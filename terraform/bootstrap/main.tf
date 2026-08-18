###############################################################################
# CreatorFlow — Terraform state backend bootstrap (CF-113)
#
# CHICKEN-AND-EGG: this config creates the bucket that every other Terraform
# configuration stores its state in, so it cannot itself use a remote backend.
# It runs on LOCAL state, and that state file IS committed to Git.
#
# That is safe here only because this config creates no secrets — just a
# bucket and its policies. Never put anything sensitive in this directory.
#
# Run once, by hand, with local AWS credentials. See terraform/README.md.
###############################################################################

terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }

  # Deliberately no backend block — local state. See the note above.
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Project   = "CreatorFlow"
      ManagedBy = "Terraform"
      Component = "tf-bootstrap"
      Phase     = "5"
    }
  }
}

data "aws_caller_identity" "current" {}

locals {
  # S3 bucket names are globally unique across all AWS accounts, so the
  # account ID is appended to avoid collisions with anyone else's bucket.
  bucket_name = "${var.state_bucket_prefix}-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket" "tfstate" {
  bucket = local.bucket_name

  # Losing this bucket means Terraform forgets everything it owns, and the
  # next apply tries to recreate live infrastructure. Do not remove this.
  lifecycle {
    prevent_destroy = true
  }

  tags = {
    Name        = local.bucket_name
    Description = "Terraform remote state for all CreatorFlow environments"
  }
}

# Versioning is the recovery mechanism for a corrupted or truncated state
# write. Without it, a bad apply is unrecoverable.
resource "aws_s3_bucket_versioning" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  versioning_configuration {
    status = "Enabled"
  }
}

# State contains PLAINTEXT SECRETS — DB passwords, generated keys, anything
# a provider returns. Encryption at rest is mandatory.
#
# SSE-S3 (AES256) is used rather than SSE-KMS: KMS adds ~$1/month per key
# plus per-request charges, and the threat model here (single-account, solo
# operator) does not justify customer-managed key control.
resource "aws_s3_bucket_server_side_encryption_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
    bucket_key_enabled = true
  }
}

resource "aws_s3_bucket_public_access_block" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# Old state versions accumulate on every apply. Keep enough history to
# recover from a bad write without paying to store years of it.
resource "aws_s3_bucket_lifecycle_configuration" "tfstate" {
  bucket = aws_s3_bucket.tfstate.id

  depends_on = [aws_s3_bucket_versioning.tfstate]

  rule {
    id     = "expire-noncurrent-state-versions"
    status = "Enabled"

    filter {}

    noncurrent_version_expiration {
      noncurrent_days           = var.state_version_retention_days
      newer_noncurrent_versions = 10 # always keep the last 10 regardless of age
    }

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Reject any request that is not over TLS. Without this, a misconfigured
# client could transmit state — including its secrets — in cleartext.
resource "aws_s3_bucket_policy" "tfstate_tls_only" {
  bucket = aws_s3_bucket.tfstate.id

  depends_on = [aws_s3_bucket_public_access_block.tfstate]

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "DenyInsecureTransport"
        Effect    = "Deny"
        Principal = "*"
        Action    = "s3:*"
        Resource = [
          aws_s3_bucket.tfstate.arn,
          "${aws_s3_bucket.tfstate.arn}/*",
        ]
        Condition = {
          Bool = {
            "aws:SecureTransport" = "false"
          }
        }
      },
    ]
  })
}

###############################################################################
# State locking
#
# NO DynamoDB TABLE. Terraform 1.11+ supports S3-native locking via
# `use_lockfile = true`, which writes a .tflock object next to the state file
# using S3 conditional writes. DynamoDB-based locking (`dynamodb_table`) is
# deprecated and slated for removal.
#
# This removes a resource, an IAM surface and a bill line for no loss of
# function. It is why every backend.tf sets `use_lockfile = true` and why
# required_version is >= 1.11.0 — on an older CLI, locking silently does
# nothing, which is worse than no locking at all because it looks configured.
###############################################################################

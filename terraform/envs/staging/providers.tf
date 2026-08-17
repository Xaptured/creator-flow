###############################################################################
# Provider and version pinning — staging
#
# Versions are pinned deliberately. An unpinned provider means `terraform init`
# can pull a new major version months from now and break a plan that has
# nothing to do with the change you were making.
###############################################################################

terraform {
  required_version = ">= 1.11.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.6"
    }
  }
}

provider "aws" {
  region = var.aws_region

  # Applied to every taggable resource created by every module in this
  # environment. Without this, Cost Explorer cannot attribute spend by
  # environment and there is no way to answer "what is staging costing me".
  default_tags {
    tags = {
      Project     = "CreatorFlow"
      Environment = var.environment
      ManagedBy   = "Terraform"
      Phase       = "5"
    }
  }
}

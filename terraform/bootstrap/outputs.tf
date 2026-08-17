output "state_bucket_name" {
  description = "Bucket name to put in each environment's backend.tf"
  value       = aws_s3_bucket.tfstate.id
}

output "state_bucket_arn" {
  description = "Bucket ARN — needed when scoping the CI deploy role in CF-121"
  value       = aws_s3_bucket.tfstate.arn
}

output "aws_region" {
  description = "Region the bucket lives in. Must match `region` in each backend.tf."
  value       = var.aws_region
}

output "backend_config_snippet" {
  description = "Copy this into terraform/envs/<env>/backend.tf, changing only the key."
  value       = <<-EOT
    terraform {
      backend "s3" {
        bucket       = "${aws_s3_bucket.tfstate.id}"
        key          = "<environment>/terraform.tfstate"
        region       = "${var.aws_region}"
        encrypt      = true
        use_lockfile = true
      }
    }
  EOT
}

###############################################################################
# Remote state — staging
#
# `bucket` is filled in after running terraform/bootstrap. Take the value from
# its `state_bucket_name` output (it embeds the AWS account ID).
#
# `use_lockfile = true` is S3-native locking (Terraform 1.11+). There is no
# DynamoDB table — that mechanism is deprecated. On a CLI older than 1.11 this
# argument is ignored and you get NO locking while appearing configured, which
# is why versions.tf pins required_version.
###############################################################################

terraform {
  backend "s3" {
    bucket       = "creatorflow-tfstate-REPLACE_WITH_ACCOUNT_ID"
    key          = "staging/terraform.tfstate"
    region       = "ap-south-1"
    encrypt      = true
    use_lockfile = true
  }
}

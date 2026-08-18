variable "aws_region" {
  description = "Region for the state bucket. All CreatorFlow infrastructure lives here."
  type        = string
  default     = "ap-south-1"
}

variable "state_bucket_prefix" {
  description = "Prefix for the state bucket. The AWS account ID is appended to make it globally unique."
  type        = string
  default     = "creatorflow-tfstate"
}

variable "state_version_retention_days" {
  description = "Days to retain non-current state versions. The 10 most recent are always kept regardless."
  type        = number
  default     = 90
}

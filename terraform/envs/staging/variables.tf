variable "aws_region" {
  description = "AWS region for all resources in this environment."
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name. Prefixes every resource name and feeds the Environment default tag."
  type        = string

  validation {
    condition     = contains(["staging", "production"], var.environment)
    error_message = "Environment must be exactly \"staging\" or \"production\" — these names appear in resource names, state keys and CI variables."
  }
}

variable "nat_mode" {
  description = <<-EOT
    How private subnets reach the internet.

      "instance" - t4g.nano NAT instance (fck-nat AMI), ~$4/month.
                   Single point of failure, you own patching.
      "gateway"  - managed NAT Gateway, ~$32/month + $0.045/GB.

    NAT is NOT optional for CreatorFlow. ai-service is a Lambda that needs
    pgvector, so it must sit in the VPC, and a VPC Lambda cannot have a public
    IP — it physically cannot reach the Claude API without NAT. VPC endpoints
    do not help: they only cover AWS services, not Claude or the social APIs.

    Flip to "gateway" at launch (CF-131), when an outage starts costing users.
    Consumed by the network module (CF-114).
  EOT
  type        = string
  default     = "instance"

  validation {
    condition     = contains(["instance", "gateway"], var.nat_mode)
    error_message = "nat_mode must be \"instance\" or \"gateway\"."
  }
}

variable "single_nat" {
  description = <<-EOT
    Share one NAT across both AZs rather than one per AZ.
    Halves NAT cost; an AZ failure takes out private egress.
    Consumed by the network module (CF-114).
  EOT
  type        = bool
  default     = true
}

variable "enable_interface_endpoints" {
  description = <<-EOT
    Interface VPC endpoints for ECR, Secrets Manager and CloudWatch Logs.
    ~$7/month each, so four of them costs about the same as a NAT Gateway
    while still not removing the need for NAT. The S3 gateway endpoint is
    free and always on. Off until NAT data processing charges justify it.
    Consumed by the network module (CF-114).
  EOT
  type        = bool
  default     = false
}

variable "aurora_min_capacity" {
  description = <<-EOT
    Aurora Serverless v2 minimum ACUs.

    0 enables auto-pause: the cluster scales to zero after the idle timeout
    and bills storage only — roughly $44/month saved versus the old 0.5 ACU
    floor. The cost is ~15 seconds resume latency on the first request after
    a pause. Raise to 0.5 once real users hit the API.
    Consumed by the data module (CF-115).
  EOT
  type        = number
  default     = 0
}

variable "aurora_seconds_until_auto_pause" {
  description = "Idle seconds before Aurora pauses. Minimum 300, maximum 86400."
  type        = number
  default     = 300

  validation {
    condition     = var.aurora_seconds_until_auto_pause >= 300 && var.aurora_seconds_until_auto_pause <= 86400
    error_message = "Must be between 300 (5 minutes) and 86400 (1 day)."
  }
}

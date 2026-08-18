###############################################################################
# CreatorFlow — staging environment
#
# This file wires modules together. It should contain almost no resources of
# its own: modules define what things are, environments define how many and
# how big.
#
# Modules are added by the tickets below. Each is commented out until its
# ticket lands, so `terraform plan` stays clean in the meantime.
###############################################################################

# --- CF-114: network -------------------------------------------------------
# module "network" {
#   source = "../../modules/network"
#
#   environment                = var.environment
#   nat_mode                   = var.nat_mode
#   single_nat                 = var.single_nat
#   enable_interface_endpoints = var.enable_interface_endpoints
# }

# --- CF-116: messaging -----------------------------------------------------
# Independent of the network module — SNS and SQS are not VPC resources.
# module "messaging" {
#   source = "../../modules/messaging"
#
#   environment = var.environment
# }

# --- CF-115: data ----------------------------------------------------------
# module "data" {
#   source = "../../modules/data"
#
#   environment                     = var.environment
#   vpc_id                          = module.network.vpc_id
#   private_subnet_ids              = module.network.private_subnet_ids
#   aurora_sg_id                    = module.network.aurora_sg_id
#   redis_sg_id                     = module.network.redis_sg_id
#   aurora_min_capacity             = var.aurora_min_capacity
#   aurora_seconds_until_auto_pause = var.aurora_seconds_until_auto_pause
# }

# --- CF-117: compute -------------------------------------------------------
# module "compute" {
#   source = "../../modules/compute"
#
#   environment        = var.environment
#   vpc_id             = module.network.vpc_id
#   public_subnet_ids  = module.network.public_subnet_ids
#   private_subnet_ids = module.network.private_subnet_ids
#   alb_sg_id          = module.network.alb_sg_id
#   ecs_tasks_sg_id    = module.network.ecs_tasks_sg_id
#   lambda_sg_id       = module.network.lambda_sg_id
#
#   db_secret_arn      = module.data.db_secret_arn
#   redis_endpoint     = module.data.redis_endpoint
#   media_bucket_name  = module.data.media_bucket_name
#
#   topic_arns         = module.messaging.topic_arns
#   queue_urls         = module.messaging.queue_urls
#   queue_arns         = module.messaging.queue_arns
# }

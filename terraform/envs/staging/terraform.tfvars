# Staging.
#
# This is currently the ONLY provisioned AWS environment. Until launch there
# are no users and no production data, so a second always-on stack would be
# ~$65/month protecting nothing. envs/production exists but is not applied;
# it goes live at CF-131, at which point staging starts earning its keep.
#
# NO SECRETS IN THIS FILE. It is committed. Secrets live in AWS Secrets
# Manager and are referenced by ARN (CF-115).

aws_region  = "ap-south-1"
environment = "staging"

# --- Cost posture ----------------------------------------------------------
# Roughly $20-25/month idle with these settings, against ~$65 on the
# conventional defaults. Staging runs the smallest thing that is still
# representative: parity means the same shape, not the same scale.

# NAT instance rather than a managed Gateway: ~$4/month vs ~$32.
# Switch to "gateway" at launch — see the variable description.
nat_mode   = "instance"
single_nat = true

# Four interface endpoints would cost about as much as a NAT Gateway and
# still would not remove the need for NAT. Measure first.
enable_interface_endpoints = false

# Aurora auto-pauses to zero ACUs after 5 minutes idle — storage-only cost
# when nothing is talking to it. Trade-off is ~15s resume on the next request,
# which is fine for a staging environment nobody is waiting on.
aurora_min_capacity             = 0
aurora_seconds_until_auto_pause = 300

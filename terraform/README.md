# CreatorFlow Infrastructure (Terraform)

All AWS infrastructure for CreatorFlow. The Next.js frontend is **not** here — it
deploys to Vercel, deliberately outside Terraform's scope. See the
[Split Deployment ADR](https://xaptured.atlassian.net/wiki/spaces/CF/pages/229179393).

Standards for deployment and CI live in [`../deployment-ci/SKILL.md`](../deployment-ci/SKILL.md).

---

## Layout

```
terraform/
├── bootstrap/          # State bucket. Local state, run once by hand.
├── modules/            # Reusable, environment-agnostic
│   ├── network/        # CF-114
│   ├── data/           # CF-115
│   ├── messaging/      # CF-116
│   └── compute/        # CF-117
└── envs/
    └── staging/        # deploys from `develop` — the only environment today
```

`envs/production/` is created at **CF-131**, and should be a copy of
`envs/staging/` differing only in tfvars.

**Modules define what things are. Environments define how many and how big.**
An environment directory should contain module blocks and almost no resources
of its own. When production is added, its `main.tf` must stay structurally
identical to staging's — if they diverge, staging stops being a valid
rehearsal for production.

## Environment strategy

**One AWS account, two independently provisioned stacks**, separated by state
key and resource name prefix.

Separate accounts per environment give cleaner blast-radius isolation and are
the right answer at team scale. They were rejected here: AWS Organizations,
cross-account roles and duplicated billing setup are real overhead for a solo
project, and the isolation problem is adequately solved by never sharing a
resource between environments.

Non-negotiable: staging and production **never share** an RDS instance, Redis
cluster, S3 bucket, SNS topic or SQS queue. A staging bug must not be able to
write production data. Every resource carries its environment prefix —
`staging-media-service`, `prod-media-service`.

## Remote state

State lives in one S3 bucket, one key per environment:

```
s3://creatorflow-tfstate-<account-id>/staging/terraform.tfstate
s3://creatorflow-tfstate-<account-id>/production/terraform.tfstate
```

The bucket has versioning, encryption at rest (SSE-S3), public access fully
blocked, a TLS-only bucket policy, and `prevent_destroy` set.

**State contains plaintext secrets.** Database passwords, generated keys and
anything else a provider returns are stored in cleartext inside the state file.
That is why it is never committed, never unencrypted, and never in a public
bucket.

### Locking: S3-native, no DynamoDB

`use_lockfile = true` in each `backend.tf`. Terraform writes a `.tflock` object
next to the state file using S3 conditional writes.

The older approach — a DynamoDB table via `dynamodb_table` — is deprecated and
scheduled for removal. S3-native locking removes a resource, an IAM surface and
a bill line with no loss of function.

**This is why `required_version >= 1.11.0` matters.** On an older CLI the
`use_lockfile` argument is silently ignored: you get no locking at all while
the config looks correctly configured. That is worse than knowing you have none.

Locking is not a team-size concern. A local `apply` and the CI pipeline can
collide, and concurrent writes corrupt state.

---

## Bootstrap — run this once

The state backend cannot store its own state in the bucket it creates, so
`bootstrap/` runs on **local state, which is committed to Git**. That is safe
only because it provisions no secrets. Never add anything sensitive there.

```bash
cd terraform/bootstrap

# Local AWS credentials with permission to create S3 buckets.
# This cannot run in CI — CF-121's OIDC roles do not exist yet, and the
# workflow that would create them needs the backend this step creates.
aws sts get-caller-identity          # confirm the right account

terraform init
terraform apply

terraform output state_bucket_name   # e.g. creatorflow-tfstate-123456789012
```

Then put that bucket name into **both** backend files, replacing
`REPLACE_WITH_ACCOUNT_ID`:

- `envs/staging/backend.tf`
- `envs/production/backend.tf`

```bash
cd ../envs/staging
terraform init      # confirms it is using the S3 backend
```

Commit the updated `backend.tf` files and `bootstrap/terraform.tfstate`.

### Verifying the lock works

Worth doing once, because a lock that silently does nothing looks identical to
one that works. In two terminals:

```bash
# terminal 1
terraform -chdir=envs/staging apply     # leave it at the confirmation prompt

# terminal 2 — should fail with "Error acquiring the state lock"
terraform -chdir=envs/staging plan
```

If the second command proceeds, `use_lockfile` is not taking effect — check
`terraform version`.

---

## Daily use

```bash
make check                  # fmt -check + validate everything. Run before pushing.
make plan ENV=staging
make apply ENV=staging
make destroy ENV=staging
```

`make destroy ENV=production` is deliberately refused.

## How many environments exist

**One: `staging`.** There is no `envs/production` directory yet, by choice.

Staging earns its keep when there is something to protect — real users, real
data, a migration that could lose it. Before launch none of that exists, so a
second stack is roughly $65/month guarding nothing. Until launch the entire
system *is* staging: `develop` auto-deploys to it, `main` stays empty, and the
staging-first rule holds trivially because there is nowhere else.

### Creating production (CF-131)

Copy `envs/staging/`, then change:

| File | Change |
|---|---|
| `backend.tf` | `key = "production/terraform.tfstate"` |
| `terraform.tfvars` | `environment = "production"` |
| `terraform.tfvars` | `nat_mode = "gateway"` — a NAT instance failing overnight means ai-service cannot reach Claude and scheduled posts fail silently. Worth $28/month once users exist. |
| `terraform.tfvars` | `aurora_min_capacity = 0.5` — a 15-second cold resume is fine in staging, not on a user-facing request |
| `../../.gitignore` | add `!envs/production/terraform.tfvars`, or the repo-root `*.tfvars` rule silently ignores it |

That last row is easy to miss and the failure is quiet: the file simply never
gets committed, and the environment is reproducible only on one laptop.

## Cost notes

Infrastructure bills from the moment it is applied, whether or not anything
runs on it. Until CF-117 gives the stack something to serve, apply selectively:

| Module | Idle cost (staging settings) | Leave applied? |
|---|---|---|
| bootstrap (S3 state) | Pennies | Yes |
| messaging (SNS/SQS) | Effectively free | Yes |
| network | **~$4/month** — NAT instance | Cheap enough to leave |
| data | **~$0** — Aurora auto-pauses; Redis ~$12 | No, until close to CF-117 |
| compute | Fargate Spot + ALB ~$17 | Applied once the stack is real |

Roughly **$20–25/month** with these settings, against ~$65 on conventional
defaults. Two decisions do most of that work:

**NAT instance instead of a NAT Gateway** — ~$4/month against ~$32. NAT is not
optional here: ai-service is a Lambda that needs pgvector, so it lives in the
VPC, and a VPC Lambda cannot have a public IP. It physically cannot reach the
Claude API without NAT. VPC endpoints do not solve this — they only cover AWS
services, and four interface endpoints (~$28/month) cost about as much as a
Gateway while still not removing the need for NAT.

The trade-off is real: a NAT instance is a single point of failure you patch
yourself. Pre-launch that is a non-event. `nat_mode = "gateway"` is part of
CF-131.

**Aurora `min_capacity = 0`** — Serverless v2 auto-pauses after five minutes
idle and bills storage only, saving ~$44/month against the old 0.5 ACU floor.
The cost is ~15 seconds resume latency on the first request after a pause,
which nobody is waiting on in staging. Production defaults to 0.5.

Aurora is slow to destroy and slow to recreate. Factor that in before tearing
down mid-session.

## Conventions

- **Tagging is automatic.** `default_tags` on the provider applies `Project`,
  `Environment`, `ManagedBy` and `Phase` to every taggable resource. Without it,
  Cost Explorer cannot answer "what is staging costing me". Don't set these
  by hand on individual resources.
- **Pin provider versions.** An unpinned provider means `terraform init` can
  pull a new major version months from now and break a plan unrelated to your change.
- **Security group rules reference other security groups by ID, not CIDR.**
- **No secrets in tfvars.** They are committed. Secrets go to Secrets Manager
  and are referenced by ARN.
- **No console changes.** If it is not in Terraform it will be silently
  destroyed by the next apply, or lost.

## Ticket map

| Ticket | Delivers |
|---|---|
| CF-113 | This foundation — state backend, layout, pinning, tagging |
| CF-114 | `modules/network` — VPC, subnets, NAT, endpoints, security groups |
| CF-115 | `modules/data` — Aurora Serverless v2 + pgvector, Redis, S3, Secrets Manager |
| CF-116 | `modules/messaging` — SNS topics, SQS queues, DLQs, filter policies |
| CF-117 | `modules/compute` — ECR, ECS Fargate Spot, ALB, Lambda, API Gateway |
| CF-121 | OIDC roles, PR plan comments, branch protection |

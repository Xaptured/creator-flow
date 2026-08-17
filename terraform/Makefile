# CreatorFlow Terraform helpers (CF-113)
#
#   make fmt                 format everything
#   make check               fmt -check + validate every config (run before pushing)
#   make plan ENV=staging    plan one environment
#   make apply ENV=staging   apply one environment
#   make destroy ENV=staging tear one down (see the cost note in README)

SHELL := /bin/bash
ENV ?= staging
ENV_DIR := envs/$(ENV)

.PHONY: help fmt fmt-check validate check init plan apply destroy bootstrap guard-env

help:
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-22s\033[0m %s\n", $$1, $$2}'

guard-env:
	@if [ ! -d "$(ENV_DIR)" ]; then \
		echo ""; \
		echo "No environment directory at $(ENV_DIR)."; \
		echo ""; \
		if [ "$(ENV)" = "production" ]; then \
			echo "envs/production does not exist yet. It is created at CF-131,"; \
			echo "when there are real users to protect. Before then a second"; \
			echo "always-on stack is ~\$$65/month guarding nothing."; \
			echo ""; \
			echo "See the environments section of terraform/README.md."; \
		else \
			echo "Available: $$(ls envs 2>/dev/null | tr '\n' ' ')"; \
		fi; \
		echo ""; \
		exit 1; \
	fi

fmt: ## Rewrite all Terraform files to canonical format
	terraform fmt -recursive .

fmt-check: ## Fail if anything is unformatted (CI-safe)
	terraform fmt -check -recursive -diff .

validate: ## terraform validate across bootstrap and every environment that exists
	@set -e; \
	for d in bootstrap $$(ls -d envs/*/ 2>/dev/null | sed 's:/*$$::'); do \
		echo "--- validate $$d"; \
		terraform -chdir=$$d init -backend=false -input=false > /dev/null; \
		terraform -chdir=$$d validate; \
	done

check: fmt-check validate ## Everything CI will check. Run before pushing.

bootstrap: ## One-off: create the remote state bucket (local state, run by hand)
	terraform -chdir=bootstrap init
	terraform -chdir=bootstrap apply

init: guard-env ## terraform init for ENV
	terraform -chdir=$(ENV_DIR) init

plan: guard-env ## terraform plan for ENV
	terraform -chdir=$(ENV_DIR) plan -var-file=terraform.tfvars

apply: guard-env ## terraform apply for ENV
	terraform -chdir=$(ENV_DIR) apply -var-file=terraform.tfvars

destroy: guard-env ## terraform destroy for ENV — check the README cost notes first
	@if [ "$(ENV)" = "production" ]; then \
		echo "Refusing to destroy production from the Makefile."; \
		echo "If you genuinely mean it, run terraform destroy in envs/production by hand."; \
		exit 1; \
	fi
	terraform -chdir=$(ENV_DIR) destroy -var-file=terraform.tfvars

# Homebody: the single entry point for common tasks.
# Run `make` or `make help` to list the available targets.

SHELL := /bin/sh
.DEFAULT_GOAL := help

PNPM ?= pnpm
COMPOSE ?= docker compose

.PHONY: help install dev build preview test test-watch coverage lint format typecheck check \
	data-validate data-build docker-build docker-run docker-dev docker-stop clean

help: ## Show available targets
	@awk 'BEGIN { FS = ":.*## " } /^[a-zA-Z0-9_-]+:.*## / { printf "  \033[36m%-14s\033[0m %s\n", $$1, $$2 }' $(MAKEFILE_LIST)

install: ## Install dependencies (pnpm)
	$(PNPM) install --frozen-lockfile

dev: ## Start Vite dev server
	$(PNPM) dev

build: ## Production build
	$(PNPM) build

preview: ## Serve the production build locally
	$(PNPM) preview

test: ## Unit tests (Vitest)
	$(PNPM) test

test-watch: ## Unit tests in watch mode
	$(PNPM) test:watch

coverage: ## Unit tests with coverage report
	$(PNPM) coverage

lint: ## ESLint
	$(PNPM) lint

format: ## Prettier write
	$(PNPM) format

typecheck: ## tsc --noEmit
	$(PNPM) typecheck

check: lint typecheck data-validate test build ## lint + typecheck + test + build (what CI runs)

data-validate: ## Validate data/exercises.json against the schema
	$(PNPM) data:validate

data-build: ## Rebuild the dataset/images from upstream (scripts/)
	$(PNPM) data:build

docker-build: ## Build the production image
	$(COMPOSE) build app

docker-run: ## Run the production image on http://localhost:8080
	$(COMPOSE) up --build --detach --wait app
	@echo "Homebody is running on http://localhost:8080"

docker-dev: ## Run the dev server in Docker with hot reload
	$(COMPOSE) --profile dev up --build dev

docker-stop: ## Stop containers
	$(COMPOSE) --profile dev down

clean: ## Remove build artifacts and caches
	rm -rf dist dev-dist coverage playwright-report test-results node_modules/.vite node_modules/.tmp .eslintcache

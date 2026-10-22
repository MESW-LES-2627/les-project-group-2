.PHONY: help up down db db-stop status test build dev compose-up compose-down

help:
	@echo "PlanIt! - Developer Commands"
	@echo "============================"
	@echo "  make db            Start local Supabase (Postgres + Auth + Studio) in Docker"
	@echo "  make db-stop       Stop local Supabase Docker containers"
	@echo "  make status        Check status of local database services"
	@echo "  make dev           Start Next.js dev server"
	@echo "  make up            Ensure env file, start local DB, and start dev server"
	@echo "  make down          Stop local DB services"
	@echo "  make compose-up    Start standalone PostgreSQL via docker-compose"
	@echo "  make compose-down  Stop standalone PostgreSQL docker-compose"
	@echo "  make test          Run test suite"
	@echo "  make build         Build production bundle"

.env.local:
	@if [ ! -f .env.local ]; then \
		echo "Creating .env.local from .env.example..."; \
		cp .env.example .env.local; \
	fi

db: .env.local
	npm run db:start

db-stop:
	npm run db:stop

status:
	npm run db:status

compose-up:
	docker compose up -d

compose-down:
	docker compose down

dev: .env.local
	npm run dev

up: db
	npm run dev

down: db-stop

test:
	npx vitest run

build:
	npm run build

ifneq (,$(wildcard ./.env))
    include .env
    export
endif

.PHONY: help up down db backend test clean

help:
	@echo "Available commands:"
	@echo "  make up       - Start database in Docker and launch the backend"
	@echo "  make down     - Stop database container"
	@echo "  make db       - Start PostgreSQL database in Docker"
	@echo "  make backend  - Run Spring Boot backend locally"
	@echo "  make test     - Run backend automated tests"
	@echo "  make clean    - Clean backend build artifacts"

.env:
	@echo "Creating .env from .env.example..."
	@cp .env.example .env

up: .env db
	cd backend && ./mvnw spring-boot:run

db: .env
	docker compose up -d --wait database

down:
	docker compose down

backend:
	cd backend && ./mvnw spring-boot:run

test:
	cd backend && ./mvnw test

clean:
	cd backend && ./mvnw clean

# Development Setup Guide

## 1. Overview

This document describes how to configure and run the local development environment for the Group Trip Planning project.

The goal is to provide a reproducible setup so that every team member can run the application locally without relying on another team member to configure the environment.

### Technology Stack

| Component | Technology |
|---|---|
| Backend language | Kotlin |
| Backend framework | Spring Boot |
| Build tool | Maven |
| Java version | Java 21 |
| Database | PostgreSQL |
| Database containerization | Docker Compose |
| IDE | IntelliJ IDEA |
| Version control | Git |

### Current Development Setup

The PostgreSQL database runs inside a Docker container, while the Spring Boot backend runs directly on the local machine through IntelliJ IDEA or the Maven Wrapper.

This allows the backend to be debugged independently of the database container.

## 2. Prerequisites

Install the following tools before setting up the project.

- **Git:** for version control.
- **JDK 21:** to compile and run the backend.
- **IntelliJ IDEA:** for backend development.
- **Docker Desktop:** to run PostgreSQL in a container.

The project includes a Maven Wrapper, so a separate Maven installation should not be necessary.

### 2.1. Verify Java

Open a terminal and run:

```bash
java -version
```

The output should indicate Java 21.

### 2.2. Verify Maven

From the backend directory, run:

```bash
./mvnw -version
```

Confirm that Maven is using Java 21.

Using an older Java runtime may result in an `UnsupportedClassVersionError` when starting the application.

## 3. Project Structure

The current repository structure is expected to follow this layout:

```text
group-trip-planning/
├── backend/
│   ├── src/
│   │   ├── main/
│   │   │   ├── kotlin/
│   │   │   └── resources/
│   │   │       └── application.properties
│   │   └── test/
│   ├── pom.xml
│   └── mvnw
├── docker-compose.yaml
├── docs/
│   └── development-setup.md
└── README.md
```

The backend source code, Maven configuration, and application properties are located inside the `backend` directory.

The Docker Compose configuration is located at the repository root.

*Note: This is the intended layout. Update it if the actual repository structure differs.*

## 4. Database Setup

PostgreSQL runs in Docker using Docker Compose.

### 4.1. Start Docker Desktop

Open Docker Desktop and wait until the Docker Engine is running.

If Docker is not running, Docker commands may fail with an error indicating that the Docker daemon or Docker socket cannot be reached.

### 4.2. Start PostgreSQL

From the repository root, run:

```bash
docker compose up -d
```

This starts the services defined in `compose.yaml` in the background.

The PostgreSQL service is named `database`.

### 4.3. Check the Database Status

Run:

```bash
docker compose ps
```

Check that the PostgreSQL container is running.

If a health check is configured in `compose.yaml`, wait until the service reports `healthy`.

### 4.4. Database Configuration

The current local development database configuration is:

| Setting | Value |
|---|---|
| Database service | `database` |
| Database name | `db-group-trip-planning` |
| Database username | `group_trip` |
| Host | `localhost` |
| Port | `5432` |

The database password is currently configured locally in the backend's `application.properties` file.

The password must match the password used to initialize the PostgreSQL database.

### 4.5. Stop the Database

To stop the containers, run:

```bash
docker compose down
```

This stops and removes the containers and the Compose network but preserves named volumes.

The PostgreSQL data is stored in a Docker volume, so it persists when the container is stopped or recreated, provided the volume is not deleted.

**Warning:** Avoid running the following command unless you intentionally want to remove the associated volumes and potentially delete local database data:

```bash
docker compose down -v
```

### 4.6. Database Initialization

The PostgreSQL environment variables `POSTGRES_DB`, `POSTGRES_USER`, and `POSTGRES_PASSWORD` are primarily used when the database data directory is initialized for the first time.

Changing these values in `compose.yaml` does not automatically rename an existing database, change its existing user's password, or create a new database inside an already initialized data volume.

If the database configuration needs to change after initialization, the corresponding changes must also be made in PostgreSQL itself.

## 5. Backend Configuration

The backend is implemented using Kotlin and Spring Boot and uses Maven as its build tool.

### 5.1. Open the Backend Project

Open the `backend` directory in IntelliJ IDEA as a Maven project.

Allow IntelliJ IDEA to import the Maven project and download the required dependencies.

### 5.2. Configure Java 21

In IntelliJ IDEA, verify the following settings:

- **Project SDK:** Java 21.
- **Maven runner JRE:** Java 21.
- **Run Configuration JRE:** Java 21, if the option is available.

The exact menu locations may vary slightly depending on the IntelliJ IDEA version.

Using different Java versions for compilation and execution may cause build or runtime errors.

### 5.3. Configure the Database Connection

The database connection is configured in:

`backend/src/main/resources/application.properties`

The relevant properties are:

```properties
spring.datasource.url=jdbc:postgresql://localhost:5432/db-group-trip-planning
spring.datasource.username=group_trip
spring.datasource.password=YOUR_LOCAL_PASSWORD
```

Replace `YOUR_LOCAL_PASSWORD` with the password configured for the local PostgreSQL database.

The JDBC URL uses `localhost` because the backend runs on the host machine, outside Docker. Port `5432` is the port published by Docker Compose.

### 5.4. Credentials and Security

The database password is currently stored directly in `application.properties` for local development.

This is a temporary configuration.

Before sharing the configuration through a shared repository, the password should be moved to an environment variable or another local configuration mechanism that is excluded from version control.

For example:

```properties
spring.datasource.password=${DB_PASSWORD}
```

The `DB_PASSWORD` environment variable can then be configured in the IntelliJ IDEA Run Configuration.

Do not commit real passwords, tokens, or other secrets to Git.

If a real password has already been committed, removing it from the current file does not remove it from the Git history. Consider rotating the password as well.

## 6. Run the Backend

1. Start Docker Desktop.
2. Start the PostgreSQL container from the repository root:

   ```bash
   docker compose up -d
   ```

3. Open the backend project in IntelliJ IDEA.
4. Ensure Java 21 is configured.
5. Verify that the database connection properties are correct.
6. Run `TravelplannerApplication.kt`.

The Spring Boot application should start successfully if PostgreSQL is available and the connection settings are valid.

## 7. Development Workflow

The recommended workflow for local development is:

1. Start Docker Desktop.
2. Start PostgreSQL:

   ```bash
   docker compose up -d
   ```

3. Verify that the database container is running:

   ```bash
   docker compose ps
   ```

4. Run the Spring Boot backend from IntelliJ IDEA or using Maven.
5. Implement and test changes.
6. Run the automated tests when appropriate:

   ```bash
   ./mvnw test
   ```

7. Stop the database when it is no longer needed:

   ```bash
   docker compose down
   ```

The backend currently runs outside Docker, so stopping Docker does not automatically stop a backend process that is already running locally. However, database operations will fail while PostgreSQL is unavailable.
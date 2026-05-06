#!/bin/bash

# ============================================================
#  Docker Entrypoint Script - InsightStream Backend
#  ===========================================================
#  This script runs INSIDE the container at startup.
#  Its job is to ensure the database is ready, aply pending migrations,
#  and only then start the application server.
#
#  Wgy do we need this?
#  - Docker Compose starts sevices in parallel. The dataase may not be 
#  ready when the backend starts, causing connection errors.
#  - We must run Alembic migrations BEFORE uvicorn starts, otherwise the
#  app might work with an outdated schema.
#
#  Exit immediately if any command fails.
set -e

echo "============================================="
echo " InsightStream Backend - Starting Entrypoint"
echo "============================================="


# =============================================================
# 1. WAIT FOR POSTGRESQL
# =============================================================
echo " Waiting for PostgreSQL to be ready..."

# pg_isready, the standard PostgreSQL utility that checks connectivity.
# The loop retries every 2 seconds untill success or too many failures.

RETRIES=30
until pg_isready -h "$POSTGRES_SERVER" -p "$POSTGRES_PORT" -U "$POSTGRES_USER" -d "$POSTGRES_DB" > /dev/null 2>&1; do
	RETRIES=$((RETRIES-1))
	if [ $RETRIES -le 0 ]; then
		echo "PostgreSQL did not become ready in time. Exiting."
		exit 1
	fi
	echo "  Waiting... ($RETRIES retries left)"
	sleep 2
done
echo "PostgreSQL is ready!"

# ==============================================================
# 2. RUN ALEMBIC MIGRATIONS
# ==============================================================

echo "Running database migrations..."
alembic upgrade head
echo " Migrations complete!"

# ==============================================================
# 3. START THE APPLICATION
# ==============================================================
echo "Starting InsightStream API server..."
# Excute whatever CMD the Dockerfile passed (uvicorn...)
exec "$@"

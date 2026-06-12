#!/bin/bash
set -e

cd /app
export PYTHONPATH=/app

echo "⏳ Running database migrations..."
alembic upgrade head

echo "✅ Migrations complete. Starting API server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000

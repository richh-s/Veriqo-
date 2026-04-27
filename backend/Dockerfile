FROM python:3.11-slim

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    postgresql-client \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Script to wait for DB and run migrations/seed
RUN echo '#!/bin/sh\n\
set -e\n\
\n\
echo "Waiting for PostgreSQL..."\n\
# Extract host and port from DATABASE_URL for pg_isready\n\
DB_HOST=$(echo $DATABASE_URL | sed -e "s/.*@//" -e "s/:.*//")\n\
DB_PORT=$(echo $DATABASE_URL | sed -e "s/.*://" -e "s/\/.*//")\n\
\n\
until pg_isready -h "$DB_HOST" -p "$DB_PORT"; do\n\
  echo "Postgres is unavailable - sleeping"\n\
  sleep 2\n\
done\n\
\n\
echo "Applying migrations..."\n\
alembic upgrade head\n\
\n\
echo "Seeding demo data..."\n\
python -m scripts.seed\n\
\n\
echo "Starting server..."\n\
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload\n\
' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 8000

CMD ["/entrypoint.sh"]

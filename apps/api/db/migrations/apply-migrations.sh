#!/bin/sh

set -eu

for migration in /migrations/[0-9][0-9][0-9][0-9]_*.sql; do
  filename=${migration##*/}
  version=${filename%.sql}
  has_ledger=$(psql \
    --username fuel_now \
    --dbname fuel_now \
    --tuples-only \
    --no-align \
    --command "SELECT to_regclass('public.schema_migrations') IS NOT NULL")

  if [ "$has_ledger" = "t" ]; then
    is_applied=$(psql \
      --username fuel_now \
      --dbname fuel_now \
      --tuples-only \
      --no-align \
      --command "SELECT EXISTS (SELECT 1 FROM schema_migrations WHERE version = '$version')")

    if [ "$is_applied" = "t" ]; then
      echo "Skipping already applied migration $version"
      continue
    fi
  fi

  psql \
    --username fuel_now \
    --dbname fuel_now \
    --file "$migration"
done

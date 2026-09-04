#!/bin/sh

set -eu

psql \
  --username fuel_now \
  --dbname fuel_now \
  --file /migrations/verify-schema.sql

for verification in /migrations/verify-*.sql; do
  if [ "$verification" = "/migrations/verify-schema.sql" ]; then
    continue
  fi

  psql \
    --username fuel_now \
    --dbname fuel_now \
    --file "$verification"
done

psql \
  --username fuel_now \
  --dbname fuel_now \
  --file /fixtures/verify-base.sql

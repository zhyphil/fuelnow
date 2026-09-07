import pg from "pg";
import {
  auditGeography,
  type CanonicalServicePointMatchCandidate,
} from "@fuel-now/data-core";
async function main() {
  if (!process.env.DATABASE_URL) throw new Error("Database is not configured");
  const client = new pg.Client({
    connectionString: process.env.DATABASE_URL,
    connectionTimeoutMillis: 5000,
  });
  await client.connect();
  try {
    await client.query("BEGIN READ ONLY");
    await client.query("SET LOCAL statement_timeout = '10s'");
    const result =
      await client.query(`SELECT id::text, country, name, brand, ST_Y(location::geometry) AS latitude, ST_X(location::geometry) AS longitude,
      json_build_object('street',address_street,'houseNumber',address_house_number,'postalCode',address_postal_code,'locality',address_locality) AS address
      FROM service_points ORDER BY id LIMIT 2001`);
    const points = result.rows.map((row) => ({
      ...row,
      trustedIdentifiers: [],
    })) as CanonicalServicePointMatchCandidate[];
    const report = auditGeography(points);
    console.log(
      JSON.stringify({
        ...report,
        checkedAt: new Date().toISOString(),
        coverage: points.length ? "scoped_service_points" : "empty",
      }),
    );
    if (report.findingCount || !points.length) process.exitCode = 2;
  } finally {
    await client.query("ROLLBACK");
    await client.end();
  }
}
void main().catch(() => {
  console.error(
    "Geography audit failed; check configuration, database access and the 2000-point scope limit.",
  );
  process.exitCode = 1;
});

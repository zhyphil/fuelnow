import { randomBytes } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";

import pg from "pg";

import { localLoadDatabaseUrl } from "./loadProfile.js";

export async function withDisposableDatabase<T>(
  connectionString: string,
  run: (pool: pg.Pool) => Promise<T>,
  options: { migrate?: boolean } = {},
): Promise<T> {
  const url = localLoadDatabaseUrl(connectionString);
  const name = `fuel_now_import_${randomBytes(6).toString("hex")}`;
  const admin = new pg.Client({
    connectionString: url.href,
    connectionTimeoutMillis: 5000,
  });
  await admin.connect();
  let created = false;
  let pool: pg.Pool | undefined;
  try {
    await admin.query(`CREATE DATABASE "${name}"`);
    created = true;
    url.pathname = `/${name}`;
    pool = new pg.Pool({
      connectionString: url.href,
      max: 4,
      connectionTimeoutMillis: 5000,
      statement_timeout: 15000,
    });
    const directory = new URL("../../db/migrations/", import.meta.url);
    const client = await pool.connect();
    try {
      for (const file of (options.migrate === false ? [] : await readdir(directory))
        .filter((entry) => /^\d{4}_.*\.sql$/.test(entry))
        .sort()) {
        const sql = (await readFile(new URL(file, directory), "utf8")).replace(
          /^\\set ON_ERROR_STOP on\r?\n/,
          "",
        );
        if (/^\\/m.test(sql)) throw new Error("Unsupported migration directive");
        await client.query(sql);
      }
    } finally {
      client.release();
    }
    return await run(pool);
  } finally {
    try {
      await pool?.end();
      if (created) {
        await admin.query(`DROP DATABASE "${name}"`);
        console.log(JSON.stringify({ temporaryDatabase: name, removed: true }));
      }
    } finally {
      await admin.end();
    }
  }
}

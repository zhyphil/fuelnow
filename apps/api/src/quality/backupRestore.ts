import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import type { Pool } from "pg";

export function archiveArguments(mode: "dump" | "restore", database: string): string[] {
  if (!/^fuel_now_import_[a-f0-9]{12}$/.test(database))
    throw new Error("Only generated disposable databases are allowed");
  const prefix = [
    "compose",
    "--file",
    fileURLToPath(new URL("../../../../compose.yaml", import.meta.url)),
    "exec",
    "-T",
    "db",
  ];
  return [
    ...prefix,
    mode === "dump" ? "pg_dump" : "pg_restore",
    "--username=fuel_now",
    `--dbname=${database}`,
    "--no-owner",
    "--no-acl",
    ...(mode === "dump"
      ? ["--format=custom"]
      : ["--single-transaction", "--exit-on-error"]),
  ];
}

export function validateArchive(archive: Buffer): void {
  if (
    archive.length < 6 ||
    archive.length > 8 * 1024 * 1024 ||
    archive.subarray(0, 5).toString("ascii") !== "PGDMP"
  )
    throw new Error("Invalid or oversized local archive");
}

export async function runArchive(
  mode: "dump" | "restore",
  database: string,
  input?: Buffer,
): Promise<Buffer> {
  const args = archiveArguments(mode, database);
  if (mode === "restore") validateArchive(input ?? Buffer.alloc(0));
  return new Promise((resolve, reject) => {
    const child = spawn("docker", args, { stdio: ["pipe", "pipe", "pipe"] });
    const chunks: Buffer[] = [];
    let bytes = 0;
    let failed = false;
    const fail = () => {
      failed = true;
      child.kill();
      // Wait for close before allowing temporary database cleanup to begin.
    };
    const timer = setTimeout(fail, 60000);
    child.on("error", fail);
    child.stdin.on("error", fail);
    child.stdout.on("data", (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > 8 * 1024 * 1024) fail();
      else chunks.push(chunk);
    });
    // PostgreSQL errors can contain row values and connection details. Never print them.
    child.stderr.resume();
    child.on("close", (code) => {
      clearTimeout(timer);
      if (failed || code !== 0) reject(new Error("Local archive command failed"));
      else resolve(Buffer.concat(chunks));
    });
    child.stdin.end(input);
  });
}

export async function databaseFingerprint(pool: Pool) {
  const relations = (
    await pool.query<{ relname: string; relkind: string }>(`
    SELECT c.relname,c.relkind FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
    WHERE n.nspname='public' AND c.relkind IN ('r','S')
      AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_class'::regclass AND d.objid=c.oid AND d.deptype='e')
    ORDER BY c.relname`)
  ).rows;
  const tables = [];
  for (const relation of relations) {
    assert.match(relation.relname, /^[a-z][a-z0-9_]*$/);
    const records = (
      await pool.query(
        relation.relkind === "S"
          ? `SELECT json_build_object('last_value',last_value,'is_called',is_called)::text AS value FROM public."${relation.relname}"`
          : `SELECT row_to_json(t)::text AS value FROM public."${relation.relname}" t ORDER BY row_to_json(t)::text`,
      )
    ).rows;
    tables.push({
      name: relation.relname,
      kind: relation.relkind,
      rows: records.length,
      sha256: createHash("sha256").update(JSON.stringify(records)).digest("hex"),
    });
  }
  const definitions = (
    await pool.query(`
    SELECT 'constraint' AS kind, c.conname AS name, pg_get_constraintdef(c.oid) AS definition FROM pg_constraint c JOIN pg_namespace n ON n.oid=c.connamespace WHERE n.nspname='public'
    UNION ALL SELECT 'index',indexname,indexdef FROM pg_indexes WHERE schemaname='public'
    UNION ALL SELECT 'function',p.proname,pg_get_functiondef(p.oid) FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.prokind='f' AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.classid='pg_proc'::regclass AND d.objid=p.oid AND d.deptype='e')
    ORDER BY kind,name,definition`)
  ).rows;
  return {
    tables,
    definitionSha256: createHash("sha256")
      .update(JSON.stringify(definitions))
      .digest("hex"),
  };
}

export async function restoreToEmptyDisposable(source: Pool, target: Pool) {
  const sourceName = (await source.query("SELECT current_database() AS name")).rows[0]
    .name as string;
  const targetName = (await target.query("SELECT current_database() AS name")).rows[0]
    .name as string;
  archiveArguments("dump", sourceName);
  archiveArguments("restore", targetName);
  assert.notEqual(sourceName, targetName);
  const occupied = (
    await target.query(
      "SELECT count(*)::int AS count FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace WHERE n.nspname='public'",
    )
  ).rows[0].count;
  assert.equal(occupied, 0, "Restore target must be empty");
  const before = await databaseFingerprint(source);
  const started = performance.now();
  const archive = await runArchive("dump", sourceName);
  validateArchive(archive);
  await runArchive("restore", targetName, archive);
  const restored = await databaseFingerprint(target);
  assert.deepEqual(
    restored,
    before,
    "Restored rows, sequences and schema definitions must match",
  );
  return {
    archiveBytes: archive.length,
    archiveSha256: createHash("sha256").update(archive).digest("hex"),
    elapsedMs: Math.round(performance.now() - started),
    relations: restored.tables.length,
    definitionSha256: restored.definitionSha256,
  };
}

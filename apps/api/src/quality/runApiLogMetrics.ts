import { MAX_METRIC_INPUT_BYTES, summarizeApiLogs } from "./apiLogMetrics.js";
async function main() {
  if (process.stdin.isTTY) throw new Error("Explicit piped log input required");
  const chunks: Buffer[] = [];
  let bytes = 0;
  for await (const value of process.stdin) {
    const chunk = Buffer.isBuffer(value) ? value : Buffer.from(value);
    bytes += chunk.length;
    if (bytes > MAX_METRIC_INPUT_BYTES) throw new Error("Input too large");
    chunks.push(chunk);
  }
  const report = summarizeApiLogs(Buffer.concat(chunks).toString("utf8"));
  console.log(JSON.stringify(report));
  process.exitCode = report.needsAttention ? 2 : 0;
}
void main().catch(() => {
  console.error("API log metrics unavailable; verify bounded JSON-line input.");
  process.exitCode = 1;
});

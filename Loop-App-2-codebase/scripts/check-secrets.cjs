/**
 * check-secrets.cjs — lightweight secret scanner committed to CI.
 *
 * Scans every TRACKED file for common hard-coded credentials:
 *   1. Postgres/Supabase connection strings with a literal password
 *   2. Assigned secrets (SERVICE_ROLE/ADMIN/CRON/etc) whose value is not an
 *      obvious placeholder
 *   3. Service-role JWT-shaped tokens in source files
 *   4. The historical incident: personal email addresses lifted into code
 *
 * Local:  npm run check:secrets
 * CI:     runs right after checkout, before any build/test
 * Exit 1 on finding (never edits files; fix in source).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const PLACEHOLDER_VALUES = new Set([
  "",
  "your-supabase-service-role-key",
  "your-cleanup-cron-secret-token",
  "your-cron-secret-token",
  "your-admin-stats-secret-token",
  "test-anon-key",
]);

// File extensions scanned. Docs (.md) are skipped to avoid false-positives from
// documented examples; the pattern corpus is intentionally conservative.
const SCANNABLE = /\.(ts|tsx|js|mjs|cjs|json|yml|yaml|sql|sh|env)$/;

const PATTERNS = [
  {
    id: "postgres-url-password",
    re: /(postgres(?:ql)?:\/\/[^\s"'`]*:)\/?[^@\s"'`<>]+@/i,
    hint: "connection string containing a literal password",
    // Skip documented placeholders like <password>@ / <project-ref>.
    allowed: (line) => line.includes("<password>") || line.includes("<project-ref>") || line.includes("your-"),
  },
  {
    id: "assigned-secret",
    re: /\b(SUPABASE_SERVICE_ROLE_KEY|ADMIN_STATS_SECRET|CLEANUP_CRON_SECRET|CRON_SECRET|EXTERNAL_EMAIL_WHITELIST|PASSWORD|SECRET_TOKEN)\s*=\s*(["']?)(.+?)\2\s*$/,
    hint: "hard-coded secret assignment",
    allowed: (line, match) => {
      const value = match && match[3] ? match[3].trim() : "";
      if (PLACEHOLDER_VALUES.has(value.toLowerCase())) return true;
      if (value.startsWith("process.env.") || value === `\${process.env.`) return true;
      if (value.startsWith("<") && value.endsWith(">")) return true; // <placeholder>
      if (/^your-/.test(value.toLowerCase())) return true;
      return false;
    },
  },
  {
    id: "jwt-shaped-token",
    re: /ey[A-Za-z0-9_-]{30,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/,
    hint: "JWT-shaped token in source (likely a Supabase service/anon key)",
    allowed: null,
  },
  {
    id: "personal-email",
    re: /[A-Za-z0-9._%+-]*sanjay[A-Za-z0-9._%+-]*@(?!vitapstudent\.ac\.in|vitap\.ac\.in)[a-z0-9.]+\.[a-z]{2,}/i,
    hint: "personal email (outside whitelist domains) in committed source",
    allowed: null,
  },
];

function gitRoot() {
  try {
    return execSync("git rev-parse --show-toplevel", { encoding: "utf8" }).trim();
  } catch {
    return process.cwd();
  }
}

function main() {
  const root = gitRoot();
  const rel = process.cwd() !== root ? path.relative(root, process.cwd()) : "";

  const tracked = execSync("git ls-files -z", { encoding: "utf8", cwd: root })
    .split("\0")
    .map((f) => (rel ? path.join(rel, f) : f))
    .filter(Boolean);

  let findings = 0;
  for (const file of tracked) {
    if (!SCANNABLE.test(file)) continue;
    const abs = path.join(root, file);
    let content;
    try {
      content = fs.readFileSync(abs, "utf8");
    } catch {
      continue;
    }
    const lines = content.split(/\r?\n/);
    lines.forEach((line, i) => {
      for (const p of PATTERNS) {
        const m = line.match(p.re);
        if (!m) continue;
        if (p.allowed && p.allowed(line, m)) continue;
        console.error(`::error::[check-secrets] ${file}:${i + 1} ${p.id}: ${p.hint}`);
        console.error(`  -> ${line.trim().slice(0, 160)}`);
        findings++;
      }
    });
  }

  if (findings > 0) {
    console.error(`\ncheck-secrets: ${findings} finding(s). Remove the secret from source and rotate it.`);
    process.exit(1);
  }
  console.log("check-secrets: ok (no hard-coded secrets found in tracked files)");
}

main();

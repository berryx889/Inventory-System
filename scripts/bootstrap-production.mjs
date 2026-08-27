import { config } from "dotenv";
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const secretFile = ".env.production.local";
if (!existsSync(secretFile)) {
  console.error(`${secretFile} is missing. Copy .env.production.example to ${secretFile} and enter the rotated secrets.`);
  process.exit(1);
}
config({ path: secretFile, override: true, quiet: true });

const required = ["DATABASE_URL", "DIRECT_URL", "SESSION_SECRET", "SEED_ADMIN_EMAIL", "SEED_ADMIN_PASSWORD"];
for (const name of required) {
  if (!process.env[name]) {
    console.error(`${name} is missing from ${secretFile}.`);
    process.exit(1);
  }
}
if (!/^postgres(ql)?:\/\//.test(process.env.DATABASE_URL) || !/^postgres(ql)?:\/\//.test(process.env.DIRECT_URL)) {
  console.error("DATABASE_URL and DIRECT_URL must start with postgresql:// or postgres://.");
  process.exit(1);
}
if (process.env.DIRECT_URL.includes("-pooler")) {
  console.error("DIRECT_URL must be the direct Neon URL and must not contain -pooler.");
  process.exit(1);
}
if (process.env.SESSION_SECRET.length < 32) {
  console.error("SESSION_SECRET must contain at least 32 characters.");
  process.exit(1);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", env: process.env });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

console.log("Applying production database migrations...");
const pooledUrl = process.env.DATABASE_URL;
process.env.DATABASE_URL = process.env.DIRECT_URL;
run("npx", ["prisma", "migrate", "deploy"]);
process.env.DATABASE_URL = pooledUrl;
console.log("Creating or rotating the production administrator...");
run("npx", ["prisma", "db", "seed"]);
console.log("Production database bootstrap complete.");

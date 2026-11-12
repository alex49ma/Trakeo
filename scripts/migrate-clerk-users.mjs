// Moves the users of the Clerk era to Better Auth (phase 4 of ../SDD/better-auth-migration/, section 6).
//
//   node scripts/migrate-clerk-users.mjs --csv <Clerk export.csv>            dry run: reads, prints what it would do
//   node scripts/migrate-clerk-users.mjs --csv <Clerk export.csv> --apply    writes, in one database transaction
//
// For every Clerk user that has a row in `users` (found by clerkUserId, so all their data stays linked):
//   - email: confirmed when Clerk had it verified; a different email in Clerk is only reported
//   - name: rebuilt when empty or "null" (D21)
//   - picture: a Clerk-hosted imageUrl (img.clerk.com) is replaced by the Google picture, or cleared
//   - password: Clerk's bcrypt hash becomes a "credential" sign-in (lib/password.js verifies it); never overwrites one
//   - Google: each Google account becomes a "google" sign-in, keyed by Google's user id
// Clerk users without a row are skipped (they have no data; your decision, revision 6). Running it twice changes
// nothing. It prints counts and problems, never a password hash. Reads DATABASE_URL and CLERK_SECRET_KEY from .env.
import fs from "node:fs";
import { randomUUID } from "node:crypto";
import "dotenv/config";
import pg from "pg";
import Papa from "papaparse";

const args = process.argv.slice(2);
const apply = args.includes("--apply");
const csvPath = args[args.indexOf("--csv") + 1];
if (!args.includes("--csv") || !csvPath) {
    console.error("Usage: node scripts/migrate-clerk-users.mjs --csv <Clerk export.csv> [--apply]");
    process.exit(1);
}

const env = (name) => {
    const value = process.env[name]?.replace(/^["']|["']$/g, "");
    if (!value) throw new Error(`${name} is not set`);
    return value;
};

// --- Clerk: the export (password hashes) and the API (Google accounts, verified emails, names) ---

const exported = new Map(
    Papa.parse(fs.readFileSync(csvPath, "utf8"), { header: true, skipEmptyLines: true }).data.map((row) => [row.id, row])
);

async function fetchClerkUsers() {
    const users = [];
    for (let offset = 0; ; offset += 100) {
        const res = await fetch(`https://api.clerk.com/v1/users?limit=100&offset=${offset}&order_by=created_at`, {
            headers: { Authorization: `Bearer ${env("CLERK_SECRET_KEY")}` },
        });
        if (!res.ok) throw new Error(`Clerk API answered ${res.status}: ${await res.text()}`);
        const page = await res.json();
        users.push(...page);
        if (page.length < 100) return users;
    }
}

const isClerkHosted = (url) => {
    try {
        return /(^|\.)clerk\.(com|dev)$/.test(new URL(url).hostname);
    } catch {
        return false;
    }
};

const BROKEN_NAME = /^\s*$|(^|\s)(null|undefined)(\s|$)/;

function cleanName(current, clerkUser, email) {
    if (current && !BROKEN_NAME.test(current)) return current;
    const fromClerk = [clerkUser.first_name, clerkUser.last_name].filter((part) => part && part !== "null").join(" ").trim();
    return fromClerk || email.split("@")[0];
}

// --- Plan one user ---

function planUser(clerkUser, row, existingSignIns) {
    const primary = clerkUser.email_addresses.find((address) => address.id === clerkUser.primary_email_address_id);
    const clerkEmail = primary?.email_address?.toLowerCase();
    const plan = { email: row.email, changes: [], notes: [], userUpdate: {}, inserts: [] };

    if (clerkEmail && clerkEmail !== row.email.toLowerCase()) {
        plan.notes.push(`Clerk's primary email is ${clerkEmail}; kept ${row.email}`);
    }

    if (!row.emailVerified && primary?.verification?.status === "verified" && clerkEmail === row.email.toLowerCase()) {
        plan.userUpdate.emailVerified = true;
        plan.changes.push("email marked as confirmed");
    }

    const name = cleanName(row.name, clerkUser, row.email);
    if (name !== row.name) {
        plan.userUpdate.name = name;
        plan.changes.push(`name "${row.name ?? ""}" -> "${name}"`);
    }

    const googleAccounts = (clerkUser.external_accounts ?? []).filter((account) => account.provider === "oauth_google");

    if (row.imageUrl && isClerkHosted(row.imageUrl)) {
        // image_url is Clerk's own copy (img.clerk.com); avatar_url and picture are Google's original
        const picture = googleAccounts
            .flatMap((account) => [account.avatar_url, account.picture, account.image_url])
            .find((url) => url && !isClerkHosted(url));
        plan.userUpdate.imageUrl = picture ?? null;
        plan.changes.push(picture ? "Clerk-hosted picture replaced by the Google one" : "Clerk-hosted picture cleared");
    }

    const mine = existingSignIns.filter((signIn) => signIn.userId === row.id);

    const csv = exported.get(clerkUser.id);
    if (csv?.password_digest) {
        if (csv.password_hasher !== "bcrypt") {
            plan.notes.push(`password hashed with "${csv.password_hasher}", not bcrypt: not imported (Forgot password still works)`);
        } else if (mine.some((signIn) => signIn.providerId === "credential")) {
            plan.notes.push("already has a Better Auth password: Clerk's hash not imported");
        } else {
            plan.inserts.push({ providerId: "credential", accountId: row.id, password: csv.password_digest });
            plan.changes.push("password imported (bcrypt)");
        }
    } else if (clerkUser.password_enabled) {
        plan.notes.push("Clerk says it has a password, but the export has no hash: not imported");
    }

    for (const account of googleAccounts) {
        const sub = account.provider_user_id;
        const taken = existingSignIns.find((signIn) => signIn.providerId === "google" && signIn.accountId === sub);
        if (!sub) plan.notes.push("a Google account without Google's user id: skipped");
        else if (taken?.userId === row.id) plan.notes.push("Google already linked");
        else if (taken) plan.notes.push("PROBLEM: this Google account is linked to another user: skipped");
        else {
            plan.inserts.push({ providerId: "google", accountId: sub, password: null });
            plan.changes.push("Google linked");
        }
    }

    return plan;
}

// --- Run ---

const client = new pg.Client({ connectionString: env("DATABASE_URL"), ssl: { rejectUnauthorized: false } });
await client.connect();

try {
    const clerkUsers = await fetchClerkUsers();
    const { rows: users } = await client.query(`select id, "clerkUserId", email, name, "imageUrl", "emailVerified" from users`);
    const { rows: signIns } = await client.query(`select "userId", "providerId", "accountId" from auth_accounts`);

    console.log(`${apply ? "APPLY" : "DRY RUN (nothing is written)"}: ${clerkUsers.length} Clerk users, ${exported.size} rows in the export, ${users.length} rows in users\n`);

    const plans = [];
    for (const clerkUser of clerkUsers) {
        const row = users.find((user) => user.clerkUserId === clerkUser.id);
        const email = clerkUser.email_addresses.find((address) => address.id === clerkUser.primary_email_address_id)?.email_address;
        if (!row) {
            console.log(`- ${email}: skipped, no row in users (no data)`);
            continue;
        }
        const plan = planUser(clerkUser, row, signIns);
        plans.push({ row, plan });
        console.log(`- ${row.email}`);
        for (const change of plan.changes) console.log(`    change: ${change}`);
        for (const note of plan.notes) console.log(`    note:   ${note}`);
        if (!plan.changes.length) console.log("    nothing to change");
    }

    const clerkIds = new Set(clerkUsers.map((user) => user.id));
    for (const user of users) {
        if (user.clerkUserId && !clerkIds.has(user.clerkUserId)) console.log(`- ${user.email}: has a clerkUserId that Clerk doesn't know (left alone)`);
        if (!user.clerkUserId) console.log(`- ${user.email}: created by Better Auth, not from Clerk (left alone)`);
    }

    if (apply) {
        await client.query("begin");
        const now = new Date();
        for (const { row, plan } of plans) {
            const fields = Object.entries(plan.userUpdate);
            if (fields.length) {
                const sets = fields.map(([column], index) => `"${column}" = $${index + 2}`).join(", ");
                await client.query(`update users set ${sets}, "updatedAt" = now() where id = $1`, [row.id, ...fields.map(([, value]) => value)]);
            }
            for (const insert of plan.inserts) {
                await client.query(
                    `insert into auth_accounts (id, "accountId", "providerId", "userId", password, "createdAt", "updatedAt")
                     values ($1, $2, $3, $4, $5, $6, $6) on conflict ("providerId", "accountId") do nothing`,
                    [randomUUID(), insert.accountId, insert.providerId, row.id, insert.password, now]
                );
            }
        }
        await client.query("commit");
        console.log("\nWritten.");
    }

    const { rows: [{ missing }] } = await client.query(`select count(*)::int as missing from users where name is null or btrim(name) = ''`);
    console.log(`\nUsers without a name: ${missing}${missing ? " (the users_name_required migration must wait)" : ""}`);
} catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
} finally {
    await client.end();
}

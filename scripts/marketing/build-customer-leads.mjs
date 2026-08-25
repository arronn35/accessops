#!/usr/bin/env node

import fs from "node:fs/promises";

const DEFAULT_PRIMARY = "docs/marketing/leads.json";
const DEFAULT_ADDITIONAL = "docs/marketing/customer-leads-additional.json";
const DEFAULT_JSON_OUTPUT = "docs/marketing/customer-leads-100.json";
const DEFAULT_CSV_OUTPUT = "docs/marketing/customer-leads-100.csv";
const DEFAULT_LIMIT = 100;

function argValue(flag, fallback) {
  const index = process.argv.indexOf(flag);
  return index >= 0 && process.argv[index + 1] ? process.argv[index + 1] : fallback;
}

function csvEscape(value) {
  const str = value == null ? "" : String(value);
  return /[",\n\r]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
}

function emailPriority(type) {
  if (type === "role") return 4;
  if (type === "sales" || type === "partnerships") return 3;
  if (type === "support") return 2;
  return 1;
}

function leadPriority(lead) {
  const segmentBoost = lead.segment === "agency" ? 4 : 3;
  return (Number(lead.fit_score) || 0) + emailPriority(lead.email_type) * 2 + segmentBoost;
}

function renumber(leads) {
  const counters = { agency: 0, ecommerce: 0 };
  return leads.map((lead) => {
    const segment = lead.segment === "agency" ? "agency" : "ecommerce";
    counters[segment] += 1;
    const prefix = segment === "agency" ? "CUS-AG" : "CUS-EC";
    const leadId = `${prefix}-${String(counters[segment]).padStart(3, "0")}`;
    return {
      ...lead,
      lead_id: leadId,
      qualification_status: Number(lead.fit_score) >= 70 ? "qualified_public_contact" : "review_before_sending",
    };
  });
}

const primaryPath = argValue("--primary", DEFAULT_PRIMARY);
const additionalPath = argValue("--additional", DEFAULT_ADDITIONAL);
const jsonOutputPath = argValue("--json", DEFAULT_JSON_OUTPUT);
const csvOutputPath = argValue("--csv", DEFAULT_CSV_OUTPUT);
const limit = Number(argValue("--limit", DEFAULT_LIMIT));

const primary = JSON.parse(await fs.readFile(primaryPath, "utf8"));
const additional = JSON.parse(await fs.readFile(additionalPath, "utf8"));
const byEmail = new Map();

for (const lead of [...primary, ...additional]) {
  const key = String(lead.contact_email).toLowerCase();
  if (!key) continue;
  const existing = byEmail.get(key);
  if (!existing || leadPriority(lead) > leadPriority(existing)) byEmail.set(key, lead);
}

const sorted = [...byEmail.values()].sort((a, b) => leadPriority(b) - leadPriority(a));
const selected = renumber(sorted.slice(0, limit));

const headers = [
  "lead_id",
  "company_name",
  "website",
  "country",
  "segment",
  "platform_hint",
  "contact_email",
  "email_type",
  "source_url",
  "source_context",
  "fit_score",
  "personalization_hook",
  "outreach_angle",
  "status",
  "qualification_status",
  "compliance_notes",
  "last_verified_at",
];

await fs.writeFile(jsonOutputPath, `${JSON.stringify(selected, null, 2)}\n`);
await fs.writeFile(
  csvOutputPath,
  `${headers.join(",")}\n${selected.map((row) => headers.map((key) => csvEscape(row[key])).join(",")).join("\n")}\n`,
);

const summary = selected.reduce(
  (acc, lead) => {
    acc.count += 1;
    acc.bySegment[lead.segment] = (acc.bySegment[lead.segment] ?? 0) + 1;
    acc.byEmailType[lead.email_type] = (acc.byEmailType[lead.email_type] ?? 0) + 1;
    return acc;
  },
  { count: 0, bySegment: {}, byEmailType: {} },
);

console.log(JSON.stringify(summary, null, 2));

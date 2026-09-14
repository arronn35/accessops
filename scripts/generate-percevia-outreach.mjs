import { readFile, writeFile } from "node:fs/promises";

const inputPath = new URL("../reports/percevia-apollo-prospects-2026-09-09.csv", import.meta.url);
const enrichedPath = new URL("../reports/percevia-apollo-enriched-contacts-2026-09-09.csv", import.meta.url);
const outputPath = new URL("../reports/percevia-personalized-outreach-2026-09-09.csv", import.meta.url);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (quoted && char === '"' && next === '"') {
      field += '"';
      index += 1;
    } else if (char === '"') {
      quoted = !quoted;
    } else if (char === "," && !quoted) {
      row.push(field);
      field = "";
    } else if (char === "\n" && !quoted) {
      row.push(field.replace(/\r$/, ""));
      if (row.some((value) => value.length > 0)) rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }

  if (field.length > 0 || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [headers, ...values] = rows;
  return values.map((cells) => Object.fromEntries(headers.map((header, index) => [header, cells[index] ?? ""])));
}

function csvCell(value) {
  return `"${String(value).replaceAll('"', '""')}"`;
}

function variantFor(id, options) {
  let hash = 0;
  for (const char of id) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return options[hash % options.length];
}

const messages = {
  agency: {
    subject: (firstName, organization) => `${firstName}, a quick idea for ${organization}`,
    problem: () => "A common problem for agencies is that accessibility scanners produce long lists of issues, but not something a client can easily understand or act on.",
    value: "I am working on Percevia AI to make that process more useful: scan an authorized site, organize the findings, guide the fixes, and turn the work into a clear client-ready report. It is focused on real remediation—not overlays or vague compliance promises.",
    cta: "Would you be open to a quick 15-minute look? We could try it with one client site you are authorized to test and see whether it fits the way your team works.",
  },
  ecommerce: {
    subject: (firstName, organization) => `${firstName}, accessibility checks for ${organization}'s storefront`,
    problem: (organization) => `For ecommerce teams at ${organization}, small accessibility regressions in navigation, product pages, forms, or checkout can quietly create friction in revenue-critical journeys.`,
    value: "Percevia AI helps teams scan key pages, prioritize findings, track remediation, and monitor regressions over time. The output is engineering-ready and explicitly avoids overlay-only fixes or unsupported compliance promises.",
    cta: "Would it be useful to run a short pilot against a storefront flow you are authorized to test?",
  },
  product: {
    subject: (firstName, organization) => `${firstName}, a clearer accessibility backlog for ${organization}`,
    problem: (organization) => `Product teams at ${organization} may already find accessibility issues, but converting scanner output into an owned, prioritized release backlog is usually the harder part.`,
    value: "Percevia AI pairs privacy-first scanning with remediation guidance, manual-review checkpoints, regression monitoring, and shared workflows that product and engineering teams can use together.",
    cta: "Would you be open to a 15-minute look at how this could fit into your release workflow?",
  },
  founder: {
    subject: (firstName, organization) => `${firstName}, a practical accessibility workflow for ${organization}`,
    problem: (organization) => `Early teams at ${organization} need a credible accessibility practice, but hiring a dedicated specialist or building an internal system is rarely realistic at the start.`,
    value: "Percevia AI offers an affordable way to scan authorized websites, understand findings, organize remediation, and produce transparent reports—without claiming automated certification or relying on an overlay.",
    cta: "Would a quick walkthrough on one of your public product pages be useful?",
  },
  engineering: {
    subject: (firstName, organization) => `${firstName}, actionable accessibility findings for ${organization}`,
    problem: (organization) => `Engineering teams at ${organization} do not need another raw scanner dump—they need reproducible findings, clear remediation guidance, and a way to see what regressed between releases.`,
    value: "Percevia AI turns authorized website scans into prioritized findings, implementation guidance, manual-review tasks, exports, and regression monitoring while keeping automated-check limitations explicit.",
    cta: "Would you be open to reviewing a sample engineering report or testing one authorized URL together?",
  },
  freelancer: {
    subject: (firstName) => `${firstName}, add accessibility audits to your client work`,
    problem: () => "Independent web professionals are increasingly asked about accessibility, yet building a repeatable audit, remediation, and reporting workflow from scratch can consume the margin on a project.",
    value: "Percevia AI helps freelancers scan authorized client sites, explain issues, organize fixes, and deliver professional reports. It supports real remediation and is careful not to present automated results as legal certification.",
    cta: "Would you be open to a 15-minute walkthrough to see whether it could become a useful client-service add-on?",
  },
};

const openings = [
  (title, organization) => `I was looking at people who are closely involved in web delivery, and your role as ${title} at ${organization} caught my attention.`,
  (title, organization) => `I came across ${organization} while looking for teams that care about the quality of the websites they ship. Since you are the ${title}, I thought this might be relevant to you.`,
  (title, organization) => `I was researching teams that build and improve web experiences, and I came across your work as ${title} at ${organization}.`,
];

const softCloses = [
  "If it is not something you are thinking about right now, no worries at all.",
  "If someone else owns accessibility on your side, I would be grateful if you pointed me in the right direction. Either way, no pressure.",
  "If the timing is not right, no problem—I am happy to leave it here.",
];

function buildEmail(person) {
  const segment = messages[person.segment];
  const firstName = person.first_name.trim();
  const organization = person.organization_name.trim() || "your team";
  const title = person.job_title.trim() || "team leader";
  const opening = variantFor(person.apollo_person_id, openings)(title, organization);
  const softClose = variantFor(`${person.apollo_person_id}-close`, softCloses);
  const subject = segment.subject(firstName, organization);
  const body = [
    `Hi ${firstName},`,
    "",
    opening,
    "",
    segment.problem(organization),
    "",
    segment.value,
    "",
    segment.cta,
    "",
    softClose,
    "",
    "Best,",
    "Efe",
    "maitrico. - percevia",
  ].join("\n");

  return { ...person, subject, email_body: body };
}

const input = await readFile(inputPath, "utf8");
const people = parseCsv(input);
const enriched = parseCsv(await readFile(enrichedPath, "utf8"));
const enrichedById = new Map(enriched.map((person) => [person.apollo_person_id, person]));
const outreach = people.map((person) => {
  const match = enrichedById.get(person.apollo_person_id);
  if (!match?.recipient_email) {
    throw new Error(`Missing enriched email for Apollo person ${person.apollo_person_id}`);
  }

  return buildEmail({
    ...person,
    first_name: match.first_name || person.first_name,
    last_name: match.last_name,
    full_name: match.full_name,
    job_title: match.job_title || person.job_title,
    organization_name: match.organization_name || person.organization_name,
    recipient_email: match.recipient_email,
    email_status: match.email_status,
  });
});
const headers = [
  "segment",
  "priority_score",
  "apollo_person_id",
  "first_name",
  "last_name",
  "full_name",
  "recipient_email",
  "email_status",
  "job_title",
  "organization_name",
  "subject",
  "email_body",
  "send_status",
];
const lines = [headers.join(",")];

for (const message of outreach) {
  lines.push(headers.map((header) => csvCell(header === "send_status" ? "draft_not_sent" : message[header] ?? "")).join(","));
}

await writeFile(outputPath, `${lines.join("\n")}\n`, "utf8");
console.log(`Generated ${outreach.length} personalized drafts at ${outputPath.pathname}`);

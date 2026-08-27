import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import ts from "typescript";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });

const apiKey = process.env.OPENAI_API_KEY;
if (!apiKey) throw new Error("OPENAI_API_KEY is required");

const ROOTS = ["src/app", "src/components"];
const OUTPUT = "src/lib/i18n/translations.tr.json";
const CACHE = "/private/tmp/accessops-i18n-translations.json";
const MODEL = process.env.OPENAI_MODEL || "gpt-5.3-codex";
const BATCH_SIZE = 55;
const TRANSLATABLE_ATTRIBUTES = new Set([
  "alt",
  "aria-description",
  "aria-label",
  "placeholder",
  "title",
]);

function walk(directory, files = []) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, files);
    else if (entry.name.endsWith(".tsx")) files.push(target);
  }
  return files;
}

function decodeEntities(value) {
  return value
    .replaceAll("&amp;", "&")
    .replaceAll("&apos;", "'")
    .replaceAll("&#39;", "'")
    .replaceAll("&quot;", '"')
    .replaceAll("&ldquo;", "“")
    .replaceAll("&rdquo;", "”")
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">");
}

function normalize(value) {
  return decodeEntities(value).replace(/\s+/g, " ").trim();
}

function looksLikeClassList(value) {
  const tokens = value.trim().split(/\s+/);
  if (tokens.length < 2) return false;
  const utilityTokens = tokens.filter((token) =>
    /(?:^|:)(?:bg|text|font|ring|border|rounded|shadow|flex|grid|items|justify|gap|space|p[trblxy]?|m[trblxy]?|w|h|min|max|size|overflow|focus|hover|sm|md|lg|xl)-/.test(
      token
    )
  );
  return utilityTokens.length / tokens.length > 0.35;
}

function shouldIncludeLiteral(node, value) {
  const text = normalize(value);
  if (text.length < 2 || text.length > 240 || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(text)) return false;
  if (/^(?:https?:|mailto:|\/|#|\.|[a-z]+\/[a-z])/.test(text)) return false;
  if (/^(?:GET|POST|PUT|PATCH|DELETE|application\/|text\/)/.test(text)) return false;
  if (looksLikeClassList(text)) return false;

  const parent = node.parent;
  if (
    ts.isImportDeclaration(parent) ||
    ts.isExportDeclaration(parent) ||
    ts.isLiteralTypeNode(parent) ||
    ts.isPropertyAssignment(parent) && parent.name === node ||
    ts.isPropertySignature(parent) && parent.name === node ||
    ts.isElementAccessExpression(parent) ||
    ts.isCallExpression(parent) && parent.expression.getText().includes("className")
  ) {
    return false;
  }

  if (ts.isJsxAttribute(parent)) {
    return TRANSLATABLE_ATTRIBUTES.has(parent.name.getText());
  }

  return /\s/.test(text) || /^[A-ZÇĞİÖŞÜ]/.test(text);
}

function extractMessages() {
  const messages = new Set();
  const add = (value) => {
    const text = normalize(value);
    if (text) messages.add(text);
  };

  for (const file of ROOTS.flatMap((root) => walk(root))) {
    const sourceText = fs.readFileSync(file, "utf8");
    const source = ts.createSourceFile(
      file,
      sourceText,
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX
    );

    const visit = (node) => {
      if (ts.isJsxText(node)) add(node.text);
      else if (
        (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) &&
        shouldIncludeLiteral(node, node.text)
      ) {
        add(node.text);
      } else if (ts.isTemplateExpression(node)) {
        add(node.head.text);
        for (const span of node.templateSpans) add(span.literal.text);
      }
      ts.forEachChild(node, visit);
    };
    visit(source);
  }

  return [...messages].sort((a, b) => a.localeCompare(b, "en"));
}

function responseText(payload) {
  return (payload.output ?? [])
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("");
}

async function translateBatch(messages) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: MODEL,
      max_output_tokens: 16_384,
      input: [
        {
          role: "system",
          content:
            "You are a senior Turkish product localization editor. Translate every supplied user-interface string from English to natural, concise Turkish. Preserve punctuation, placeholders, numbers, markup fragments, and the original capitalization intent. If a string is already Turkish, return it unchanged. Preserve these technical/product terms exactly: Percevia AI, maitrico, WCAG, ADA, EAA, Section 508, EN 301 549, WAI-ARIA, ARIA, API, URL, HTML, CSS, JavaScript, TypeScript, React, Next.js, Shopify, WordPress, Webflow, Framer, Firebase, Vercel, OpenAI, GPT, JSON, PDF, SSRF, DNS, OAuth, GitHub, Cloud Run. Do not add explanations.",
        },
        {
          role: "user",
          content: JSON.stringify(messages),
        },
      ],
      text: {
        format: {
          type: "json_schema",
          name: "turkish_ui_translations",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            properties: {
              translations: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  properties: {
                    source: { type: "string" },
                    target: { type: "string" },
                  },
                  required: ["source", "target"],
                },
              },
            },
            required: ["translations"],
          },
        },
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(`OpenAI translation failed (${response.status}): ${payload.error?.message ?? "unknown error"}`);
  }
  const parsed = JSON.parse(responseText(payload));
  const translations = Object.fromEntries(
    parsed.translations.map(({ source, target }) => [normalize(source), normalize(target)])
  );
  for (const source of messages) {
    if (!translations[source]) throw new Error(`Missing translation: ${source}`);
  }
  return translations;
}

const messages = extractMessages();
const catalog = fs.existsSync(CACHE)
  ? JSON.parse(fs.readFileSync(CACHE, "utf8"))
  : {};
const pending = messages.filter((message) => !catalog[message]);

console.log(`Extracted ${messages.length} messages; ${pending.length} need translation.`);
for (let index = 0; index < pending.length; index += BATCH_SIZE) {
  const batch = pending.slice(index, index + BATCH_SIZE);
  const translated = await translateBatch(batch);
  Object.assign(catalog, translated);
  fs.writeFileSync(CACHE, `${JSON.stringify(catalog, null, 2)}\n`);
  console.log(`Translated ${Math.min(index + batch.length, pending.length)}/${pending.length}.`);
}

const output = Object.fromEntries(messages.map((message) => [message, catalog[message]]));
fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
fs.writeFileSync(OUTPUT, `${JSON.stringify(output, null, 2)}\n`);
console.log(`Wrote ${Object.keys(output).length} translations to ${OUTPUT}.`);

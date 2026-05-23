export interface ScanSummary {
  id: string;
  url: string;
  domain: string;
  scanType: "single" | "multi" | "sitemap" | "manual";
  startedAt: string; // ISO
  durationSec: number;
  pagesScanned: number;
  score: number; // 0–100
  issues: { critical: number; moderate: number; minor: number };
  status: "complete" | "running" | "failed";
  triggeredBy: string;
}

export const scans: ScanSummary[] = [
  {
    id: "sc_2025_05_12",
    url: "https://northwind-shop.example",
    domain: "northwind-shop.example",
    scanType: "multi",
    startedAt: "2026-05-17T09:14:00Z",
    durationSec: 184,
    pagesScanned: 47,
    score: 78,
    issues: { critical: 5, moderate: 11, minor: 7 },
    status: "complete",
    triggeredBy: "Eli M.",
  },
  {
    id: "sc_2025_04_28",
    url: "https://northwind-shop.example",
    domain: "northwind-shop.example",
    scanType: "multi",
    startedAt: "2026-05-04T15:02:00Z",
    durationSec: 172,
    pagesScanned: 44,
    score: 71,
    issues: { critical: 8, moderate: 14, minor: 9 },
    status: "complete",
    triggeredBy: "Priya S.",
  },
  {
    id: "sc_2025_04_10",
    url: "https://northwind-shop.example",
    domain: "northwind-shop.example",
    scanType: "sitemap",
    startedAt: "2026-04-22T11:30:00Z",
    durationSec: 240,
    pagesScanned: 62,
    score: 64,
    issues: { critical: 12, moderate: 18, minor: 13 },
    status: "complete",
    triggeredBy: "Eli M.",
  },
];

export const latestScan = scans[0];

export function getScan(id: string): ScanSummary | undefined {
  return scans.find((s) => s.id === id) ?? latestScan;
}

export const scoreTrend = [
  { date: "Jan", score: 52 },
  { date: "Feb", score: 58 },
  { date: "Mar", score: 61 },
  { date: "Apr", score: 71 },
  { date: "May", score: 78 },
];

export const categoryDistribution = [
  { category: "Contrast", count: 6 },
  { category: "ARIA", count: 4 },
  { category: "Form labels", count: 3 },
  { category: "Keyboard", count: 3 },
  { category: "Headings", count: 2 },
  { category: "Alt text", count: 3 },
  { category: "Link names", count: 2 },
];

export const pagesAffected = [
  { path: "/", title: "Home", critical: 1, moderate: 3, minor: 1, score: 82 },
  { path: "/products/copper-french-press", title: "Copper French Press", critical: 2, moderate: 1, minor: 0, score: 71 },
  { path: "/collections/coffee", title: "Coffee collection", critical: 1, moderate: 2, minor: 1, score: 79 },
  { path: "/checkout", title: "Checkout", critical: 1, moderate: 1, minor: 0, score: 74 },
  { path: "/account", title: "Account dashboard", critical: 0, moderate: 2, minor: 2, score: 86 },
  { path: "/blog", title: "Blog index", critical: 0, moderate: 1, minor: 1, score: 92 },
  { path: "/search", title: "Search results", critical: 0, moderate: 1, minor: 2, score: 90 },
];

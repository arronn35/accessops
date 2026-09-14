import { z } from "zod";

const PageSchema = z.enum([
  "landing",
  "pricing",
  "onboarding",
  "sample_report",
  "solution_agencies",
  "solution_turkiye",
]);

export const ClientAnalyticsEventSchema = z.discriminatedUnion("event", [
  z.object({ event: z.literal("page_viewed"), properties: z.object({ page: PageSchema }).strict() }).strict(),
  z.object({ event: z.literal("public_scan_started"), properties: z.object({ source: z.literal("landing") }).strict() }).strict(),
]);

export type ClientAnalyticsEvent = z.infer<typeof ClientAnalyticsEventSchema>;

export type ServerAnalyticsEvent =
  | { event: "public_scan_completed"; properties: { source: "landing" } }
  // signup_completed means "an account was created". A returning user signing
  // in emits login_completed instead; conflating them inflates the funnel by
  // one signup per session.
  | { event: "signup_completed"; properties: { provider: "firebase" } }
  | { event: "login_completed"; properties: { provider: "firebase" } }
  | { event: "first_scan_completed"; properties: { pagesBucket: "1" | "2-10" | "11+" } }
  | { event: "report_exported"; properties: { format: "html" | "csv" | "json" | "pdf" } }
  | { event: "monitor_created"; properties: { frequency: string } }
  | { event: "checkout_completed"; properties: { plan: string } };

export type AnalyticsEvent = ClientAnalyticsEvent | ServerAnalyticsEvent;

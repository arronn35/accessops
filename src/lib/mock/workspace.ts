export type Role = "owner" | "admin" | "developer" | "auditor" | "client_viewer" | "report_viewer";

export const ROLES: { id: Role; label: string; description: string }[] = [
  { id: "owner", label: "Owner", description: "Full access including billing and workspace deletion." },
  { id: "admin", label: "Admin", description: "Manage scans, team, privacy settings. No billing." },
  { id: "developer", label: "Developer", description: "Run scans, view issues, apply AI fixes, mark tasks done." },
  { id: "auditor", label: "Auditor", description: "Review findings, add manual review notes, export reports." },
  { id: "client_viewer", label: "Client Viewer", description: "View only the scans and reports shared with them." },
  { id: "report_viewer", label: "Report Viewer", description: "View final reports only. No raw scan data." },
];

export const PERMISSIONS = [
  { id: "create_scans", label: "Create scans" },
  { id: "view_scans", label: "View scans" },
  { id: "view_ai", label: "View AI suggestions" },
  { id: "export_reports", label: "Export reports" },
  { id: "manage_billing", label: "Manage billing" },
  { id: "manage_privacy", label: "Manage privacy" },
  { id: "delete_scans", label: "Delete scan data" },
] as const;

export const PERMISSION_MATRIX: Record<Role, Record<(typeof PERMISSIONS)[number]["id"], boolean>> = {
  owner: {
    create_scans: true, view_scans: true, view_ai: true, export_reports: true,
    manage_billing: true, manage_privacy: true, delete_scans: true,
  },
  admin: {
    create_scans: true, view_scans: true, view_ai: true, export_reports: true,
    manage_billing: false, manage_privacy: true, delete_scans: true,
  },
  developer: {
    create_scans: true, view_scans: true, view_ai: true, export_reports: false,
    manage_billing: false, manage_privacy: false, delete_scans: false,
  },
  auditor: {
    create_scans: false, view_scans: true, view_ai: true, export_reports: true,
    manage_billing: false, manage_privacy: false, delete_scans: false,
  },
  client_viewer: {
    create_scans: false, view_scans: true, view_ai: false, export_reports: false,
    manage_billing: false, manage_privacy: false, delete_scans: false,
  },
  report_viewer: {
    create_scans: false, view_scans: false, view_ai: false, export_reports: false,
    manage_billing: false, manage_privacy: false, delete_scans: false,
  },
};

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  initials: string;
  role: Role;
  lastActive: string;
  avatarTone: "navy" | "purple" | "green" | "blue";
}

export const workspace = {
  id: "ws_northwind",
  name: "Northwind Studios",
  type: "Agency" as const,
  region: "EU (Frankfurt)" as const,
  primaryFramework: "Next.js" as const,
  targetStandard: "WCAG 2.2 AA" as const,
  createdAt: "2025-01-14",
  plan: "Agency" as const,
};

export const teamMembers: TeamMember[] = [
  {
    id: "u1",
    name: "Eli Marquez",
    email: "eli@northwindstudios.example",
    initials: "EM",
    role: "owner",
    lastActive: "Just now",
    avatarTone: "purple",
  },
  {
    id: "u2",
    name: "Priya Shah",
    email: "priya@northwindstudios.example",
    initials: "PS",
    role: "admin",
    lastActive: "12 minutes ago",
    avatarTone: "navy",
  },
  {
    id: "u3",
    name: "Jonas Berg",
    email: "jonas@northwindstudios.example",
    initials: "JB",
    role: "developer",
    lastActive: "3 hours ago",
    avatarTone: "blue",
  },
  {
    id: "u4",
    name: "Amara Okafor",
    email: "amara@northwindstudios.example",
    initials: "AO",
    role: "auditor",
    lastActive: "Yesterday",
    avatarTone: "green",
  },
  {
    id: "u5",
    name: "Northwind Shop (client)",
    email: "client@northwind-shop.example",
    initials: "NS",
    role: "client_viewer",
    lastActive: "2 weeks ago",
    avatarTone: "navy",
  },
];

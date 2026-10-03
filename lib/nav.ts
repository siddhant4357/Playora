/**
 * lib/nav.ts
 *
 * Sidebar navigation per role. Pure data (plus lucide icons) so it can be
 * imported from client components. Routes that are not built yet still
 * appear here so the shells show the full shape of the product; their pages
 * render a PagePlaceholder until the matching phase lands.
 */

import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  CalendarDays,
  Users,
  QrCode,
  Kanban,
  Store,
  Boxes,
  PackageCheck,
  Wine,
  ChefHat,
  Receipt,
  BookOpen,
  Clock,
  Wallet,
  FileText,
  Landmark,
  Percent,
  BriefcaseBusiness,
  BarChart3,
  Sparkles,
  Settings,
  ShieldCheck,
  Dumbbell,
  UserCircle,
} from "lucide-react";
import type { Role } from "./roles";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  exact?: boolean;
}

export interface NavSection {
  label: string;
  items: NavItem[];
}

const DESK: NavSection = {
  label: "Front desk",
  items: [
    { label: "Today", href: "/desk", icon: LayoutDashboard, exact: true },
    { label: "Bookings", href: "/desk/bookings", icon: CalendarDays },
    { label: "Members", href: "/desk/members", icon: Users },
    { label: "Check-in", href: "/desk/checkin", icon: QrCode },
    { label: "Leads", href: "/desk/leads", icon: Kanban },
    { label: "Shifts", href: "/desk/shifts", icon: Clock },
  ],
};

const SHOP: NavSection = {
  label: "Shop",
  items: [
    { label: "Counter sale", href: "/shop-pos", icon: Store, exact: true },
    { label: "Inventory", href: "/shop-pos/inventory", icon: Boxes },
    { label: "Orders", href: "/shop-pos/orders", icon: PackageCheck },
  ],
};

const BAR_FULL: NavSection = {
  label: "Bar & cafe",
  items: [
    { label: "POS", href: "/bar/pos", icon: Wine },
    { label: "Kitchen", href: "/bar/kds", icon: ChefHat },
    { label: "Open tabs", href: "/bar/tabs", icon: Receipt },
    { label: "Menu", href: "/bar/menu", icon: BookOpen },
    { label: "Shift", href: "/bar/shift", icon: Clock },
  ],
};

const BAR_STAFF_NAV: NavSection = {
  ...BAR_FULL,
  items: BAR_FULL.items.filter((i) => i.href !== "/bar/menu"),
};

const COACH: NavSection = {
  label: "Coaching",
  items: [
    { label: "My sessions", href: "/coach", icon: Dumbbell, exact: true },
    { label: "Players", href: "/coach/players", icon: Users },
  ],
};

const OWNER_FINANCE: NavSection = {
  label: "Finance",
  items: [
    { label: "Ledger", href: "/owner/finance", icon: Wallet },
    { label: "Invoices", href: "/owner/invoices", icon: FileText },
    { label: "Payables", href: "/owner/payables", icon: Landmark },
    { label: "Tax", href: "/owner/tax", icon: Percent },
  ],
};

const MANAGEMENT = (full: boolean): NavSection => ({
  label: "Management",
  items: [
    { label: "HR & payroll", href: "/owner/hr", icon: BriefcaseBusiness },
    { label: "Reports", href: "/owner/reports", icon: BarChart3 },
    ...(full
      ? [
          { label: "Ask Yolla", href: "/owner/ask", icon: Sparkles },
          { label: "Club settings", href: "/owner/settings", icon: Settings },
          { label: "System health", href: "/admin/health", icon: ShieldCheck },
        ]
      : []),
  ],
});

const ACCOUNT: NavSection = {
  label: "You",
  items: [{ label: "Account", href: "/account", icon: UserCircle }],
};

export function navFor(role: Role): NavSection[] {
  switch (role) {
    case "OWNER":
      return [
        {
          label: "Overview",
          items: [{ label: "Dashboard", href: "/owner", icon: LayoutDashboard, exact: true }],
        },
        DESK,
        SHOP,
        BAR_FULL,
        COACH,
        OWNER_FINANCE,
        MANAGEMENT(true),
        ACCOUNT,
      ];
    case "MANAGER":
      return [DESK, SHOP, BAR_FULL, COACH, MANAGEMENT(false), ACCOUNT];
    case "FRONT_DESK":
      return [DESK, SHOP, ACCOUNT];
    case "BAR_STAFF":
      return [BAR_STAFF_NAV, ACCOUNT];
    case "KITCHEN":
      return [
        { label: "Kitchen", items: [{ label: "Tickets", href: "/bar/kds", icon: ChefHat }] },
        ACCOUNT,
      ];
    case "COACH":
      return [COACH, ACCOUNT];
    case "MEMBER":
    default:
      return [ACCOUNT];
  }
}

/** Bottom tab bar for the member app. */
export const MEMBER_TABS: NavItem[] = [
  { label: "Home", href: "/me", icon: LayoutDashboard, exact: true },
  { label: "Book", href: "/me/book", icon: CalendarDays },
  { label: "Shop", href: "/me/shop", icon: Store },
  { label: "Tab", href: "/me/tab", icon: Receipt },
  { label: "Profile", href: "/me/profile", icon: UserCircle },
];

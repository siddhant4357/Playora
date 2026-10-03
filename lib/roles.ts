/**
 * lib/roles.ts
 *
 * Single source of truth for "who can go where". Imported by middleware
 * (Edge) and by server code, so it must stay free of Prisma / Node imports.
 * The Role union mirrors `enum Role` in prisma/schema.prisma.
 */

export const ROLES = [
  "OWNER",
  "MANAGER",
  "FRONT_DESK",
  "BAR_STAFF",
  "KITCHEN",
  "COACH",
  "MEMBER",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  FRONT_DESK: "Front desk",
  BAR_STAFF: "Bar staff",
  KITCHEN: "Kitchen",
  COACH: "Coach",
  MEMBER: "Member",
};

export const STAFF_ROLES: readonly Role[] = [
  "OWNER",
  "MANAGER",
  "FRONT_DESK",
  "BAR_STAFF",
  "KITCHEN",
  "COACH",
];

/** Where a role lands right after sign-in (and where /app sends them). */
export function homeFor(role: Role): string {
  switch (role) {
    case "OWNER":
      return "/owner";
    case "MANAGER":
    case "FRONT_DESK":
      return "/desk";
    case "BAR_STAFF":
      return "/bar/pos";
    case "KITCHEN":
      return "/bar/kds";
    case "COACH":
      return "/coach";
    case "MEMBER":
    default:
      return "/me";
  }
}

/**
 * Route prefixes that require a session. Anything not listed here is public.
 * Order does not matter; matching is by longest prefix in `canAccess`.
 */
const ACCESS: Record<string, readonly Role[]> = {
  "/me": ["MEMBER", "OWNER"],
  "/desk": ["FRONT_DESK", "MANAGER", "OWNER"],
  "/shop-pos": ["FRONT_DESK", "MANAGER", "OWNER"],
  "/bar": ["BAR_STAFF", "MANAGER", "OWNER"],
  "/bar/kds": ["KITCHEN", "BAR_STAFF", "MANAGER", "OWNER"],
  "/bar/menu": ["MANAGER", "OWNER"],
  "/coach": ["COACH", "MANAGER", "OWNER"],
  "/owner": ["OWNER"],
  "/owner/hr": ["MANAGER", "OWNER"],
  "/owner/reports": ["MANAGER", "OWNER"],
  "/admin": ["OWNER"],
  "/display": ["FRONT_DESK", "MANAGER", "OWNER"],
  "/account": [...ROLES],
};

const PROTECTED_PREFIXES = Object.keys(ACCESS).sort((a, b) => b.length - a.length);

function matchPrefix(pathname: string): string | null {
  for (const prefix of PROTECTED_PREFIXES) {
    if (pathname === prefix || pathname.startsWith(prefix + "/")) return prefix;
  }
  return null;
}

/** True when the path needs a signed-in user at all. */
export function isProtectedPath(pathname: string): boolean {
  return matchPrefix(pathname) !== null;
}

/** True when `role` may open `pathname`. Public paths always return true. */
export function canAccess(role: Role | null | undefined, pathname: string): boolean {
  const prefix = matchPrefix(pathname);
  if (!prefix) return true;
  if (!role) return false;
  return ACCESS[prefix].includes(role);
}

export function isStaff(role: Role): boolean {
  return STAFF_ROLES.includes(role);
}

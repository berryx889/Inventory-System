import type { Role } from "@prisma/client";
import { AppError } from "./http";

export type Permission =
  | "inventory:read" | "inventory:manage" | "stock:issue" | "stock:receive"
  | "stock:return" | "stock:adjust" | "reports:read" | "reports:export"
  | "employees:manage" | "clients:manage" | "users:manage" | "audit:read";

const rolePermissions: Record<Role, ReadonlySet<Permission>> = {
  ADMIN: new Set<Permission>(["inventory:read", "inventory:manage", "stock:issue", "stock:receive", "stock:return", "stock:adjust", "reports:read", "reports:export", "employees:manage", "clients:manage", "users:manage", "audit:read"]),
  WAREHOUSE_OFFICER: new Set<Permission>(["inventory:read", "stock:issue", "stock:receive", "stock:return", "reports:read"]),
  MANAGER: new Set<Permission>(["inventory:read", "reports:read", "reports:export", "audit:read"]),
  STAFF: new Set<Permission>(["inventory:read"]),
};

export function requirePermission(role: Role, permission: Permission) {
  if (!rolePermissions[role].has(permission)) {
    throw new AppError(403, "FORBIDDEN", "You do not have permission to perform this action.");
  }
}

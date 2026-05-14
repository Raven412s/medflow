import { Permission } from "@/lib/constants";
import { auth } from "@/auth";

// Use in server components and server actions
export async function checkPermission(
  permission: Permission
): Promise<boolean> {
  const session = await auth();
  if (!session?.user) return false;
  return session.user.permissions.includes(permission);
}

export async function requirePermission(
  permission: Permission
): Promise<void> {
  const hasPermission = await checkPermission(permission);
  if (!hasPermission) {
    throw new Error(`Unauthorized: missing permission ${permission}`);
  }
}

// Use in client components (pass permissions from server)
export function hasPermission(
  permissions: Permission[],
  required: Permission
): boolean {
  return permissions.includes(required);
}

export function hasAnyPermission(
  permissions: Permission[],
  required: Permission[]
): boolean {
  return required.some((p) => permissions.includes(p));
}

export function hasAllPermissions(
  permissions: Permission[],
  required: Permission[]
): boolean {
  return required.every((p) => permissions.includes(p));
}
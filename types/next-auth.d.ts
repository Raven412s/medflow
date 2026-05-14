import { DefaultSession } from "next-auth";
import { UserRole } from "@/config/site";
import { Permission } from "@/lib/constants";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      tenantId: string;
      role: UserRole;
      permissions: Permission[];
    } & DefaultSession["user"];
  }

  interface User {
    tenantId: string;
    role: UserRole;
    permissions: Permission[];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    tenantId: string;
    role: UserRole;
    permissions: Permission[];
  }
}
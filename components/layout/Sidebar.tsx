"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { UserRole } from "@/config/site";
import {
  Activity,
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  Receipt,
  FlaskConical,
  Scan,
  Package,
  UserCog,
  BarChart2,
  Settings,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: UserRole[];
}

const navItems: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["super_admin", "clinic_admin", "doctor", "receptionist", "pharmacist", "lab_tech"],
  },
  {
    label: "Patients",
    href: "/patients",
    icon: Users,
    roles: ["super_admin", "clinic_admin", "doctor", "receptionist"],
  },
  {
    label: "Appointments",
    href: "/appointments",
    icon: CalendarDays,
    roles: ["super_admin", "clinic_admin", "doctor", "receptionist"],
  },
  {
    label: "Prescriptions",
    href: "/prescriptions",
    icon: FileText,
    roles: ["super_admin", "clinic_admin", "doctor"],
  },
  {
    label: "Billing",
    href: "/billing",
    icon: Receipt,
    roles: ["super_admin", "clinic_admin", "receptionist"],
  },
  {
    label: "Lab",
    href: "/lab",
    icon: FlaskConical,
    roles: ["super_admin", "clinic_admin", "doctor", "lab_tech"],
  },
  {
    label: "Radiology",
    href: "/radiology",
    icon: Scan,
    roles: ["super_admin", "clinic_admin", "doctor"],
  },
  {
    label: "Pharmacy",
    href: "/pharmacy",
    icon: Package,
    roles: ["super_admin", "clinic_admin", "pharmacist"],
  },
  {
    label: "Staff",
    href: "/staff",
    icon: UserCog,
    roles: ["super_admin", "clinic_admin"],
  },
  {
    label: "Analytics",
    href: "/analytics",
    icon: BarChart2,
    roles: ["super_admin", "clinic_admin"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["super_admin", "clinic_admin"],
  },
];

interface SidebarProps {
  role: UserRole;
}

export function Sidebar({ role }: SidebarProps) {
  const pathname = usePathname();

  const visibleItems = navItems.filter((item) =>
    item.roles.includes(role)
  );

  return (
    <aside className="hidden md:flex flex-col w-60 min-h-screen border-r bg-background shrink-0">
      {/* Logo */}
      <div className="h-16 flex items-center gap-2.5 px-5 border-b shrink-0">
        <div className="w-7 h-7 bg-primary rounded-md flex items-center justify-center">
          <Activity className="w-3.5 h-3.5 text-primary-foreground" />
        </div>
        <span className="font-semibold text-base tracking-tight">Medflow</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 py-4 px-3 space-y-0.5 overflow-y-auto">
        {visibleItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom role badge */}
      <div className="px-4 py-4 border-t">
        <div className="text-xs text-muted-foreground capitalize">
          {role.replace("_", " ")}
        </div>
      </div>
    </aside>
  );
}
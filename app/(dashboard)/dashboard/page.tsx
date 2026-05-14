import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Card } from "@/components/ui/card";
import {
  Users,
  CalendarDays,
  Receipt,
  FlaskConical,
} from "lucide-react";

const stats = [
  { label: "Total Patients", value: "—", icon: Users, color: "text-blue-500" },
  { label: "Today's Appointments", value: "—", icon: CalendarDays, color: "text-violet-500" },
  { label: "Pending Bills", value: "—", icon: Receipt, color: "text-amber-500" },
  { label: "Pending Lab Reports", value: "—", icon: FlaskConical, color: "text-teal-500" },
];

export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold">
          Good morning, {session.user.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Here&apos;s what&apos;s happening at your clinic today.
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Card key={stat.label} className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {stat.label}
                </span>
                <Icon className={`w-4 h-4 ${stat.color}`} />
              </div>
              <div className="text-2xl font-semibold">{stat.value}</div>
            </Card>
          );
        })}
      </div>

      {/* Placeholder sections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="text-sm font-medium mb-4">Today&apos;s Appointments</h2>
          <p className="text-sm text-muted-foreground">
            No appointments yet — they&apos;ll appear here once you start adding patients.
          </p>
        </Card>
        <Card className="p-5">
          <h2 className="text-sm font-medium mb-4">Recent Patients</h2>
          <p className="text-sm text-muted-foreground">
            No patients yet — register your first patient to get started.
          </p>
        </Card>
      </div>
    </div>
  );
}
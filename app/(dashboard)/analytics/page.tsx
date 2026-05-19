import { getAnalyticsData } from "@/modules/analytics/actions/analyticsActions";
import { AnalyticsClient } from "@/components/analytics/AnalyticsClient";
import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!["clinic_admin", "super_admin"].includes(session.user.role)) {
    redirect("/dashboard");
  }

  const result = await getAnalyticsData();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Clinic performance and operational insights
        </p>
      </div>
      <AnalyticsClient data={result.data} />
    </div>
  );
}
import { getTenantProfile } from "@/modules/tenants/actions/settingsActions";
import { auth } from "@/auth";
import { SettingsClient } from "@/components/settings/SettingsClient";
import { redirect } from "next/navigation";

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const isAdmin = ["clinic_admin", "super_admin"].includes(session.user.role);
  if (!isAdmin) redirect("/dashboard");

  const result = await getTenantProfile();

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your clinic profile and preferences
        </p>
      </div>
      <SettingsClient initialData={result.data} />
    </div>
  );
}
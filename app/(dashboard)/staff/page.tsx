import { getStaff } from "@/modules/staff/actions/staffActions";
import { StaffClient } from "@/components/staff/StaffClient";
import { auth } from "@/auth";

export default async function StaffPage() {
  const session = await auth();
  const result = await getStaff();

  const isAdmin = ["clinic_admin", "super_admin"].includes(
    session?.user?.role ?? ""
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Staff</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage your clinic&apos;s staff members and their roles
        </p>
      </div>
      <StaffClient
        initialStaff={result.data ?? []}
        isAdmin={isAdmin}
      />
    </div>
  );
}
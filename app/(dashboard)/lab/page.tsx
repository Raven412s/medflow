import { getLabOrders } from "@/modules/lab/actions/labActions";
import { getLabTests } from "@/modules/lab/actions/labActions";
import { LabClient } from "@/components/lab/LabClient";
import { auth } from "@/auth";

export default async function LabPage() {
  const session = await auth();
  const [ordersResult, testsResult] = await Promise.all([
    getLabOrders({ page: 1, limit: 20 }),
    getLabTests(),
  ]);

  const isAdmin = ["clinic_admin", "super_admin"].includes(
    session?.user?.role ?? ""
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Lab</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Lab orders, results, and test catalogue
        </p>
      </div>
      <LabClient
        initialOrders={ordersResult.data ?? []}
        initialTests={testsResult.data ?? []}
        isAdmin={isAdmin}
        userRole={session?.user?.role ?? ""}
      />
    </div>
  );
}
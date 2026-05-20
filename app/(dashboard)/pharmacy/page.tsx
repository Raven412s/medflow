import { getMedicines, getLowStockMedicines, getDispenses } from "@/modules/pharmacy/actions/pharmacyActions";
import { PharmacyClient } from "@/components/pharmacy/PharmacyClient";
import { auth } from "@/auth";

export default async function PharmacyPage() {
  const session = await auth();

  const isAdmin = ["clinic_admin", "super_admin", "pharmacist"].includes(
    session?.user?.role ?? ""
  );

  const [medicinesResult, lowStockResult, dispensesResult] = await Promise.all([
    getMedicines(),
    getLowStockMedicines(),
    getDispenses({ page: 1, limit: 20 }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Pharmacy</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Medicine inventory, dispensing, and stock management
        </p>
      </div>
      <PharmacyClient
        initialMedicines={medicinesResult.data ?? []}
        lowStockMedicines={lowStockResult.data ?? []}
        initialDispenses={dispensesResult.data ?? []}
        isAdmin={isAdmin}
      />
    </div>
  );
}
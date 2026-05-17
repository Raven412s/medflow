import { getRadiologyOrders } from "@/modules/radiology/actions/radiologyActions";
import { RadiologyClient } from "@/components/radiology/RadiologyClient";

export default async function RadiologyPage() {
  const result = await getRadiologyOrders({ page: 1, limit: 20 });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold">Radiology</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Imaging orders and reports
        </p>
      </div>
      <RadiologyClient initialOrders={result.data ?? []} />
    </div>
  );
}
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { NewRadiologyOrderDrawer } from "@/components/radiology/NewRadiologyOrderDrawer";
import {
  getRadiologyOrders,
  updateRadiologyStatus,
} from "@/modules/radiology/actions/radiologyActions";
import { formatDate, cn } from "@/lib/utils";
import { Scan, MoreHorizontal, ChevronRight, Plus } from "lucide-react";
import { IMAGING_LABELS } from "@/modules/radiology/constants";

const STATUS_STYLES = {
  ordered: "bg-blue-50 text-blue-700 border-blue-200",
  imaging_done: "bg-violet-50 text-violet-700 border-violet-200",
  reported: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const STATUS_LABELS = {
  ordered: "Ordered",
  imaging_done: "Imaging Done",
  reported: "Reported",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  ordered: ["imaging_done", "cancelled"],
  imaging_done: ["reported", "cancelled"],
  reported: ["completed"],
  completed: [],
  cancelled: [],
};

interface RadiologyOrder {
  _id: string;
  orderNumber: string;
  patientId: { name: string; patientId: string };
  orderedBy: { name: string };
  imagingType: string;
  bodyPart: string;
  contrast: boolean;
  status: keyof typeof STATUS_STYLES;
  createdAt: string;
}

export function RadiologyClient({
  initialOrders,
}: {
  initialOrders: RadiologyOrder[];
}) {
  const router = useRouter();
  const [orders, setOrders] = useState<RadiologyOrder[]>(initialOrders);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refresh() {
    startTransition(async () => {
      const r = await getRadiologyOrders({ limit: 20 });
      if (r.success) setOrders(r.data ?? []);
    });
  }

  function handleStatusUpdate(id: string, status: string) {
    startTransition(async () => {
      await updateRadiologyStatus(
        id,
        status as
          | "ordered"
          | "imaging_done"
          | "reported"
          | "completed"
          | "cancelled"
      );
      refresh();
    });
  }

  return (
    <>
      <div className="flex justify-end">
        <Button onClick={() => setDrawerOpen(true)}>
          <Scan className="w-4 h-4 mr-2" />
          New Radiology Order
        </Button>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/50">
              <TableHead className="w-44">Order No.</TableHead>
              <TableHead>Patient</TableHead>
              <TableHead>Imaging</TableHead>
              <TableHead>Body Part</TableHead>
              <TableHead>Ordered By</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-10" />
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {isPending ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-12 text-muted-foreground text-sm"
                >
                  Loading...
                </TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell
                  colSpan={9}
                  className="text-center py-12 text-muted-foreground text-sm"
                >
                  No radiology orders yet.
                </TableCell>
              </TableRow>
            ) : (
              orders.map((order) => (
                <TableRow key={order._id}>
                  <TableCell className="font-mono text-xs text-muted-foreground">
                    {order.orderNumber}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium text-sm">
                      {order.patientId?.name}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {order.patientId?.patientId}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {IMAGING_LABELS[order.imagingType] ?? order.imagingType}
                    </Badge>
                    {order.contrast && (
                      <Badge
                        variant="outline"
                        className="text-xs ml-1 bg-amber-50 text-amber-700 border-amber-200"
                      >
                        +C
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">{order.bodyPart}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {order.orderedBy?.name}
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-xs border",
                        STATUS_STYLES[order.status]
                      )}
                    >
                      {STATUS_LABELS[order.status]}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(order.createdAt)}
                  </TableCell>
                  <TableCell>
                    {STATUS_TRANSITIONS[order.status]?.length > 0 && (
                      <DropdownMenu>
                        <DropdownMenuTrigger className="p-1 rounded hover:bg-muted">
                          <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {STATUS_TRANSITIONS[order.status].map((next) => (
                            <DropdownMenuItem
                              key={next}
                              onClick={() =>
                                handleStatusUpdate(order._id, next)
                              }
                            >
                              Mark as{" "}
                              {STATUS_LABELS[next as keyof typeof STATUS_LABELS]}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() =>
                        router.push(`/radiology/${order._id}`)
                      }
                      className="p-1 rounded hover:bg-muted"
                    >
                      <ChevronRight className="w-4 h-4 text-muted-foreground" />
                    </button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewRadiologyOrderDrawer
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        onSuccess={() => {
          setDrawerOpen(false);
          refresh();
        }}
      />
    </>
  );
}
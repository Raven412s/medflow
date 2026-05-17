"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { NewLabOrderDrawer } from "@/components/lab/NewLabOrderDrawer";
import { AddLabTestDrawer } from "@/components/lab/AddLabTestDrawer";
import { getLabOrders, getLabTests, updateLabOrderStatus, toggleLabTestStatus } from "@/modules/lab/actions/labActions";
import { formatDate, cn } from "@/lib/utils";
import { Plus, FlaskConical, MoreHorizontal, ChevronRight } from "lucide-react";

const STATUS_STYLES = {
  ordered: "bg-blue-50 text-blue-700 border-blue-200",
  sample_collected: "bg-violet-50 text-violet-700 border-violet-200",
  processing: "bg-amber-50 text-amber-700 border-amber-200",
  completed: "bg-green-50 text-green-700 border-green-200",
  cancelled: "bg-zinc-100 text-zinc-500 border-zinc-200",
};

const STATUS_LABELS = {
  ordered: "Ordered",
  sample_collected: "Sample Collected",
  processing: "Processing",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATUS_TRANSITIONS: Record<string, string[]> = {
  ordered: ["sample_collected", "cancelled"],
  sample_collected: ["processing", "cancelled"],
  processing: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

interface LabOrder {
  _id: string;
  orderNumber: string;
  patientId: { name: string; patientId: string };
  orderedBy: { name: string };
  tests: { name: string; code: string }[];
  status: keyof typeof STATUS_STYLES;
  createdAt: string;
}

interface LabTest {
  _id: string;
  name: string;
  code: string;
  category: string;
  price: number;
  unit?: string;
  turnaroundHours: number;
  isActive: boolean;
}

interface LabClientProps {
  initialOrders: LabOrder[];
  initialTests: LabTest[];
  isAdmin: boolean;
  userRole: string;
}

export function LabClient({
  initialOrders,
  initialTests,
  isAdmin,
}: LabClientProps) {
  const router = useRouter();
  const [orders, setOrders] = useState<LabOrder[]>(initialOrders);
  const [tests, setTests] = useState<LabTest[]>(initialTests);
  const [orderDrawerOpen, setOrderDrawerOpen] = useState(false);
  const [testDrawerOpen, setTestDrawerOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  function refreshOrders() {
    startTransition(async () => {
      const r = await getLabOrders({ limit: 20 });
      if (r.success) setOrders(r.data ?? []);
    });
  }

  function refreshTests() {
    startTransition(async () => {
      const r = await getLabTests();
      if (r.success) setTests(r.data ?? []);
    });
  }

  function handleStatusUpdate(id: string, status: string) {
    startTransition(async () => {
      await updateLabOrderStatus(id, status as "ordered" | "sample_collected" | "processing" | "completed" | "cancelled");
      refreshOrders();
    });
  }

  function handleToggleTest(id: string, isActive: boolean) {
    startTransition(async () => {
      await toggleLabTestStatus(id, !isActive);
      refreshTests();
    });
  }

  return (
    <Tabs defaultValue="orders">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <TabsList>
          <TabsTrigger value="orders">Lab Orders</TabsTrigger>
          <TabsTrigger value="catalogue">Test Catalogue</TabsTrigger>
        </TabsList>

        <div className="flex gap-2">
          {isAdmin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTestDrawerOpen(true)}
            >
              <Plus className="w-3.5 h-3.5 mr-1.5" />
              Add Test
            </Button>
          )}
          <Button onClick={() => setOrderDrawerOpen(true)}>
            <FlaskConical className="w-4 h-4 mr-2" />
            New Lab Order
          </Button>
        </div>
      </div>

      {/* Orders tab */}
      <TabsContent value="orders" className="mt-4">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-44">Order No.</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Tests</TableHead>
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
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    Loading...
                  </TableCell>
                </TableRow>
              ) : orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-12 text-muted-foreground text-sm">
                    No lab orders yet.
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
                      <div className="flex flex-wrap gap-1">
                        {order.tests?.slice(0, 2).map((t) => (
                          <Badge
                            key={t.code}
                            variant="outline"
                            className="text-xs"
                          >
                            {t.code}
                          </Badge>
                        ))}
                        {order.tests?.length > 2 && (
                          <Badge variant="outline" className="text-xs">
                            +{order.tests.length - 2}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
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
                                Mark as {STATUS_LABELS[next as keyof typeof STATUS_LABELS]}
                              </DropdownMenuItem>
                            ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </TableCell>
                    <TableCell>
                      <button
                        onClick={() => router.push(`/lab/${order._id}`)}
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
      </TabsContent>

      {/* Test catalogue tab */}
      <TabsContent value="catalogue" className="mt-4">
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/50">
                <TableHead className="w-24">Code</TableHead>
                <TableHead>Test Name</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Unit</TableHead>
                <TableHead>TAT</TableHead>
                <TableHead className="text-right">Price ₹</TableHead>
                <TableHead>Status</TableHead>
                {isAdmin && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {tests.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center py-12 text-muted-foreground text-sm"
                  >
                    No tests in catalogue yet. Add your first test.
                  </TableCell>
                </TableRow>
              ) : (
                tests.map((test) => (
                  <TableRow key={test._id}>
                    <TableCell className="font-mono text-xs font-medium">
                      {test.code}
                    </TableCell>
                    <TableCell className="font-medium text-sm">
                      {test.name}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {test.category}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {test.unit ?? "—"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {test.turnaroundHours}h
                    </TableCell>
                    <TableCell className="text-right font-medium text-sm">
                      ₹{test.price.toLocaleString("en-IN")}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-xs",
                          test.isActive
                            ? "bg-green-50 text-green-700 border-green-200"
                            : "bg-zinc-100 text-zinc-500 border-zinc-200"
                        )}
                      >
                        {test.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    {isAdmin && (
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger className="p-1 rounded hover:bg-muted">
                            <MoreHorizontal className="w-4 h-4 text-muted-foreground" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() =>
                                handleToggleTest(test._id, test.isActive)
                              }
                              className={
                                test.isActive
                                  ? "text-destructive"
                                  : "text-green-600"
                              }
                            >
                              {test.isActive ? "Deactivate" : "Activate"}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </TabsContent>

      <NewLabOrderDrawer
        open={orderDrawerOpen}
        tests={tests}
        onClose={() => setOrderDrawerOpen(false)}
        onSuccess={() => {
          setOrderDrawerOpen(false);
          refreshOrders();
        }}
      />

      <AddLabTestDrawer
        open={testDrawerOpen}
        onClose={() => setTestDrawerOpen(false)}
        onSuccess={() => {
          setTestDrawerOpen(false);
          refreshTests();
        }}
      />
    </Tabs>
  );
}
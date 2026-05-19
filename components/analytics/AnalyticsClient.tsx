"use client";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
    CalendarDays,
    Clock,
    FlaskConical,
    Receipt,
    ScanLine,
    Stethoscope,
    TrendingDown,
    TrendingUp,
    Users,
} from "lucide-react";
import {
    Area,
    AreaChart,
    Bar,
    BarChart,
    CartesianGrid,
    Cell,
    Legend,
    Pie,
    PieChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from "recharts";

interface ChartPoint {
    label: string;
    value: number;
}

interface AnalyticsData {
    kpis: {
        totalPatients: number;
        newPatientsThisMonth: number;
        patientGrowth: number;
        totalAppointmentsThisMonth: number;
        appointmentGrowth: number;
        completionRate: number;
        revenueThisMonth: number;
        revenueGrowth: number;
        pendingAmount: number;
    };
    charts: {
        patientChartData: ChartPoint[];
        appointmentChartData: ChartPoint[];
        revenueChartData: ChartPoint[];
        weeklyAppointments: ChartPoint[];
        weeklyPatients: ChartPoint[];
        appointmentsByStatus: ChartPoint[];
        appointmentsByType: ChartPoint[];
        labOrdersByStatus: ChartPoint[];
        radiologyOrdersByStatus: ChartPoint[];
        topDiagnoses: ChartPoint[];
    };
}

const COLORS = [
    "#6366f1", "#22c55e", "#f59e0b", "#ef4444",
    "#8b5cf6", "#14b8a6", "#f97316", "#06b6d4",
];

function GrowthBadge({ value }: { value: number }) {
    const isPositive = value >= 0;
    return (
        <div
            className={cn(
                "flex items-center gap-1 text-xs font-medium",
                isPositive ? "text-green-600" : "text-red-500"
            )}
        >
            {isPositive ? (
                <TrendingUp className="w-3 h-3" />
            ) : (
                <TrendingDown className="w-3 h-3" />
            )}
            {Math.abs(value)}% vs last month
        </div>
    );
}

function formatChartData(data: ChartPoint[]) {
    return data.map((d) => ({ name: d.label, value: d.value }));
}

export function AnalyticsClient({ data }: { data: AnalyticsData | undefined }) {
    if (!data) {
        return (
            <div className="text-center py-12 text-muted-foreground text-sm">
                Failed to load analytics data.
            </div>
        );
    }

    const { kpis, charts } = data;

    const kpiCards = [
        {
            label: "Total Patients",
            value: kpis.totalPatients.toLocaleString("en-IN"),
            sub: `${kpis.newPatientsThisMonth} new this month`,
            growth: kpis.patientGrowth,
            icon: Users,
            color: "text-blue-500",
            bg: "bg-blue-50",
        },
        {
            label: "Appointments",
            value: kpis.totalAppointmentsThisMonth.toLocaleString("en-IN"),
            sub: `${kpis.completionRate}% completion rate`,
            growth: kpis.appointmentGrowth,
            icon: CalendarDays,
            color: "text-violet-500",
            bg: "bg-violet-50",
        },
        {
            label: "Revenue This Month",
            value: `₹${kpis.revenueThisMonth.toLocaleString("en-IN")}`,
            sub: `₹${kpis.pendingAmount.toLocaleString("en-IN")} pending`,
            growth: kpis.revenueGrowth,
            icon: TrendingUp,
            color: "text-green-500",
            bg: "bg-green-50",
        },
        {
            label: "Pending Collections",
            value: `₹${kpis.pendingAmount.toLocaleString("en-IN")}`,
            sub: "Across all invoices",
            growth: null,
            icon: Clock,
            color: "text-amber-500",
            bg: "bg-amber-50",
        },
    ];

    return (
        <div className="space-y-6">
            {/* KPI cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {kpiCards.map((card) => {
                    const Icon = card.icon;
                    return (
                        <Card key={card.label} className="p-5 space-y-3">
                            <div className="flex items-center justify-between">
                                <span className="text-xs text-muted-foreground">
                                    {card.label}
                                </span>
                                <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center", card.bg)}>
                                    <Icon className={cn("w-4 h-4", card.color)} />
                                </div>
                            </div>
                            <div className="text-2xl font-semibold">{card.value}</div>
                            <div className="space-y-1">
                                <p className="text-xs text-muted-foreground">{card.sub}</p>
                                {card.growth !== null && (
                                    <GrowthBadge value={card.growth} />
                                )}
                            </div>
                        </Card>
                    );
                })}
            </div>

            {/* Tabs */}
            <Tabs defaultValue="overview">
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="patients">Patients</TabsTrigger>
                    <TabsTrigger value="appointments">Appointments</TabsTrigger>
                    <TabsTrigger value="revenue">Revenue</TabsTrigger>
                    <TabsTrigger value="clinical">Clinical</TabsTrigger>
                </TabsList>

                {/* Overview tab */}
                <TabsContent value="overview" className="space-y-4 mt-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Weekly appointments */}
                        <Card className="p-5">
                            <h2 className="text-sm font-medium mb-4">
                                This Week&apos;s Appointments
                            </h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={formatChartData(charts.weeklyAppointments)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{
                                            fontSize: 12,
                                            borderRadius: 8,
                                            border: "1px solid var(--border)",
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} name="Appointments" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>

                        {/* Weekly new patients */}
                        <Card className="p-5">
                            <h2 className="text-sm font-medium mb-4">
                                New Patients This Week
                            </h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <BarChart data={formatChartData(charts.weeklyPatients)}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                    <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                    <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                    <Tooltip
                                        contentStyle={{
                                            fontSize: 12,
                                            borderRadius: 8,
                                            border: "1px solid var(--border)",
                                        }}
                                    />
                                    <Bar dataKey="value" fill="#22c55e" radius={[4, 4, 0, 0]} name="New Patients" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>

                    {/* Appointment breakdown */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <Card className="p-5">
                            <h2 className="text-sm font-medium mb-4">
                                Appointments by Status
                            </h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={formatChartData(charts.appointmentsByStatus)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {charts.appointmentsByStatus.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            fontSize: 12,
                                            borderRadius: 8,
                                            border: "1px solid var(--border)",
                                        }}
                                    />
                                    <Legend
                                        formatter={(value) => (
                                            <span style={{ fontSize: 11, textTransform: "capitalize" }}>
                                                {value}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>

                        <Card className="p-5">
                            <h2 className="text-sm font-medium mb-4">
                                Appointments by Type
                            </h2>
                            <ResponsiveContainer width="100%" height={200}>
                                <PieChart>
                                    <Pie
                                        data={formatChartData(charts.appointmentsByType)}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={50}
                                        outerRadius={80}
                                        paddingAngle={3}
                                        dataKey="value"
                                    >
                                        {charts.appointmentsByType.map((_, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        contentStyle={{
                                            fontSize: 12,
                                            borderRadius: 8,
                                            border: "1px solid var(--border)",
                                        }}
                                    />
                                    <Legend
                                        formatter={(value) => (
                                            <span style={{ fontSize: 11, textTransform: "capitalize" }}>
                                                {value}
                                            </span>
                                        )}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </Card>
                    </div>
                </TabsContent>

                {/* Patients tab */}
                <TabsContent value="patients" className="space-y-4 mt-4">
                    <Card className="p-5">
                        <h2 className="text-sm font-medium mb-4">
                            Patient Registrations — Last 12 Months
                        </h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={formatChartData(charts.patientChartData)}>
                                <defs>
                                    <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#6366f1" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        fontSize: 12,
                                        borderRadius: 8,
                                        border: "1px solid var(--border)",
                                    }}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#6366f1"
                                    strokeWidth={2}
                                    fill="url(#patientGrad)"
                                    name="New Patients"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </TabsContent>

                {/* Appointments tab */}
                <TabsContent value="appointments" className="space-y-4 mt-4">
                    <Card className="p-5">
                        <h2 className="text-sm font-medium mb-4">
                            Appointments — Last 12 Months
                        </h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <BarChart data={formatChartData(charts.appointmentChartData)}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
                                <Tooltip
                                    contentStyle={{
                                        fontSize: 12,
                                        borderRadius: 8,
                                        border: "1px solid var(--border)",
                                    }}
                                />
                                <Bar dataKey="value" fill="#8b5cf6" radius={[4, 4, 0, 0]} name="Appointments" />
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                        {/* LAB ORDERS */}
                        <Card className="p-5">
                            <Tabs defaultValue="list">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <FlaskConical className="w-4 h-4 text-muted-foreground" />
                                        <h2 className="text-sm font-medium">
                                            Lab Orders Analytics
                                        </h2>
                                    </div>

                                    <TabsList className="h-8">
                                        <TabsTrigger value="list" className="text-xs">
                                            List
                                        </TabsTrigger>
                                        <TabsTrigger value="chart" className="text-xs">
                                            Chart
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* LIST VIEW */}
                                <TabsContent value="list" className="mt-0">
                                    <div className="space-y-2">
                                        {charts.labOrdersByStatus.map((item, i) => (
                                            <div
                                                key={item.label}
                                                className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{
                                                            background: COLORS[i % COLORS.length],
                                                        }}
                                                    />

                                                    <span className="text-sm capitalize">
                                                        {item.label.replace("_", " ")}
                                                    </span>
                                                </div>

                                                <Badge variant="secondary" className="text-xs">
                                                    {item.value}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* CHART VIEW */}
                                <TabsContent value="chart" className="mt-0">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={formatChartData(charts.labOrdersByStatus)}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={85}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {charts.labOrdersByStatus.map((_, index) => (
                                                    <Cell
                                                        key={index}
                                                        fill={COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>

                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: 12,
                                                    borderRadius: 8,
                                                    border: "1px solid var(--border)",
                                                }}
                                            />

                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </TabsContent>
                            </Tabs>
                        </Card>

                        {/* RADIOLOGY */}
                        <Card className="p-5">
                            <Tabs defaultValue="chart">
                                <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                        <ScanLine className="w-4 h-4 text-muted-foreground" />
                                        <h2 className="text-sm font-medium">
                                            Radiology Orders Analytics
                                        </h2>
                                    </div>

                                    <TabsList className="h-8">
                                        <TabsTrigger value="list" className="text-xs">
                                            List
                                        </TabsTrigger>

                                        <TabsTrigger value="chart" className="text-xs">
                                            Chart
                                        </TabsTrigger>
                                    </TabsList>
                                </div>

                                {/* LIST VIEW */}
                                <TabsContent value="list" className="mt-0">
                                    <div className="space-y-2">
                                        {charts.radiologyOrdersByStatus.map((item, i) => (
                                            <div
                                                key={item.label}
                                                className="flex items-center justify-between px-3 py-2 rounded-md bg-muted/40"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-2.5 h-2.5 rounded-full shrink-0"
                                                        style={{
                                                            background: COLORS[i % COLORS.length],
                                                        }}
                                                    />

                                                    <span className="text-sm capitalize">
                                                        {item.label.replace("_", " ")}
                                                    </span>
                                                </div>

                                                <Badge variant="secondary" className="text-xs">
                                                    {item.value}
                                                </Badge>
                                            </div>
                                        ))}
                                    </div>
                                </TabsContent>

                                {/* CHART VIEW */}
                                <TabsContent value="chart" className="mt-0">
                                    <ResponsiveContainer width="100%" height={260}>
                                        <PieChart>
                                            <Pie
                                                data={formatChartData(charts.radiologyOrdersByStatus)}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={55}
                                                outerRadius={85}
                                                paddingAngle={3}
                                                dataKey="value"
                                            >
                                                {charts.radiologyOrdersByStatus.map((_, index) => (
                                                    <Cell
                                                        key={index}
                                                        fill={COLORS[index % COLORS.length]}
                                                    />
                                                ))}
                                            </Pie>

                                            <Tooltip
                                                contentStyle={{
                                                    fontSize: 12,
                                                    borderRadius: 8,
                                                    border: "1px solid var(--border)",
                                                }}
                                            />

                                            <Legend />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </TabsContent>
                            </Tabs>
                        </Card>
                    </div>
                </TabsContent>

                {/* Revenue tab */}
                <TabsContent value="revenue" className="space-y-4 mt-4">
                    <Card className="p-5">
                        <h2 className="text-sm font-medium mb-4">
                            Revenue — Last 12 Months (₹)
                        </h2>
                        <ResponsiveContainer width="100%" height={280}>
                            <AreaChart data={formatChartData(charts.revenueChartData)}>
                                <defs>
                                    <linearGradient id="revenueGrad" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#22c55e" stopOpacity={0.15} />
                                        <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                                <XAxis dataKey="name" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
                                />
                                <Tooltip
                                    contentStyle={{
                                        fontSize: 12,
                                        borderRadius: 8,
                                        border: "1px solid var(--border)",
                                    }}
                                    formatter={(value) => [
                                        `₹${value?.toLocaleString("en-IN")}`,
                                        "Revenue",
                                    ]}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="value"
                                    stroke="#22c55e"
                                    strokeWidth={2}
                                    fill="url(#revenueGrad)"
                                    name="Revenue"
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Card>
                </TabsContent>

                {/* Clinical tab */}
                <TabsContent value="clinical" className="space-y-4 mt-4">
                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Stethoscope className="w-4 h-4 text-muted-foreground" />
                            <h2 className="text-sm font-medium">Top Diagnoses</h2>
                        </div>
                        {charts.topDiagnoses.length === 0 ? (
                            <p className="text-sm text-muted-foreground">
                                No prescription data yet.
                            </p>
                        ) : (
                            <div className="space-y-3">
                                {charts.topDiagnoses.map((item, i) => {
                                    const max = charts.topDiagnoses[0]?.value ?? 1;
                                    const pct = Math.round((item.value / max) * 100);
                                    return (
                                        <div key={item.label} className="space-y-1">
                                            <div className="flex items-center justify-between text-sm">
                                                <span className="capitalize font-medium truncate max-w-xs">
                                                    {item.label}
                                                </span>
                                                <span className="text-muted-foreground shrink-0 ml-2">
                                                    {item.value} case{item.value !== 1 ? "s" : ""}
                                                </span>
                                            </div>
                                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                                                <div
                                                    className="h-full rounded-full transition-all"
                                                    style={{
                                                        width: `${pct}%`,
                                                        background: COLORS[i % COLORS.length],
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </Card>

                    <Card className="p-5">
                        <div className="flex items-center gap-2 mb-4">
                            <Receipt className="w-4 h-4 text-muted-foreground" />
                            <h2 className="text-sm font-medium">Appointment Completion Rate</h2>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="relative w-24 h-24">
                                <svg viewBox="0 0 36 36" className="w-24 h-24 -rotate-90">
                                    <circle
                                        cx="18" cy="18" r="15.9"
                                        fill="none"
                                        stroke="var(--muted)"
                                        strokeWidth="3"
                                    />
                                    <circle
                                        cx="18" cy="18" r="15.9"
                                        fill="none"
                                        stroke="#6366f1"
                                        strokeWidth="3"
                                        strokeDasharray={`${kpis.completionRate} ${100 - kpis.completionRate}`}
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <span className="text-lg font-semibold">{kpis.completionRate}%</span>
                                </div>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm font-medium">Completion Rate</p>
                                <p className="text-xs text-muted-foreground">
                                    {kpis.totalAppointmentsThisMonth} appointments this month
                                </p>
                                <p className="text-xs text-muted-foreground">
                                    Based on completed vs total scheduled
                                </p>
                            </div>
                        </div>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
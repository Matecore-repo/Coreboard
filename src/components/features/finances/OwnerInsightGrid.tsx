import React, { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ComposedChart, Tooltip, XAxis, YAxis } from "recharts";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../../ui/card";
import { ChartConfig, ChartContainer } from "../../ui/chart";

type IncomeExpensePoint = {
  date: string;
  income: number;
  expense: number;
};

type PaymentMethodDatum = {
  method: string;
  amount: number;
};

export interface OwnerInsightGridProps {
  incomeExpenseData: IncomeExpensePoint[];
  paymentMethodData: PaymentMethodDatum[];
  currencyFormatter: (value: number) => string;
}

const dualSeriesConfig: ChartConfig = {
  income: {
    label: "Ingresos",
    color: "hsl(var(--chart-1))",
  },
  expense: {
    label: "Gastos",
    color: "hsl(var(--chart-2))",
  },
};

export function OwnerInsightGrid({
  incomeExpenseData,
  paymentMethodData,
  currencyFormatter,
}: OwnerInsightGridProps) {
  const lastPoint = incomeExpenseData.at(-1);
  const totalIncome = incomeExpenseData.reduce((sum, point) => sum + point.income, 0);
  const totalExpense = incomeExpenseData.reduce((sum, point) => sum + point.expense, 0);
  const netResult = totalIncome - totalExpense;

  const trend = useMemo(() => {
    if (incomeExpenseData.length < 2) return null;
    const prev = incomeExpenseData.slice(0, -1).reduce((sum, point) => sum + point.income, 0) /
      Math.max(1, incomeExpenseData.length - 1);
    const current = lastPoint?.income ?? 0;
    return prev === 0 ? null : ((current - prev) / prev) * 100;
  }, [incomeExpenseData, lastPoint]);

  const methodConfig: ChartConfig = useMemo(() => {
    const entries = paymentMethodData.map((item, index) => {
      const slot = (index % 5) + 1;
      return [
        item.method,
        {
          label: item.method,
          color: `hsl(var(--chart-${slot}))`,
        },
      ] as const;
    });
    return Object.fromEntries(entries);
  }, [paymentMethodData]);

  const sortedMethods = useMemo(
    () => [...paymentMethodData].sort((a, b) => b.amount - a.amount).slice(0, 5),
    [paymentMethodData],
  );
  const reversedMethods = useMemo(() => [...sortedMethods].reverse(), [sortedMethods]);

  return (
    <div className="grid gap-6 lg:gap-8 xl:gap-10 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <Card className="h-full">
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Rendimiento financiero</CardTitle>
            <CardDescription>Evolución diaria de ingresos y gastos</CardDescription>
          </div>
          <div className="flex flex-col items-start gap-1 text-sm sm:items-end">
            <span className="text-muted-foreground">Resultado acumulado</span>
            <span className={netResult >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
              {currencyFormatter(netResult)}
            </span>
            {trend !== null && (
              <span className="text-muted-foreground text-xs">
                Tendencia diaria: {trend >= 0 ? "+" : ""}
                {trend.toFixed(1)}%
              </span>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-4">
          <ChartContainer config={dualSeriesConfig} className="h-[280px] w-full">
            <ComposedChart data={incomeExpenseData}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tickMargin={10}
                tickFormatter={(value: string) =>
                  new Date(value).toLocaleDateString("es-AR", { day: "2-digit", month: "short" })
                }
                className="text-xs text-muted-foreground"
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value))}
                className="text-xs text-muted-foreground"
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.2)" }}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  return (
                    <div className="border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 flex min-w-[10rem] flex-col gap-2 rounded-md border px-3 py-2 shadow-lg">
                      <span className="text-xs font-medium text-muted-foreground">
                        {new Date(label as string).toLocaleDateString("es-AR", {
                          day: "2-digit",
                          month: "long",
                        })}
                      </span>
                      {payload.map((item) => (
                        <div key={item.dataKey as string} className="flex items-center justify-between gap-4 text-xs">
                          <span className="flex items-center gap-2 text-muted-foreground">
                            <span
                              className="h-2 w-2 rounded-full"
                              style={{ backgroundColor: String(item.color ?? "hsl(var(--chart-1))") }}
                            />
                            {dualSeriesConfig[item.dataKey as string]?.label ?? item.name}
                          </span>
                          <span className="font-mono font-semibold text-foreground">
                            {currencyFormatter(Number(item.value ?? 0))}
                          </span>
                        </div>
                      ))}
                    </div>
                  );
                }}
              />
              <Bar dataKey="income" fill="var(--color-income)" radius={[6, 6, 0, 0]} maxBarSize={28} />
              <Bar dataKey="expense" fill="var(--color-expense)" radius={[6, 6, 0, 0]} maxBarSize={28} />
            </ComposedChart>
          </ChartContainer>
          <div className="mt-6 grid gap-3 text-xs text-muted-foreground sm:grid-cols-3">
            <div className="rounded-lg border border-border/40 p-4">
              <span className="block text-[11px] uppercase tracking-wide">Ingresos</span>
              <span className="text-sm font-semibold text-foreground">{currencyFormatter(totalIncome)}</span>
            </div>
            <div className="rounded-lg border border-border/40 p-4">
              <span className="block text-[11px] uppercase tracking-wide">Gastos</span>
              <span className="text-sm font-semibold text-foreground">{currencyFormatter(totalExpense)}</span>
            </div>
            <div className="rounded-lg border border-border/40 p-4">
              <span className="block text-[11px] uppercase tracking-wide">Promedio diario</span>
              <span className="text-sm font-semibold text-foreground">
                {currencyFormatter(Math.round(totalIncome / Math.max(1, incomeExpenseData.length)))}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="h-full">
        <CardHeader>
          <CardTitle className="text-base font-semibold">Métodos de pago destacados</CardTitle>
          <CardDescription>Participación de ingresos por medio de cobro</CardDescription>
        </CardHeader>
        <CardContent className="flex h-full flex-col justify-between gap-8">
          <ChartContainer config={methodConfig} className="h-[240px]">
            <BarChart data={reversedMethods} layout="vertical">
              <CartesianGrid horizontal={false} strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                type="number"
                axisLine={false}
                tickLine={false}
                tickFormatter={(value: number) => (value >= 1000 ? `${(value / 1000).toFixed(0)}k` : String(value))}
                className="text-xs text-muted-foreground"
              />
              <YAxis
                type="category"
                dataKey="method"
                axisLine={false}
                tickLine={false}
                width={100}
                className="text-xs text-muted-foreground"
              />
              <Tooltip
                cursor={{ fill: "hsl(var(--muted) / 0.15)" }}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const item = payload[0];
                  return (
                    <div className="border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/75 flex min-w-[8rem] flex-col gap-1 rounded-md border px-3 py-2 text-xs shadow-lg">
                      <span className="font-medium text-muted-foreground">{item.payload.method}</span>
                      <span className="font-mono text-foreground">{currencyFormatter(Number(item.value ?? 0))}</span>
                    </div>
                  );
                }}
              />
              <Bar dataKey="amount" radius={[4, 4, 4, 4]} barSize={18}>
                {reversedMethods.map((entry, index) => (
                  <Cell
                    key={entry.method}
                    fill={`hsl(var(--chart-${((sortedMethods.length - index - 1) % 5) + 1}))`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ChartContainer>
          <div className="grid gap-3 text-xs text-muted-foreground">
            {sortedMethods.map((item, index) => (
              <div
                key={item.method}
                className="flex items-center justify-between rounded-lg border border-border/30 px-4 py-2.5"
              >
                <span className="flex items-center gap-2 text-foreground">
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ backgroundColor: `hsl(var(--chart-${(index % 5) + 1}))` }}
                  />
                  {item.method}
                </span>
                <span className="font-mono font-semibold text-foreground">
                  {currencyFormatter(item.amount)}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}


import React from "react";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  Legend,
  LineChart,
  Line,
} from "recharts";

// Utilidad: número de semana ISO (1-53)
function getISOWeekNumber(date: Date): number {
  const temp = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNumber = temp.getUTCDay() || 7;
  temp.setUTCDate(temp.getUTCDate() + 4 - dayNumber);
  const yearStart = new Date(Date.UTC(temp.getUTCFullYear(), 0, 1));
  const diffDays = Math.floor((temp.getTime() - yearStart.getTime()) / 86400000) + 1;
  return Math.ceil(diffDays / 7);
}

// ============================================================================
// GRÁFICO 1: RevenueTrendChart - Línea de tiempo de ingresos
// ============================================================================
interface RevenueTrendData {
  date: string;
  revenue: number;
}

interface RevenueTrendChartProps {
  data: RevenueTrendData[];
  period?: 'day' | 'week' | 'month';
}

export function RevenueTrendChart({ data, period = 'day' }: RevenueTrendChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#6366f1" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => {
            const date = new Date(value);
            if (period === 'day') return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
            if (period === 'week') return `Sem ${getISOWeekNumber(date)}`;
            return date.toLocaleDateString('es-AR', { month: 'short' });
          }}
        />
        <YAxis 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
          labelFormatter={(label) => `Fecha: ${new Date(label).toLocaleDateString('es-AR')}`}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Area 
          type="monotone" 
          dataKey="revenue" 
          stroke="#6366f1" 
          fillOpacity={1}
          fill="url(#colorRevenue)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// GRÁFICO 2: TopServicesChart - Barras de top servicios por ingreso
// ============================================================================
interface TopServiceData {
  name: string;
  revenue: number;
  count: number;
}

interface TopServicesChartProps {
  data: TopServiceData[];
}

export function TopServicesChart({ data }: TopServicesChartProps) {
  const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'];
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} layout="vertical">
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          type="number"
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <YAxis 
          type="category"
          dataKey="name"
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          width={120}
        />
        <Tooltip
          formatter={(value: number, name: string, props: any) => [
            `$${value.toLocaleString()}`, 
            `${props.payload.count} turnos`
          ]}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Bar 
          dataKey="revenue" 
          radius={[0, 8, 8, 0]}
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// GRÁFICO 3: ServiceDistributionChart - Torta de distribución por servicio
// ============================================================================
interface ServiceDistributionData {
  name: string;
  value: number;
  revenue: number;
}

interface ServiceDistributionChartProps {
  data: ServiceDistributionData[];
}

export function ServiceDistributionChart({ data }: ServiceDistributionChartProps) {
  const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#10b981'];

  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry.name}: $${entry.revenue.toLocaleString()}`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number, name: string, props: any) => [
            `$${props.payload.revenue.toLocaleString()}`, 
            'Ingresos'
          ]}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

// Componentes legacy (mantener compatibilidad)
type BarProps = {
  data: any[];
  xKey: string;
  barKey: string;
  fill?: string;
};

export function BarChartComponent({ data, xKey, barKey, fill = "#6366f1" }: BarProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Bar dataKey={barKey} fill={fill} radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

type AreaProps = {
  data: any[];
  xKey: string;
  areaKey: string;
  stroke?: string;
  fill?: string;
};

export function AreaChartComponent({ data, xKey, areaKey, stroke = "#14b8a6", fill = "#14b8a6" }: AreaProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <AreaChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey={xKey} />
        <YAxis />
        <Tooltip />
        <Area type="monotone" dataKey={areaKey} stroke={stroke} fill={fill} fillOpacity={0.6} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

type PieProps = {
  data: any[];
  dataKey: string;
  colors?: string[];
  labelFn?: (entry: any) => string;
};

export function PieChartComponent({ data, dataKey, colors = [], labelFn }: PieProps) {
  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie data={data} cx="50%" cy="50%" labelLine={false} outerRadius={80} dataKey={dataKey} label={(args: any) => (labelFn ? labelFn(args) : `${args.name} ${(args.percent * 100).toFixed(0)}%`)}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={colors[index % colors.length] || "#8884d8"} />
          ))}
        </Pie>
        <Tooltip />
      </PieChart>
    </ResponsiveContainer>
  );
}

// ============================================================================
// NUEVOS GRÁFICOS PARA FINANZAS COMPLETAS
// ============================================================================

interface IncomeExpenseData {
  date: string;
  income: number;
  expense: number;
}

interface IncomeExpenseChartProps {
  data: IncomeExpenseData[];
  period?: 'day' | 'week' | 'month';
}

export function IncomeExpenseChart({ data, period = 'day' }: IncomeExpenseChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#10b981" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
          </linearGradient>
          <linearGradient id="colorExpense" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
            <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => {
            const date = new Date(value);
            if (period === 'day') return date.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
            if (period === 'week') return `Sem ${getISOWeekNumber(date)}`;
            return date.toLocaleDateString('es-AR', { month: 'short' });
          }}
        />
        <YAxis 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === 'income' ? 'Ingresos' : 'Gastos']}
          labelFormatter={(label) => `Fecha: ${new Date(label).toLocaleDateString('es-AR')}`}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend />
        <Area 
          type="monotone" 
          dataKey="income" 
          stroke="#10b981" 
          fillOpacity={1}
          fill="url(#colorIncome)"
          strokeWidth={2}
          name="Ingresos"
        />
        <Area 
          type="monotone" 
          dataKey="expense" 
          stroke="#ef4444" 
          fillOpacity={1}
          fill="url(#colorExpense)"
          strokeWidth={2}
          name="Gastos"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface CashFlowData {
  date: string;
  cash: number;
}

interface CashFlowChartProps {
  data: CashFlowData[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
        />
        <YAxis 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Flujo de Caja']}
          labelFormatter={(label) => `Fecha: ${new Date(label).toLocaleDateString('es-AR')}`}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Line 
          type="monotone" 
          dataKey="cash" 
          stroke="#06b6d4" 
          strokeWidth={2}
          dot={{ fill: '#06b6d4', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface ProfitByMonthData {
  month: string;
  profit: number;
}

interface ProfitByMonthChartProps {
  data: ProfitByMonthData[];
}

export function ProfitByMonthChart({ data }: ProfitByMonthChartProps) {
  const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6'];
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="month" 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
        />
        <YAxis 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Utilidad']}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Bar dataKey="profit" radius={[8, 8, 0, 0]}>
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface PaymentMethodData {
  name: string;
  value: number;
}

interface PaymentMethodChartProps {
  data: PaymentMethodData[];
}

export function PaymentMethodChart({ data }: PaymentMethodChartProps) {
  const COLORS = ['#6366f1', '#ec4899', '#14b8a6', '#f59e0b', '#8b5cf6', '#06b6d4', '#f97316', '#10b981'];
  
  return (
    <ResponsiveContainer width="100%" height={300}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={(entry) => `${entry.name}: $${entry.value.toLocaleString()}`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [`$${value.toLocaleString()}`, 'Ingresos']}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface CancellationsData {
  date: string;
  cancelled: number;
  noShow: number;
}

interface CancellationsChartProps {
  data: CancellationsData[];
}

export function CancellationsChart({ data }: CancellationsChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
        />
        <YAxis 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
        />
        <Tooltip
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend />
        <Bar dataKey="cancelled" stackId="a" fill="#ef4444" name="Cancelados" />
        <Bar dataKey="noShow" stackId="a" fill="#f59e0b" name="No-Show" />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface ProjectionData {
  date: string;
  actual: number;
  projected: number;
}

interface ProjectionChartProps {
  data: ProjectionData[];
}

export function ProjectionChart({ data }: ProjectionChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
        />
        <YAxis 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === 'actual' ? 'Real' : 'Proyectado']}
          labelFormatter={(label) => `Fecha: ${new Date(label).toLocaleDateString('es-AR')}`}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="actual" 
          stroke="#06b6d4" 
          strokeWidth={2}
          name="Real"
          dot={{ fill: '#06b6d4', r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="projected" 
          stroke="#8b5cf6" 
          strokeWidth={2}
          strokeDasharray="5 5"
          name="Proyectado"
          dot={{ fill: '#8b5cf6', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface BreakEvenData {
  date: string;
  revenue: number;
  fixedCost: number;
}

interface BreakEvenChartProps {
  data: BreakEvenData[];
}

export function BreakEvenChart({ data }: BreakEvenChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis 
          dataKey="date" 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: 'short' })}
        />
        <YAxis 
          stroke="#6b7280"
          tick={{ fill: '#6b7280' }}
          tickFormatter={(value) => `$${value.toLocaleString()}`}
        />
        <Tooltip
          formatter={(value: number, name: string) => [`$${value.toLocaleString()}`, name === 'revenue' ? 'Ingreso' : 'Costo Fijo']}
          labelFormatter={(label) => `Fecha: ${new Date(label).toLocaleDateString('es-AR')}`}
          contentStyle={{ backgroundColor: '#fff', border: '1px solid #e5e7eb', borderRadius: '8px' }}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="revenue" 
          stroke="#10b981" 
          strokeWidth={2}
          name="Ingreso del día"
          dot={{ fill: '#10b981', r: 4 }}
        />
        <Line 
          type="monotone" 
          dataKey="fixedCost" 
          stroke="#ef4444" 
          strokeWidth={2}
          name="Costo fijo"
          dot={{ fill: '#ef4444', r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}



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
            if (period === 'week') return `Sem ${date.getWeek()}`;
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



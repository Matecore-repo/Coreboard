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
} from "recharts";

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



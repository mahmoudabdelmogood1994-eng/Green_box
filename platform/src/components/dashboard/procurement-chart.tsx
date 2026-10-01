'use client';

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/chart';

type ProcurementChartProps = {
  data: { month: string; cost: number }[];
};

const chartConfig = {
  cost: {
    label: "Cost",
    color: "hsl(var(--primary))",
  },
};

export default function ProcurementChart({ data }: ProcurementChartProps) {
  return (
    <ChartContainer config={chartConfig} className="w-full h-[350px]">
      <ResponsiveContainer>
        <BarChart data={data} accessibilityLayer>
          <XAxis
            dataKey="month"
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="hsl(var(--muted-foreground))"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            tickFormatter={(value) => `$${Number(value) / 1000}k`}
          />
          <ChartTooltip
              cursor={false}
              content={<ChartTooltipContent indicator="dot" />}
          />
          <Bar dataKey="cost" fill="var(--color-cost)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </ChartContainer>
  );
}

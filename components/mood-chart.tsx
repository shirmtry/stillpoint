"use client";

import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface MoodPoint {
  label: string;
  full: string;
  mood: number;
}

interface TooltipProps {
  active?: boolean;
  payload?: ReadonlyArray<{ value?: number | string | undefined }>;
  label?: string | number;
}

function ChartTooltip({ active, payload, label }: TooltipProps) {
  if (!active || !payload || payload.length === 0) return null;
  const value = payload[0]?.value;
  return (
    <div className="rounded-xl border border-border bg-[#0b101c] px-3 py-2 text-xs shadow-xl">
      <p className="text-muted">{String(label)}</p>
      <p className="mt-0.5 font-medium text-foreground">{String(value ?? "–")}/5</p>
    </div>
  );
}

export function MoodChart({ data }: { data: MoodPoint[] }) {
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <defs>
            <linearGradient id="moodFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7dd3c0" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7dd3c0" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="rgba(255,255,255,0.06)" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            minTickGap={18}
          />
          <YAxis
            domain={[1, 5]}
            ticks={[1, 2, 3, 4, 5]}
            tick={{ fill: "#94a3b8", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: "rgba(125,211,192,0.25)" }} />
          <Area
            type="monotone"
            dataKey="mood"
            stroke="#7dd3c0"
            strokeWidth={2}
            fill="url(#moodFill)"
            dot={{ r: 2.5, fill: "#7dd3c0", strokeWidth: 0 }}
            activeDot={{ r: 4, fill: "#a7f3e4", strokeWidth: 0 }}
            isAnimationActive
            animationDuration={600}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
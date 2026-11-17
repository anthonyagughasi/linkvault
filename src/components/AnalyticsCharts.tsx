import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BreakdownItem, TimeSeriesPoint } from '../types/linkvault.ts';

interface CustomTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  payload?: Record<string, unknown>;
}

function TrafficTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
  label?: string;
}) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-lg border border-slate-700/80 bg-[#0D1119] px-3.5 py-2.5 shadow-xl text-xs space-y-1.5">
      <p className="font-medium text-slate-200">{label}</p>
      {payload.map((entry) => (
        <div key={entry.name} className="flex items-center justify-between gap-4">
          <span className="text-slate-400">{entry.name}</span>
          <span className="font-mono tabular-nums font-medium text-white">
            {Number(entry.value ?? 0).toLocaleString()}
          </span>
        </div>
      ))}
    </div>
  );
}

function BreakdownTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const item = payload[0]?.payload as unknown as BreakdownItem | undefined;
  if (!item) return null;

  return (
    <div className="rounded-lg border border-slate-700/80 bg-[#0D1119] px-3 py-2 shadow-xl text-xs space-y-1">
      <p className="font-medium text-white">{item.name}</p>
      <p className="font-mono tabular-nums text-slate-300">
        {item.clicks.toLocaleString()} clicks ({item.percentage}%)
      </p>
    </div>
  );
}

export function TrafficAreaChart({ data }: { data: TimeSeriesPoint[] }) {
  const hasAnyClicks = data.some((d) => d.clicks > 0);

  if (!hasAnyClicks) {
    return (
      <div className="h-64 flex flex-col items-center justify-center text-center px-4">
        <p className="text-sm font-medium text-slate-300">No clicks recorded in this period</p>
        <p className="text-xs text-slate-500 mt-1">
          Share your short link to see click volume and unique visitor trends here.
        </p>
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <defs>
            <linearGradient id="lvClicksGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366F1" stopOpacity={0.35} />
              <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="lvUniqueGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#10B981" stopOpacity={0.22} />
              <stop offset="95%" stopColor="#10B981" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
          <XAxis
            dataKey="label"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            minTickGap={24}
          />
          <YAxis
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <Tooltip content={<TrafficTooltip />} />
          <Area
            type="monotone"
            dataKey="clicks"
            name="Total Clicks"
            stroke="#6366F1"
            strokeWidth={2}
            fill="url(#lvClicksGrad)"
          />
          <Area
            type="monotone"
            dataKey="uniqueVisitors"
            name="Unique Visitors"
            stroke="#10B981"
            strokeWidth={1.75}
            fill="url(#lvUniqueGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const CHART_COLORS = ['#6366F1', '#818CF8', '#38BDF8', '#10B981', '#F59E0B', '#94A3B8'];

export function BreakdownBarChart({
  data,
  emptyLabel,
}: {
  data: BreakdownItem[];
  emptyLabel: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-52 flex items-center justify-center text-xs text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="h-52 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          layout="vertical"
          margin={{ top: 4, right: 16, left: 4, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" horizontal={false} />
          <XAxis
            type="number"
            stroke="#64748B"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            stroke="#94A3B8"
            fontSize={12}
            tickLine={false}
            axisLine={false}
            width={110}
          />
          <Tooltip content={<BreakdownTooltip />} cursor={{ fill: 'rgba(148, 163, 184, 0.08)' }} />
          <Bar dataKey="clicks" radius={[0, 4, 4, 0]} maxBarSize={20}>
            {data.map((entry, idx) => (
              <Cell key={entry.name} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BreakdownList({
  data,
  emptyLabel,
}: {
  data: BreakdownItem[];
  emptyLabel: string;
}) {
  if (!data || data.length === 0) {
    return (
      <div className="h-44 flex items-center justify-center text-xs text-slate-500">
        {emptyLabel}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((item, idx) => (
        <div key={item.name} className="space-y-1.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-200 font-medium truncate">{item.name}</span>
            <span className="font-mono tabular-nums text-slate-400 shrink-0">
              {item.clicks.toLocaleString()} · {item.percentage}%
            </span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-800/80 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-300"
              style={{
                width: `${Math.max(3, item.percentage)}%`,
                backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
              }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { fmtMoney } from './compensationBreakdownFormat';

export interface PayPart {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface NestedChild {
  key: string;
  label: string;
  value: number;
  color: string;
}

export interface NestedGroup {
  key: string;
  label: string;
  color: string;
  total: number;
  children: NestedChild[];
}

// Mixes a colour toward white, so one part's slices read as shades of the same thing.
export const shade = (hex: string, amount: number) => {
  const value = parseInt(hex.slice(1), 16);
  const channel = (offset: number) => (value >> offset) & 255;
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  return `#${[mix(channel(16)), mix(channel(8)), mix(channel(0))]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
};

// Evenly spread shades so neighbouring slices stay distinguishable however many there are.
export const shadesFor = (color: string, count: number) =>
  Array.from({ length: count }, (_, index) =>
    count <= 1 ? color : shade(color, (index / (count - 1)) * 0.55)
  );

export const PayPie = ({ groups, empty }: { groups: NestedGroup[]; empty: string }) => {
  const parts = groups.filter((group) => group.total > 0);
  // One ring, each part cut into the slices that made it up; adjacent arcs keep a part readable.
  const slices = parts.flatMap((part) => {
    const children = part.children.filter((child) => child.value > 0);
    if (children.length === 0) {
      return [{ key: part.key, label: part.label, value: part.total, color: part.color }];
    }
    return children.map((child) => ({
      key: child.key,
      label: `${part.label} · ${child.label} · ${Math.round((child.value / part.total) * 100)}% of ${part.label.toLowerCase()}`,
      value: child.value,
      color: child.color,
    }));
  });

  if (slices.length === 0) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-gray-200 dark:border-white/[0.08] bg-white/80 dark:bg-ink-900/80 text-sm text-gray-400 dark:text-ink-500">
        {empty}
      </div>
    );
  }

  return (
    <ResponsiveContainer
      width="100%"
      height="100%"
      minWidth={240}
      minHeight={240}
      initialDimension={{ width: 240, height: 256 }}
    >
      <PieChart>
        <Pie
          data={slices}
          dataKey="value"
          nameKey="label"
          innerRadius={62}
          outerRadius={96}
          paddingAngle={1}
          stroke="#ffffff"
          strokeWidth={2}
          isAnimationActive={false}
        >
          {slices.map((slice) => (
            <Cell key={slice.key} fill={slice.color} />
          ))}
        </Pie>
        <RechartsTooltip
          formatter={(value) => fmtMoney(Math.round(Number(value ?? 0)))}
          contentStyle={{
            borderRadius: 14,
            border: '1px solid #e5e7eb',
            boxShadow: '0 10px 30px rgba(15, 23, 42, 0.08)',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
};

// One bar per part of pay, split into the roles or years that made it up.
export const PayStackedBar = ({ parts, total }: { parts: PayPart[]; total: number }) => {
  const shown = parts.filter((part) => part.value > 0);
  if (shown.length === 0 || total <= 0) return null;

  return (
    <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-ink-800">
      {shown.map((part) => (
        <div
          key={part.key}
          title={`${part.label} · ${fmtMoney(Math.round(part.value))}`}
          style={{ width: `${(part.value / total) * 100}%`, backgroundColor: part.color }}
        />
      ))}
    </div>
  );
};

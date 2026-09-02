import { fmtMoney } from './compensationBreakdownFormat';
import { PayPie, PayStackedBar } from './PayChart';

export interface PartMember {
  key: string;
  label: string;
  sublabel?: string;
  value: number;
  color: string;
}

export interface PayPart {
  key: string;
  label: string;
  color: string;
  total: number;
  members: PartMember[];
}

const money = (value: number) => fmtMoney(Math.round(value));

// Parts of pay, each split into whoever earned it: one chart, one bar and one list per part.
export const PayPartsPanel = ({
  parts,
  total,
  chartEmpty,
  memberNoun,
}: {
  parts: PayPart[];
  total: number;
  chartEmpty: string;
  memberNoun: string;
}) => (
  <>
    <div className="h-64">
      <PayPie
        groups={parts.map((part) => ({
          key: part.key,
          label: part.label,
          color: part.color,
          total: part.total,
          children: part.members.map((member) => ({
            key: `${part.key}-${member.key}`,
            label: member.label,
            value: member.value,
            color: member.color,
          })),
        }))}
        empty={chartEmpty}
      />
    </div>

    <div className="space-y-3">
      {parts.map((part) => {
        const share = total > 0 ? (part.total / total) * 100 : 0;
        return (
          <div key={part.key} className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: part.color }}
                />
                <span className="text-sm font-semibold text-gray-800">{part.label}</span>
              </div>
              <div className="text-right">
                <div className="text-lg font-bold text-gray-900">{money(part.total)}</div>
                <div className="text-xs text-gray-400">
                  {part.total > 0 ? `${share.toFixed(1)}% of pay` : 'Not included'}
                </div>
              </div>
            </div>

            <div className="mt-3">
              <PayStackedBar
                total={part.total}
                parts={part.members.map((member) => ({
                  key: member.key,
                  label: member.label,
                  value: member.value,
                  color: member.color,
                }))}
              />
            </div>

            {part.members.length > 0 && (
              <div className="mt-3 space-y-2 border-t border-gray-100 pt-3">
                {part.members.map((member) => {
                  const memberShare = part.total > 0 ? (member.value / part.total) * 100 : 0;
                  return (
                    <div key={member.key} className="flex items-baseline justify-between gap-3">
                      <span className="flex min-w-0 items-center gap-2 truncate text-sm text-gray-700">
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{ backgroundColor: member.color }}
                        />
                        {member.label}
                        {member.sublabel && (
                          <span className="text-gray-400"> · {member.sublabel}</span>
                        )}
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-gray-900">
                        {money(member.value)}
                        <span className="ml-1.5 text-xs font-normal text-gray-400">
                          {memberShare.toFixed(0)}%
                        </span>
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {part.total > 0 && part.members.length === 0 && (
              <p className="mt-3 border-t border-gray-100 pt-3 text-xs text-gray-400">
                No {memberNoun} breakdown available.
              </p>
            )}
          </div>
        );
      })}
    </div>
  </>
);

export default PayPartsPanel;

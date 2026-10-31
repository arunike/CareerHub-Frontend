import { useState } from 'react';
import dayjs from 'dayjs';
import { Button, DatePicker } from 'antd';
import { CloseOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import UnitNumberInput from '../inputs/UnitNumberInput';
import { money } from '../../utils/Income/format';
import type { PricePoint } from '../../utils/OfferComparison/equityPricing';

const dateLabel = (iso: string) => dayjs(iso).format('MMM D, YYYY');

// A plain button in a modal body is outside the global 44px floor.
const TEXT_BUTTON = 'min-h-11 !px-1.5 text-[11px] font-semibold lg:min-h-0';

export const GrantPriceLog = ({
  points,
  undatedPrice,
  grantDate,
  todayIso,
  onSave,
  lockedReason,
}: {
  points: PricePoint[];
  // A price typed on the offer form, which carries no date and is superseded by the first one here.
  undatedPrice?: number | null;
  grantDate: string;
  todayIso: string;
  onSave?: (points: PricePoint[]) => Promise<void>;
  // Why a price cannot be entered, so a missing control is never silent.
  lockedReason?: string;
}) => {
  const [editing, setEditing] = useState<string | null>(null);
  const [date, setDate] = useState(todayIso);
  const [price, setPrice] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);

  const close = () => {
    setEditing(null);
    setPrice(null);
  };

  const save = async (next: PricePoint[]) => {
    if (!onSave) return;
    setSaving(true);
    try {
      await onSave([...next].sort((a, b) => a.date.localeCompare(b.date)));
      close();
    } catch {
      // The caller reports it; the editor stays open so the price can be entered again.
    } finally {
      setSaving(false);
    }
  };

  // Keyed by date, so re-entering a day you already priced corrects it rather than stacking up.
  const commit = () =>
    price != null &&
    price > 0 &&
    save([...points.filter((point) => point.date !== date), { date, price }]);

  const open = (point: PricePoint | null) => {
    setEditing(point?.date ?? 'new');
    setDate(point?.date ?? todayIso);
    setPrice(point?.price ?? null);
  };

  return (
    <div className="mt-2 rounded-lg border border-slate-200 px-3 py-2 dark:border-white/[0.08]">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400 dark:text-ink-500">
          Priced by hand
        </span>
        <span className="text-[11px] text-slate-400 dark:text-ink-500">
          {points.length > 0
            ? `${points.length} ${points.length === 1 ? 'price' : 'prices'} since the grant`
            : undatedPrice
              ? `${money(undatedPrice)} on the offer, with no date`
              : 'No ticker to look up'}
        </span>
      </div>

      {points.length > 0 && (
        <div className="mt-1 max-h-[140px] divide-y divide-slate-200/70 overflow-y-auto pr-1 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar]:w-1.5 dark:divide-white/[0.08] dark:[&::-webkit-scrollbar-thumb]:bg-ink-700">
          {points.map((point) => (
            <div key={point.date} className="flex items-center justify-between gap-2 py-0.5">
              <span className="text-xs tabular-nums text-slate-500 dark:text-ink-400">
                {dateLabel(point.date)}
              </span>
              <div className="flex items-center gap-1">
                {onSave ? (
                  <button
                    type="button"
                    disabled={saving}
                    onClick={() => open(point)}
                    title="Correct this price"
                    className="-my-1 inline-flex min-h-11 items-center rounded text-xs font-semibold tabular-nums text-slate-700 underline decoration-slate-300 decoration-dashed underline-offset-4 transition-colors hover:text-blue-600 hover:decoration-blue-400 disabled:opacity-60 lg:min-h-0 dark:text-ink-100 dark:decoration-white/25 dark:hover:text-blue-300 dark:hover:decoration-blue-400"
                  >
                    {money(point.price)}
                  </button>
                ) : (
                  <span className="text-xs font-semibold tabular-nums text-slate-700 dark:text-ink-100">
                    {money(point.price)}
                  </span>
                )}
                {onSave && (
                  <Button
                    type="text"
                    size="small"
                    icon={<DeleteOutlined />}
                    disabled={saving}
                    onClick={() => void save(points.filter((row) => row.date !== point.date))}
                    title={`Remove the ${dateLabel(point.date)} price`}
                    className={`${TEXT_BUTTON} !text-slate-400 dark:!text-ink-500`}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {onSave && editing != null && (
        <div className="grant-price-row mt-1.5 flex flex-wrap items-center gap-2">
          <DatePicker
            size="small"
            allowClear={false}
            value={dayjs(date)}
            disabledDate={(day) =>
              day.isBefore(dayjs(grantDate), 'day') || day.isAfter(dayjs(todayIso), 'day')
            }
            onChange={(day) => day && setDate(day.format('YYYY-MM-DD'))}
          />
          <UnitNumberInput
            unit="$"
            min={0}
            size="small"
            autoFocus
            value={price}
            placeholder="0"
            className="w-28"
            onChange={setPrice}
            onPressEnter={() => void commit()}
          />
          <Button
            type="link"
            size="small"
            loading={saving}
            disabled={!price}
            onClick={() => void commit()}
            className={`${TEXT_BUTTON} !text-blue-600 dark:!text-blue-300`}
          >
            Save
          </Button>
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={close}
            title="Leave the prices as they are"
            className={`${TEXT_BUTTON} !text-slate-400 dark:!text-ink-500`}
          />
        </div>
      )}

      {onSave && editing == null && (
        <Button
          type="link"
          size="small"
          icon={<PlusOutlined />}
          onClick={() => open(null)}
          className={`mt-0.5 ${TEXT_BUTTON} !text-blue-600 dark:!text-blue-300`}
        >
          Add a price
        </Button>
      )}

      <p className="mt-1 text-[11px] leading-relaxed text-slate-500 dark:text-ink-400">
        {onSave
          ? 'Enter the buyback or valuation price per share and the day it applied from. Each one holds until the next, so the grant is repriced in steps rather than daily.'
          : (lockedReason ??
            'Prices for a grant with no ticker are entered by hand on the linked offer.')}
      </p>
    </div>
  );
};

export default GrantPriceLog;

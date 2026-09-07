import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button, DatePicker, Input, InputNumber, Modal, Popconfirm, Table, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import {
  deleteStockPrice,
  getStockPrices,
  saveStockPrice,
  updateOffer,
  type StockPrice,
} from '../../api';
import { impliedShares, normalizeSymbol, priceRatio } from './equityPricing';
import type { OfferLike as Offer } from './offerTypes';

const money = (value: number) =>
  `$${Math.round(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

// An offer with no id has never been saved, so there is nothing to attach a ticker to.
type SavedOffer = Offer & { id: number };

interface GrantDraft {
  equity_ticker: string;
  equity_shares: number | null;
  equity_grant_price: number | null;
}

const draftFrom = (offer: SavedOffer): GrantDraft => ({
  equity_ticker: offer.equity_ticker ?? '',
  equity_shares: offer.equity_shares ?? null,
  equity_grant_price: offer.equity_grant_price ?? null,
});

const StockPricingModal = ({
  open,
  onClose,
  offers,
  offerLabel,
  onSaved,
}: {
  open: boolean;
  onClose: () => void;
  offers: Offer[];
  offerLabel: (offer: SavedOffer) => string;
  onSaved: () => void;
}) => {
  const [prices, setPrices] = useState<StockPrice[]>([]);
  const [drafts, setDrafts] = useState<Record<number, GrantDraft>>({});
  const [newSymbol, setNewSymbol] = useState('');
  const [newPrice, setNewPrice] = useState<number | null>(null);
  const [newDate, setNewDate] = useState(() => dayjs());
  const [busy, setBusy] = useState(false);

  // Only offers with equity can be repriced, so the rest would be noise in the list.
  const withEquity = useMemo(
    () =>
      offers.filter(
        (offer): offer is SavedOffer =>
          typeof offer.id === 'number' &&
          (Number(offer.equity) > 0 ||
            Number(offer.equity_total_grant) > 0 ||
            Number(offer.equity_buyback_value) > 0)
      ),
    [offers]
  );

  const load = useCallback(async () => {
    const resp = await getStockPrices().catch(() => null);
    setPrices(resp?.data ?? []);
  }, []);

  useEffect(() => {
    if (!open) return;
    void load();
    setDrafts(Object.fromEntries(withEquity.map((offer) => [offer.id, draftFrom(offer)])));
  }, [open, load, withEquity]);

  const priceMap = useMemo(
    () =>
      prices.reduce<Record<string, number>>((map, row) => {
        map[normalizeSymbol(row.symbol)] = Number(row.price) || 0;
        return map;
      }, {}),
    [prices]
  );

  const addPrice = async () => {
    const symbol = normalizeSymbol(newSymbol);
    if (!symbol || newPrice === null) return;
    setBusy(true);
    try {
      await saveStockPrice({ symbol, price: newPrice, as_of: newDate.format('YYYY-MM-DD') });
      setNewSymbol('');
      setNewPrice(null);
      await load();
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const removePrice = async (id: number) => {
    await deleteStockPrice(id);
    await load();
    onSaved();
  };

  const saveGrant = async (offer: SavedOffer) => {
    const draft = drafts[offer.id];
    if (!draft) return;
    setBusy(true);
    try {
      await updateOffer(offer.id, {
        equity_ticker: normalizeSymbol(draft.equity_ticker),
        equity_shares: draft.equity_shares,
        equity_grant_price: draft.equity_grant_price,
      });
      onSaved();
    } finally {
      setBusy(false);
    }
  };

  const setDraft = (id: number, patch: Partial<GrantDraft>) =>
    setDrafts((current) => ({ ...current, [id]: { ...current[id], ...patch } }));

  return (
    <Modal
      title="Stock prices"
      open={open}
      onCancel={onClose}
      footer={<Button onClick={onClose}>Done</Button>}
      width={880}
    >
      <p className="mb-4 text-[12.5px] text-slate-500 dark:text-ink-400">
        Equity is stored as the dollar value it was granted at. Give a grant a symbol and either a
        grant price or a share count, and the comparison revalues it — annual value, total grant and
        buyback alike — at the latest price below. A private company works the same way: use any
        symbol you like and enter the internal price per share.
      </p>

      <h3 className="mb-2 text-[13px] font-semibold text-slate-900 dark:text-ink-50">
        Latest prices
      </h3>
      <Table<StockPrice>
        size="small"
        rowKey="id"
        pagination={false}
        dataSource={prices}
        locale={{ emptyText: 'No prices yet' }}
        columns={[
          { title: 'Ticker', dataIndex: 'symbol', width: 110 },
          {
            title: 'Price',
            dataIndex: 'price',
            width: 140,
            render: (value: string) => `$${Number(value).toLocaleString()}`,
          },
          { title: 'As of', dataIndex: 'as_of', width: 130 },
          {
            title: '',
            width: 56,
            render: (_, row) => (
              <Popconfirm title="Remove this price?" onConfirm={() => void removePrice(row.id)}>
                <Button type="text" size="small" icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Input
          placeholder="Ticker"
          value={newSymbol}
          onChange={(event) => setNewSymbol(event.target.value)}
          style={{ width: 120 }}
        />
        <InputNumber
          placeholder="Price"
          value={newPrice}
          onChange={setNewPrice}
          min={0}
          prefix="$"
          style={{ width: 150 }}
        />
        <DatePicker
          value={newDate}
          onChange={(value) => value && setNewDate(value)}
          allowClear={false}
        />
        <Button
          type="primary"
          icon={<PlusOutlined />}
          loading={busy}
          disabled={!normalizeSymbol(newSymbol) || newPrice === null}
          onClick={() => void addPrice()}
        >
          Save price
        </Button>
      </div>

      <h3 className="mb-2 mt-6 text-[13px] font-semibold text-slate-900 dark:text-ink-50">
        Grants
      </h3>
      {withEquity.length === 0 ? (
        <p className="text-[12.5px] text-slate-400 dark:text-ink-500">
          No offer has an equity value to reprice.
        </p>
      ) : (
        <Table<SavedOffer>
          size="small"
          rowKey="id"
          pagination={false}
          dataSource={withEquity}
          columns={[
            { title: 'Offer', render: (_, offer) => offerLabel(offer) },
            {
              title: 'Ticker',
              width: 100,
              render: (_, offer) => (
                <Input
                  size="small"
                  value={drafts[offer.id]?.equity_ticker ?? ''}
                  onChange={(event) => setDraft(offer.id, { equity_ticker: event.target.value })}
                />
              ),
            },
            {
              title: 'Shares',
              width: 120,
              render: (_, offer) => {
                const draft = drafts[offer.id];
                const implied = impliedShares({ ...offer, ...draft });
                const entered = Number(draft?.equity_shares) > 0;
                return (
                  <>
                    <InputNumber
                      size="small"
                      min={0}
                      value={draft?.equity_shares ?? null}
                      onChange={(value) => setDraft(offer.id, { equity_shares: value })}
                      className="w-full"
                    />
                    {!entered && implied !== null && (
                      <span className="mt-0.5 block text-[10.5px] text-slate-400 dark:text-ink-500">
                        ≈ {Math.round(implied).toLocaleString()} implied
                      </span>
                    )}
                  </>
                );
              },
            },
            {
              title: 'Grant price',
              width: 120,
              render: (_, offer) => (
                <InputNumber
                  size="small"
                  min={0}
                  prefix="$"
                  value={drafts[offer.id]?.equity_grant_price ?? null}
                  onChange={(value) => setDraft(offer.id, { equity_grant_price: value })}
                  className="w-full"
                />
              ),
            },
            {
              title: 'Repriced',
              width: 150,
              render: (_, offer) => {
                const ratio = priceRatio({ ...offer, ...drafts[offer.id] }, priceMap);
                const value =
                  (Number(offer.equity) || Number(offer.equity_buyback_value) || 0) * ratio;
                if (ratio === 1) {
                  return <span className="text-slate-400 dark:text-ink-500">unchanged</span>;
                }
                return (
                  <Tooltip title={`${ratio > 1 ? '+' : ''}${Math.round((ratio - 1) * 100)}%`}>
                    <span
                      className={
                        ratio > 1
                          ? 'font-semibold text-emerald-600 dark:text-emerald-300'
                          : 'font-semibold text-rose-600 dark:text-rose-300'
                      }
                    >
                      {money(value)}/yr
                    </span>
                  </Tooltip>
                );
              },
            },
            {
              title: '',
              width: 70,
              render: (_, offer) => (
                <Button size="small" loading={busy} onClick={() => void saveGrant(offer)}>
                  Save
                </Button>
              ),
            },
          ]}
        />
      )}
    </Modal>
  );
};

export default StockPricingModal;

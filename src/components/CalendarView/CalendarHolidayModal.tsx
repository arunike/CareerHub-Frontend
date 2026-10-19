import { useEffect, useMemo } from 'react';
import { Button, Checkbox, Form, Input, Select, Switch } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { DeleteOutlined } from '@ant-design/icons';
import ModalShell from '../modals/ModalShell';
import SpanDateFields from './SpanDateFields';
import type { Holiday, HolidayTab } from '../../types';
import type { CalendarHolidayTarget } from './types';
import { confirmHolidayDeletion } from './confirmCalendarDeletion';
import type { SpanEditScope } from './SpanDateFields';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';
import { UNTABBED_HOLIDAY_LABEL } from '../../utils/holidayTabColors';
import { holidayRangeDates } from '../../utils/Holidays/holidayGrouping';
import { alreadyOffReason, type ObservedDays } from '../../utils/TimeOff/ptoBalance';
import {
  holidayKindOf,
  isHolidayViewOnly,
  OBSERVED_TAB_LABEL,
  OBSERVED_TAB_VALUE,
  tabFieldValue,
} from '../../utils/Holidays/observance';

export type CalendarHolidayFormValues = {
  description?: string;
  is_recurring?: boolean;
  tab?: string | null;
  // Mirrors the event form's fields, so the two date sections read and behave the same.
  date?: Dayjs | null;
  end_date?: Dayjs | null;
  is_multi_day?: boolean;
  scope?: SpanEditScope;
  // Which roles the day is charged to; concurrent jobs each spend a day.
  pto_experience_ids?: number[];
  counts_as_pto?: boolean;
};

type CalendarHolidayModalProps = {
  open: boolean;
  mode: 'add' | 'edit';
  date?: Date | null;
  target?: CalendarHolidayTarget | null;
  holiday?: Holiday | null;
  // Every day of the trip being edited, so its real extent is what the pickers show.
  groupHolidays?: Holiday[];
  holidayTabs?: HolidayTab[];
  allowObservedTab?: boolean;
  // Days the employer is already closed, which no amount of leave is spent on.
  observedDates?: ObservedDays;
  // Full-time roles a day can be charged to.
  ptoRoles?: Array<{
    id: number;
    label: string;
    startDate?: string | null;
    endDate?: string | null;
  }>;
  onCancel: () => void;
  onSubmit: (values: CalendarHolidayFormValues) => void;
  onDelete?: (holiday: Holiday) => boolean | void | Promise<boolean | void>;
  // Observing a day is a setting rather than a field of the record, so it saves on the switch.
  onToggleObservance?: (holiday: Holiday, observed: boolean) => void | Promise<void>;
};

// Which roles were running on a day: concurrent jobs both spend it.
const rolesRunningOnIn = (
  roles: Array<{ id: number; startDate?: string | null; endDate?: string | null }>,
  date: string | null
) => {
  if (!date) return [];
  return roles
    .filter(
      (role) =>
        (!role.startDate || role.startDate <= date) && (!role.endDate || date <= role.endDate)
    )
    .map((role) => role.id);
};

const ALREADY_OFF_COPY = {
  holiday: 'an observed holiday',
  weekend: 'the weekend',
  both: 'a holiday and the weekend',
};

const CalendarHolidayModal = ({
  open,
  mode,
  date,
  target,
  holiday,
  groupHolidays = [],
  holidayTabs = [],
  allowObservedTab = false,
  observedDates,
  ptoRoles = [],
  onCancel,
  onSubmit,
  onDelete,
  onToggleObservance,
}: CalendarHolidayModalProps) => {
  const [form] = Form.useForm<CalendarHolidayFormValues>();
  const rolesRunningOn = (date: string | null) => rolesRunningOnIn(ptoRoles, date);
  const countsAsPto = Form.useWatch('counts_as_pto', form);
  const isMultiDay = Form.useWatch('is_multi_day', form);
  const startDate = Form.useWatch('date', form);
  const endDate = Form.useWatch('end_date', form);
  // Judged off the pickers, not the saved row, so moving a day onto a holiday answers immediately.
  const alreadyOff = useMemo(
    () =>
      alreadyOffReason(
        holidayRangeDates({ date: startDate, end_date: endDate, is_multi_day: isMultiDay }),
        observedDates
      ),
    [startDate, endDate, isMultiDay, observedDates]
  );
  const groupDays = groupHolidays.length > 1 ? groupHolidays : [];
  // Callers build this array inline, so its identity changes every render; its dates do not.
  const groupSignature = groupHolidays.map((row) => row.date).join(',');

  useEffect(() => {
    if (!open) return;

    const clicked = date ? dayjs(date) : holiday?.date ? dayjs(holiday.date) : null;
    // A trip opens on its whole extent, which is the choice the scope control starts on.
    const spansDays = groupDays.length > 1;
    form.setFieldsValue({
      description: holiday?.description || '',
      is_recurring: !!holiday?.is_recurring,
      tab: tabFieldValue(holiday) || target?.tab || '',
      scope: 'all',
      date: spansDays ? dayjs(groupDays[0].date) : clicked,
      end_date: spansDays ? dayjs(groupDays[groupDays.length - 1].date) : null,
      is_multi_day: spansDays,
      counts_as_pto: holiday?.counts_as_pto !== false,
      // Only seed a day that counts: clearing the list is how you opt out, so it must survive a reopen.
      pto_experience_ids:
        holiday?.counts_as_pto === false
          ? []
          : holiday?.pto_experience_ids?.length
            ? holiday.pto_experience_ids
            : rolesRunningOn(holiday?.date ?? null),
    });
    // Re-seeding on a new array identity would wipe the form on every render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date, form, groupSignature, holiday, mode, open, target]);

  // The dates follow the choice: a single day is that day, the whole trip is its extent.
  const onScopeChange = (next: SpanEditScope) => {
    form.setFieldsValue({
      date: dayjs(next === 'all' ? groupDays[0].date : next),
      end_date: next === 'all' ? dayjs(groupDays[groupDays.length - 1].date) : null,
      is_multi_day: next === 'all',
    });
  };

  const isObserved = holidayKindOf(holiday) !== 'custom';
  // The option has to exist for a day already in the tab, or the control renders a raw sentinel.
  const showObservedTab = allowObservedTab || isObserved;
  const readOnly = isHolidayViewOnly(holiday, allowObservedTab);
  // Names what is being edited: one editor opens every kind of day, so a generic title says nothing.
  const tabLabel = isObserved ? OBSERVED_TAB_LABEL : (holiday?.tab_name ?? UNTABBED_HOLIDAY_LABEL);
  const title =
    mode === 'edit'
      ? `${readOnly ? '' : 'Edit '}${tabLabel}`
      : `Add ${target?.label || 'Time off'}`;

  return (
    <ModalShell
      isOpen={open}
      title={title}
      onClose={onCancel}
      width={512}
      bodyClassName="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      footer={
        <>
          {mode === 'edit' && holiday?.id && onDelete && !readOnly ? (
            <Button
              danger
              size="large"
              icon={<DeleteOutlined />}
              onClick={() => confirmHolidayDeletion(holiday, onDelete)}
              className="w-full sm:mr-auto sm:w-auto"
            >
              Delete Time Off
            </Button>
          ) : null}
          <Button size="large" onClick={onCancel} className="w-full sm:w-auto">
            {readOnly ? 'Close' : 'Cancel'}
          </Button>
          {readOnly ? null : (
            <Button
              size="large"
              type="primary"
              onClick={() => form.submit()}
              className="w-full sm:w-auto"
            >
              {isObserved ? 'Save Holiday' : 'Save Time Off'}
            </Button>
          )}
        </>
      }
    >
      <Form
        scrollToFirstError={SCROLL_TO_FIRST_ERROR}
        form={form}
        layout="vertical"
        onFinish={onSubmit}
      >
        <Form.Item name="description" label="Name">
          <Input
            size="large"
            disabled={readOnly}
            placeholder={target?.label || holiday?.description || 'Time off'}
          />
        </Form.Item>

        {readOnly ? (
          <Form.Item label="Date">
            <Input size="large" disabled value={holiday?.date ?? ''} />
          </Form.Item>
        ) : (
          <SpanDateFields
            form={form}
            size="large"
            isMultiDay={isMultiDay}
            spanDays={mode === 'edit' ? groupDays.map((row) => row.date) : []}
            onScopeChange={onScopeChange}
            dateRequiredMessage="Pick the day this starts"
          >
            <Form.Item name="is_recurring" valuePropName="checked" noStyle>
              <Checkbox>Recurring yearly</Checkbox>
            </Form.Item>
          </SpanDateFields>
        )}

        <Form.Item name="tab" label="Holiday Tab">
          <Select
            size="large"
            // A day that cannot be edited here still shows the tab it belongs to.
            disabled={readOnly}
            options={[
              { label: UNTABBED_HOLIDAY_LABEL, value: '' },
              ...holidayTabs.map((tab) => ({ label: tab.name, value: tab.id })),
              ...(showObservedTab
                ? [{ label: OBSERVED_TAB_LABEL, value: OBSERVED_TAB_VALUE }]
                : []),
            ]}
          />
        </Form.Item>

        {isObserved && allowObservedTab && onToggleObservance && holiday ? (
          <div className="mb-6 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-700 dark:text-ink-100">
                Observance Status
              </div>
              <div className="text-sm text-slate-500 dark:text-ink-400">
                An ignored day leaves the calendar and starts costing leave again.
              </div>
            </div>
            <Switch
              checked={!holiday.is_ignored}
              onChange={(next) => void onToggleObservance(holiday, next)}
            />
          </div>
        ) : null}

        {/* Emptying the roles is the same decision as unticking this, so the two move together. */}
        <div className="flex flex-wrap items-center gap-2">
          {isObserved ? null : alreadyOff ? (
            <p className="mb-0 text-sm text-slate-500 dark:text-ink-400">
              Already off for {ALREADY_OFF_COPY[alreadyOff]}, so this spends no PTO.
            </p>
          ) : (
            <Form.Item name="counts_as_pto" valuePropName="checked" className="!mb-0">
              <Checkbox
                onChange={(event) =>
                  form.setFieldValue(
                    'pto_experience_ids',
                    event.target.checked ? rolesRunningOn(holiday?.date ?? null) : []
                  )
                }
              >
                Counts against my PTO
              </Checkbox>
            </Form.Item>
          )}
        </div>

        {!isObserved && !alreadyOff && countsAsPto !== false && (
          <Form.Item
            name="pto_experience_ids"
            label="Charge to role"
            extra="Filled in from the date. Hold both if two jobs each spend the day."
          >
            <Select
              mode="multiple"
              size="large"
              allowClear
              maxTagCount={2}
              maxTagTextLength={22}
              placeholder="Charged to no role"
              options={ptoRoles.map((role) => ({ label: role.label, value: role.id }))}
              onChange={(value: number[]) => {
                if (value.length === 0) form.setFieldValue('counts_as_pto', false);
              }}
            />
          </Form.Item>
        )}
      </Form>
    </ModalShell>
  );
};

export default CalendarHolidayModal;

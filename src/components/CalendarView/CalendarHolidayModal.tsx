import { useEffect } from 'react';
import { Button, Checkbox, Form, Input, Select } from 'antd';
import dayjs, { type Dayjs } from 'dayjs';
import { LockOutlined, UnlockOutlined, DeleteOutlined } from '@ant-design/icons';
import ModalShell from '../modals/ModalShell';
import SpanDateFields from './SpanDateFields';
import type { Holiday, HolidayTab } from '../../types';
import type { CalendarHolidayTarget } from './types';
import { confirmHolidayDeletion } from './confirmCalendarDeletion';
import type { SpanEditScope } from './SpanDateFields';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';

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
  onToggleLock?: (holiday: Holiday) => void | Promise<void>;
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

const CalendarHolidayModal = ({
  open,
  mode,
  date,
  target,
  holiday,
  groupHolidays = [],
  holidayTabs = [],
  ptoRoles = [],
  onCancel,
  onSubmit,
  onDelete,
  onToggleLock,
}: CalendarHolidayModalProps) => {
  const [form] = Form.useForm<CalendarHolidayFormValues>();
  const rolesRunningOn = (date: string | null) => rolesRunningOnIn(ptoRoles, date);
  const countsAsPto = Form.useWatch('counts_as_pto', form);
  const isMultiDay = Form.useWatch('is_multi_day', form);
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
      tab: holiday?.tab || target?.tab || '',
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

  const title = mode === 'edit' ? 'Edit Time Off' : `Add ${target?.label || 'Time off'}`;

  return (
    <ModalShell
      isOpen={open}
      title={title}
      onClose={onCancel}
      maxWidthClass="max-w-lg"
      bodyClassName="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6"
      footer={
        <>
          {mode === 'edit' && holiday?.id && !holiday.is_locked && onDelete ? (
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
            Cancel
          </Button>
          <Button
            size="large"
            type="primary"
            onClick={() => form.submit()}
            className="w-full sm:w-auto"
          >
            Save Time Off
          </Button>
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
          <Input size="large" placeholder={target?.label || holiday?.description || 'Time off'} />
        </Form.Item>

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

        <Form.Item name="tab" label="Holiday Tab">
          <Select
            size="large"
            options={[
              { label: 'My Time Off', value: '' },
              ...holidayTabs.map((tab) => ({ label: tab.name, value: tab.id })),
            ]}
          />
        </Form.Item>

        {/* Emptying the roles is the same decision as unticking this, so the two move together. */}
        <div className="flex flex-wrap items-center justify-between gap-2">
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
          {/* Beside the record rather than a fourth footer button, where it was running off the edge. */}
          {mode === 'edit' && holiday?.id && onToggleLock ? (
            <Button
              size="small"
              icon={holiday.is_locked ? <UnlockOutlined /> : <LockOutlined />}
              onClick={() => void onToggleLock(holiday)}
            >
              {holiday.is_locked ? 'Unlock' : 'Lock'}
            </Button>
          ) : null}
        </div>

        {countsAsPto !== false && (
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

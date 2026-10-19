import type React from 'react';
import { List, Button, Card, Space, Switch, Typography } from 'antd';
import { CalendarOutlined, PlusOutlined } from '@ant-design/icons';
import ObservedHolidayCard, { type ObservedHolidayDisplayItem } from './ObservedHolidayCard';

const { Text } = Typography;

type Props = {
  observedForm: any;
  groupedObservedHolidays: ObservedHolidayDisplayItem[];
  handleDelete: any;
  handleDeleteObservedRange: any;
  handleToggleObservedHoliday: any;
  handleRenameObservedHoliday: any;
  loading: any;
  setAddObservedModalOpen: any;
  setIsObservedRangeMode: any;
  isAdvancedMode: boolean;
  setIsAdvancedMode: React.Dispatch<React.SetStateAction<boolean>>;
};

const ObservedHolidayTabPanel = ({
  isAdvancedMode,
  setIsAdvancedMode,
  observedForm,
  groupedObservedHolidays,
  handleDelete,
  handleDeleteObservedRange,
  handleToggleObservedHoliday,
  handleRenameObservedHoliday,
  loading,
  setAddObservedModalOpen,
  setIsObservedRangeMode,
}: Props) => (
  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <Card>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <Space align="start">
          <CalendarOutlined className="mt-1 text-xl text-blue-600 dark:text-blue-400" />
          <div>
            <Text strong>Observed Holidays</Text>
            <div>
              <Text type="secondary">
                US federal holidays are included automatically. Add company holidays, wellness days,
                or other shared days off here.
              </Text>
            </div>
          </div>
        </Space>

        <Space direction="vertical" align="end" size={2}>
          <Space size={16}>
            {isAdvancedMode && (
              <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => {
                  observedForm.resetFields();
                  setIsObservedRangeMode(false);
                  setAddObservedModalOpen(true);
                }}
              >
                Add Observed Holiday
              </Button>
            )}
            <Space>
              <Text strong>Advanced Options</Text>
              <Switch checked={isAdvancedMode} onChange={setIsAdvancedMode} />
            </Space>
          </Space>
          {isAdvancedMode && (
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Toggle specific holidays on or off or add custom ones
            </Text>
          )}
        </Space>
      </div>
    </Card>
    {loading ? (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="enterprise-card p-5 space-y-4" style={{ height: 166 }}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full shimmer-bg" />
              <div className="space-y-2 flex-1">
                <div className="shimmer-bg h-4 w-40 rounded-full" />
                <div className="shimmer-bg h-3 w-20 rounded-full" />
              </div>
            </div>
            <div className="shimmer-bg h-4 w-11/12 rounded-full" />
          </div>
        ))}
      </div>
    ) : (
      <List
        grid={{ gutter: 24, column: 3, xs: 1, sm: 1, md: 2, lg: 3, xl: 3, xxl: 3 }}
        dataSource={groupedObservedHolidays}
        renderItem={(item) => (
          <List.Item style={{ height: '100%', width: '100%' }}>
            <ObservedHolidayCard
              item={item}
              isAdvancedMode={isAdvancedMode}
              onDeleteHoliday={(id) => void handleDelete(id)}
              onDeleteRange={(group) => void handleDeleteObservedRange(group)}
              onToggleObserved={handleToggleObservedHoliday}
              onRename={(target, nextName) => void handleRenameObservedHoliday(target, nextName)}
            />
          </List.Item>
        )}
      />
    )}
  </Space>
);

export default ObservedHolidayTabPanel;

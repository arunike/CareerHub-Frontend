import type React from 'react';
import { List, Button, Card, Space, Switch, Typography } from 'antd';
import { LockOutlined, PlusOutlined } from '@ant-design/icons';
import FederalHolidayCard, {
  type FederalHolidayDisplayItem,
} from './components/FederalHolidayCard';

const { Text } = Typography;

type Props = {
  federalForm: any;
  groupedFederalHolidays: FederalHolidayDisplayItem[];
  handleDelete: any;
  handleDeleteFederalRange: any;
  handleToggleFederalHoliday: any;
  loading: any;
  setAddFederalModalOpen: any;
  setIsFederalRangeMode: any;
  isAdvancedMode: boolean;
  setIsAdvancedMode: React.Dispatch<React.SetStateAction<boolean>>;
};

const FederalHolidayTabPanel = ({
  isAdvancedMode,
  setIsAdvancedMode,
  federalForm,
  groupedFederalHolidays,
  handleDelete,
  handleDeleteFederalRange,
  handleToggleFederalHoliday,
  loading,
  setAddFederalModalOpen,
  setIsFederalRangeMode,
}: Props) => (
  <Space direction="vertical" size="middle" style={{ width: '100%' }}>
    <Card>
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <Space align="start">
          <LockOutlined style={{ fontSize: 20, color: '#2563eb', marginTop: 4 }} />
          <div>
            <Text strong>Observed Holidays</Text>
            <div>
              <Text type="secondary">
                Federal holidays are included automatically. Add company holidays, wellness days, or
                other shared days off here.
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
                  federalForm.resetFields();
                  setIsFederalRangeMode(false);
                  setAddFederalModalOpen(true);
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
        dataSource={groupedFederalHolidays}
        renderItem={(item) => (
          <List.Item style={{ height: '100%', width: '100%' }}>
            <FederalHolidayCard
              item={item}
              isAdvancedMode={isAdvancedMode}
              onDeleteHoliday={(id) => void handleDelete(id)}
              onDeleteRange={(group) => void handleDeleteFederalRange(group)}
              onToggleObserved={handleToggleFederalHoliday}
            />
          </List.Item>
        )}
      />
    )}
  </Space>
);

export default FederalHolidayTabPanel;

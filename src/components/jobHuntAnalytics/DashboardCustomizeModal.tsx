import { EyeInvisibleOutlined, EyeOutlined, SettingOutlined } from '@ant-design/icons';
import { Button, Modal, Switch, Typography } from 'antd';
import type { CustomWidget } from '../../hooks/useCustomWidgets';
import type { WidgetDefinition } from './types';

const { Text } = Typography;

type Props = {
  open: boolean;
  onClose: () => void;
  onOpenCreateWidget: () => void;
  availableWidgets: WidgetDefinition[];
  enabledWidgets: string[];
  toggleWidget: (id: string) => void;
  customWidgets: CustomWidget[];
};

const DashboardCustomizeModal = ({
  open,
  onClose,
  onOpenCreateWidget,
  availableWidgets,
  enabledWidgets,
  toggleWidget,
  customWidgets,
}: Props) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          <SettingOutlined />
          <span>Customize Dashboard</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={[
        <Button key="create" onClick={onOpenCreateWidget}>
          + Create Custom Widget
        </Button>,
        <Button key="close" type="primary" onClick={onClose}>
          Done
        </Button>,
      ]}
      width={600}
    >
      <div className="space-y-4">
        <Text type="secondary">
          Toggle widgets on/off to customize your dashboard. Drag widgets to reorder them.
        </Text>

        <div className="space-y-3 mt-4">
          {availableWidgets.map((widget) => {
            const isEnabled = enabledWidgets.includes(widget.id);
            const isLastEnabled = enabledWidgets.length === 1 && isEnabled;

            return (
              <div
                key={widget.id}
                className={`p-4 border rounded-lg transition-all ${
                  isEnabled ? 'border-blue-200 bg-blue-50' : 'border-gray-200 bg-gray-50'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="text-xl mt-1">{widget.icon}</div>
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">{widget.name}</div>
                      <div className="text-sm text-gray-500 mt-1">{widget.description}</div>
                      <div className="text-xs text-gray-400 mt-1 capitalize">{widget.category}</div>
                    </div>
                  </div>
                  <Switch
                    checked={isEnabled}
                    onChange={() => toggleWidget(widget.id)}
                    disabled={isLastEnabled}
                    checkedChildren={<EyeOutlined />}
                    unCheckedChildren={<EyeInvisibleOutlined />}
                  />
                </div>
                {isLastEnabled && (
                  <Text type="secondary" className="text-xs block mt-2">
                    At least one widget must be enabled
                  </Text>
                )}
              </div>
            );
          })}

          {customWidgets.length > 0 && (
            <>
              <div className="border-t pt-3 mt-4">
                <Text strong>Custom Widgets</Text>
              </div>
              {customWidgets.map((widget) => {
                const isEnabled = enabledWidgets.includes(widget.id);
                return (
                  <div
                    key={widget.id}
                    className={`p-4 border rounded-lg transition-all ${
                      isEnabled ? 'border-purple-200 bg-purple-50' : 'border-gray-200 bg-gray-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{widget.name}</div>
                        <div className="text-xs text-gray-400 mt-1">Custom • {widget.query}</div>
                      </div>
                      <Switch
                        checked={isEnabled}
                        onChange={() => toggleWidget(widget.id)}
                        checkedChildren={<EyeOutlined />}
                        unCheckedChildren={<EyeInvisibleOutlined />}
                      />
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default DashboardCustomizeModal;

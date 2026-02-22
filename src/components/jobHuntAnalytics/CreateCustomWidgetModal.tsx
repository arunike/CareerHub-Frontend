import {
  ClockCircleOutlined,
  EnvironmentOutlined,
  FileTextOutlined,
  NumberOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import { Button, Input, Modal, Tag, Typography } from 'antd';

const { Text } = Typography;

type ValidationResult = {
  type: 'metric' | 'chart';
  value?: string | number;
  unit?: string;
  data?: unknown[];
};

type Props = {
  open: boolean;
  onCancel: () => void;
  onCreate: () => void;
  newWidgetName: string;
  setNewWidgetName: (value: string) => void;
  newWidgetQuery: string;
  setNewWidgetQuery: (value: string) => void;
  isValidating: boolean;
  onTestQuery: () => void;
  validationResult: ValidationResult | null;
  newWidgetIcon: string;
  setNewWidgetIcon: (value: string) => void;
  newWidgetColor: string;
  setNewWidgetColor: (value: string) => void;
};

const CreateCustomWidgetModal = ({
  open,
  onCancel,
  onCreate,
  newWidgetName,
  setNewWidgetName,
  newWidgetQuery,
  setNewWidgetQuery,
  isValidating,
  onTestQuery,
  validationResult,
  newWidgetIcon,
  setNewWidgetIcon,
  newWidgetColor,
  setNewWidgetColor,
}: Props) => {
  return (
    <Modal
      title="Create Custom Widget"
      open={open}
      onCancel={onCancel}
      onOk={onCreate}
      okText="Create Widget"
    >
      <div className="space-y-4 py-4">
        <div>
          <Text strong>Widget Name</Text>
          <Input
            placeholder="e.g., Pending Applications"
            value={newWidgetName}
            onChange={(e) => setNewWidgetName(e.target.value)}
            className="mt-2"
          />
        </div>

        <div>
          <Text strong>What would you like to see?</Text>
          <div className="flex gap-2 items-start mt-2">
            <Input.TextArea
              placeholder="e.g., Total applications, Active applications, Applications by status"
              value={newWidgetQuery}
              onChange={(e) => setNewWidgetQuery(e.target.value)}
              rows={3}
              className="flex-1"
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Text type="secondary" className="text-xs">
              Try charts:
            </Text>
            <Tag
              className="cursor-pointer hover:border-blue-500"
              onClick={() => {
                setNewWidgetQuery('Applications by status');
                setNewWidgetIcon('BarChartOutlined');
              }}
            >
              Applications by status
            </Tag>
          </div>
          <div className="flex justify-between items-center mt-2">
            <Button onClick={onTestQuery} loading={isValidating} type="default" size="small">
              Test Query
            </Button>
            {validationResult && (
              <Text type="success" className="text-xs">
                {validationResult.type === 'metric'
                  ? `Result: ${validationResult.value} ${validationResult.unit}`
                  : `Result: Chart (${validationResult.data?.length || 0} items)`}
              </Text>
            )}
          </div>
        </div>

        <div>
          <Text strong>Icon</Text>
          <div className="flex gap-2 mt-2">
            {[
              'FileTextOutlined',
              'ClockCircleOutlined',
              'TrophyOutlined',
              'EnvironmentOutlined',
              'NumberOutlined',
            ].map((icon) => (
              <button
                key={icon}
                onClick={() => setNewWidgetIcon(icon)}
                className={`p-3 border rounded-lg transition-all ${
                  newWidgetIcon === icon
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {icon === 'FileTextOutlined' && <FileTextOutlined className="text-xl" />}
                {icon === 'ClockCircleOutlined' && <ClockCircleOutlined className="text-xl" />}
                {icon === 'TrophyOutlined' && <TrophyOutlined className="text-xl" />}
                {icon === 'EnvironmentOutlined' && <EnvironmentOutlined className="text-xl" />}
                {icon === 'NumberOutlined' && <NumberOutlined className="text-xl" />}
              </button>
            ))}
          </div>
        </div>

        <div>
          <Text strong>Color Theme</Text>
          <div className="flex gap-2 mt-2">
            {[
              { name: 'blue', class: 'bg-blue-500' },
              { name: 'green', class: 'bg-green-500' },
              { name: 'amber', class: 'bg-amber-500' },
              { name: 'red', class: 'bg-red-500' },
              { name: 'purple', class: 'bg-purple-500' },
              { name: 'pink', class: 'bg-pink-500' },
            ].map((color) => (
              <button
                key={color.name}
                onClick={() => setNewWidgetColor(color.name)}
                className={`w-10 h-10 rounded-lg ${color.class} transition-all ${
                  newWidgetColor === color.name ? 'ring-2 ring-offset-2 ring-gray-400' : ''
                }`}
                title={color.name}
              />
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default CreateCustomWidgetModal;

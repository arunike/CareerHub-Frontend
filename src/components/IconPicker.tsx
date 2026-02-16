import React, { useState } from 'react';
import { Popover, Button, Tooltip } from 'antd';
import { ICON_MAP, CATEGORY_ICONS } from './CategoryBadge';
import { DownOutlined } from '@ant-design/icons';

interface IconPickerProps {
  value: string;
  onChange: (iconKey: string) => void;
}

const IconPicker: React.FC<IconPickerProps> = ({ value, onChange }) => {
  const [open, setOpen] = useState(false);

  // Get the component for the current value, or fallback
  const SelectedIcon = ICON_MAP[value] || ICON_MAP['tag'];

  const content = (
    <div className="w-64 grid grid-cols-6 gap-2 max-h-60 overflow-y-auto p-1 overflow-x-hidden">
      {CATEGORY_ICONS.map((iconKey) => {
        const IconComponent = ICON_MAP[iconKey];
        const isSelected = value === iconKey;
        return (
          <Tooltip title={iconKey} key={iconKey}>
            <button
              type="button"
              onClick={() => {
                onChange(iconKey);
                setOpen(false);
              }}
              className={`
                w-10 h-10 flex items-center justify-center rounded-lg transition-all text-lg
                ${isSelected 
                  ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500 ring-offset-1' 
                  : 'hover:bg-gray-100 text-gray-600 hover:text-gray-900'}
              `}
            >
              <IconComponent />
            </button>
          </Tooltip>
        );
      })}
    </div>
  );

  return (
    <Popover
      content={content}
      trigger="click"
      open={open}
      onOpenChange={setOpen}
      placement="bottomLeft"
      arrow={false}
      overlayClassName="icon-picker-popover"
    >
      <Button 
        className="flex items-center gap-2 px-3"
        icon={<SelectedIcon className="text-blue-600" />}
      >
        <span className="text-gray-600 capitalize">{value || 'Select Icon'}</span>
        <DownOutlined className="text-xs text-gray-400" />
      </Button>
    </Popover>
  );
};

export default IconPicker;

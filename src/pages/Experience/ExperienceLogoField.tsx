import { getAvatarStyle } from './experienceUtils';
import type React from 'react';
import { Button, Upload, Avatar } from 'antd';
import { CameraOutlined, DeleteOutlined, BankOutlined, ZoomInOutlined } from '@ant-design/icons';

type Props = {
  companyName: string;
  currentLogoSrc: string | null;
  handleLogoSelect: (file: File) => string | boolean | void;
  handleOpenAdjustModal: () => void;
  handleRemoveLogo: (e: React.MouseEvent) => void;
};

const ExperienceLogoField = ({
  companyName,
  currentLogoSrc,
  handleLogoSelect,
  handleOpenAdjustModal,
  handleRemoveLogo,
}: Props) => (
  <div className="mb-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
    <div className="relative group/logo">
      <Upload accept="image/*" showUploadList={false} beforeUpload={handleLogoSelect}>
        <div className="cursor-pointer">
          {currentLogoSrc ? (
            <Avatar
              size={72}
              src={currentLogoSrc}
              className="shadow-md border-4 border-white ring-2 ring-gray-100"
            />
          ) : (
            <Avatar
              size={72}
              style={getAvatarStyle(companyName)}
              className="font-bold text-2xl shadow-md border-4 border-white ring-2 ring-gray-100"
            >
              {companyName?.charAt(0)?.toUpperCase() || <BankOutlined />}
            </Avatar>
          )}
          <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover/logo:opacity-100 transition-opacity">
            <CameraOutlined className="text-white text-lg" />
          </div>
        </div>
      </Upload>

      {/* Remove button */}
      {currentLogoSrc && (
        <button
          type="button"
          onClick={handleRemoveLogo}
          className="absolute -right-2 -top-2 flex h-11 w-11 items-center justify-center rounded-xl bg-red-500 text-white shadow-sm transition-colors hover:bg-red-600 lg:-right-1 lg:-top-1 lg:h-6 lg:w-6 lg:rounded-full"
          title="Remove logo"
          aria-label="Remove company logo"
        >
          <DeleteOutlined style={{ fontSize: 12 }} />
        </button>
      )}
    </div>
    <div className="flex flex-col items-center justify-center sm:items-start gap-1">
      <div className="flex items-center gap-2 flex-wrap">
        <Upload accept="image/*" showUploadList={false} beforeUpload={handleLogoSelect}>
          <Button
            size="small"
            icon={<CameraOutlined />}
            type="link"
            className="!min-h-11 !px-3 text-gray-600 hover:text-blue-500 font-medium lg:!min-h-0 lg:!px-0"
          >
            {currentLogoSrc ? 'Change logo' : 'Upload logo'}
          </Button>
        </Upload>

        {currentLogoSrc && (
          <Button
            size="small"
            icon={<ZoomInOutlined />}
            type="link"
            onClick={handleOpenAdjustModal}
            className="!min-h-11 !px-3 text-blue-600 hover:text-blue-700 font-medium lg:!min-h-0 lg:!px-0"
          >
            Adjust size / fit
          </Button>
        )}
      </div>
      <span className="text-xs text-gray-400">PNG, JPG up to 4MB</span>
    </div>
  </div>
);

export default ExperienceLogoField;

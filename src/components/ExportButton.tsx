import React, { useState } from 'react';
import {
  DownloadOutlined,
  FileExcelOutlined,
  FileTextOutlined,
  FileUnknownOutlined,
  DownOutlined,
} from '@ant-design/icons';
import { Button, Dropdown, message } from 'antd';
import type { MenuProps } from 'antd';

interface ExportButtonProps {
  onExport: (format: string) => Promise<{ data: Blob; headers: Record<string, string> }>;
  label?: string;
  filename?: string;
  className?: string;
  size?: 'large' | 'middle' | 'small';
}

const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  label = 'Export',
  filename = 'export',
  className,
  size = 'middle',
}) => {
  const [messageApi, contextHolder] = message.useMessage();
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: string) => {
    try {
      setIsExporting(true);

      const response = await onExport(format);

      // Create a Blob from the PDF/CSV Stream
      const blob = new Blob([response.data], {
        type: response.headers['content-type'],
      });

      // Create a link element
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      // Set filename based on format
      const extension = format === 'excel' ? 'xlsx' : format;
      link.setAttribute(
        'download',
        `${filename}_${new Date().toISOString().split('T')[0]}.${extension}`
      );

      // Append to html link element page
      document.body.appendChild(link);

      // Start download
      link.click();

      // Clean up and remove the link
      link.parentNode?.removeChild(link);
      link.parentNode?.removeChild(link);
      messageApi.success('Export successful');
    } catch (error) {
      console.error('Export failed:', error);
      messageApi.error('Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  const items: MenuProps['items'] = [
    {
      key: 'csv',
      label: 'CSV',
      icon: <FileTextOutlined style={{ color: '#52c41a' }} />,
      onClick: () => handleExport('csv'),
    },
    {
      key: 'xlsx',
      label: 'Excel (XLSX)',
      icon: <FileExcelOutlined style={{ color: '#13c2c2' }} />,
      onClick: () => handleExport('xlsx'),
    },
    {
      key: 'json',
      label: 'JSON',
      icon: <FileUnknownOutlined style={{ color: '#faad14' }} />,
      onClick: () => handleExport('json'),
    },
  ];

  return (
    <>
      {contextHolder}
      <Dropdown menu={{ items }} trigger={['click']} disabled={isExporting}>
        <Button className={className} size={size} icon={<DownloadOutlined />} loading={isExporting}>
          {label} <DownOutlined className="text-xs" />
        </Button>
      </Dropdown>
    </>
  );
};

export default ExportButton;

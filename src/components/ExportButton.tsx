import React, { useState } from 'react';
import { DownloadOutlined, FileExcelOutlined, FileTextOutlined, FileUnknownOutlined, DownOutlined } from '@ant-design/icons';
import { Button, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { useToast } from '../context/ToastContext';

interface ExportButtonProps {
  onExport: (format: string) => Promise<{ data: Blob; headers: Record<string, string> }>;
  label?: string;
  filename?: string;
}

const ExportButton: React.FC<ExportButtonProps> = ({
  onExport,
  label = 'Export',
  filename = 'export',
}) => {
  const { addToast } = useToast();
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
      addToast('Export successful', 'success');
    } catch (error) {
      console.error('Export failed:', error);
      addToast('Failed to export data', 'error');
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
    <Dropdown menu={{ items }} trigger={['click']} disabled={isExporting}>
      <Button icon={<DownloadOutlined />} loading={isExporting}>
        {label} <DownOutlined className="text-xs" />
      </Button>
    </Dropdown>
  );
};

export default ExportButton;

import React, { useState, useRef, useEffect } from 'react';
import { DownloadOutlined, FileExcelOutlined, FileTextOutlined, FileUnknownOutlined, DownOutlined } from '@ant-design/icons';
import clsx from 'clsx';
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
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleExport = async (format: string) => {
    try {
      setIsExporting(true);
      setIsOpen(false);

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

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        disabled={isExporting}
        className={clsx(
          'flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg shadow-sm text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors',
          isExporting && 'opacity-50 cursor-not-allowed'
        )}
      >
        <DownloadOutlined className="text-gray-500" />
        <span>{isExporting ? 'Exporting...' : label}</span>
        <DownOutlined className="text-xs text-gray-400" />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-200 z-50 animate-in fade-in zoom-in-95 duration-100">
          <div className="p-1">
            <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              Select Format
            </div>

            <button
              onClick={() => handleExport('csv')}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
            >
              <FileTextOutlined className="text-green-600" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => handleExport('xlsx')}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
            >
              <FileExcelOutlined className="text-emerald-600" />
              <span>Excel (XLSX)</span>
            </button>

            <button
              onClick={() => handleExport('json')}
              className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md flex items-center gap-2"
            >
              <FileUnknownOutlined className="text-yellow-600" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExportButton;

import React, { useState, useEffect } from 'react';
import { Form, Input, Select, Upload, message } from 'antd';
import Modal from '../../components/MobileModal';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { createDocument } from '../../api';
import { getApiErrorMessage } from '../../utils/apiError';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';
import ApplicationSelect from '../../components/ApplicationSelect';

interface UploadDocumentModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
  // When opened from an application, the link is fixed and the picker is hidden.
  lockedApplicationId?: number;
  lockedApplicationLabel?: string;
  // Prefilled when the caller already knows what is being uploaded.
  defaultTitle?: string;
  defaultDocumentType?: string;
}

const { Dragger } = Upload;
const { Option } = Select;
const MAX_DOCUMENT_FILE_BYTES = 4 * 1024 * 1024;
const ALLOWED_DOCUMENT_EXTENSIONS = ['.pdf', '.doc', '.docx', '.txt'];

const validateDocumentFile = (file: File) => {
  const lowerName = file.name.toLowerCase();
  const isAllowed = ALLOWED_DOCUMENT_EXTENSIONS.some((extension) => lowerName.endsWith(extension));
  if (!isAllowed) {
    message.error('Document must be a PDF, DOC, DOCX, or TXT file.');
    return false;
  }
  if (file.size > MAX_DOCUMENT_FILE_BYTES) {
    message.error('Document must be smaller than 4 MB.');
    return false;
  }
  return true;
};

const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  lockedApplicationId,
  lockedApplicationLabel,
  defaultTitle,
  defaultDocumentType,
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);

  useEffect(() => {
    if (!visible) {
      form.resetFields();
      setFileList([]);
      return;
    }
    // Seeded on open so the caller's context survives the reset above.
    form.setFieldsValue({
      title: defaultTitle ?? '',
      document_type: defaultDocumentType ?? 'RESUME',
    });
  }, [visible, form, defaultTitle, defaultDocumentType]);

  const handleOk = async () => {
    try {
      const values = await form.validateFields();

      if (fileList.length === 0) {
        message.error('Please upload a file');
        return;
      }

      setLoading(true);
      const formData = new FormData();
      formData.append('title', values.title);
      formData.append('document_type', values.document_type);
      const applicationId = lockedApplicationId ?? values.application;
      if (applicationId) {
        formData.append('application', String(applicationId));
      }
      const selectedFile = fileList[0]?.originFileObj ?? (fileList[0] as unknown as File);
      if (!(selectedFile instanceof File)) {
        message.error('Invalid file. Please choose a file again.');
        return;
      }
      formData.append('file', selectedFile);

      await createDocument(formData);
      message.success('Document uploaded successfully');
      onSuccess();
    } catch (error: any) {
      if (error.errorFields) {
        return;
      }
      message.error(getApiErrorMessage(error, 'Failed to upload document'));
    } finally {
      setLoading(false);
    }
  };

  const uploadProps: UploadProps = {
    onRemove: (file) => {
      const index = fileList.indexOf(file);
      const newFileList = fileList.slice();
      newFileList.splice(index, 1);
      setFileList(newFileList);
    },
    beforeUpload: (file) => {
      if (!validateDocumentFile(file)) {
        return Upload.LIST_IGNORE;
      }
      setFileList([file as UploadFile]);
      return false;
    },
    fileList,
    maxCount: 1,
  };

  return (
    <Modal
      title="Upload Document"
      open={visible}
      onOk={handleOk}
      onCancel={onCancel}
      confirmLoading={loading}
      okText="Upload"
      destroyOnClose
    >
      <Form
        scrollToFirstError={SCROLL_TO_FIRST_ERROR}
        form={form}
        layout="vertical"
        className="mt-4"
      >
        <Form.Item
          name="title"
          label="Document Title"
          rules={[{ required: true, message: 'Please enter a title' }]}
        >
          <Input placeholder="e.g. Frontend Engineer Resume - Google" />
        </Form.Item>

        <Form.Item
          name="document_type"
          label="Document Type"
          rules={[{ required: true, message: 'Please select a type' }]}
        >
          <Select>
            <Option value="RESUME">Resume</Option>
            <Option value="COVER_LETTER">Cover Letter</Option>
            <Option value="OFFER_LETTER">Offer Letter</Option>
            <Option value="PORTFOLIO">Portfolio</Option>
            <Option value="OTHER">Other</Option>
          </Select>
        </Form.Item>

        {lockedApplicationId ? (
          <div className="mb-6 rounded-lg border border-slate-200 dark:border-white/[0.08] bg-slate-50 dark:bg-ink-900 px-3 py-2 text-sm text-slate-600 dark:text-ink-200">
            Linking to{' '}
            <span className="font-medium text-slate-900 dark:text-ink-50">
              {lockedApplicationLabel}
            </span>
          </div>
        ) : (
          <Form.Item name="application" label="Link to Application (Optional)">
            <ApplicationSelect
              className="w-full"
              placeholder="Select an application"
              formatLabel={(a) => `${a.role_title} @ ${a.company_details?.name || 'Unknown'}`}
            />
          </Form.Item>
        )}

        <Form.Item label="File" required>
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">
              Support for a single PDF, DOC, DOCX, or TXT file up to 4 MB.
            </p>
          </Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UploadDocumentModal;

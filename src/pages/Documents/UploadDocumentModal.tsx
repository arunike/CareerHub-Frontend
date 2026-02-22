import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Select, Upload, message } from 'antd';
import { InboxOutlined } from '@ant-design/icons';
import type { UploadFile, UploadProps } from 'antd';
import { createDocument, getApplications } from '../../api';

interface UploadDocumentModalProps {
  visible: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

const { Dragger } = Upload;
const { Option } = Select;

const UploadDocumentModal: React.FC<UploadDocumentModalProps> = ({
  visible,
  onCancel,
  onSuccess,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [applications, setApplications] = useState<any[]>([]);

  useEffect(() => {
    if (visible) {
      fetchApplications();
    } else {
      form.resetFields();
      setFileList([]);
    }
  }, [visible, form]);

  const fetchApplications = async () => {
    try {
      const response = await getApplications();
      setApplications(response.data);
    } catch (error) {
      console.error('Failed to fetch applications', error);
    }
  };

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
      if (values.application) {
        formData.append('application', String(values.application));
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
      message.error(error.response?.data?.error || 'Failed to upload document');
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
      <Form form={form} layout="vertical" className="mt-4">
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
          initialValue="RESUME"
        >
          <Select>
            <Option value="RESUME">Resume</Option>
            <Option value="COVER_LETTER">Cover Letter</Option>
            <Option value="PORTFOLIO">Portfolio</Option>
            <Option value="OTHER">Other</Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="application"
          label="Link to Application (Optional)"
        >
          <Select
            showSearch
            allowClear
            placeholder="Select an application"
            optionFilterProp="children"
            filterOption={(input, option: any) =>
              option.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
            }
          >
            {applications.map((app) => (
              <Option key={app.id} value={app.id}>
                {app.role_title} @ {app.company_details?.name || 'Unknown'}
              </Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item label="File" required>
          <Dragger {...uploadProps}>
            <p className="ant-upload-drag-icon">
              <InboxOutlined />
            </p>
            <p className="ant-upload-text">Click or drag file to this area to upload</p>
            <p className="ant-upload-hint">
              Support for a single PDF, DOCX, or text file.
            </p>
          </Dragger>
        </Form.Item>
      </Form>
    </Modal>
  );
};

export default UploadDocumentModal;

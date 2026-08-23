import { Form, Input, type FormInstance } from 'antd';
import type React from 'react';
import { SCROLL_TO_FIRST_ERROR } from '../../constants/formDefaults';

const { TextArea } = Input;

type Props = {
  importForm: FormInstance;
  handleTextPaste: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
};

const ExperienceImportForm = ({ handleTextPaste, importForm }: Props) => (
  <Form
    scrollToFirstError={SCROLL_TO_FIRST_ERROR}
    form={importForm}
    layout="vertical"
    className="mt-4"
  >
    <Form.Item
      name="raw_text"
      label="Paste Resume Section"
      help="Paste the full block for a single role (Title, Company, Dates, and Bullets). We'll automatically build the form for you!"
      rules={[{ required: true, message: 'Please paste your experience text' }]}
    >
      <TextArea
        rows={10}
        placeholder="Job Title&#10;Company Name&#10;San Jose, CA&#10;Start Date - End Date&#10;- Bullet point 1&#10;- Bullet point 2&#10;- Bullet point 3..."
        onChange={handleTextPaste}
      />
    </Form.Item>
  </Form>
);

export default ExperienceImportForm;

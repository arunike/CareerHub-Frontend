import { getAvatarStyle } from './experienceUtils';
import type React from 'react';
import { Form, Avatar, AutoComplete, type FormInstance } from 'antd';
import LocationSelect from '../../components/LocationSelect';

type Props = {
  form: FormInstance;
  companyOptions: Array<{ value: string; logoUrl: string | null }>;
  handleCompanySelect: (_value: string, option: { logoUrl?: string | null }) => void;
  setCompanyName: React.Dispatch<React.SetStateAction<string>>;
};

const ExperienceDateFields = ({
  companyOptions,
  handleCompanySelect,
  setCompanyName,
  form,
}: Props) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    <Form.Item
      name="company"
      label="Company"
      rules={[{ required: true, message: 'Please enter company name' }]}
    >
      <AutoComplete
        options={companyOptions}
        optionRender={(option) => (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {option.data.logoUrl ? (
              <Avatar size={18} src={option.data.logoUrl} />
            ) : (
              <Avatar size={18} style={getAvatarStyle(option.value as string)}>
                {(option.value as string).charAt(0).toUpperCase()}
              </Avatar>
            )}
            <span>{option.value as string}</span>
          </div>
        )}
        onSelect={handleCompanySelect}
        onChange={(val) => {
          const name = val || '';
          setCompanyName(name);
          const matches = companyOptions.some(
            (opt) => opt.value.toLowerCase() === name.toLowerCase()
          );
          if (!matches) form.setFieldValue('is_promotion', false);
        }}
        filterOption={(input, option) =>
          (option?.value as string)?.toLowerCase().includes(input.toLowerCase())
        }
        placeholder="e.g. Google"
      />
    </Form.Item>
    <Form.Item name="location" label="Location">
      <LocationSelect placeholder="e.g. San Francisco, CA" />
    </Form.Item>
  </div>
);

export default ExperienceDateFields;

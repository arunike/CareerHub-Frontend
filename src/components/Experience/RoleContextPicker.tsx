import type { FormInstance } from 'antd';
import { Form, Input } from 'antd';
import { RiseOutlined, LinkOutlined } from '@ant-design/icons';

type Props = {
  form: FormInstance;
  isExistingCompany: unknown;
  roleContext: unknown;
};

const RoleContextPicker = ({ isExistingCompany, roleContext, form }: Props) => (
  <>
    {/* Hidden Form.Item keeps the value registered with the form */}
    <Form.Item name="role_context" className="hidden mb-0">
      <Input />
    </Form.Item>
    <div className="mt-4">
      <div className="text-sm font-medium text-gray-700 dark:text-ink-100 mb-2">Role Context</div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        {/* Standard */}
        <button
          type="button"
          onClick={() => form.setFieldValue('role_context', 'none')}
          className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
            roleContext === 'none'
              ? 'border-gray-400 dark:border-white/[0.16] bg-gray-50 dark:bg-ink-900 text-gray-700 dark:text-ink-100 shadow-sm'
              : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 text-gray-400 dark:text-ink-500 hover:border-gray-300 hover:text-gray-600'
          }`}
        >
          <span className="text-base">🏷️</span>
          <span>Standard</span>
        </button>

        {/* Promotion */}
        <button
          type="button"
          onClick={() => isExistingCompany && form.setFieldValue('role_context', 'promotion')}
          disabled={!isExistingCompany}
          className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 ${
            !isExistingCompany
              ? 'border-gray-100 dark:border-white/[0.07] bg-gray-50 dark:bg-ink-900 text-gray-300 dark:text-ink-600 cursor-not-allowed opacity-60'
              : roleContext === 'promotion'
                ? 'border-amber-400 bg-amber-50 dark:bg-amber-500/10 text-amber-700 dark:text-amber-300 shadow-sm cursor-pointer'
                : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 text-gray-400 dark:text-ink-500 hover:border-amber-300 hover:text-amber-600 cursor-pointer'
          }`}
        >
          <RiseOutlined className="text-base" />
          <span>Promotion</span>
        </button>

        {/* Return Offer */}
        <button
          type="button"
          onClick={() => form.setFieldValue('role_context', 'return_offer')}
          className={`flex flex-col items-center gap-1.5 px-3 py-2.5 rounded-xl border-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
            roleContext === 'return_offer'
              ? 'border-blue-400 bg-blue-50 dark:bg-blue-500/10 text-blue-700 dark:text-blue-300 shadow-sm'
              : 'border-gray-200 dark:border-white/[0.08] bg-white dark:bg-ink-900 text-gray-400 dark:text-ink-500 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          <LinkOutlined className="text-base" />
          <span>Return Offer</span>
        </button>
      </div>
      {!isExistingCompany && (
        <div className="text-xs text-gray-400 dark:text-ink-500 mt-1.5">
          "Promotion" requires matching an existing company in your experience.
        </div>
      )}
    </div>
  </>
);

export default RoleContextPicker;

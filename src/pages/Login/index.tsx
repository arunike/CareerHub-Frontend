import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, Spin, Typography } from 'antd';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleFilled,
  DollarOutlined,
  LineChartOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { getSignupStatus, type SignupStatusResponse } from '../../api/auth';
import { useAuth } from '../../context/AuthContext';
import './login.css';

type AuthMode = 'login' | 'signup';

interface AuthFormValues {
  full_name?: string;
  email?: string;
  password: string;
  confirm_password?: string;
}

interface LoginLocationState {
  from?: string;
}

const features = [
  { icon: <CalendarOutlined />, label: 'Schedule tracking', desc: 'Interviews, availability, weekly pulse' },
  { icon: <LineChartOutlined />, label: 'Application pipeline', desc: 'Status, response rates, follow-ups' },
  { icon: <DollarOutlined />, label: 'Offer comparison', desc: 'Base, equity, PTO side by side' },
  { icon: <SafetyCertificateOutlined />, label: 'Career analytics', desc: 'Earnings, growth, timeline' },
];

const trustPills = ['Private dashboard', 'Token secured', 'Encrypted passwords'];

function extractErrorMessage(error: unknown, fallback: string) {
  if (!axios.isAxiosError(error)) {
    return fallback;
  }

  if (typeof error.response?.data?.error === 'string') {
    return error.response.data.error;
  }

  if (typeof error.response?.data?.detail === 'string') {
    return error.response.data.detail;
  }

  return fallback;
}

export default function LoginPage() {
  const [form] = Form.useForm<AuthFormValues>();
  const navigate = useNavigate();
  const location = useLocation();
  const { login, signup, isAuthenticated, isLoading } = useAuth();
  const [mode, setMode] = useState<AuthMode | null>(null);
  const [signupStatus, setSignupStatus] = useState<SignupStatusResponse | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const locationState = location.state as LoginLocationState | null;

  const redirectTo = typeof locationState?.from === 'string' ? locationState.from : '/';
  const canSignup = !!signupStatus?.can_signup;

  const modeLabel = useMemo(() => {
    if (mode === 'signup') {
      return {
        title: 'Get started',
        subtitle: 'Create your account to get access.',
        cta: 'Create Account',
      };
    }

    return {
      title: 'Welcome back',
      subtitle: 'Sign in to your private workspace.',
      cta: 'Sign In',
    };
  }, [mode]);

  useEffect(() => {
    let cancelled = false;

    async function bootstrapPage() {
      try {
        const response = await getSignupStatus();
        if (!cancelled) {
          setSignupStatus(response.data);
          setMode(response.data.can_signup && !response.data.has_users ? 'signup' : 'login');
        }
      } catch (error) {
        if (!cancelled) {
          setMode('login');
          console.error('Unable to load signup mode.', error);
        }
      } finally {
        if (!cancelled) {
          setStatusLoading(false);
        }
      }
    }

    void bootstrapPage();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate(redirectTo, { replace: true });
    }
  }, [isAuthenticated, isLoading, navigate, redirectTo]);

  function handleModeChange(nextMode: AuthMode) {
    if (nextMode === 'signup' && !signupStatus?.can_signup) {
      return;
    }

    setMode(nextMode);
    setErrorMessage('');
    setSuccessMessage('');
    form.resetFields();
  }

  async function handleFinish(values: AuthFormValues) {
    if (!mode) {
      return;
    }

    setSubmitting(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      if (mode === 'signup') {
        const signupResult = await signup({
          email: values.email || '',
          full_name: values.full_name || '',
          password: values.password,
          confirm_password: values.confirm_password || '',
        });
        if (signupResult.requires_login) {
          setMode('login');
          form.resetFields();
          form.setFieldsValue({ email: values.email || '' });
          setSuccessMessage(signupResult.message || 'Account created. Sign in to continue.');
          return;
        }
      } else {
        await login(values.email || '', values.password);
      }

      navigate(redirectTo, { replace: true });
    } catch (error) {
      const fallback =
        mode === 'signup' ? 'Unable to create your account right now.' : 'Unable to sign in right now.';
      setErrorMessage(extractErrorMessage(error, fallback));

      if (mode === 'signup' && axios.isAxiosError(error) && error.response?.status === 403) {
        try {
          const response = await getSignupStatus();
          setSignupStatus(response.data);
          setMode(response.data.can_signup && !response.data.has_users ? 'signup' : 'login');
        } catch {
          // Keep the page usable even if the status refresh fails.
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__shell">
        <section className="login-page__hero">
          <div className="login-page__eyebrow">
            <SafetyCertificateOutlined />
            CareerHub
          </div>

          <div className="login-page__headline-wrap">
            <Typography.Title level={1} className="login-page__title">
              Your private
              <br />
              <span className="login-page__title-accent">career OS.</span>
            </Typography.Title>
            <Typography.Paragraph className="login-page__lead">
              One place for interviews, applications, offers, and analytics.
              Private by default. Built for focus.
            </Typography.Paragraph>
          </div>

          <div className="login-page__features">
            {features.map((f) => (
              <div key={f.label} className="login-page__feature-item">
                <span className="login-page__feature-icon">{f.icon}</span>
                <div>
                  <p className="login-page__feature-label">{f.label}</p>
                  <p className="login-page__feature-desc">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="login-page__panel">
          <div className="login-page__panel-inner">
            <div className="login-page__panel-top">
              <div className="login-page__panel-brand">
                <SafetyCertificateOutlined className="login-page__panel-brand-icon" />
                <span>CareerHub</span>
              </div>
              <Typography.Title level={2} className="login-page__panel-title">
                {modeLabel.title}
              </Typography.Title>
              <p className="login-page__panel-subtitle">{modeLabel.subtitle}</p>
              <div className="login-page__trust-pills">
                {trustPills.map((pill) => (
                  <span key={pill} className="login-page__trust-pill">
                    <CheckCircleFilled />
                    {pill}
                  </span>
                ))}
              </div>
            </div>

            <div className="login-page__panel-body">
              <div className="login-page__mode-switch">
                <button
                  type="button"
                  className={mode === 'login' ? 'is-active' : ''}
                  onClick={() => handleModeChange('login')}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  className={mode === 'signup' ? 'is-active' : ''}
                  onClick={() => handleModeChange('signup')}
                  disabled={!canSignup || statusLoading}
                >
                  Create Account
                </button>
              </div>

              {mode ? (
                <Form<AuthFormValues>
                  form={form}
                  layout="vertical"
                  onFinish={handleFinish}
                  className="login-page__form"
                >
                  {mode === 'signup' ? (
                    <>
                      <Form.Item
                        label="Full Name"
                        name="full_name"
                        rules={[{ required: true, message: 'Enter your full name.' }]}
                      >
                        <Input prefix={<UserOutlined />} autoComplete="name" />
                      </Form.Item>

                      <Form.Item
                        label="Email"
                        name="email"
                        rules={[
                          { required: true, message: 'Enter your email.' },
                          { type: 'email', message: 'Enter a valid email.' },
                        ]}
                      >
                        <Input prefix={<MailOutlined />} autoComplete="email" />
                      </Form.Item>
                    </>
                  ) : (
                    <Form.Item
                      label="Email"
                      name="email"
                      rules={[
                        { required: true, message: 'Enter your email.' },
                        { type: 'email', message: 'Enter a valid email.' },
                      ]}
                    >
                      <Input prefix={<MailOutlined />} autoComplete="email" />
                    </Form.Item>
                  )}

                  <Form.Item
                    label="Password"
                    name="password"
                    rules={[{ required: true, message: 'Enter your password.' }]}
                  >
                    <Input.Password
                      prefix={<LockOutlined />}
                      autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                    />
                  </Form.Item>

                  {mode === 'signup' ? (
                    <Form.Item
                      label="Confirm Password"
                      name="confirm_password"
                      dependencies={['password']}
                      rules={[
                        { required: true, message: 'Confirm your password.' },
                        ({ getFieldValue }) => ({
                          validator(_, value) {
                            if (!value || getFieldValue('password') === value) {
                              return Promise.resolve();
                            }
                            return Promise.reject(new Error('Passwords do not match.'));
                          },
                        }),
                      ]}
                    >
                      <Input.Password prefix={<LockOutlined />} autoComplete="new-password" />
                    </Form.Item>
                  ) : null}

                  {errorMessage ? (
                    <Form.Item>
                      <Alert type="error" showIcon message={errorMessage} />
                    </Form.Item>
                  ) : null}

                  {successMessage ? (
                    <Form.Item>
                      <Alert type="success" showIcon message={successMessage} />
                    </Form.Item>
                  ) : null}

                  <div className="login-page__submit-wrap">
                    <Button
                      type="primary"
                      htmlType="submit"
                      block
                      loading={submitting}
                      disabled={statusLoading || (mode === 'signup' && !canSignup)}
                      className="login-page__submit"
                    >
                      {modeLabel.cta} <ArrowRightOutlined />
                    </Button>
                  </div>
                </Form>
              ) : (
                <div className="login-page__empty-state">
                  <Spin />
                </div>
              )}

              <div className="login-page__footnote">
                {mode === 'signup'
                  ? 'Email is your account identity. Passwords are encrypted and never stored in plain text.'
                  : 'Your data is secured with industry-standard encryption and private by default.'}
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

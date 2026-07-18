import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Form, Input, Spin, Typography } from 'antd';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  DollarOutlined,
  FileTextOutlined,
  LineChartOutlined,
  LockOutlined,
  MailOutlined,
  SafetyCertificateOutlined,
  UserOutlined,
} from '@ant-design/icons';
import { Link, useLocation, useNavigate } from 'react-router-dom';
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

const quotes: Record<AuthMode, { text: string; author: string }> = {
  login: {
    text: 'Welcome back. The search gets quieter when every next step has a place.',
    author: 'CareerHub',
  },
  signup: {
    text: 'Start with one clean workspace. Let the applications, notes, and offers line up.',
    author: 'CareerHub',
  },
};

const visualStats = [
  { label: 'roles', value: '18' },
  { label: 'interviews', value: '04' },
  { label: 'offers', value: '02' },
];

const workspaceRows = [
  {
    icon: <CalendarOutlined />,
    title: 'Design systems interview',
    meta: 'Today, 2:30 PM',
    status: 'Prep',
  },
  {
    icon: <LineChartOutlined />,
    title: 'Senior PM application',
    meta: 'Follow-up due Friday',
    status: 'Active',
  },
  {
    icon: <FileTextOutlined />,
    title: 'Cover letter draft',
    meta: 'Ready for review',
    status: 'Draft',
  },
];

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
        title: 'Create an account',
        subtitle: 'Enter your details below to start your private workspace.',
        cta: 'Create account',
      };
    }

    return {
      title: 'Sign in to your account',
      subtitle: 'Enter your email below to sign in.',
      cta: 'Sign in',
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
        mode === 'signup'
          ? 'Unable to create your account right now.'
          : 'Unable to sign in right now.';
      setErrorMessage(extractErrorMessage(error, fallback));

      if (mode === 'signup' && axios.isAxiosError(error) && error.response?.status === 403) {
        try {
          const response = await getSignupStatus();
          setSignupStatus(response.data);
          setMode(response.data.can_signup && !response.data.has_users ? 'signup' : 'login');
        } catch {
          setErrorMessage('Unable to determine signup status. Please try again later.');
        }
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-page__shell">
        <aside className="login-page__visual" aria-label="CareerHub welcome panel">
          <div className="login-page__visual-scene">
            <div className="login-page__workspace-window">
              <div className="login-page__window-top">
                <span />
                <span />
                <span />
              </div>

              <div className="login-page__workspace-header">
                <div>
                  <span className="login-page__workspace-kicker">CareerHub</span>
                  <h2>Today&apos;s search board</h2>
                </div>
                <span className="login-page__workspace-badge">Private</span>
              </div>

              <div className="login-page__window-grid">
                {visualStats.map((stat) => (
                  <div key={stat.label}>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                ))}
              </div>

              <div className="login-page__workspace-list">
                {workspaceRows.map((item) => (
                  <div key={item.title} className="login-page__workspace-row">
                    <span className="login-page__workspace-icon">{item.icon}</span>
                    <div>
                      <p>{item.title}</p>
                      <span>{item.meta}</span>
                    </div>
                    <em>{item.status}</em>
                  </div>
                ))}
              </div>
            </div>

            <div className="login-page__offer-card">
              <div>
                <span>Offer delta</span>
                <strong>+18.4%</strong>
              </div>
              <DollarOutlined />
            </div>

            <div className="login-page__document-card">
              <FileTextOutlined />
              <span>Negotiation notes</span>
            </div>
          </div>

          <blockquote className="login-page__quote">
            <p>{quotes[mode || 'login'].text}</p>
            <cite>{quotes[mode || 'login'].author}</cite>
          </blockquote>
        </aside>

        <main className="login-page__auth">
          <div className="login-page__form-card">
            <Link to="/" className="login-page__brand" style={{ textDecoration: 'none' }}>
              <SafetyCertificateOutlined />
              <span>CareerHub</span>
            </Link>

            <div className="login-page__form-heading">
              <Typography.Title level={2} className="login-page__panel-title">
                {modeLabel.title}
              </Typography.Title>
              <p className="login-page__panel-subtitle">{modeLabel.subtitle}</p>
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
                      label="Full name"
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
                    label="Confirm password"
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

            <div className="login-page__mode-line">
              {mode === 'signup' ? 'Already have an account?' : "Don't have an account?"}
              <Button
                type="link"
                className="login-page__mode-link"
                onClick={() => handleModeChange(mode === 'signup' ? 'login' : 'signup')}
                disabled={statusLoading || (mode !== 'signup' && !canSignup)}
              >
                {mode === 'signup' ? 'Sign in' : 'Sign up'}
              </Button>
            </div>

            <div className="login-page__divider">
              <span>Protected workspace</span>
            </div>

            <div className="login-page__footnote">
              {mode === 'signup'
                ? 'Email is your account identity. Passwords are encrypted and never stored in plain text.'
                : 'Your data stays scoped to your CareerHub account.'}
              <div className="login-page__legal-links">
                <Link to="/">Back to Home</Link>
                <span aria-hidden="true">·</span>
                <Link to="/privacy">Privacy Policy</Link>
                <span aria-hidden="true">·</span>
                <Link to="/terms">Terms of Service</Link>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import {
  getUserSettings,
  updateUserSettings,
  changePassword,
} from '../../api';
import type { UserSettings } from '../../types';
import {
  UserOutlined,
  SaveOutlined,
  CloseOutlined,
  LockOutlined,
  MailOutlined,
  KeyOutlined,
  IdcardOutlined,
  SafetyOutlined,
  CameraOutlined,
} from '@ant-design/icons';
import { Button, message, Tooltip } from 'antd';
import PageActionToolbar from '../../components/PageActionToolbar';
import { useAuth } from '../../context/AuthContext';

const ProfilePage: React.FC = () => {
  const [messageApi, contextHolder] = message.useMessage();
  const [settings, setSettings] = useState<UserSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { user, updateProfile, logout } = useAuth();

  // User info state
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Password state
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

  const fetchSettings = async () => {
    try {
      const resp = await getUserSettings();
      const data = resp.data;
      if (!data.display_name && user?.full_name) {
        data.display_name = user.full_name;
      }
      setSettings(data);
    } catch (error) {
      messageApi.error('Failed to fetch profile settings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    if (user) {
      setFirstName(user.first_name || '');
      setLastName(user.last_name || '');
    }
  }, [user]);

  const handleSaveGeneral = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      await updateUserSettings({ display_name: settings.display_name });
      await updateProfile({ first_name: firstName, last_name: lastName });
      window.dispatchEvent(new CustomEvent('settings-saved', { detail: { 
        display_name: settings.display_name,
        profile_picture: settings.profile_picture 
      }}));
      messageApi.success('Profile updated successfully!');
    } catch (error) {
      messageApi.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordChange = async () => {
    if (!oldPassword || !newPassword) {
      messageApi.warning('Please enter current and new passwords');
      return;
    }
    if (newPassword !== confirmPassword) {
      messageApi.error('New passwords do not match');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword({ old_password: oldPassword, new_password: newPassword });
      messageApi.success('Password changed successfully! Logging out...');
      setOldPassword('');
      setNewPassword('');
      setConfirmPassword('');
      
      // Logout after a short delay so user can see the message
      setTimeout(() => {
        logout();
      }, 1500);
    } catch (error: any) {
      messageApi.error(error.response?.data?.error || 'Failed to change password');
    } finally {
      setPasswordSaving(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[60vh]"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" /></div>;
  if (!settings) return <div className="text-center py-12 text-red-600">Failed to load profile</div>;

  return (
    <div className="max-w-6xl mx-auto pb-20">
      {contextHolder}
      
      <PageActionToolbar
        title="Profile Settings"
        extraActions={
          <Button
            type="primary"
            size="large"
            icon={<SaveOutlined />}
            loading={saving}
            onClick={handleSaveGeneral}
            className="rounded-xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 border-none shadow-lg shadow-indigo-200 font-semibold"
          >
            Save All Changes
          </Button>
        }
      />

      <div className="grid grid-cols-12 gap-8 mt-6">
        {/* Sidebar-style Profile Preview */}
        <div className="col-span-12 lg:col-span-4 space-y-6">
          <div className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden sticky top-24">
            {/* Branded Header */}
            <div className="h-24 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 relative">
              <div className="absolute inset-0 bg-black/10" />
            </div>
            
            <div className="px-8 pb-8">
              <div className="relative -mt-12 mb-6 flex flex-col items-center">
                <div className="relative group">
                  <div className="w-32 h-32 rounded-[32px] overflow-hidden bg-white border-4 border-white shadow-xl group-hover:shadow-2xl transition-all duration-500 transform group-hover:scale-[1.02]">
                    {settings.profile_picture ? (
                      <img src={settings.profile_picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50">
                        <span className="text-4xl font-black text-indigo-500">
                          {firstName?.charAt(0) || user?.email?.charAt(0) || 'U'}
                        </span>
                      </div>
                    )}
                    <label className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px] flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 cursor-pointer">
                      <CameraOutlined className="text-2xl text-white mb-1" />
                      <span className="text-white text-[9px] font-black uppercase tracking-widest">Update</span>
                      <input
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const formData = new FormData();
                            formData.append('profile_picture', file);
                            setSaving(true);
                            try {
                              const resp = await updateUserSettings(formData);
                              setSettings(resp.data);
                              window.dispatchEvent(new CustomEvent('settings-saved', { detail: { 
                                display_name: resp.data.display_name,
                                profile_picture: resp.data.profile_picture 
                              }}));
                              messageApi.success('Photo updated!');
                            } catch (err) { messageApi.error('Upload failed'); } finally { setSaving(false); }
                          }
                        }}
                      />
                    </label>
                  </div>
                  {settings.profile_picture && (
                    <Tooltip title="Remove Photo">
                      <button
                        onClick={async () => {
                          setSaving(true);
                          try {
                            const resp = await updateUserSettings({ profile_picture: null });
                            setSettings(resp.data);
                            window.dispatchEvent(new CustomEvent('settings-saved', { detail: { 
                              display_name: resp.data.display_name,
                              profile_picture: resp.data.profile_picture 
                            }}));
                          } catch (err) { messageApi.error('Error'); } finally { setSaving(false); }
                        }}
                        className="absolute -top-1 -right-1 bg-white p-1.5 rounded-full shadow-lg border border-slate-100 text-slate-400 hover:text-rose-500 transition-all hover:scale-110"
                      >
                        <CloseOutlined className="text-[10px]" />
                      </button>
                    </Tooltip>
                  )}
                </div>
                
                <div className="mt-4 text-center">
                  <h2 className="text-lg font-bold text-slate-900 leading-tight">
                    {firstName || lastName ? `${firstName} ${lastName}` : 'Update Your Name'}
                  </h2>
                  <p className="text-sm font-medium text-slate-400 mt-0.5">{user?.email}</p>
                </div>
              </div>

              <div className="space-y-4 pt-6 border-t border-slate-100">
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-indigo-500">
                    <MailOutlined className="text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Email</p>
                    <p className="text-xs font-bold text-slate-600 truncate">{user?.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 rounded-xl bg-slate-50/50 border border-slate-100/50">
                  <div className="w-8 h-8 rounded-lg bg-white shadow-sm flex items-center justify-center text-indigo-500">
                    <SafetyOutlined className="text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Account Type</p>
                    <p className="text-xs font-bold text-slate-600">{user?.is_staff ? 'Administrator' : 'Standard User'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Form Area */}
        <div className="col-span-12 lg:col-span-8 space-y-8">
          {/* General Section */}
          <section className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <IdcardOutlined />
              </div>
              <h3 className="text-base font-bold text-slate-800">Basic Information</h3>
            </div>
            
            <div className="p-8 space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">First Name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                    placeholder="Enter first name"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">Last Name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-300"
                    placeholder="Enter last name"
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="text-xs font-bold text-slate-500 ml-1">Display Name</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <UserOutlined className="text-slate-300 group-focus-within:text-indigo-500 transition-colors" />
                  </div>
                  <input
                    type="text"
                    value={settings.display_name || ''}
                    onChange={(e) => setSettings({ ...settings, display_name: e.target.value })}
                    className="w-full h-12 pl-11 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                    placeholder="Your public name"
                  />
                </div>
                <p className="text-[10px] text-slate-400 ml-1 flex items-center gap-1">
                  <div className="w-1 h-1 rounded-full bg-slate-300" />
                  This name will be visible on booking links and public profiles.
                </p>
              </div>
            </div>
          </section>

          {/* Security Section */}
          <section className="bg-white rounded-[24px] border border-slate-200/60 shadow-sm overflow-hidden">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600">
                <LockOutlined />
              </div>
              <h3 className="text-base font-bold text-slate-800">Security & Privacy</h3>
              <Tooltip title="Your password is encrypted using industry-standard hashing algorithms and is never stored in plain text.">
                <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-md bg-emerald-50 text-[10px] font-bold text-emerald-600 cursor-help transition-all hover:bg-emerald-100">
                  <SafetyOutlined className="text-[12px]" />
                  ENCRYPTED
                </div>
              </Tooltip>
            </div>
            
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-500 ml-1">Current Password</label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <KeyOutlined className="text-slate-300 group-focus-within:text-rose-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    value={oldPassword}
                    onChange={(e) => setOldPassword(e.target.value)}
                    placeholder="Enter current password"
                    className="w-full h-12 pl-11 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-rose-500/5 focus:border-rose-500 transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">New Password</label>
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 ml-1">Confirm New Password</label>
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat new password"
                    className="w-full h-12 rounded-xl border border-slate-200 bg-slate-50/20 px-4 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all"
                  />
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button
                  type="default"
                  size="large"
                  icon={<LockOutlined />}
                  loading={passwordSaving}
                  onClick={handlePasswordChange}
                  className="rounded-xl h-11 text-xs font-bold border-slate-200 hover:border-indigo-500 hover:text-indigo-600 transition-all flex items-center gap-2"
                >
                  Update Account Password
                </Button>
              </div>
            </div>
          </section>

          {/* Delete Account */}
          <div className="p-6 rounded-[24px] bg-rose-50/30 border border-rose-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="text-center md:text-left">
              <h4 className="text-sm font-bold text-rose-900">Advanced Account Actions</h4>
              <p className="text-xs text-rose-700/60 font-medium">To permanently delete your account and all data, please contact support.</p>
            </div>
            <a 
              href="mailto:richiezhouyjz@gmail.com"
              onClick={() => {
                // If mailto doesn't open, at least they have it on clipboard
                navigator.clipboard.writeText('richiezhouyjz@gmail.com');
                messageApi.success('Support email copied to clipboard!');
              }}
              className="font-bold text-xs bg-rose-100/50 hover:bg-rose-100 h-10 px-6 rounded-xl flex items-center justify-center text-rose-600 transition-all hover:text-rose-700 no-underline cursor-pointer"
            >
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;

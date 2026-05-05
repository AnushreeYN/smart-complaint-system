import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import {
  Building2,
  Camera,
  Loader2,
  Lock,
  Mail,
  Save,
  Settings,
  ShieldCheck,
  User as UserIcon,
} from 'lucide-react';

const ProfileSettings = () => {
  const { user, refreshUser } = useAuth();
  const [formData, setFormData] = useState({
    full_name: '',
    email: '',
    password: '',
    profile_photo: '',
  });
  const [organizationData, setOrganizationData] = useState({
    name: '',
    logo_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savingOrganization, setSavingOrganization] = useState(false);
  const [success, setSuccess] = useState(false);
  const [organizationSuccess, setOrganizationSuccess] = useState(false);

  const canManageOrganization = Boolean(user?.organization_id) && hasPermission(user, 'organization:update');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const requests = [api.get('/users/me')];
        if (user?.organization_id) {
          requests.push(api.get('/organizations/me'));
        }

        const [profileResponse, organizationResponse] = await Promise.all(requests);
        setFormData({ ...profileResponse.data, password: '' });

        if (organizationResponse) {
          setOrganizationData({
            name: organizationResponse.data.name,
            logo_url: organizationResponse.data.logo_url || '',
          });
        }
      } catch (error) {
        console.error('Failed to fetch profile', error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [user?.organization_id]);

  const loadImage = (file, callback) => {
    const reader = new FileReader();
    reader.onloadend = () => callback(reader.result);
    reader.readAsDataURL(file);
  };

  const handleFileChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadImage(file, (value) => setFormData({ ...formData, profile_photo: value }));
  };

  const handleOrganizationLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    loadImage(file, (value) => setOrganizationData({ ...organizationData, logo_url: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setSuccess(false);
    try {
      await api.put('/users/me', formData);
      await refreshUser();
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update profile', error);
    } finally {
      setSaving(false);
    }
  };

  const handleOrganizationSubmit = async (event) => {
    event.preventDefault();
    setSavingOrganization(true);
    setOrganizationSuccess(false);
    try {
      await api.put('/organizations/me', organizationData);
      await refreshUser();
      setOrganizationSuccess(true);
      setTimeout(() => setOrganizationSuccess(false), 3000);
    } catch (error) {
      console.error('Failed to update organization', error);
    } finally {
      setSavingOrganization(false);
    }
  };

  if (loading) return <div className="p-20 text-center">Loading profile...</div>;

  return (
    <div className="max-w-5xl mx-auto py-8 animate-in">
      <div className="flex items-center gap-4 mb-8">
        <div className="bg-indigo-600 p-3 rounded-2xl shadow-lg shadow-indigo-200">
          <Settings className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Profile Settings</h1>
          <p className="text-slate-500">Manage your personal identity, organization branding, and security.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 text-center relative group">
            <div className="relative inline-block">
              <div className="w-32 h-32 rounded-[2.5rem] bg-indigo-50 flex items-center justify-center text-indigo-600 text-4xl font-black border-4 border-white shadow-xl overflow-hidden">
                {formData.profile_photo ? (
                  <img src={formData.profile_photo} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  formData.full_name ? formData.full_name[0].toUpperCase() : user.email[0].toUpperCase()
                )}
              </div>
              <label className="absolute bottom-0 right-0 p-2.5 bg-white rounded-xl shadow-lg border border-slate-100 text-slate-600 hover:text-indigo-600 transition-all cursor-pointer">
                <Camera className="w-5 h-5" />
                <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
              </label>
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-900">{formData.full_name}</h3>
            <p className="text-sm font-bold text-indigo-600 uppercase tracking-widest mt-1">{user.role}</p>
            <div className="mt-8 pt-8 border-t border-slate-50 space-y-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500 font-medium">Verified Status</span>
                <ShieldCheck className="w-5 h-5 text-emerald-500" />
              </div>
            </div>
          </div>

          {user.organization_id && (
            <div className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-[1.5rem] bg-slate-100">
                  {organizationData.logo_url ? (
                    <img src={organizationData.logo_url} alt={organizationData.name} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-7 w-7 text-slate-400" />
                  )}
                </div>
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Organization</p>
                  <h3 className="text-lg font-black text-slate-900">{organizationData.name || user.organization_name}</h3>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:col-span-2 space-y-8">
          <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <label className="label-text">Full Name</label>
                  <div className="relative">
                    <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      className="input-field pl-12"
                      value={formData.full_name}
                      onChange={(event) => setFormData({ ...formData, full_name: event.target.value })}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="label-text">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="email"
                      disabled
                      className="input-field pl-12 bg-slate-50 cursor-not-allowed opacity-60"
                      value={formData.email}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="label-text">New Password (leave blank to keep current)</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="password"
                      className="input-field pl-12"
                      placeholder="••••••••"
                      value={formData.password}
                      onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="pt-6 flex items-center justify-between">
                {success && (
                  <p className="text-emerald-600 font-bold flex items-center gap-2 animate-in">
                    <ShieldCheck className="w-5 h-5" />
                    Profile Updated Successfully!
                  </p>
                )}
                <div className="flex-1" />
                <button type="submit" disabled={saving} className="btn-primary min-w-[180px] h-14">
                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Changes</>}
                </button>
              </div>
            </form>
          </div>

          {canManageOrganization && (
            <div className="bg-white p-10 rounded-[2.5rem] border border-slate-100 shadow-xl shadow-slate-200/50">
              <form onSubmit={handleOrganizationSubmit} className="space-y-6">
                <div>
                  <h2 className="text-2xl font-black text-slate-900">Organization Branding</h2>
                  <p className="mt-2 text-sm text-slate-500">Keep your workspace logo and name current for everyone in the organization.</p>
                </div>

                <div className="grid gap-6 md:grid-cols-[1fr_auto]">
                  <div>
                    <label className="label-text">Organization Name</label>
                    <input
                      type="text"
                      className="input-field"
                      value={organizationData.name}
                      onChange={(event) => setOrganizationData({ ...organizationData, name: event.target.value })}
                    />
                  </div>
                  <div>
                    <label className="label-text">Organization Logo</label>
                    <label className="flex h-14 items-center justify-center rounded-2xl border border-slate-200 px-5 text-sm font-bold text-slate-600 hover:border-indigo-200 hover:text-indigo-600">
                      Upload Logo
                      <input type="file" className="hidden" accept="image/*" onChange={handleOrganizationLogoChange} />
                    </label>
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between">
                  {organizationSuccess && (
                    <p className="text-emerald-600 font-bold flex items-center gap-2 animate-in">
                      <ShieldCheck className="w-5 h-5" />
                      Organization Updated Successfully!
                    </p>
                  )}
                  <div className="flex-1" />
                  <button type="submit" disabled={savingOrganization} className="btn-primary min-w-[220px] h-14">
                    {savingOrganization ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-5 h-5" /> Save Branding</>}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSettings;

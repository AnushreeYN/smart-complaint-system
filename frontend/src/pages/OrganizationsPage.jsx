import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { Building2, Edit3, Loader2, Plus, Save, Shield, Trash2, Users, Layers3, X } from 'lucide-react';

const emptyForm = {
  name: '',
  logo_url: '',
  admin_full_name: '',
  admin_email: '',
  admin_password: '',
};

const OrganizationsPage = () => {
  const [organizations, setOrganizations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrganization, setEditingOrganization] = useState(null);
  const [formData, setFormData] = useState(emptyForm);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const fetchOrganizations = async () => {
    try {
      const response = await api.get('/organizations/');
      setOrganizations(response.data);
    } catch (error) {
      console.error('Failed to fetch organizations', error);
    } finally {
      setLoading(false);
    }
  };

  const openModal = (organization = null) => {
    setEditingOrganization(organization);
    if (organization) {
      setFormData({
        name: organization.name,
        logo_url: organization.logo_url || '',
        admin_full_name: organization.admin_name || '',
        admin_email: organization.admin_email || '',
        admin_password: '',
      });
    } else {
      setFormData(emptyForm);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingOrganization(null);
    setFormData(emptyForm);
  };

  const handleLogoChange = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => setFormData((current) => ({ ...current, logo_url: reader.result }));
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (editingOrganization) {
        await api.put(`/organizations/${editingOrganization.id}`, {
          name: formData.name,
          logo_url: formData.logo_url || null,
        });
      } else {
        await api.post('/organizations/', formData);
      }
      closeModal();
      await fetchOrganizations();
    } catch (error) {
      alert(error.response?.data?.detail || 'Unable to save this organization.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteOrganization = async (organizationId) => {
    if (!window.confirm('Delete this organization and all of its data?')) return;
    try {
      await api.delete(`/organizations/${organizationId}`);
      await fetchOrganizations();
    } catch (error) {
      alert(error.response?.data?.detail || 'Unable to delete this organization.');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in">
      <div className="premium-card overflow-hidden">
        <div className="grid gap-6 bg-white px-6 py-7 md:grid-cols-[1.45fr_1fr] md:px-8">
          <div>
            <div className="inline-flex items-center gap-2 rounded-lg bg-indigo-50 px-3 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-indigo-700">
              <Shield className="h-4 w-4" />
              Platform Control
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Organizations and Admins</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">
              Provision organizations, assign their first administrator, and monitor every workspace from the superadmin console.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link to="/admin/users" className="outline-button">
                <Users className="h-4 w-4" />
                Manage users
              </Link>
              <Link to="/admin/roles" className="outline-button">
                <Layers3 className="h-4 w-4" />
                Manage roles
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Organizations', value: organizations.length },
              { label: 'Members', value: organizations.reduce((sum, org) => sum + (org.user_count || 0), 0) },
              { label: 'Open tenants', value: organizations.filter((org) => (org.complaint_count || 0) > 0).length },
              { label: 'Branded', value: organizations.filter((org) => org.logo_url).length },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-3xl font-black text-slate-900">{item.value}</p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" onClick={() => openModal()} className="btn-primary h-12 px-6">
          <Plus className="h-5 w-5" />
          Provision Organization
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {organizations.map((organization) => (
        <div key={organization.id} className="premium-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl bg-slate-100">
                  {organization.logo_url ? (
                    <img src={organization.logo_url} alt={organization.name} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-6 w-6 text-slate-500" />
                  )}
                </div>
                <div>
                  <h3 className="text-xl font-black text-slate-900">{organization.name}</h3>
                  <p className="text-sm font-medium text-slate-500">{organization.admin_name || 'No admin assigned yet'}</p>
                </div>
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Members</p>
                <p className="mt-2 text-lg font-black text-slate-900">{organization.user_count || 0}</p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Cases</p>
                <p className="mt-2 text-lg font-black text-slate-900">{organization.complaint_count || 0}</p>
              </div>
            </div>

            <p className="mt-5 text-sm text-slate-500">{organization.admin_email || 'Admin email will appear here after provisioning.'}</p>

            <div className="mt-6 flex gap-2">
              <button type="button" onClick={() => openModal(organization)} className="outline-button flex-1 text-xs">
                <Edit3 className="mr-2 inline h-4 w-4" />
                Edit
              </button>
              <button type="button" onClick={() => deleteOrganization(organization.id)} className="inline-flex items-center gap-2 rounded-lg border border-rose-100 px-4 py-3 text-xs font-black text-rose-600 transition hover:bg-rose-50">
                <Trash2 className="mr-2 inline h-4 w-4" />
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 pt-20 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-white px-8 py-7 md:px-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Tenant Provisioning</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{editingOrganization ? 'Update Organization' : 'Create Organization'}</h2>
                </div>
                <button type="button" onClick={closeModal} className="icon-button">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7 p-8 md:p-10">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="label-text">Organization Name</label>
                  <input
                    type="text"
                    required
                    className="input-field"
                    value={formData.name}
                    onChange={(event) => setFormData({ ...formData, name: event.target.value })}
                  />
                </div>

                <div>
                  <label className="label-text">Organization Logo</label>
                  <div className="flex items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-lg bg-white">
                      {formData.logo_url ? (
                        <img src={formData.logo_url} alt="Organization logo preview" className="h-full w-full object-cover" />
                      ) : (
                        <Building2 className="h-5 w-5 text-slate-400" />
                      )}
                    </div>
                    <label className="outline-button cursor-pointer text-xs">
                      Upload Logo
                      <input type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                    </label>
                  </div>
                </div>

                {!editingOrganization && (
                  <>
                    <div>
                      <label className="label-text">Admin Full Name</label>
                      <input
                        type="text"
                        required
                        className="input-field"
                        value={formData.admin_full_name}
                        onChange={(event) => setFormData({ ...formData, admin_full_name: event.target.value })}
                      />
                    </div>

                    <div>
                      <label className="label-text">Admin Email</label>
                      <input
                        type="email"
                        required
                        className="input-field"
                        value={formData.admin_email}
                        onChange={(event) => setFormData({ ...formData, admin_email: event.target.value })}
                      />
                    </div>

                    <div className="md:col-span-2">
                      <label className="label-text">Admin Password</label>
                      <input
                        type="password"
                        required
                        className="input-field"
                        value={formData.admin_password}
                        onChange={(event) => setFormData({ ...formData, admin_password: event.target.value })}
                      />
                    </div>
                  </>
                )}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary h-12 w-full">
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Save Organization</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizationsPage;

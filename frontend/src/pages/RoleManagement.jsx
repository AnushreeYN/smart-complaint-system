import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Check,
  ChevronDown,
  Layers3,
  Loader2,
  Plus,
  Save,
  Search,
  Shield,
  Trash2,
  X,
} from 'lucide-react';

const RoleManagement = () => {
  const { user } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissionCatalog, setPermissionCatalog] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [newRoleName, setNewRoleName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const isSuperAdmin = user?.role === 'super_admin';

  useEffect(() => {
    if (!isSuperAdmin) return;
    fetchOrganizations();
  }, [isSuperAdmin]);

  useEffect(() => {
    fetchData();
  }, [selectedOrganizationId]);

  const fetchOrganizations = async () => {
    try {
      const response = await api.get('/organizations/');
      setOrganizations(response.data);
      if (!selectedOrganizationId && response.data.length) {
        setSelectedOrganizationId(response.data[0].id);
      }
    } catch (error) {
      console.error('Failed to fetch organizations', error);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const query = isSuperAdmin && selectedOrganizationId ? `?organization_id=${selectedOrganizationId}` : '';
      const [rolesResponse, permissionsResponse] = await Promise.all([
        api.get(`/roles${query}`),
        api.get('/roles/permissions'),
      ]);
      setRoles(rolesResponse.data);
      setPermissionCatalog(permissionsResponse.data);
    } catch (error) {
      console.error('Failed to fetch roles', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredRoles = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return roles;
    return roles.filter((role) =>
      [role.name, role.permissions]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [roles, search]);

  const togglePermission = (permissionId) => {
    setSelectedPermissions((previous) =>
      previous.includes(permissionId)
        ? previous.filter((permission) => permission !== permissionId)
        : [...previous, permissionId]
    );
  };

  const createRole = async (event) => {
    event.preventDefault();
    if (!newRoleName.trim()) return;

    setIsSubmitting(true);
    try {
      await api.post('/roles', {
        name: newRoleName.trim(),
        permissions: selectedPermissions.join(','),
        organization_id: isSuperAdmin ? selectedOrganizationId : undefined,
      });
      setNewRoleName('');
      setSelectedPermissions([]);
      setIsModalOpen(false);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create role.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRole = async (roleId) => {
    if (!window.confirm('Delete this role pack?')) return;
    try {
      await api.delete(`/roles/${roleId}`);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Cannot delete role.');
    }
  };

  const permissionCount = selectedPermissions.length;

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
              <Layers3 className="h-4 w-4" />
              Permission Architecture
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Organization Role Packs</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">
              Build reusable access bundles for admins, staff, and resolution teams inside a selected organization.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Role packs', value: roles.length },
              { label: 'Permission types', value: permissionCatalog.length },
              { label: 'Selected', value: permissionCount },
              { label: 'Reusable access', value: roles.filter((role) => role.permissions).length },
            ].map((item) => (
              <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/80 p-4">
                <p className="text-3xl font-black text-slate-900">{item.value}</p>
                <p className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 md:flex-row">
          {isSuperAdmin && (
            <div className="relative w-full md:w-72">
              <select
                className="input-field appearance-none pl-11"
                value={selectedOrganizationId}
                onChange={(event) => setSelectedOrganizationId(event.target.value)}
              >
                {organizations.map((organization) => (
                  <option key={organization.id} value={organization.id}>
                    {organization.name}
                  </option>
                ))}
              </select>
              <Building2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            </div>
          )}
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
          <input
            type="text"
            className="input-field pl-11"
            placeholder="Search role packs or permissions"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        </div>

        <button type="button" onClick={() => setIsModalOpen(true)} disabled={isSuperAdmin && !selectedOrganizationId} className="btn-primary h-12 px-6">
          <Plus className="h-5 w-5" />
          Create Role Pack
        </button>
      </div>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredRoles.map((role) => (
          <div key={role.id} className="premium-card p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="mt-5 text-2xl font-black text-slate-900">{role.name}</h3>
                <p className="mt-2 text-xs font-black uppercase tracking-[0.24em] text-slate-400">
                  {role.permissions ? `${role.permissions.split(',').length} effective permissions` : 'No custom permissions'}
                </p>
              </div>
              <button type="button" onClick={() => deleteRole(role.id)} className="icon-button border-rose-100 text-rose-600 hover:bg-rose-50 hover:text-rose-600">
                <Trash2 className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              {role.permissions ? (
                role.permissions.split(',').map((permission) => (
                  <span key={permission} className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600">
                    {permission}
                  </span>
                ))
              ) : (
                <span className="text-sm font-medium text-slate-400">No additional permissions configured yet.</span>
              )}
            </div>

            <p className="mt-6 text-xs font-medium text-slate-400">
              Created {new Date(role.created_at).toLocaleDateString()}
            </p>
          </div>
        ))}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 pt-20 backdrop-blur-sm">
          <div className="w-full max-w-3xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-white px-8 py-7 md:px-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Access Design Studio</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">Build a New Role Pack</h2>
                </div>
                <button type="button" onClick={() => setIsModalOpen(false)} className="icon-button">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={createRole} className="space-y-8 p-8 md:p-10">
              <div>
                <label className="label-text">Role Pack Name</label>
                <input
                  type="text"
                  required
                  className="input-field"
                  placeholder="Operations Manager, Quality Lead, Resolution Owner"
                  value={newRoleName}
                  onChange={(event) => setNewRoleName(event.target.value)}
                />
              </div>

              <div>
                <label className="label-text">Permission Blueprint</label>
                <div className="grid gap-4 md:grid-cols-2">
                  {permissionCatalog.map((permission) => {
                    const active = selectedPermissions.includes(permission.id);
                    return (
                      <button
                        key={permission.id}
                        type="button"
                        onClick={() => togglePermission(permission.id)}
                        className={`rounded-xl border p-5 text-left transition-all ${
                          active
                            ? 'border-indigo-200 bg-indigo-50 ring-2 ring-indigo-500/10'
                            : 'border-slate-100 bg-white hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`mt-1 flex h-7 w-7 items-center justify-center rounded-xl ${active ? 'bg-indigo-600 text-white' : 'bg-slate-100 text-transparent'}`}>
                            <Check className="h-4 w-4" />
                          </div>
                          <div>
                            <p className={`text-sm font-black ${active ? 'text-indigo-700' : 'text-slate-800'}`}>{permission.label}</p>
                            <p className="mt-1 text-xs font-medium leading-6 text-slate-500">{permission.description}</p>
                            <p className="mt-3 text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">{permission.id}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-[10px] font-black uppercase tracking-[0.24em] text-slate-400">Selected scope</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {selectedPermissions.length ? (
                    selectedPermissions.map((permission) => (
                      <span key={permission} className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 shadow-sm">
                        {permission}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm font-medium text-slate-400">Choose one or more permissions to define this role pack.</span>
                  )}
                </div>
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary h-12 w-full">
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Save Role Pack</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RoleManagement;

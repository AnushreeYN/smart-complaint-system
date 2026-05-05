import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import {
  BadgeCheck,
  ChevronDown,
  Loader2,
  Mail,
  Plus,
  Save,
  Search,
  Trash2,
  UserRound,
  Users,
  X,
  Building2,
  KeyRound,
  Phone,
} from 'lucide-react';

const emptyForm = {
  email: '',
  full_name: '',
  phone_number: '',
  password: '',
  confirm_password: '',
  role: 'user',
  role_id: '',
  organization_id: '',
};

const UserManagement = () => {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [organizations, setOrganizations] = useState([]);
  const [selectedOrganizationId, setSelectedOrganizationId] = useState('');
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState(emptyForm);
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
    } catch (error) {
      console.error('Failed to fetch organizations', error);
    }
  };

  const fetchRolesForOrganization = async (organizationId) => {
    if (!organizationId) {
      setRoles([]);
      return;
    }
    try {
      const response = await api.get(`/roles?organization_id=${organizationId}`);
      setRoles(response.data);
    } catch (error) {
      console.error('Failed to fetch organization roles', error);
      setRoles([]);
    }
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      const query = isSuperAdmin && selectedOrganizationId ? `?organization_id=${selectedOrganizationId}` : '';
      const [usersResponse, rolesResponse] = await Promise.all([
        api.get(`/users/${query}`),
        api.get(`/roles${query}`),
      ]);
      setUsers(usersResponse.data);
      setRoles(rolesResponse.data);
    } catch (error) {
      console.error('Failed to fetch team data', error);
    } finally {
      setLoading(false);
    }
  };

  const filteredUsers = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return users;
    return users.filter((user) =>
      [user.full_name, user.email, user.custom_role_name, user.role]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [users, search]);

  const openModal = (user = null) => {
    if (user) {
      if (isSuperAdmin) fetchRolesForOrganization(user.organization_id);
      setEditingUser(user);
      setFormData({
        email: user.email,
        full_name: user.full_name || '',
        phone_number: user.phone_number || '',
        password: '',
        confirm_password: '',
        role: user.role,
        role_id: user.role_id || '',
        organization_id: user.organization_id || '',
      });
    } else {
      if (isSuperAdmin && selectedOrganizationId) fetchRolesForOrganization(selectedOrganizationId);
      setEditingUser(null);
      setFormData({
        ...emptyForm,
        organization_id: isSuperAdmin ? selectedOrganizationId || '' : user?.organization_id || '',
      });
    }
    setIsModalOpen(true);
  };

  const handleOrganizationChange = (organizationId) => {
    setFormData({ ...formData, organization_id: organizationId, role_id: '' });
    fetchRolesForOrganization(organizationId);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingUser(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      if (!editingUser && formData.password !== formData.confirm_password) {
        alert('Password and verification password do not match.');
        setIsSubmitting(false);
        return;
      }

      const payload = {
        email: formData.email,
        full_name: formData.full_name,
        phone_number: formData.phone_number,
        role: formData.role,
        role_id: formData.role_id || null,
      };

      if (!editingUser) {
        if (isSuperAdmin) payload.organization_id = formData.organization_id || null;
        payload.password = formData.password;
        await api.post('/users/', payload);
      } else {
        if (formData.password) payload.password = formData.password;
        await api.put(`/users/${editingUser.id}`, payload);
      }

      closeModal();
      if (!editingUser && isSuperAdmin && payload.organization_id && selectedOrganizationId !== payload.organization_id) {
        setSelectedOrganizationId(payload.organization_id);
      } else {
        await fetchData();
      }
    } catch (error) {
      alert(error.response?.data?.detail || 'Action failed. Please review the form.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteUser = async (userId) => {
    if (!window.confirm('Delete this team member?')) return;
    try {
      await api.delete(`/users/${userId}`);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to delete user.');
    }
  };

  const selectedRole = roles.find((role) => role.id === formData.role_id);
  const selectedOrganization = organizations.find((organization) => organization.id === formData.organization_id);
  const organizationNameForForm = isSuperAdmin
    ? selectedOrganization?.name || editingUser?.organization_name
    : user?.organization_name;

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
              <Users className="h-4 w-4" />
              Identity Control
            </div>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-900">Users and Admin Assignment</h1>
            <p className="mt-3 max-w-2xl text-sm font-medium leading-7 text-slate-500">
              Create organization admins, invite staff, and apply role packs from one clear workspace.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {[
              { label: 'Members', value: users.length },
              { label: 'Admins', value: users.filter((user) => user.role === 'admin').length },
              { label: 'Staff', value: users.filter((user) => user.role === 'staff').length },
              { label: 'Custom roles', value: users.filter((user) => user.custom_role_name).length },
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
                <option value="">All organizations</option>
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
              placeholder="Search people, email, role pack"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>
        </div>

        <button type="button" onClick={() => openModal()} className="btn-primary h-12 px-6">
          <Plus className="h-5 w-5" />
          Add Team Member
        </button>
      </div>

      <div className="premium-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em]">Member</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em]">Access Model</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em]">Permissions</th>
                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-[0.18em]">Joined</th>
                <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-[0.18em]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredUsers.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/60">
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-4">
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-indigo-50 font-black text-indigo-700">
                        {user.profile_photo ? (
                          <img src={user.profile_photo} alt={user.full_name || user.email} className="h-full w-full object-cover" />
                        ) : (
                          (user.full_name || user.email)[0].toUpperCase()
                        )}
                      </div>
                      <div>
                        <p className="font-bold text-slate-900">{user.full_name || 'No name'}</p>
                        <p className="text-sm font-medium text-slate-500">{user.email}</p>
                        {user.phone_number && (
                          <p className="mt-1 text-xs font-bold text-slate-400">{user.phone_number}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="space-y-2">
                      <span className="inline-flex rounded-md bg-slate-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-slate-600">
                        {user.role}
                      </span>
                      <p className="text-sm font-bold text-indigo-700">{user.custom_role_name || 'Base system role only'}</p>
                      {isSuperAdmin && (
                        <p className="text-xs font-bold text-slate-400">{user.organization_name || 'No organization'}</p>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex max-w-xl flex-wrap gap-2">
                      {user.permissions.map((permission) => (
                        <span key={permission} className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700">
                          {permission.split(':')[1]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-sm font-medium text-slate-500">
                    {new Date(user.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex justify-end gap-2">
                      <button type="button" onClick={() => openModal(user)} className="outline-button py-2 text-xs">
                        Edit
                      </button>
                      <button type="button" onClick={() => deleteUser(user.id)} className="inline-flex items-center gap-1 rounded-lg border border-rose-100 px-3 py-2 text-xs font-black text-rose-600 transition hover:bg-rose-50">
                        <Trash2 className="inline h-3.5 w-3.5" /> Remove
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 pt-20 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-xl bg-white shadow-2xl">
            <div className="border-b border-slate-200 bg-white px-8 py-7 md:px-10">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600">Identity & Access</p>
                  <h2 className="mt-2 text-2xl font-black text-slate-950">{editingUser ? 'Update Team Member' : 'Create Team Member'}</h2>
                </div>
                <button type="button" onClick={closeModal} className="icon-button">
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-7 p-8 md:p-10">
              <div className="grid gap-6 md:grid-cols-2">
                <div>
                  <label className="label-text">User Name</label>
                  <div className="relative">
                    <UserRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      className="input-field pl-12"
                      value={formData.full_name}
                      onChange={(event) => setFormData({ ...formData, full_name: event.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="label-text">Email</label>
                  <div className="relative">
                    <Mail className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      required
                      className="input-field pl-12"
                      value={formData.email}
                      onChange={(event) => setFormData({ ...formData, email: event.target.value })}
                    />
                  </div>
                </div>

                <div className="md:col-span-2">
                  <label className="label-text">Phone Number</label>
                  <div className="relative">
                    <Phone className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    <input
                      type="tel"
                      className="input-field pl-12"
                      placeholder="+91 98765 43210"
                      value={formData.phone_number}
                      onChange={(event) => setFormData({ ...formData, phone_number: event.target.value })}
                    />
                  </div>
                </div>

                {!editingUser && (
                  <>
                    <div>
                      <label className="label-text">Password</label>
                      <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          required
                          className="input-field pl-12"
                          value={formData.password}
                          onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label className="label-text">Verify Password</label>
                      <div className="relative">
                        <KeyRound className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                        <input
                          type="password"
                          required
                          className="input-field pl-12"
                          value={formData.confirm_password}
                          onChange={(event) => setFormData({ ...formData, confirm_password: event.target.value })}
                        />
                      </div>
                    </div>
                  </>
                )}

                {isSuperAdmin && !editingUser && (
                  <div className="md:col-span-2">
                    <label className="label-text">Organization</label>
                    <div className="relative">
                      <select
                        className="input-field appearance-none"
                        required
                        value={formData.organization_id}
                        onChange={(event) => handleOrganizationChange(event.target.value)}
                      >
                        <option value="">Select organization</option>
                        {organizations.map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                    </div>
                  </div>
                )}

                {(isSuperAdmin && editingUser) && (
                  <div className="md:col-span-2">
                    <label className="label-text">Organization</label>
                    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-500">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {selectedOrganization?.name || editingUser.organization_name || 'Assigned organization'}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          Organization is fixed after user creation.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {!isSuperAdmin && (
                  <div className="md:col-span-2">
                    <label className="label-text">Organization</label>
                    <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-white text-slate-500">
                        <Building2 className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-900">
                          {organizationNameForForm || 'Your organization'}
                        </p>
                        <p className="text-xs font-medium text-slate-500">
                          New users are created inside your organization.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {editingUser && (
                  <div className="md:col-span-2">
                    <label className="label-text">Reset Password</label>
                    <input
                      type="password"
                      className="input-field"
                      placeholder="Leave blank to keep the current password"
                      value={formData.password}
                      onChange={(event) => setFormData({ ...formData, password: event.target.value })}
                    />
                  </div>
                )}

                <div>
                  <label className="label-text">Role</label>
                  <div className="relative">
                    <select
                      className="input-field appearance-none"
                      required
                      value={formData.role}
                      onChange={(event) => setFormData({ ...formData, role: event.target.value })}
                    >
                      <option value="user">Standard User</option>
                      <option value="staff">Staff Member</option>
                      <option value="admin">Administrator</option>
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>

                <div>
                  <label className="label-text">Custom Role Pack</label>
                  <div className="relative">
                    <select
                      className="input-field appearance-none"
                      value={formData.role_id}
                      onChange={(event) => setFormData({ ...formData, role_id: event.target.value })}
                      disabled={isSuperAdmin && !formData.organization_id}
                    >
                      <option value="">
                        {isSuperAdmin && !formData.organization_id ? 'Select organization first' : 'No custom pack'}
                      </option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <BadgeCheck className="h-5 w-5 text-indigo-600" />
                  <div>
                    <p className="text-sm font-black text-slate-900">Effective Access Preview</p>
                    <p className="text-xs font-medium text-slate-500">
                      Base role: {formData.role}. Custom pack: {selectedRole?.name || 'None'}.
                    </p>
                  </div>
                </div>
                {selectedRole?.permissions && (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {selectedRole.permissions.split(',').map((permission) => (
                      <span key={permission} className="rounded-full bg-white px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em] text-slate-600 shadow-sm">
                        {permission}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button type="submit" disabled={isSubmitting} className="btn-primary h-12 w-full">
                {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> Save Team Member</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;

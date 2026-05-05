import React, { useEffect, useMemo, useState } from 'react';
import api from '../api/axios';
import ComplaintWorkbenchModal from '../components/ComplaintWorkbenchModal';
import { useAuth } from '../context/AuthContext';
import { hasPermission } from '../utils/permissions';
import {
  Activity,
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  Loader2,
  Search,
  Shield,
  Sparkles,
  UserCheck,
  Users,
} from 'lucide-react';

const STATUS_OPTIONS = ['all', 'pending', 'in_progress', 'resolved', 'closed'];

const statusTone = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  resolved: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-200',
};

const AdminPanel = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState(null);
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [savingComplaint, setSavingComplaint] = useState(false);
  const [deletingComplaint, setDeletingComplaint] = useState(false);

  const canAssign = hasPermission(user, 'complaints:assign');
  const canDelete = hasPermission(user, 'complaints:delete');
  const canSelfAssignComplaint = (complaint) =>
    user.role === 'staff' &&
    !complaint.assigned_to &&
    complaint.organization_id === user.organization_id;
  const canEditComplaintWork = (complaint) =>
    !complaint.assigned_to ||
    complaint.assigned_to === user.id ||
    complaint.user_id === user.id;

  useEffect(() => {
    fetchData();
  }, [filterStatus, canAssign]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const complaintUrl =
        filterStatus === 'all' ? '/complaints/' : `/complaints/?status=${filterStatus}`;
      const requests = [api.get(complaintUrl)];
      if (canAssign) {
        requests.push(api.get('/users/'));
      }

      const [complaintResponse, usersResponse] = await Promise.all(requests);
      setComplaints(complaintResponse.data);
      setUsers(usersResponse?.data || []);
    } catch (error) {
      console.error('Failed to fetch operations data', error);
    } finally {
      setLoading(false);
    }
  };

  const teamResponders = useMemo(
    () => users.filter((member) => member.role === 'staff' || member.role === 'admin'),
    [users]
  );

  const filteredComplaints = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return complaints;
    return complaints.filter((complaint) =>
      [complaint.title, complaint.description, complaint.reporter_name, complaint.assigned_staff_name]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(normalizedSearch))
    );
  }, [complaints, search]);

  const updateComplaint = async (complaintId, payload) => {
    setBusyId(complaintId);
    try {
      await api.put(`/complaints/${complaintId}`, payload);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Unable to update this complaint right now.');
    } finally {
      setBusyId(null);
    }
  };

  const saveComplaint = async (payload) => {
    if (!activeComplaint) return;
    setSavingComplaint(true);
    try {
      await api.put(`/complaints/${activeComplaint.id}`, payload);
      setActiveComplaint(null);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Unable to update this complaint.');
    } finally {
      setSavingComplaint(false);
    }
  };

  const deleteComplaint = async () => {
    if (!activeComplaint) return;
    if (!window.confirm('Delete this complaint?')) return;
    setDeletingComplaint(true);
    try {
      await api.delete(`/complaints/${activeComplaint.id}`);
      setActiveComplaint(null);
      await fetchData();
    } catch (error) {
      alert(error.response?.data?.detail || 'Unable to delete this complaint.');
    } finally {
      setDeletingComplaint(false);
    }
  };

  const summary = {
    total: complaints.length,
    open: complaints.filter((complaint) => !['resolved', 'closed'].includes(complaint.status)).length,
    resolved: complaints.filter((complaint) => complaint.status === 'resolved').length,
    assigned: complaints.filter((complaint) => complaint.assigned_to).length,
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="page-panel p-6 md:p-8">
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-3xl">
              <div className="soft-badge">
                <Sparkles className="h-4 w-4" />
                Live Operations Workspace
              </div>
              <div>
                <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Organization Command Center</h1>
                <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500">
                  {user.organization_name || 'Workspace'} incidents, responder assignment, and resolution flow in one place.
                </p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              {[
                { label: 'Total cases', value: summary.total, icon: Activity },
                { label: 'Open now', value: summary.open, icon: AlertCircle },
                { label: 'Resolved', value: summary.resolved, icon: CheckCircle2 },
                { label: 'Assigned', value: summary.assigned, icon: UserCheck },
              ].map((item) => (
                <div key={item.label} className="rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-5">
                  <item.icon className="h-5 w-5 text-indigo-600" />
                  <p className="mt-4 text-3xl font-black text-slate-950">{item.value}</p>
                  <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="relative w-full max-w-md group">
          <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
          <input
            type="text"
            className="input-field pl-11"
            placeholder="Search incidents, reporters, assignees"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_OPTIONS.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setFilterStatus(status)}
              className={`rounded-lg px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                filterStatus === status
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'bg-white text-slate-500 border border-slate-200 hover:border-slate-300'
              }`}
            >
              {status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="premium-card flex min-h-[280px] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
          </div>
        ) : filteredComplaints.length === 0 ? (
          <div className="premium-card p-12 text-center">
            <Shield className="mx-auto h-10 w-10 text-indigo-500" />
            <h3 className="mt-5 text-2xl font-black text-slate-900">No incidents match this view</h3>
            <p className="mt-2 text-sm font-medium text-slate-500">
              Change the filters or search query to inspect a different part of the workload.
            </p>
          </div>
        ) : (
          filteredComplaints.map((complaint) => (
            <div key={complaint.id} className="page-panel p-6 md:p-7">
              <div className="flex flex-col gap-6 xl:flex-row xl:items-center xl:justify-between">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className={`rounded-lg border px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] ${statusTone[complaint.status] || statusTone.closed}`}>
                      {complaint.status.replace('_', ' ')}
                    </span>
                    <span className="rounded-lg bg-slate-100 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.16em] text-slate-500">
                      {complaint.priority}
                    </span>
                    <span className="text-xs font-bold text-slate-400">#{String(complaint.id).slice(0, 8)}</span>
                  </div>

                  <div>
                    <h3 className="text-2xl font-black text-slate-900">{complaint.title}</h3>
                    <p className="mt-2 max-w-3xl text-sm leading-7 text-slate-500">{complaint.description}</p>
                  </div>

                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Organization</p>
                      <p className="mt-2 text-sm font-bold text-slate-700">{complaint.organization_name || 'Global'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Reporter</p>
                      <p className="mt-2 text-sm font-bold text-slate-700">{complaint.reporter_name || 'Unknown reporter'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Assigned to</p>
                      <p className="mt-2 text-sm font-bold text-slate-700">{complaint.assigned_staff_name || 'Unassigned'}</p>
                    </div>
                    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Updated</p>
                      <p className="mt-2 text-sm font-bold text-slate-700">
                        {new Date(complaint.updated_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="w-full xl:max-w-sm">
                  <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-5">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Action rail</p>
                    <div className="mt-4 grid gap-3">
                      <div>
                        <label className="label-text">Status</label>
                        <div className="grid grid-cols-2 gap-2">
                          {['pending', 'in_progress', 'resolved', 'closed'].map((status) => (
                            <button
                              key={status}
                              type="button"
                              disabled={busyId === complaint.id || !canEditComplaintWork(complaint)}
                              onClick={() => updateComplaint(complaint.id, { status })}
                              className={`rounded-lg px-3 py-3 text-xs font-black uppercase tracking-[0.14em] transition-all ${
                                complaint.status === status
                                  ? 'bg-indigo-600 text-white'
                                  : 'bg-white border border-slate-200 text-slate-500 hover:border-indigo-200 hover:text-indigo-600'
                              }`}
                            >
                              {status.replace('_', ' ')}
                            </button>
                          ))}
                        </div>
                      </div>

                      {canAssign && (
                        <div>
                          <label className="label-text">Assign responder</label>
                          <div className="relative">
                            <select
                              className="input-field appearance-none"
                              value={complaint.assigned_to || ''}
                              onChange={(event) =>
                                updateComplaint(complaint.id, {
                                  assigned_to: event.target.value || null,
                                })
                              }
                              disabled={busyId === complaint.id}
                            >
                              <option value="">Unassigned</option>
                              {teamResponders
                                .filter((member) => member.organization_id === complaint.organization_id)
                                .map((member) => (
                                <option key={member.id} value={member.id}>
                                  {member.full_name || member.email}
                                </option>
                              ))}
                            </select>
                            <ChevronDown className="pointer-events-none absolute right-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                          </div>
                        </div>
                      )}

                      {!canAssign && canSelfAssignComplaint(complaint) && (
                        <button
                          type="button"
                          disabled={busyId === complaint.id}
                          onClick={() => updateComplaint(complaint.id, { assigned_to: user.id })}
                          className="btn-primary h-11 w-full text-sm"
                        >
                          Assign to me
                        </button>
                      )}

                      {busyId === complaint.id && (
                        <div className="flex items-center gap-2 rounded-lg bg-indigo-50 px-4 py-3 text-sm font-bold text-indigo-700">
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving live changes...
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => setActiveComplaint(complaint)}
                        className="outline-button w-full text-xs"
                      >
                        Review Full Case
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
      {activeComplaint && (
        <ComplaintWorkbenchModal
          complaint={activeComplaint}
          users={teamResponders.filter((member) => member.organization_id === activeComplaint.organization_id)}
          canAssign={canAssign}
          canSelfAssign={canSelfAssignComplaint(activeComplaint)}
          canEditWork={canEditComplaintWork(activeComplaint)}
          currentUserId={user.id}
          canDelete={canDelete}
          saving={savingComplaint}
          deleting={deletingComplaint}
          onClose={() => setActiveComplaint(null)}
          onSave={saveComplaint}
          onDelete={deleteComplaint}
        />
      )}
    </div>
  );
};

export default AdminPanel;

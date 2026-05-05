import React, { useEffect, useState } from 'react';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import ComplaintWorkbenchModal from '../components/ComplaintWorkbenchModal';
import { hasPermission } from '../utils/permissions';
import { 
  AlertCircle, Clock, CheckCircle2, Search,
  ChevronRight, Calendar,
  Plus, MessageSquare, BarChart3, TrendingUp, ShieldAlert
} from 'lucide-react';
import { Link } from 'react-router-dom';

const Dashboard = () => {
  const { user } = useAuth();
  const [complaints, setComplaints] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
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
    if (!user?.id) return undefined;
    fetchComplaints();
    const token = localStorage.getItem('token');
    if (!token) return undefined;

    const wsBase = (import.meta.env.VITE_WS_URL || 'ws://localhost:8000').replace(/\/$/, '');
    const ws = new WebSocket(`${wsBase}/ws/${user.id}?token=${encodeURIComponent(token)}`);
    ws.onmessage = () => fetchComplaints();
    return () => ws.close();
  }, [user]);

  const fetchComplaints = async () => {
    try {
      const requests = [api.get('/complaints/')];
      if (canAssign) {
        requests.push(api.get('/users/'));
      }

      const [complaintsResponse, usersResponse] = await Promise.all(requests);
      setComplaints(complaintsResponse.data);
      setUsers(usersResponse?.data || []);
    } catch (error) {
      console.error("Failed to fetch complaints", error);
    } finally {
      setLoading(false);
    }
  };

  const saveComplaint = async (payload) => {
    if (!activeComplaint) return;
    setSavingComplaint(true);
    try {
      await api.put(`/complaints/${activeComplaint.id}`, payload);
      setActiveComplaint(null);
      await fetchComplaints();
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
      await fetchComplaints();
    } catch (error) {
      alert(error.response?.data?.detail || 'Unable to delete this complaint.');
    } finally {
      setDeletingComplaint(false);
    }
  };

  const getStatusInfo = (status) => {
    switch (status) {
      case 'pending': return { color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', icon: Clock };
      case 'in_progress': return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: MessageSquare };
      case 'resolved': return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: CheckCircle2 };
      default: return { color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-100', icon: AlertCircle };
    }
  };

  const filteredComplaints = complaints.filter(c => 
    c.title.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );
  const displayName = user.full_name || user.email?.split('@')[0] || 'there';

  if (loading) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 animate-pulse">
      <div className="w-16 h-16 bg-indigo-100 rounded-[2rem] flex items-center justify-center">
        <TrendingUp className="w-8 h-8 text-indigo-600 animate-bounce" />
      </div>
      <p className="text-slate-400 font-black tracking-widest uppercase text-xs">Synchronizing Intelligence...</p>
    </div>
  );

  return (
    <div className="space-y-6 animate-in">
      <div className="page-panel p-6 md:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <span className="soft-badge">
              <TrendingUp className="h-4 w-4" />
              System Overview
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950 md:text-4xl">Good day, {displayName}</h1>
            <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500">
              Monitor complaint volume, response progress, and recent activity from one focused workspace.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative group">
              <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-600" />
              <input
                type="text"
                placeholder="Search incidents"
                className="input-field h-12 min-w-72 pl-11"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            {user.organization_id && (
              <Link to="/complaints/new" className="btn-primary h-12 px-5">
                <Plus className="h-5 w-5" />
                New Report
              </Link>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {[
          { label: 'Active Issues', count: complaints.filter(c => c.status !== 'resolved').length, color: 'text-rose-600', bg: 'bg-rose-50', icon: ShieldAlert, trend: 'Needs attention' },
          { label: 'Resolution Rate', count: complaints.length ? `${Math.round((complaints.filter(c => c.status === 'resolved').length/complaints.length)*100)}%` : '0%', color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2, trend: 'Resolved cases' },
          { label: 'Average Time', count: '4.2h', color: 'text-indigo-600', bg: 'bg-indigo-50', icon: BarChart3, trend: 'Current estimate' },
        ].map((stat, idx) => (
          <div key={idx} className="metric-card">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h4 className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">{stat.label}</h4>
                <p className="mt-3 text-3xl font-black text-slate-950">{stat.count}</p>
                <p className="mt-1 text-xs font-bold text-slate-500">{stat.trend}</p>
              </div>
              <div className={`rounded-xl p-3 ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-5 w-5" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8">
        <div className="page-panel overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h3 className="text-lg font-black text-slate-950">Incident Stream</h3>
              <p className="mt-1 text-xs font-medium text-slate-500">{filteredComplaints.length} records in this view</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50">
                  <th className="table-head-cell">Incident Details</th>
                  <th className="table-head-cell">Priority Status</th>
                  <th className="table-head-cell">Created</th>
                  <th className="table-head-cell text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100/50">
                {filteredComplaints.map((c) => {
                  const status = getStatusInfo(c.status);
                  return (
                    <tr key={c.id} className="group hover:bg-slate-50/50 transition-all duration-300">
                      <td className="table-body-cell">
                        <div className="flex flex-col">
                          <span className="text-lg font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">{c.title}</span>
                          <span className="text-sm text-slate-400 mt-1 line-clamp-1">{c.description}</span>
                        </div>
                      </td>
                      <td className="table-body-cell">
                        <div className="flex items-center gap-4">
                          <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-wider border ${status.bg} ${status.color} ${status.border}`}>
                            {c.status.replace('_', ' ')}
                          </div>
                          <div className={`w-2 h-2 rounded-full ${
                            c.priority === 'critical' ? 'bg-rose-500 shadow-lg shadow-rose-200' :
                            c.priority === 'high' ? 'bg-orange-500' : 'bg-slate-300'
                          }`} />
                        </div>
                      </td>
                      <td className="table-body-cell">
                        <div className="flex items-center gap-2 text-slate-500 font-bold text-sm">
                          <Calendar className="w-4 h-4 text-slate-300" />
                          {new Date(c.created_at).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                        </div>
                      </td>
                      <td className="table-body-cell text-right">
                        <button
                          type="button"
                          onClick={() => setActiveComplaint(c)}
                          className="icon-button"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
      {activeComplaint && (
        <ComplaintWorkbenchModal
          complaint={activeComplaint}
          users={users.filter(
            (member) =>
              (member.role === 'staff' || member.role === 'admin') &&
              member.organization_id === activeComplaint.organization_id
          )}
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

export default Dashboard;

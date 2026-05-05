import React, { useEffect, useState } from 'react';
import { Bot, Camera, ChevronDown, Loader2, Save, Trash2, Upload, Video, X } from 'lucide-react';
import api from '../api/axios';

const readFilesAsDataUrls = (files) =>
  Promise.all(
    Array.from(files || []).map(
      (file) =>
        new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        })
    )
  );

const ComplaintWorkbenchModal = ({
  complaint,
  users = [],
  canAssign = false,
  canSelfAssign = false,
  canEditWork = true,
  currentUserId,
  canDelete = false,
  onClose,
  onSave,
  onDelete,
  saving = false,
  deleting = false,
}) => {
  const [aiReport, setAiReport] = useState(null);
  const [loadingAiReport, setLoadingAiReport] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    status: 'pending',
    assigned_to: '',
    photo_urls: [],
    video_urls: [],
    audio_url: '',
    voice_transcript: '',
  });

  useEffect(() => {
    if (!complaint) return;
    setFormData({
      title: complaint.title || '',
      description: complaint.description || '',
      priority: complaint.priority || 'medium',
      status: complaint.status || 'pending',
      assigned_to: complaint.assigned_to || '',
      photo_urls: complaint.photo_urls || [],
      video_urls: complaint.video_urls || [],
      audio_url: complaint.audio_url || '',
      voice_transcript: complaint.voice_transcript || '',
    });
    setAiReport(null);
  }, [complaint]);

  if (!complaint) return null;

  const handleSubmit = async (event) => {
    event.preventDefault();
    const payload = {};
    if (canEditWork) {
      payload.title = formData.title;
      payload.description = formData.description;
      payload.priority = formData.priority;
      payload.status = formData.status;
      payload.photo_urls = formData.photo_urls;
      payload.video_urls = formData.video_urls;
      payload.audio_url = formData.audio_url || null;
      payload.voice_transcript = formData.voice_transcript || null;
    }
    if (canAssign) {
      payload.assigned_to = formData.assigned_to || null;
    } else if (canSelfAssign) {
      payload.assigned_to = currentUserId;
    }
    await onSave(payload);
  };

  const addMedia = async (event, field) => {
    const dataUrls = await readFilesAsDataUrls(event.target.files);
    setFormData((current) => ({ ...current, [field]: [...current[field], ...dataUrls] }));
    event.target.value = '';
  };

  const generateAiReport = async () => {
    setLoadingAiReport(true);
    try {
      const response = await api.get(`/complaints/${complaint.id}/ai-report`);
      setAiReport(response.data);
    } catch (error) {
      alert(error.response?.data?.detail || 'Unable to generate AI report.');
    } finally {
      setLoadingAiReport(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-slate-950/45 p-4 pt-20 backdrop-blur-sm">
      <div className="w-full max-w-3xl overflow-hidden rounded-[2.5rem] bg-white shadow-2xl">
        <div className="bg-[linear-gradient(135deg,#0f172a_0%,#312e81_100%)] px-8 py-8 text-white md:px-10">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-200">Case Workbench</p>
              <h2 className="mt-3 text-3xl font-black">{complaint.title}</h2>
              <p className="mt-2 text-sm font-medium text-slate-300">
                {complaint.organization_name ? `${complaint.organization_name} | ` : ''}
                {complaint.reporter_name || 'Unknown reporter'}
              </p>
            </div>
            <button onClick={onClose} className="rounded-2xl p-2 hover:bg-white/10">
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-7 p-8 md:p-10">
          <div className="grid gap-6 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className="label-text">Title</label>
              <input
                type="text"
                required
                className="input-field"
                disabled={!canEditWork}
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              />
            </div>

            <div className="md:col-span-2">
              <label className="label-text">Description</label>
              <textarea
                rows="6"
                required
                className="input-field resize-none"
                disabled={!canEditWork}
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              />
            </div>

            <div>
              <label className="label-text">Priority</label>
              <div className="relative">
                <select
                  className="input-field appearance-none"
                  disabled={!canEditWork}
                  value={formData.priority}
                  onChange={(event) => setFormData({ ...formData, priority: event.target.value })}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="critical">Critical</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div>
              <label className="label-text">Status</label>
              <div className="relative">
                <select
                  className="input-field appearance-none"
                  disabled={!canEditWork}
                  value={formData.status}
                  onChange={(event) => setFormData({ ...formData, status: event.target.value })}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  <option value="closed">Closed</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              </div>
            </div>

            <div className="md:col-span-2">
              <label className="label-text">Voice Transcript</label>
              <textarea
                rows="3"
                className="input-field resize-none"
                disabled={!canEditWork}
                value={formData.voice_transcript}
                onChange={(event) => setFormData({ ...formData, voice_transcript: event.target.value })}
              />
            </div>

            <div className="md:col-span-2 rounded-xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-black text-slate-950">Evidence and AI Monitoring</p>
                  <p className="mt-1 text-xs font-medium text-slate-500">
                    Photos: {formData.photo_urls.length} | Videos: {formData.video_urls.length} | Audio: {formData.audio_url ? 'Attached' : 'None'}
                  </p>
                </div>
                {canEditWork && (
                  <div className="flex flex-wrap gap-2">
                    <label className="outline-button cursor-pointer text-xs">
                      <Camera className="h-4 w-4" />
                      Photos
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => addMedia(event, 'photo_urls')} />
                    </label>
                    <label className="outline-button cursor-pointer text-xs">
                      <Video className="h-4 w-4" />
                      Videos
                      <input type="file" accept="video/*" multiple className="hidden" onChange={(event) => addMedia(event, 'video_urls')} />
                    </label>
                    <label className="outline-button cursor-pointer text-xs">
                      <Upload className="h-4 w-4" />
                      Audio
                      <input
                        type="file"
                        accept="audio/*"
                        className="hidden"
                        onChange={async (event) => {
                          const [audio] = await readFilesAsDataUrls(event.target.files);
                          setFormData({ ...formData, audio_url: audio || '' });
                          event.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}
              </div>

              {(complaint.ai_summary || complaint.ai_recommendation) && (
                <div className="mt-4 rounded-xl border border-indigo-100 bg-white p-4">
                  <div className="flex items-center gap-2">
                    <Bot className="h-4 w-4 text-indigo-600" />
                    <p className="text-sm font-black text-slate-950">AI Case Intelligence</p>
                  </div>
                  {complaint.ai_summary && <p className="mt-3 text-sm font-medium leading-6 text-slate-600">{complaint.ai_summary}</p>}
                  <div className="mt-3 flex flex-wrap gap-2">
                    {complaint.ai_category && (
                      <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-black capitalize text-indigo-700">{complaint.ai_category}</span>
                    )}
                    {complaint.ai_risk_score && (
                      <span className="rounded-lg bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700">Risk {complaint.ai_risk_score}</span>
                    )}
                  </div>
                  {complaint.ai_recommendation && (
                    <pre className="mt-3 whitespace-pre-wrap text-xs font-medium leading-6 text-slate-500">{complaint.ai_recommendation}</pre>
                  )}
                </div>
              )}

              <div className="mt-4">
                <button
                  type="button"
                  onClick={generateAiReport}
                  disabled={loadingAiReport}
                  className="outline-button"
                >
                  {loadingAiReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  Generate AI Report
                </button>
              </div>

              {aiReport && (
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Recommended Actions</p>
                    <ul className="mt-3 space-y-2">
                      {aiReport.recommended_actions.map((action) => (
                        <li key={action} className="text-xs font-medium leading-5 text-slate-600">{action}</li>
                      ))}
                    </ul>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-4">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Live Monitoring</p>
                    <ul className="mt-3 space-y-2">
                      {aiReport.live_monitoring.map((item) => (
                        <li key={item} className="text-xs font-medium leading-5 text-slate-600">{item}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {canAssign && (
              <div className="md:col-span-2">
                <label className="label-text">Assigned Responder</label>
                <div className="relative">
                  <select
                    className="input-field appearance-none"
                    value={formData.assigned_to}
                    onChange={(event) => setFormData({ ...formData, assigned_to: event.target.value })}
                  >
                    <option value="">Unassigned</option>
                    {users.map((user) => (
                      <option key={user.id} value={user.id}>
                        {user.full_name || user.email}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-5 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                </div>
              </div>
            )}

            {!canAssign && canSelfAssign && (
              <div className="md:col-span-2 rounded-xl border border-indigo-100 bg-indigo-50 p-4">
                <p className="text-sm font-black text-indigo-900">Assign this case to yourself</p>
                <p className="mt-1 text-xs font-medium leading-5 text-indigo-700">
                  Saving changes will claim this unassigned case and make you the responder.
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t border-slate-100 pt-6 md:flex-row md:items-center md:justify-between">
            {canDelete ? (
              <button
                type="button"
                disabled={deleting || saving}
                onClick={onDelete}
                className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-rose-100 px-6 text-sm font-black uppercase tracking-[0.2em] text-rose-600 hover:bg-rose-50"
              >
                {deleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                Delete Case
              </button>
            ) : <div />}

            <button type="submit" disabled={saving || deleting} className="btn-primary h-14 min-w-[220px]">
              {saving ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Save className="h-5 w-5" /> {canEditWork ? 'Save Changes' : 'Save Assignment'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ComplaintWorkbenchModal;

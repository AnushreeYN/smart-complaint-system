import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axios';
import {
  ArrowLeft,
  Bot,
  Camera,
  CheckCircle,
  FileText,
  Loader2,
  Mic,
  Send,
  Upload,
  Video,
} from 'lucide-react';

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

const CreateComplaint = () => {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'medium',
    voice_transcript: '',
  });
  const [photoUrls, setPhotoUrls] = useState([]);
  const [videoUrls, setVideoUrls] = useState([]);
  const [audioUrl, setAudioUrl] = useState('');
  const [aiPreview, setAiPreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const navigate = useNavigate();

  const evidenceCount = photoUrls.length + videoUrls.length + (audioUrl ? 1 : 0);
  const canAnalyze = useMemo(
    () => formData.voice_transcript.trim().length > 12 || formData.description.trim().length > 12,
    [formData.description, formData.voice_transcript]
  );

  const handleMediaChange = async (event, type) => {
    const dataUrls = await readFilesAsDataUrls(event.target.files);
    if (type === 'photo') setPhotoUrls((current) => [...current, ...dataUrls]);
    if (type === 'video') setVideoUrls((current) => [...current, ...dataUrls]);
    event.target.value = '';
  };

  const startRecording = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data);
    };
    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const reader = new FileReader();
      reader.onloadend = () => setAudioUrl(reader.result);
      reader.readAsDataURL(blob);
      stream.getTracks().forEach((track) => track.stop());
    };
    recorderRef.current = recorder;
    recorder.start();
    setIsRecording(true);
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
    setIsRecording(false);
  };

  const analyzeVoice = async () => {
    setIsAnalyzing(true);
    try {
      const transcript = formData.voice_transcript || formData.description;
      const response = await api.post('/complaints/voice/analyze', { transcript });
      setAiPreview(response.data);
      setFormData((current) => ({
        ...current,
        priority: response.data.recommended_priority || current.priority,
      }));
    } catch (error) {
      alert(error.response?.data?.detail || 'Unable to analyze this report right now.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      await api.post('/complaints/', {
        ...formData,
        photo_urls: photoUrls,
        video_urls: videoUrls,
        audio_url: audioUrl || null,
      });
      navigate('/dashboard');
    } catch (error) {
      alert(error.response?.data?.detail || 'Failed to create complaint.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl animate-in space-y-6">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="outline-button"
      >
        <ArrowLeft className="h-4 w-4" />
        Back
      </button>

      <div className="page-panel overflow-hidden">
        <div className="border-b border-slate-200 bg-white px-6 py-7 md:px-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <span className="soft-badge">
                <FileText className="h-4 w-4" />
                AI Assisted Intake
              </span>
              <h1 className="mt-4 text-3xl font-black tracking-tight text-slate-950">Report an Incident</h1>
              <p className="mt-2 max-w-2xl text-sm font-medium leading-7 text-slate-500">
                Add text, voice, photos, or video. The AI engine will summarize the case, estimate risk, and recommend next actions.
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Evidence</p>
              <p className="mt-1 text-2xl font-black text-slate-950">{evidenceCount}</p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="grid gap-6 p-6 md:grid-cols-[1.3fr_0.7fr] md:p-8">
          <div className="space-y-6">
            <div>
              <label className="label-text">Complaint Title</label>
              <input
                type="text"
                required
                placeholder="e.g., Water leakage near main corridor"
                className="input-field"
                value={formData.title}
                onChange={(event) => setFormData({ ...formData, title: event.target.value })}
              />
            </div>

            <div>
              <label className="label-text">Detailed Description</label>
              <textarea
                required
                rows="6"
                placeholder="What happened? Where is it? Who is affected? What evidence is attached?"
                className="input-field resize-none"
                value={formData.description}
                onChange={(event) => setFormData({ ...formData, description: event.target.value })}
              />
            </div>

            <div>
              <label className="label-text">Voice Transcript</label>
              <textarea
                rows="4"
                placeholder="Type or paste transcript from the recorded voice report."
                className="input-field resize-none"
                value={formData.voice_transcript}
                onChange={(event) => setFormData({ ...formData, voice_transcript: event.target.value })}
              />
              <div className="mt-3 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={isRecording ? stopRecording : startRecording}
                  className={isRecording ? 'inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-bold text-white' : 'outline-button'}
                >
                  <Mic className="h-4 w-4" />
                  {isRecording ? 'Stop Recording' : 'Record Voice'}
                </button>
                <button
                  type="button"
                  onClick={analyzeVoice}
                  disabled={!canAnalyze || isAnalyzing}
                  className="outline-button"
                >
                  {isAnalyzing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Bot className="h-4 w-4" />}
                  Analyze
                </button>
              </div>
            </div>

            <div>
              <label className="label-text">Priority</label>
              <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                {['low', 'medium', 'high', 'critical'].map((priority) => (
                  <button
                    key={priority}
                    type="button"
                    onClick={() => setFormData({ ...formData, priority })}
                    className={`rounded-lg border px-4 py-3 text-sm font-black capitalize transition ${
                      formData.priority === priority
                        ? 'border-indigo-200 bg-indigo-50 text-indigo-700 ring-2 ring-indigo-500/10'
                        : 'border-slate-200 bg-white text-slate-500 hover:border-indigo-200'
                    }`}
                  >
                    {priority}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <aside className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-black text-slate-950">Evidence Capture</p>
              <p className="mt-1 text-xs font-medium leading-5 text-slate-500">
                Attach photos, video, and audio to improve triage quality.
              </p>
              <div className="mt-4 grid gap-3">
                <label className="outline-button cursor-pointer justify-start">
                  <Camera className="h-4 w-4" />
                  Add Photos
                  <input type="file" accept="image/*" multiple className="hidden" onChange={(event) => handleMediaChange(event, 'photo')} />
                </label>
                <label className="outline-button cursor-pointer justify-start">
                  <Video className="h-4 w-4" />
                  Add Videos
                  <input type="file" accept="video/*" multiple className="hidden" onChange={(event) => handleMediaChange(event, 'video')} />
                </label>
                <label className="outline-button cursor-pointer justify-start">
                  <Upload className="h-4 w-4" />
                  Upload Audio
                  <input
                    type="file"
                    accept="audio/*"
                    className="hidden"
                    onChange={async (event) => {
                      const [audio] = await readFilesAsDataUrls(event.target.files);
                      setAudioUrl(audio || '');
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>
            </div>

            {aiPreview && (
              <div className="rounded-xl border border-indigo-100 bg-indigo-50 p-5">
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-indigo-700" />
                  <p className="text-sm font-black text-indigo-950">AI Preview</p>
                </div>
                <p className="mt-3 text-sm font-medium leading-6 text-indigo-900">{aiPreview.summary}</p>
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Risk</p>
                    <p className="mt-1 text-lg font-black text-slate-950">{aiPreview.risk_score}</p>
                  </div>
                  <div className="rounded-lg bg-white p-3">
                    <p className="text-[10px] font-black uppercase tracking-[0.16em] text-slate-400">Category</p>
                    <p className="mt-1 text-lg font-black capitalize text-slate-950">{aiPreview.category}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex items-start gap-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-emerald-800">
              <CheckCircle className="mt-0.5 h-5 w-5" />
              <p className="text-sm font-medium leading-6">Visible only inside your organization workspace.</p>
            </div>

            <button type="submit" disabled={isSubmitting} className="btn-primary h-12 w-full">
              {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Send className="h-5 w-5" /> Submit Report</>}
            </button>
          </aside>
        </form>
      </div>
    </div>
  );
};

export default CreateComplaint;

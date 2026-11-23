import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertCircle,
  Camera,
  Shield,
  FileCheck,
  RotateCcw,
  Clock,
  Send,
  UserCheck,
  AlertTriangle,
  Radio,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { NotConnectedState } from '../../components/ui/NotConnectedState';
import { CameraCapture } from '../../components/camera/CameraCapture';
import { useAuth } from '../../context/AuthContext';

export const StudentAttendance: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<'camera' | 'records' | 'recheck'>('camera');
  const [recheckSubmitted, setRecheckSubmitted] = useState<boolean>(false);
  const [recheckReason, setRecheckReason] = useState<string>('');

  // Sample schedule items from CampusPulse blueprint (Demo Fixtures)
  const sampleSessionRecords = [
    {
      subject: 'Database Management Systems (DBMS)',
      code: 'CS301',
      session: '10:00 – 11:00 AM (Sample)',
      room: 'Room 204',
      faculty: 'Dr. S. Kumar',
      statusNote: 'Session completed in demo schedule',
    },
    {
      subject: 'Computer Networks (CN)',
      code: 'CS302',
      session: '11:00 – 12:00 PM (Sample)',
      room: 'Room 307',
      faculty: 'Prof. Anitha Nair',
      statusNote: 'Session completed in demo schedule',
    },
    {
      subject: 'Java Enterprise Architecture (JAVA)',
      code: 'CS303',
      session: '12:00 – 01:00 PM (Sample)',
      room: 'Room 204',
      faculty: 'Dr. S. Kumar',
      statusNote: 'Session scheduled in demo schedule',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 3"
        title="Attendance & Camera Verification Console"
        description="Demonstrates the Teacher Photo + Student Scan comparison concept from Blueprint Page 5 alongside real browser camera capture."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              Demo Environment
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/student/attendance/subject-wise')}
            >
              Subject Percentages →
            </Button>
          </div>
        }
      />

      {/* Mandatory Technical Honesty Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wide">
              Browser Camera vs Backend Verification Boundary
            </h4>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              Browser camera capture is fully functional via local WebRTC. However, biometric face recognition, server-side vector embedding, and official attendance commits are <strong>NOT YET CONNECTED</strong>. Camera snapshots will not mark attendance until backend models are integrated.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
          Backend Offline
        </span>
      </div>

      {/* Tab Switcher */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-deep border border-glass-border w-fit">
        <button
          onClick={() => setActiveTab('camera')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors focus-ring min-h-[36px] ${
            activeTab === 'camera'
              ? 'bg-teal text-canvas font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Live Browser Camera Test
        </button>

        <button
          onClick={() => setActiveTab('records')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors focus-ring min-h-[36px] ${
            activeTab === 'records'
              ? 'bg-teal text-canvas font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Blueprint Compare Workflow
        </button>

        <button
          onClick={() => setActiveTab('recheck')}
          className={`px-4 py-2 rounded-lg text-xs font-medium transition-colors focus-ring min-h-[36px] ${
            activeTab === 'recheck'
              ? 'bg-teal text-canvas font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          Dispute / Recheck Demo
        </button>
      </div>

      {/* Tab 1: Live Browser Camera Capture Component */}
      {activeTab === 'camera' && (
        <div className="space-y-6">
          <CameraCapture
            title="Browser Camera Capture Component"
            description="Local WebRTC camera testing. Capture, retake, and confirm workflows run entirely in your local browser."
          />

          {/* Honest Service Status Banner */}
          <NotConnectedState
            moduleName="Face Embedding & Biometric Matcher"
            serviceType="Biometric Engine"
            explanation="The camera stream runs in your browser. Server-side vector embeddings, facial matching models, and official institutional database commits are not yet connected in this frontend phase."
          />
        </div>
      )}

      {/* Tab 2: Blueprint Compare Workflow (Educational / Concept Architecture) */}
      {activeTab === 'records' && (
        <div className="space-y-6">
          <SurfacePanel variant="deep" className="p-6 border border-glass-border space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-glass-border">
              <div>
                <span className="text-[11px] font-mono uppercase text-teal">
                  Architecture Concept · Blueprint Page 5
                </span>
                <h3 className="text-base font-semibold text-text-primary mt-0.5">
                  Teacher Photo + Student Scan Compare Flow
                </h3>
                <p className="text-xs text-text-secondary mt-1">
                  Illustrative representation of the multi-modal comparison pipeline
                </p>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-2.5 py-1 rounded border border-amber-500/20">
                Demo Reference
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-center space-y-1">
                <span className="text-[10px] font-mono text-text-muted block">1. Teacher Photo</span>
                <span className="font-semibold text-text-primary">Classroom Group Photo</span>
                <span className="text-[10px] text-text-muted block">Wide field of view</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-center space-y-1">
                <span className="text-[10px] font-mono text-text-muted block">2. Student Scan</span>
                <span className="font-semibold text-text-primary">Registered Face Vector</span>
                <span className="text-[10px] text-text-muted block">Associated to Student ID</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-center space-y-1">
                <span className="text-[10px] font-mono text-teal block">3. Comparison</span>
                <span className="font-semibold text-text-primary">Section Roster Match</span>
                <span className="text-[10px] text-teal block">Cosine Vector Similarity</span>
              </div>
              <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-center space-y-1">
                <span className="text-[10px] font-mono text-amber-400 block">4. Commit State</span>
                <span className="font-semibold text-text-primary">Faculty Review Decision</span>
                <span className="text-[10px] text-amber-400 block">Manual Confirm / Recheck</span>
              </div>
            </div>
          </SurfacePanel>

          {/* Sample Scheduled Sessions List */}
          <div className="space-y-4">
            <h4 className="text-sm font-semibold text-text-primary">
              Sample Scheduled Lecture Sessions (Demo Fixture)
            </h4>

            {sampleSessionRecords.map((item, idx) => (
              <SurfacePanel key={idx} variant="deep" className="p-5 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
                  <div>
                    <h5 className="text-sm font-bold text-text-primary">
                      {item.subject} <span className="font-mono text-xs text-text-muted font-normal">({item.code})</span>
                    </h5>
                    <p className="text-xs text-text-secondary mt-0.5">
                      {item.session} · {item.room} · Faculty: {item.faculty}
                    </p>
                  </div>

                  <StatusPill variant="neutral" label="ATTENDANCE: NOT CONNECTED" />
                </div>

                <div className="flex items-center justify-between text-xs text-text-muted font-mono">
                  <span>Backend State: Offline in UI Prototype</span>
                  <span>{item.statusNote}</span>
                </div>
              </SurfacePanel>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Dispute & Recheck Demo */}
      {activeTab === 'recheck' && (
        <SurfacePanel variant="deep" className="p-6 sm:p-8 max-w-xl space-y-6">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold text-text-primary">
                Student Attendance Recheck Interface (Local Demo)
              </h3>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised text-amber-400 border border-amber-500/20">
                Local UI Preview
              </span>
            </div>
            <p className="text-xs text-text-secondary mt-1 leading-relaxed">
              Local UI demonstration of the “Ask to recheck · Student rescans” branch from Blueprint Page 5. This form operates entirely in local browser memory. No request is actually transmitted to any faculty member or backend server.
            </p>
          </div>

          {recheckSubmitted ? (
            <div className="p-5 rounded-2xl bg-amber-500/10 border border-amber-500/25 space-y-3 text-center">
              <CheckCircle2 className="w-8 h-8 text-amber-400 mx-auto" />
              <h4 className="text-sm font-semibold text-amber-300">
                Sample Recheck Request Formatted (Local Demo Only)
              </h4>
              <p className="text-xs text-text-secondary max-w-sm mx-auto">
                Form validated in local browser state only. No request was submitted to faculty, review queues, or backend services.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setRecheckSubmitted(false)}
              >
                Reset Demo Form
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (recheckReason.trim()) setRecheckSubmitted(true);
              }}
              className="space-y-4"
            >
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">
                  Select Class Session (Sample)
                </label>
                <select className="w-full h-11 bg-surface-deep text-text-primary text-sm rounded-xl border border-input-border px-3.5 focus-ring">
                  <option value="cs301">DBMS (10:00 – 11:00 AM) · Dr. S. Kumar</option>
                  <option value="cs302">CN (11:00 – 12:00 PM) · Prof. Anitha Nair</option>
                  <option value="cs303">JAVA (12:00 – 01:00 PM) · Dr. S. Kumar</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">
                  Explanation & Seat Location
                </label>
                <textarea
                  rows={4}
                  value={recheckReason}
                  onChange={(e) => setRecheckReason(e.target.value)}
                  placeholder="e.g. Seated in Row 3, Seat 4 near window. Face had partial shadow."
                  className="w-full bg-surface-deep text-text-primary text-sm rounded-xl border border-input-border p-3.5 focus-ring placeholder:text-text-muted"
                  required
                />
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full"
                rightIcon={<Send className="w-4 h-4" />}
              >
                Format Local Demo Request (No Backend Submit)
              </Button>
            </form>
          )}
        </SurfacePanel>
      )}
    </div>
  );
};

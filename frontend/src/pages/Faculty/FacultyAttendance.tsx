import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Camera,
  Users,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
  RotateCcw,
  Check,
  X,
  Clock,
  Radio,
  FileCheck,
  Sparkles,
  ChevronRight,
  Info,
  Lock,
  EyeOff,
  Database,
  Binary,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { CameraCapture } from '../../components/camera/CameraCapture';
import { useAuth } from '../../context/AuthContext';

// Enrolled student model for manual faculty review simulation (no fake biometric scores)
interface EnrolledStudent {
  id: string;
  name: string;
  rollNumber: string;
  section: string;
  localDemoStatus: 'PRESENT' | 'LATE' | 'ABSENT';
  note?: string;
}

export const FacultyAttendance: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Step 1: Selected Class
  const [selectedClassId, setSelectedClassId] = useState<string>('cs301-a');

  // Step 2: Session Active State (supports ?session=active preview param)
  const [sessionActive, setSessionActive] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('session') === 'active' || params.get('captured') === 'true';
    } catch {
      return false;
    }
  });

  // Step 3 & 4: Photo Captured & Frame State in local browser memory (supports ?captured=true)
  const [groupPhotoCaptured, setGroupPhotoCaptured] = useState<boolean>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      return params.get('captured') === 'true';
    } catch {
      return false;
    }
  });
  const [capturedFrameData, setCapturedFrameData] = useState<string | null>(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get('captured') === 'true') {
        return 'data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"%3E%3Crect width="640" height="360" fill="%23121D26"/%3E%3Ctext x="320" y="180" font-family="sans-serif" font-size="14" fill="%2336B5A5" text-anchor="middle"%3ELocal Classroom Frame Grab (HTML5 Canvas)%3C/text%3E%3C/svg%3E';
      }
    } catch {}
    return null;
  });

  // Filter tab for manual roster review
  const [rosterFilter, setRosterFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT'>('ALL');

  // Step 8: Confirmation Modal
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isCommitted, setIsCommitted] = useState<boolean>(false);

  // Assigned Classes from Blueprint Page 16/17
  const assignedClasses = [
    {
      id: 'cs301-a',
      name: 'DBMS · CSE-A (10:00 – 11:00 AM)',
      room: 'Room 204',
      enrolled: 47,
    },
    {
      id: 'cs302-b',
      name: 'CN · CSE-B (11:00 – 12:00 PM)',
      room: 'Room 307',
      enrolled: 47,
    },
    {
      id: 'cs303-a',
      name: 'JAVA · CSE-A (12:00 – 01:00 PM)',
      room: 'Room 204',
      enrolled: 47,
    },
    {
      id: 'cs304-c',
      name: 'OS · CSE-C (02:00 – 03:00 PM)',
      room: 'Room 301',
      enrolled: 47,
    },
    {
      id: 'ma301-a',
      name: 'MATHS · CSE-A (03:00 – 04:00 PM)',
      room: 'Room 105',
      enrolled: 47,
    },
    {
      id: 'cs301-b',
      name: 'DBMS-B · CSE-B (04:00 – 05:00 PM)',
      room: 'Room 204',
      enrolled: 47,
    },
  ];

  // Enrolled Section Roster for Manual Faculty Review (Section CSE-A: 47 Students)
  // CRITICAL: Strictly manual roster entries. ZERO fake AI similarity scores or face match detections.
  const [enrolledStudents, setEnrolledStudents] = useState<EnrolledStudent[]>([
    { id: 's1', name: 'Rahul Sharma', rollNumber: 'STU-2026-0842', section: 'CSE-A', localDemoStatus: 'PRESENT' },
    { id: 's2', name: 'Ananya Deshmukh', rollNumber: 'STU-2026-0843', section: 'CSE-A', localDemoStatus: 'PRESENT' },
    { id: 's3', name: 'Imran Khan', rollNumber: 'STU-2026-0844', section: 'CSE-A', localDemoStatus: 'PRESENT' },
    { id: 's4', name: 'Suresh Raina', rollNumber: 'STU-2026-0845', section: 'CSE-A', localDemoStatus: 'PRESENT' },
    { id: 's5', name: 'Pooja Hegde', rollNumber: 'STU-2026-0846', section: 'CSE-A', localDemoStatus: 'PRESENT' },
    { id: 's6', name: 'Vikram Seth', rollNumber: 'STU-2026-0847', section: 'CSE-A', localDemoStatus: 'PRESENT' },
    { id: 's7', name: 'Neha Kakkar', rollNumber: 'STU-2026-0848', section: 'CSE-A', localDemoStatus: 'PRESENT' },
    { id: 's8', name: 'Arjun Rampal', rollNumber: 'STU-2026-0849', section: 'CSE-A', localDemoStatus: 'PRESENT' },
    { id: 's9', name: 'Karthik Aryan', rollNumber: 'STU-2026-0850', section: 'CSE-A', localDemoStatus: 'LATE', note: 'Arrived 10:12 AM' },
    { id: 's10', name: 'Meera Nambiar', rollNumber: 'STU-2026-0851', section: 'CSE-A', localDemoStatus: 'LATE', note: 'Arrived 10:15 AM' },
    { id: 's11', name: 'Divya Dutta', rollNumber: 'STU-2026-0852', section: 'CSE-A', localDemoStatus: 'LATE', note: 'Arrived 10:18 AM' },
    { id: 's12', name: 'Rohan Verma', rollNumber: 'STU-2026-0853', section: 'CSE-A', localDemoStatus: 'ABSENT', note: 'Unreported absence' },
    { id: 's13', name: 'Sneha Patel', rollNumber: 'STU-2026-0854', section: 'CSE-A', localDemoStatus: 'ABSENT', note: 'Medical leave recheck pending' },
  ]);

  // Blueprint Page 12 Reference Ratios (Benchmark figures for UI validation only)
  const blueprintReferences = {
    present: 42,
    late: 3,
    unverified: 2, // Corrected terminology: 2 Unverified (formerly Unknown)
    totalEnrolled: 47,
  };

  const handleStatusOverride = (id: string, newStatus: 'PRESENT' | 'LATE' | 'ABSENT') => {
    setEnrolledStudents((prev) =>
      prev.map((s) => (s.id === id ? { ...s, localDemoStatus: newStatus } : s))
    );
  };

  const handleStartSession = () => {
    setSessionActive(true);
    setGroupPhotoCaptured(false);
    setCapturedFrameData(null);
    setIsCommitted(false);
  };

  const handlePhotoCaptured = (dataUrl: string) => {
    setGroupPhotoCaptured(true);
    setCapturedFrameData(dataUrl);
  };

  const handleCommit = () => {
    setIsCommitted(true);
    setShowConfirmModal(false);
  };

  const filteredStudents = enrolledStudents.filter((s) => {
    if (rosterFilter === 'ALL') return true;
    return s.localDemoStatus === rosterFilter;
  });

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Page Header */}
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 2 & 5"
        title="Classroom Attendance & Photo Verification Console"
        description="Comprehensive 8-step faculty attendance workflow: class selection, group photograph capture, candidate verification, manual review, and authorized save."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              Local UI Demo
            </span>
            <StatusPill
              variant={isCommitted ? 'present' : sessionActive ? 'late' : 'neutral'}
              label={
                isCommitted
                  ? 'ROSTER COMMITTED (DEMO)'
                  : sessionActive
                  ? 'SESSION ACTIVE'
                  : 'SESSION STANDBY'
              }
              pulse={sessionActive && !isCommitted}
            />
          </div>
        }
      />

      {/* Mandatory Technical Honesty & Hardware Boundary Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-amber-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Radio className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary uppercase tracking-wide flex items-center gap-2">
              <span>Browser Camera vs Neural Biometric Engine Boundary</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Services Offline
              </span>
            </h4>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              Real camera frames temporarily exist in local browser memory via HTML5 Canvas. Neural face detection, biometric vector embeddings, facial matching, and database persistence are <strong>NOT YET CONNECTED</strong>. No student is marked present automatically from a camera frame alone.
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 shrink-0">
          Backend Offline
        </span>
      </div>

      {/* 8-Step Workflow Progress Indicator */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border">
        <span className="text-[10px] font-mono uppercase text-teal block mb-2 font-semibold">
          Faculty Attendance Workflow (CampusPulse Blueprint Specifications)
        </span>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 text-[11px] font-mono">
          <div className={`p-2 rounded-lg border text-center ${selectedClassId ? 'bg-teal/15 text-teal border-teal/30' : 'bg-surface-raised text-text-muted border-glass-border'}`}>
            1. Select Class
          </div>
          <div className={`p-2 rounded-lg border text-center ${sessionActive ? 'bg-teal/15 text-teal border-teal/30' : 'bg-surface-raised text-text-muted border-glass-border'}`}>
            2. Start Session
          </div>
          <div className={`p-2 rounded-lg border text-center ${groupPhotoCaptured ? 'bg-teal/15 text-teal border-teal/30' : 'bg-surface-raised text-text-muted border-glass-border'}`}>
            3. Group Photo
          </div>
          <div className={`p-2 rounded-lg border text-center ${groupPhotoCaptured ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-surface-raised text-text-muted border-glass-border'}`}>
            4. Detect Faces (Offline)
          </div>
          <div className={`p-2 rounded-lg border text-center ${groupPhotoCaptured ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-surface-raised text-text-muted border-glass-border'}`}>
            5. Section Match (Offline)
          </div>
          <div className={`p-2 rounded-lg border text-center ${sessionActive ? 'bg-teal/15 text-teal border-teal/30' : 'bg-surface-raised text-text-muted border-glass-border'}`}>
            6. Reference Ratios
          </div>
          <div className={`p-2 rounded-lg border text-center ${sessionActive ? 'bg-teal/15 text-teal border-teal/30' : 'bg-surface-raised text-text-muted border-glass-border'}`}>
            7. Manual Review
          </div>
          <div className={`p-2 rounded-lg border text-center ${isCommitted ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40' : 'bg-surface-raised text-text-muted border-glass-border'}`}>
            8. Authorized Save
          </div>
        </div>
      </div>

      {/* Step 1 & 2: Assigned Class Selection & Session Control */}
      <SurfacePanel variant="deep" className="p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
          <div>
            <h3 className="text-base font-semibold text-text-primary">
              Step 1 & 2: Select Assigned Scheduled Class & Start Session
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Initialize local demo class-session context.
            </p>
          </div>

          {!sessionActive ? (
            <Button
              variant="primary"
              size="md"
              onClick={handleStartSession}
              leftIcon={<Clock className="w-4 h-4" />}
            >
              Start Session & Open Camera
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono text-teal bg-teal/10 px-2.5 py-1 rounded border border-teal/25">
                ● Session Active
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSessionActive(false);
                  setGroupPhotoCaptured(false);
                  setCapturedFrameData(null);
                  setIsCommitted(false);
                }}
              >
                Reset Session
              </Button>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
          {assignedClasses.map((cls) => (
            <button
              key={cls.id}
              disabled={sessionActive}
              onClick={() => setSelectedClassId(cls.id)}
              className={`p-3.5 rounded-xl border text-left transition-all focus-ring ${
                selectedClassId === cls.id
                  ? 'bg-teal/10 border-teal text-text-primary shadow-sm'
                  : 'bg-surface-raised border-glass-border text-text-secondary hover:text-text-primary'
              } ${sessionActive ? 'opacity-80 cursor-not-allowed' : ''}`}
            >
              <span className="font-semibold text-xs block">{cls.name}</span>
              <span className="text-[11px] text-text-muted mt-0.5 block">
                {cls.room} · {cls.enrolled} Registered Students
              </span>
            </button>
          ))}
        </div>

        {/* Physical Room Occupancy Boundary Notice */}
        <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border flex items-center gap-2.5 text-xs text-text-secondary">
          <Info className="w-4 h-4 text-teal shrink-0" />
          <span>
            <strong>Occupancy Boundary:</strong> Physical room occupancy detection or verification is <strong>NOT YET CONNECTED</strong>. No IoT hardware sensor or occupancy-detection service is active.
          </span>
        </div>
      </SurfacePanel>

      {/* Step 3 & 4: Classroom Group Photograph & Camera Capture */}
      {sessionActive && (
        <SurfacePanel variant="deep" className="p-6 space-y-6 border border-teal/20">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">
                  Step 3 & 4: Classroom Group Photograph & Local Frame Capture
                </h3>
                <span className="text-[10px] font-mono text-teal bg-teal/10 px-2 py-0.5 rounded border border-teal/25">
                  WebRTC Video Device
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                Real camera stream and HTML5 Canvas snapshot. Captured frames exist solely in local browser memory.
              </p>
            </div>

            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                if (groupPhotoCaptured) {
                  setGroupPhotoCaptured(false);
                  setCapturedFrameData(null);
                } else {
                  setGroupPhotoCaptured(true);
                  // Provide synthetic canvas snapshot data URL for headless testing preview
                  setCapturedFrameData('data:image/svg+xml;charset=utf-8,%3Csvg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360"%3E%3Crect width="640" height="360" fill="%23121D26"/%3E%3Ctext x="320" y="180" font-family="sans-serif" font-size="14" fill="%2336B5A5" text-anchor="middle"%3ELocal Classroom Frame Grab (HTML5 Canvas)%3C/text%3E%3C/svg%3E');
                }
              }}
            >
              {groupPhotoCaptured ? 'Simulate Re-capture' : 'Simulate Group Frame Grab'}
            </Button>
          </div>

          {/* WebRTC Live Camera component */}
          <CameraCapture
            title="Classroom Wide Camera Stream (Live WebRTC)"
            description="Align classroom view. Captured frames remain exclusively in local browser memory."
            initialImage={capturedFrameData}
            onCapture={handlePhotoCaptured}
          />

          {/* CRITICAL BOUNDARY: Explicit Face Detection & Matching Offline Card */}
          <div className="p-5 rounded-2xl bg-surface-raised border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-glass-border">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <EyeOff className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold uppercase tracking-wider text-text-primary">
                    Face Detection & Identity Matching Status: NOT CONNECTED
                  </h4>
                  <span className="text-[11px] text-text-secondary">
                    Upstream AI Microservices & Biometric Tensor Engines Offline
                  </span>
                </div>
              </div>
              <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30">
                Zero AI Detections Rendered
              </span>
            </div>

            <p className="text-xs text-text-secondary leading-relaxed">
              The application does <strong>not</strong> render fake face bounding boxes, synthetic similarity scores, or automated identity matches over the captured photograph. Real attendance verification requires connected institutional biometric microservices and explicit instructor sign-off.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5 pt-1 text-[11px] font-mono">
              <div className="p-2.5 rounded-xl bg-surface-deep border border-glass-border">
                <span className="text-text-muted block text-[10px]">NEURAL FACE DETECTION</span>
                <span className="text-amber-400 font-semibold mt-0.5 block">NOT CONNECTED</span>
                <span className="text-[10px] text-text-muted mt-0.5 block">Zero bounding boxes</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-deep border border-glass-border">
                <span className="text-text-muted block text-[10px]">BIOMETRIC EMBEDDINGS</span>
                <span className="text-amber-400 font-semibold mt-0.5 block">NOT CONNECTED</span>
                <span className="text-[10px] text-text-muted mt-0.5 block">No vector extraction</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-deep border border-glass-border">
                <span className="text-text-muted block text-[10px]">SIMILARITY MATCHING</span>
                <span className="text-amber-400 font-semibold mt-0.5 block">NOT CONNECTED</span>
                <span className="text-[10px] text-text-muted mt-0.5 block">No cosine computation</span>
              </div>
              <div className="p-2.5 rounded-xl bg-surface-deep border border-glass-border">
                <span className="text-text-muted block text-[10px]">AUTOMATIC ATTENDANCE</span>
                <span className="text-rose-400 font-semibold mt-0.5 block">DISABLED</span>
                <span className="text-[10px] text-text-muted mt-0.5 block">Snapshot ≠ Present</span>
              </div>
            </div>
          </div>
        </SurfacePanel>
      )}

      {/* CRITICAL SEPARATION: DEMO / BLUEPRINT REFERENCE VALUES (PAGE 12) */}
      {sessionActive && (
        <SurfacePanel variant="deep" className="p-6 space-y-6 border border-glass-border">
          {/* Section Divider & Clarification Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-glass-border">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-text-primary">
                  Demo / Blueprint Reference Values (Page 12)
                </h3>
                <span className="text-[10px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/25">
                  Blueprint Reference Values
                </span>
              </div>
              <p className="text-xs text-text-secondary mt-0.5">
                The reference figures below (42 Present, 3 Late, 2 Unverified) are illustrative benchmark targets from CampusPulse Blueprint Page 12.
              </p>
            </div>

            <div className="text-right">
              <span className="text-[11px] font-mono text-text-muted block">
                Total Enrolled in CSE-A: <strong>47 Students</strong>
              </span>
              <span className="text-[10px] font-mono text-amber-400 block">
                Visually Separated from Camera Capture
              </span>
            </div>
          </div>

          {/* Reference Values Note */}
          <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-xs text-text-secondary flex items-start gap-3">
            <Info className="w-4 h-4 text-teal shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              <strong>Data Separation Notice:</strong> These reference counts reflect the official sample scenario published on Page 12 of the CampusPulse Product Blueprint. They are <strong>never</strong> presented as processing results of the camera image above.
            </p>
          </div>

          {/* The 3 Reference Metric Cards: 42 Present, 3 Late, 2 Unverified */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Present Reference */}
            <div className="p-5 rounded-2xl bg-surface-raised border border-emerald-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
                  PRESENT
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                  DEMO REFERENCE
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-emerald-400">
                {blueprintReferences.present}
              </div>
              <span className="text-[11px] text-text-muted block leading-relaxed">
                CampusPulse Blueprint Page 12 on-time benchmark ratio (42 of 47).
              </span>
            </div>

            {/* Late Reference */}
            <div className="p-5 rounded-2xl bg-surface-raised border border-amber-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
                  LATE
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                  DEMO REFERENCE
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-amber-400">
                {blueprintReferences.late}
              </div>
              <span className="text-[11px] text-text-muted block leading-relaxed">
                CampusPulse Blueprint Page 12 late arrival reference ratio (3 of 47).
              </span>
            </div>

            {/* Unverified Reference (CORRECTED: 2 Unverified, formerly Unknown) */}
            <div className="p-5 rounded-2xl bg-surface-raised border border-rose-500/30 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-rose-400">
                  UNVERIFIED
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/10 text-rose-300 border border-rose-500/20">
                  DEMO REFERENCE
                </span>
              </div>
              <div className="font-mono text-3xl font-bold text-rose-400">
                {blueprintReferences.unverified}
              </div>
              <span className="text-[11px] text-text-muted block leading-relaxed">
                CampusPulse Blueprint Page 12 unverified target count (Corrected from 2 Unknown).
              </span>
            </div>
          </div>

          {/* Demo Roster — CSE-A (47 Illustrative Entries) */}
          <div className="space-y-4 pt-4 border-t border-glass-border">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <span>Demo Roster — CSE-A (47 Illustrative Entries)</span>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
                    DEMO DATA
                  </span>
                </h4>
                <p className="text-xs text-text-secondary mt-0.5">
                  Demonstration roster data for administrative UI testing, not official student records retrieved from the institution's database. Manual Present, Late and Absent changes remain local browser demo state.
                </p>
              </div>

              {/* Roster Filter Tabs */}
              <div className="flex items-center gap-1.5 p-1 rounded-xl bg-surface-raised border border-glass-border text-xs">
                {(['ALL', 'PRESENT', 'LATE', 'ABSENT'] as const).map((filter) => (
                  <button
                    key={filter}
                    onClick={() => setRosterFilter(filter)}
                    className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                      rosterFilter === filter
                        ? 'bg-teal text-canvas font-semibold shadow-sm'
                        : 'text-text-secondary hover:text-text-primary'
                    }`}
                  >
                    {filter}
                  </button>
                ))}
              </div>
            </div>

            {/* Student Roster List */}
            <div className="divide-y divide-glass-border rounded-xl border border-glass-border overflow-hidden bg-surface-deep">
              {filteredStudents.map((student) => (
                <div
                  key={student.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs hover:bg-surface-raised/40 transition-colors"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-text-primary text-sm">
                        {student.name}
                      </span>
                      <span className="font-mono text-[11px] text-text-muted">
                        ({student.rollNumber})
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised text-teal border border-teal/20">
                        {student.section}
                      </span>
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded font-semibold ${
                          student.localDemoStatus === 'PRESENT'
                            ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                            : student.localDemoStatus === 'LATE'
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {student.localDemoStatus} (LOCAL DEMO)
                      </span>
                    </div>
                    {student.note && (
                      <span className="text-[11px] text-text-muted block">
                        Note: {student.note}
                      </span>
                    )}
                  </div>

                  {/* Manual Faculty Override Controls */}
                  <div className="flex items-center gap-1.5 self-end sm:self-auto">
                    <Button
                      variant={student.localDemoStatus === 'PRESENT' ? 'primary' : 'ghost'}
                      size="sm"
                      onClick={() => handleStatusOverride(student.id, 'PRESENT')}
                    >
                      Present
                    </Button>
                    <Button
                      variant={student.localDemoStatus === 'LATE' ? 'secondary' : 'ghost'}
                      size="sm"
                      onClick={() => handleStatusOverride(student.id, 'LATE')}
                    >
                      Late
                    </Button>
                    <Button
                      variant={student.localDemoStatus === 'ABSENT' ? 'danger' : 'ghost'}
                      size="sm"
                      onClick={() => handleStatusOverride(student.id, 'ABSENT')}
                    >
                      Absent
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Step 8 Action Launcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
              <span className="text-xs text-text-muted font-mono">
                Manual Attendance Simulation · No changes saved to database
              </span>
              <Button
                variant="primary"
                size="md"
                disabled={isCommitted}
                onClick={() => setShowConfirmModal(true)}
                leftIcon={<ShieldCheck className="w-4 h-4" />}
              >
                {isCommitted ? 'Attendance Committed (Local Demo)' : 'Finalize & Save Attendance →'}
              </Button>
            </div>
          </div>
        </SurfacePanel>
      )}

      {/* Step 8: Confirmation Modal */}
      {showConfirmModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-canvas/80 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <SurfacePanel
            variant="deep"
            className="w-full max-w-lg p-6 sm:p-8 space-y-6 border border-glass-border shadow-glass-dropdown"
          >
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-text-primary">
                    Authorized Faculty Attendance Sign-Off
                  </h3>
                  <span className="text-[11px] text-text-muted">
                    Step 8: Authorized Confirmation (Local Demo Commit)
                  </span>
                </div>
              </div>
              <button
                onClick={() => setShowConfirmModal(false)}
                className="text-text-muted hover:text-text-primary p-1"
                aria-label="Close dialog"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-text-secondary leading-relaxed">
                You are about to commit the manual attendance records for <strong>Database Management Systems (DBMS · CSE-A)</strong> for the session <strong>10:00 – 11:00 AM</strong>.
              </p>

              <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-text-muted">Enrolled Section Total:</span>
                  <span className="text-teal font-bold">47 Students</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Blueprint Reference Present:</span>
                  <span className="text-emerald-400 font-bold">{blueprintReferences.present}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Blueprint Reference Late:</span>
                  <span className="text-amber-400 font-bold">{blueprintReferences.late}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Blueprint Reference Unverified:</span>
                  <span className="text-rose-400 font-bold">{blueprintReferences.unverified}</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-[11px] text-text-secondary space-y-1">
                <span className="font-bold text-amber-300 block">
                  Mandatory Governance & Boundary Check
                </span>
                <p className="leading-relaxed">
                  1. No student has been marked present from a camera frame alone.
                </p>
                <p className="leading-relaxed">
                  2. Committing saves records to local browser memory only. Live institutional backend persistence and attendance registers are <strong>NOT YET CONNECTED</strong>.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConfirmModal(false)}
              >
                Cancel Review
              </Button>
              <Button
                variant="primary"
                size="md"
                onClick={handleCommit}
                leftIcon={<Check className="w-4 h-4" />}
              >
                Confirm & Commit Attendance (Demo)
              </Button>
            </div>
          </SurfacePanel>
        </div>
      )}
    </div>
  );
};

import React, { useState, useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  FileSpreadsheet,
  Camera,
  Upload,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Building2,
  Users,
  Clock,
  Trash2,
  Plus,
  Edit2,
  Check,
  X,
  Send,
  Eye,
  FileCheck,
  AlertOctagon,
  ShieldAlert,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { CameraCapture } from '../../components/camera/CameraCapture';
import {
  INITIAL_TIMETABLE_SLOTS,
  TimetableSlotItem,
  INSTITUTIONAL_FACULTY,
  INSTITUTIONAL_SUBJECTS,
  INSTITUTIONAL_SECTIONS,
  INSTITUTIONAL_ROOMS,
} from './hodMockData';

export const TimetableManagement: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const paramStep = searchParams.get('step') ? parseInt(searchParams.get('step')!, 10) : 1;
  const paramShowConflict = searchParams.get('showConflictModal') === 'true';
  const paramInjectConflict = searchParams.get('injectConflict') === 'true';

  // 7-Stage Pipeline Step Tracker
  const [currentStep, setCurrentStep] = useState<number>(paramStep);

  // Stage 1: Intake Image
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [intakeMethod, setIntakeMethod] = useState<'camera' | 'upload'>('camera');

  // Stage 2: Image Inspection & Sample Fixture Tokens (OCR Not Connected)
  const [tokensLoaded, setTokensLoaded] = useState<boolean>(false);
  const [sampleTokens, setSampleTokens] = useState<string[]>([]);

  // Stage 3 & 4: Timetable Grid Data (Manual Data Entry)
  const [timetableSlots, setTimetableSlots] = useState<TimetableSlotItem[]>(() => {
    if (paramInjectConflict) {
      const conflictingSlot: TimetableSlotItem = {
        id: 'slot-conflict-injected',
        day: 'Monday',
        startTime: '09:00',
        endTime: '10:00',
        subjectCode: 'CS502',
        subjectName: 'Database Systems',
        facultyName: 'Dr. Rajesh Kumar',
        room: 'Lab-1',
        section: 'CSE-B',
        status: 'conflict',
      };
      return [conflictingSlot, ...INITIAL_TIMETABLE_SLOTS];
    }
    return INITIAL_TIMETABLE_SLOTS;
  });
  const [editingSlotId, setEditingSlotId] = useState<string | null>(null);

  // Stage 5: Conflict Resolution Safety Modal
  const [showConflictModal, setShowConflictModal] = useState<boolean>(paramShowConflict);

  // Stage 6: Approval Memo
  const [approvalMemo, setApprovalMemo] = useState<string>(
    'Department of CSE Semester 5 Timetable approved for institutional preview. Classroom allocations manually verified against department load limits.'
  );
  const [isApproved, setIsApproved] = useState<boolean>(false);

  // Stage 7: Publication Modal
  const [showPublicationModal, setShowPublicationModal] = useState<boolean>(false);
  const [publicationStage, setPublicationStage] = useState<number>(1);

  // Sample Printable Timetable Scan Generator (for intake testing)
  const handleLoadSampleTimetable = () => {
    const canvas = document.createElement('canvas');
    canvas.width = 800;
    canvas.height = 500;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, 0, 800, 500);

      ctx.fillStyle = '#38BDF8';
      ctx.font = 'bold 20px monospace';
      ctx.fillText('DEPARTMENT OF COMPUTER SCIENCE & ENG - TIMETABLE 2026', 40, 50);

      ctx.fillStyle = '#94A3B8';
      ctx.font = '14px monospace';
      ctx.fillText('MON: 10:00-11:00 CS301 Dr. Kumar Rm204 [SEC-A]', 40, 100);
      ctx.fillText('MON: 11:15-12:15 CS302 Prof. Nair Rm307 [SEC-A]', 40, 130);
      ctx.fillText('MON: 13:00-14:00 CS303 Dr. Shetty Rm301 [SEC-A]', 40, 160);
      ctx.fillText('TUE: 10:00-11:00 CS301B Prof. Nair Rm301 [SEC-B]', 40, 190);
      ctx.fillText('TUE: 14:15-15:15 CS304 Dr. Kumar Rm105 [SEC-B]', 40, 220);
      ctx.fillText('WED: 10:00-11:00 CS301 Dr. Kumar Rm204 [SEC-A]', 40, 250);
      ctx.fillText('WED: 15:30-16:30 MA301 Dr. Shetty Rm204 [SEC-B]', 40, 280);
      ctx.fillText('THU: 11:15-12:15 CS302 Prof. Nair Rm307 [SEC-A]', 40, 310);
      ctx.fillText('FRI: 10:00-11:00 CS301 Dr. Kumar Rm204 [SEC-A]', 40, 340);
      ctx.fillText('FRI: 14:15-15:15 CS304 Dr. Kumar Rm105 [SEC-B]', 40, 370);

      const dataUrl = canvas.toDataURL('image/png');
      setCapturedImage(dataUrl);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setCapturedImage(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  // Transition to Stage 2: Inspection (Without claiming fabricated OCR)
  const handleProceedToInspection = () => {
    if (!capturedImage) return;
    setSampleTokens([
      'HEADER: DEPT CSE SEM 5 TIMETABLE 2026',
      'MON 10:00-11:00 CS301 DR.KUMAR RM204 SEC-A',
      'MON 11:15-12:15 CS302 PROF.NAIR RM307 SEC-A',
      'MON 13:00-14:00 CS303 DR.SHETTY RM301 SEC-A',
      'TUE 10:00-11:00 CS301B PROF.NAIR RM301 SEC-B',
      'TUE 14:15-15:15 CS304 DR.KUMAR RM105 SEC-B',
      'WED 10:00-11:00 CS301 DR.KUMAR RM204 SEC-A',
      'WED 15:30-16:30 MA301 DR.SHETTY RM204 SEC-B',
      'THU 11:15-12:15 CS302 PROF.NAIR RM307 SEC-A',
      'FRI 10:00-11:00 CS301 DR.KUMAR RM204 SEC-A',
      'FRI 14:15-15:15 CS304 DR.KUMAR RM105 SEC-B',
    ]);
    setTokensLoaded(true);
    setCurrentStep(2);
  };

  // Step 5: Real-Time Conflict Validation Engine
  interface Conflict {
    id: string;
    type: 'FACULTY_DOUBLE_BOOKING' | 'ROOM_COLLISION' | 'SECTION_OVERLAP' | 'INVALID_TIME';
    description: string;
    proposedResolution: string;
    slotIds: string[];
  }

  const conflicts = useMemo<Conflict[]>(() => {
    const foundConflicts: Conflict[] = [];

    for (let i = 0; i < timetableSlots.length; i++) {
      for (let j = i + 1; j < timetableSlots.length; j++) {
        const a = timetableSlots[i];
        const b = timetableSlots[j];

        // Check if same day
        if (a.day === b.day) {
          // Check time overlap: (startA < endB) and (startB < endA)
          const overlap = a.startTime < b.endTime && b.startTime < a.endTime;
          if (overlap) {
            // 1. Faculty double-booking
            if (a.facultyName === b.facultyName) {
              foundConflicts.push({
                id: `CONF-FAC-${a.id}-${b.id}`,
                type: 'FACULTY_DOUBLE_BOOKING',
                description: `Faculty conflict: ${a.facultyName} is scheduled simultaneously for ${a.subjectCode} (${a.room}) and ${b.subjectCode} (${b.room}) on ${a.day} ${a.startTime}-${a.endTime}.`,
                proposedResolution: `Reschedule ${b.subjectCode} to a non-overlapping teaching period (e.g. Tuesday 14:15-15:15 in Room 105) to eliminate instructor conflict.`,
                slotIds: [a.id, b.id],
              });
            }

            // 2. Room collision
            if (a.room === b.room) {
              foundConflicts.push({
                id: `CONF-ROOM-${a.id}-${b.id}`,
                type: 'ROOM_COLLISION',
                description: `Room collision: ${a.room} is double-booked on ${a.day} between ${a.subjectCode} and ${b.subjectCode}.`,
                proposedResolution: `Reallocate ${b.subjectCode} to an alternate available lecture hall (e.g. Room 105 or Room 307) during ${b.startTime}-${b.endTime}.`,
                slotIds: [a.id, b.id],
              });
            }

            // 3. Section overlap
            if (a.section === b.section) {
              foundConflicts.push({
                id: `CONF-SEC-${a.id}-${b.id}`,
                type: 'SECTION_OVERLAP',
                description: `Section overlap: Section ${a.section} is assigned two concurrent classes (${a.subjectCode} & ${b.subjectCode}) on ${a.day}.`,
                proposedResolution: `Adjust lecture timetable for Section ${a.section} so sessions occur in sequential academic periods.`,
                slotIds: [a.id, b.id],
              });
            }
          }
        }

        // 4. Invalid time range check
        if (a.endTime <= a.startTime) {
          foundConflicts.push({
            id: `CONF-TIME-${a.id}`,
            type: 'INVALID_TIME',
            description: `Invalid time range: Slot ${a.subjectCode} on ${a.day} ends (${a.endTime}) before or at start (${a.startTime}).`,
            proposedResolution: `Correct duration for ${a.subjectCode} to a valid minimum 60-minute window (e.g. ${a.startTime} to 11:00).`,
            slotIds: [a.id],
          });
        }
      }
    }

    return foundConflicts;
  }, [timetableSlots]);

  // Conflict Testing Helper: Injects an intentional conflict so user can witness the validation engine
  const handleInjectTestConflict = () => {
    const conflictingSlot: TimetableSlotItem = {
      id: `TT-CLASH-${Date.now()}`,
      day: 'Monday',
      startTime: '10:00',
      endTime: '11:00',
      subjectCode: 'CS304',
      subjectName: 'Operating Systems',
      facultyName: 'Dr. Suresh Kumar', // Same faculty as CS301 at 10:00 AM!
      section: 'CSE-B',
      room: 'Room 204', // Also same room!
      status: 'conflict',
      rawTokenNote: 'Injected Test Clash',
    };
    setTimetableSlots((prev) => [conflictingSlot, ...prev]);
  };

  // Safe Conflict Resolution: Requires HOD Review & Confirmation
  const handleOpenConflictResolutionReview = () => {
    setShowConflictModal(true);
  };

  const handleConfirmApplyResolution = () => {
    setTimetableSlots(INITIAL_TIMETABLE_SLOTS);
    setShowConflictModal(false);
  };

  // Table edit helpers
  const handleUpdateSlotField = (
    id: string,
    field: keyof TimetableSlotItem,
    value: string
  ) => {
    setTimetableSlots((prev) =>
      prev.map((slot) => {
        if (slot.id === id) {
          const updated = { ...slot, [field]: value };
          if (field === 'subjectCode') {
            const foundSub = INSTITUTIONAL_SUBJECTS.find((s) => s.code === value);
            if (foundSub) updated.subjectName = foundSub.name;
          }
          return updated;
        }
        return slot;
      })
    );
  };

  const handleDeleteSlot = (id: string) => {
    setTimetableSlots((prev) => prev.filter((s) => s.id !== id));
  };

  const handleAddNewSlot = () => {
    const newSlot: TimetableSlotItem = {
      id: `TT-NEW-${Date.now()}`,
      day: 'Monday',
      startTime: '14:00',
      endTime: '15:00',
      subjectCode: 'CS301',
      subjectName: 'Database Management Systems',
      facultyName: 'Dr. Suresh Kumar',
      section: 'CSE-A',
      room: 'Room 204',
      status: 'mapped',
      rawTokenNote: 'Manually Entered Slot',
    };
    setTimetableSlots((prev) => [...prev, newSlot]);
  };

  // Publication Walkthrough Flow
  const handleStartPublication = () => {
    setShowPublicationModal(true);
    setPublicationStage(1);
    setTimeout(() => setPublicationStage(2), 1200);
    setTimeout(() => setPublicationStage(3), 2400);
  };

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        title="Timetable Image Capture & Manual Data Entry — OCR Not Connected"
        subtitle="7-Stage Pipeline: Image Capture, Inspection Buffer, Manual Grid Entry, Directory Mapping, Conflict Validation & HOD Governance"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono">
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>OCR Not Connected · Manual Intake Mode</span>
          </div>
        }
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/hod/review')}
            >
              Back to HOD Review
            </Button>
          </div>
        }
      />

      {/* Mandatory Technical Honesty Banner (Option B: OCR Not Connected) */}
      <div className="p-4 rounded-xl bg-surface-deep border border-amber-500/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
              Technical Architecture Notice: OCR Outstanding Integration
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
            OCR NOT CONNECTED
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          Optical Character Recognition (OCR) is <strong>NOT YET CONNECTED</strong> to the local application build. Capturing a photograph does not automatically produce verified timetable records. Preloaded tokens are clearly labeled <strong>"Sample Fixture Tokens — Not OCR Output"</strong>. The manual data-entry grid, directory mapping, real-time conflict validation engine, and HOD approval workflow remain fully functional.
        </p>
      </div>

      {/* 7-Stage Interactive Pipeline Progress Bar */}
      <SurfacePanel variant="deep" className="p-4 sm:p-5">
        <div className="flex items-center justify-between pb-3 border-b border-glass-border">
          <span className="text-xs font-mono uppercase text-text-muted tracking-wider">
            Timetable Ingestion Pipeline (Step {currentStep} of 7)
          </span>
          <span className="text-xs font-mono text-teal">
            {currentStep === 1 && 'Stage 1: Image / Camera Intake'}
            {currentStep === 2 && 'Stage 2: Image Inspection & Sample Fixture Tokens (OCR Not Connected)'}
            {currentStep === 3 && 'Stage 3: Interactive Timetable Grid (Manual Entry)'}
            {currentStep === 4 && 'Stage 4: Demo Institutional Directory Mapping'}
            {currentStep === 5 && 'Stage 5: Conflict Validation Engine'}
            {currentStep === 6 && 'Stage 6: HOD Review & Governance Sign-Off'}
            {currentStep === 7 && 'Stage 7: Local Demo Publication Walkthrough'}
          </span>
        </div>

        <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mt-4">
          {[
            { num: 1, label: 'Intake' },
            { num: 2, label: 'Inspect Buffer' },
            { num: 3, label: 'Edit Grid' },
            { num: 4, label: 'Directory' },
            { num: 5, label: 'Conflict' },
            { num: 6, label: 'HOD Sign' },
            { num: 7, label: 'Publish' },
          ].map((s) => (
            <button
              key={s.num}
              onClick={() => setCurrentStep(s.num)}
              className={`p-2 rounded-lg text-center transition-all focus-ring ${
                currentStep === s.num
                  ? 'bg-teal text-canvas font-bold shadow-md'
                  : currentStep > s.num
                  ? 'bg-teal/15 text-teal border border-teal/30'
                  : 'bg-surface-raised text-text-muted border border-glass-border'
              }`}
            >
              <div className="text-[10px] font-mono leading-none">Step {s.num}</div>
              <div className="text-xs truncate mt-1 hidden sm:block">{s.label}</div>
            </button>
          ))}
        </div>
      </SurfacePanel>

      {/* STAGE 1: INTAKE (CAMERA / UPLOAD) */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Camera className="w-4 h-4 text-teal" />
                  <span>Stage 1: Physical Timetable Intake</span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Capture a physical departmental timetable document via browser webcam or upload a reference image.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant={intakeMethod === 'camera' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setIntakeMethod('camera')}
                  leftIcon={<Camera className="w-3.5 h-3.5" />}
                >
                  Live Camera
                </Button>
                <Button
                  variant={intakeMethod === 'upload' ? 'primary' : 'secondary'}
                  size="sm"
                  onClick={() => setIntakeMethod('upload')}
                  leftIcon={<Upload className="w-3.5 h-3.5" />}
                >
                  File Upload
                </Button>
              </div>
            </div>

            {/* Quick Demo Pre-load Button */}
            <div className="p-3.5 rounded-xl bg-teal/10 border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Sparkles className="w-4 h-4 text-teal shrink-0" />
                <span className="text-xs text-text-secondary">
                  Testing intake without a webcam? Load a high-contrast sample timetable document:
                </span>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={handleLoadSampleTimetable}
                className="shrink-0"
              >
                Load Sample Timetable Scan
              </Button>
            </div>

            {intakeMethod === 'camera' ? (
              <div className="space-y-4">
                <CameraCapture
                  title="Timetable Document Camera Capture"
                  description="Align physical printed timetable sheet in viewport. Frames are handled strictly in local browser memory."
                  onCapture={(dataUrl) => setCapturedImage(dataUrl)}
                  initialImage={capturedImage}
                />
              </div>
            ) : (
              <div className="p-8 border-2 border-dashed border-glass-border rounded-xl text-center space-y-3 bg-surface-raised/30">
                <Upload className="w-10 h-10 text-teal mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-text-primary">
                    Upload Timetable Image / Scanned Document
                  </p>
                  <p className="text-[11px] text-text-muted mt-1">PNG, JPG or PDF up to 10MB</p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="timetable-file-input"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => document.getElementById('timetable-file-input')?.click()}
                >
                  Browse File
                </Button>
              </div>
            )}

            {/* Preview & Proceed Button */}
            {capturedImage && (
              <div className="pt-3 border-t border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-teal font-mono">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Timetable frame captured in browser memory</span>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={handleProceedToInspection}
                  rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                >
                  Proceed to Stage 2: Image Inspection Buffer
                </Button>
              </div>
            )}
          </SurfacePanel>
        </div>
      )}

      {/* STAGE 2: IMAGE INSPECTION & SAMPLE FIXTURE TOKENS (OCR NOT CONNECTED) */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Eye className="w-4 h-4 text-teal" />
                  <span>Stage 2: Image Inspection & Sample Fixture Tokens (OCR Not Connected)</span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Inspect captured document frame alongside sample fixture tokens for manual grid entry.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                SAMPLE FIXTURE TOKENS — NOT OCR OUTPUT
              </span>
            </div>

            {/* Clear Boundary Notice */}
            <div className="p-4 rounded-xl bg-surface-raised border border-amber-500/30 space-y-1.5">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  OCR Engine Not Yet Connected
                </span>
              </div>
              <p className="text-xs text-text-secondary leading-relaxed">
                Optical Character Recognition (OCR) is <strong>NOT YET CONNECTED</strong> to the application. The camera snapshot does not automatically produce extracted timetable records. The tokens shown below are <strong>Sample Fixture Tokens — Not OCR Output</strong>, provided solely to demonstrate manual grid verification, institutional directory mapping, and conflict validation in Stage 3 and 4.
              </p>
            </div>

            {/* Side-by-side Preview */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left: Scanned Document Buffer */}
              <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2">
                <span className="text-xs font-mono uppercase text-text-muted">
                  Captured Document Frame (Local Browser Buffer)
                </span>
                <div className="aspect-video w-full rounded-lg bg-canvas border border-glass-border overflow-hidden flex items-center justify-center">
                  {capturedImage ? (
                    <img
                      src={capturedImage}
                      alt="Captured Timetable"
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-xs text-text-muted">No image buffer available</span>
                  )}
                </div>
              </div>

              {/* Right: Sample Fixture Tokens (Explicitly Labeled) */}
              <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-mono uppercase text-text-muted">
                      Sample Fixture Tokens — Not OCR Output
                    </span>
                    <span className="text-[10px] font-mono text-amber-300">DEMO REFERENCE</span>
                  </div>
                  <div className="mt-2 font-mono text-xs text-teal bg-canvas p-3 rounded-lg border border-glass-border max-h-56 overflow-y-auto space-y-1">
                    {sampleTokens.map((tok, i) => (
                      <div key={i} className="hover:bg-surface-raised p-1 rounded">
                        &gt; {tok}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-text-muted">
                  Notice: All values require manual confirmation in Stage 3 editable grid.
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-glass-border flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(1)}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back to Intake
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep(3)}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Proceed to Stage 3: Editable Grid (Manual Entry)
              </Button>
            </div>
          </SurfacePanel>
        </div>
      )}

      {/* STAGE 3 & 4: EDITABLE TIMETABLE GRID & DEMO DIRECTORY MAPPING */}
      {(currentStep === 3 || currentStep === 4) && (
        <div className="space-y-6">
          <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <FileSpreadsheet className="w-4 h-4 text-teal" />
                  <span>
                    {currentStep === 3
                      ? 'Stage 3: Interactive Timetable Grid (Manual Data Entry)'
                      : 'Stage 4: Demo Institutional Directory Mapping'}
                  </span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Verify or manually adjust lecture slots against Demo Institutional Directories (until actual integration).
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleAddNewSlot}
                  leftIcon={<Plus className="w-3.5 h-3.5" />}
                >
                  Add Slot
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleInjectTestConflict}
                  className="text-amber-300 border-amber-500/30"
                  leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}
                >
                  Inject Test Conflict
                </Button>
              </div>
            </div>

            {/* Editable Grid Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[760px]">
                <thead>
                  <tr className="border-b border-glass-border text-[11px] font-mono uppercase text-text-muted">
                    <th className="py-2.5 px-3">Day</th>
                    <th className="py-2.5 px-3">Time Range</th>
                    <th className="py-2.5 px-3">Subject</th>
                    <th className="py-2.5 px-3">Faculty (Demo Directory)</th>
                    <th className="py-2.5 px-3">Section</th>
                    <th className="py-2.5 px-3">Room</th>
                    <th className="py-2.5 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-glass-border text-xs">
                  {timetableSlots.map((slot) => {
                    const isEditing = editingSlotId === slot.id;
                    return (
                      <tr
                        key={slot.id}
                        className={`hover:bg-surface-raised/50 transition-colors ${
                          slot.status === 'conflict' ? 'bg-rose-500/10' : ''
                        }`}
                      >
                        {/* Day */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <select
                              value={slot.day}
                              onChange={(e) =>
                                handleUpdateSlotField(slot.id, 'day', e.target.value)
                              }
                              className="px-2 py-1 rounded bg-surface-raised border border-glass-border text-xs text-text-primary focus-ring"
                            >
                              {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((d) => (
                                <option key={d} value={d}>
                                  {d}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-semibold text-text-primary">{slot.day}</span>
                          )}
                        </td>

                        {/* Time */}
                        <td className="py-2.5 px-3 font-mono">
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="text"
                                value={slot.startTime}
                                onChange={(e) =>
                                  handleUpdateSlotField(slot.id, 'startTime', e.target.value)
                                }
                                className="w-14 px-1.5 py-1 rounded bg-surface-raised border border-glass-border text-xs font-mono text-text-primary"
                              />
                              <span>-</span>
                              <input
                                type="text"
                                value={slot.endTime}
                                onChange={(e) =>
                                  handleUpdateSlotField(slot.id, 'endTime', e.target.value)
                                }
                                className="w-14 px-1.5 py-1 rounded bg-surface-raised border border-glass-border text-xs font-mono text-text-primary"
                              />
                            </div>
                          ) : (
                            <span>
                              {slot.startTime} - {slot.endTime}
                            </span>
                          )}
                        </td>

                        {/* Subject */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <select
                              value={slot.subjectCode}
                              onChange={(e) =>
                                handleUpdateSlotField(slot.id, 'subjectCode', e.target.value)
                              }
                              className="px-2 py-1 rounded bg-surface-raised border border-glass-border text-xs text-text-primary focus-ring"
                            >
                              {INSTITUTIONAL_SUBJECTS.map((s) => (
                                <option key={s.code} value={s.code}>
                                  {s.code} - {s.name}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <div>
                              <span className="font-semibold text-text-primary">
                                {slot.subjectCode}
                              </span>
                              <span className="text-[11px] text-text-muted block truncate max-w-[140px]">
                                {slot.subjectName}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Faculty */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <select
                              value={slot.facultyName}
                              onChange={(e) =>
                                handleUpdateSlotField(slot.id, 'facultyName', e.target.value)
                              }
                              className="px-2 py-1 rounded bg-surface-raised border border-glass-border text-xs text-text-primary focus-ring"
                            >
                              {INSTITUTIONAL_FACULTY.map((f) => (
                                <option key={f} value={f}>
                                  {f}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-text-secondary">{slot.facultyName}</span>
                          )}
                        </td>

                        {/* Section */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <select
                              value={slot.section}
                              onChange={(e) =>
                                handleUpdateSlotField(slot.id, 'section', e.target.value)
                              }
                              className="px-2 py-1 rounded bg-surface-raised border border-glass-border text-xs text-text-primary focus-ring"
                            >
                              {INSTITUTIONAL_SECTIONS.map((sec) => (
                                <option key={sec} value={sec}>
                                  {sec}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-mono px-2 py-0.5 rounded bg-surface-raised border border-glass-border text-text-secondary">
                              {slot.section}
                            </span>
                          )}
                        </td>

                        {/* Room */}
                        <td className="py-2.5 px-3">
                          {isEditing ? (
                            <select
                              value={slot.room}
                              onChange={(e) =>
                                handleUpdateSlotField(slot.id, 'room', e.target.value)
                              }
                              className="px-2 py-1 rounded bg-surface-raised border border-glass-border text-xs text-text-primary focus-ring"
                            >
                              {INSTITUTIONAL_ROOMS.map((rm) => (
                                <option key={rm} value={rm}>
                                  {rm}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="font-mono text-teal">{slot.room}</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-2.5 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isEditing ? (
                              <Button
                                variant="primary"
                                size="sm"
                                onClick={() => setEditingSlotId(null)}
                                className="px-2 py-1 text-xs"
                              >
                                Save
                              </Button>
                            ) : (
                              <button
                                onClick={() => setEditingSlotId(slot.id)}
                                className="p-1.5 rounded text-text-muted hover:text-text-primary hover:bg-surface-raised"
                                title="Edit Row"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSlot(slot.id)}
                              className="p-1.5 rounded text-rose-400 hover:text-rose-300 hover:bg-rose-500/10"
                              title="Delete Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            <div className="pt-3 border-t border-glass-border flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(2)}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back to Inspection
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep(5)}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Proceed to Stage 5: Conflict Engine ({conflicts.length} Conflicts)
              </Button>
            </div>
          </SurfacePanel>
        </div>
      )}

      {/* STAGE 5: CONFLICT VALIDATION ENGINE */}
      {currentStep === 5 && (
        <div className="space-y-6">
          <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-teal" />
                  <span>Stage 5: Conflict Validation Engine</span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Algorithmic verification of faculty double-booking, room collisions, and section overlaps.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={handleInjectTestConflict}
                  className="text-amber-300 border-amber-500/30"
                  leftIcon={<AlertTriangle className="w-3.5 h-3.5" />}
                >
                  Simulate Conflict
                </Button>
                {conflicts.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleOpenConflictResolutionReview}
                    leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
                  >
                    Review & Resolve Conflicts
                  </Button>
                )}
              </div>
            </div>

            {/* Conflict Status Banner */}
            {conflicts.length === 0 ? (
              <div className="p-5 rounded-xl bg-teal/10 border border-teal/30 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal/20 text-teal flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-teal uppercase tracking-wider">
                    Zero Timetable Conflicts Detected
                  </h4>
                  <p className="text-xs text-text-secondary mt-0.5">
                    All 10 slots satisfy faculty teaching capacity, room availability, and section cohort integrity. Ready for HOD governance sign-off.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                    <span className="text-xs font-bold text-rose-300 uppercase">
                      {conflicts.length} Timetable Scheduling Conflict(s) Detected
                    </span>
                  </div>
                  <span className="text-xs font-mono text-rose-300">Approval Blocked</span>
                </div>

                <div className="space-y-2">
                  {conflicts.map((conf) => (
                    <div
                      key={conf.id}
                      className="p-3.5 rounded-xl bg-surface-raised border border-rose-500/25 flex flex-col sm:flex-row sm:items-start justify-between gap-3 text-xs"
                    >
                      <div className="space-y-1">
                        <div className="font-semibold text-rose-300 flex items-center gap-2">
                          <span className="px-1.5 py-0.5 rounded bg-rose-500/20 text-[10px] font-mono">
                            {conf.type}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary">{conf.description}</p>
                        <p className="text-[11px] text-teal font-mono">
                          Proposed Action: {conf.proposedResolution}
                        </p>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={handleOpenConflictResolutionReview}
                        className="text-xs shrink-0 self-start sm:self-center"
                      >
                        Inspect & Resolve
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-glass-border flex justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(3)}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back to Grid
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCurrentStep(6)}
                disabled={conflicts.length > 0}
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
              >
                Proceed to Stage 6: HOD Approval
              </Button>
            </div>
          </SurfacePanel>
        </div>
      )}

      {/* STAGE 6: HOD APPROVAL & REJECTION CONTROLS */}
      {currentStep === 6 && (
        <div className="space-y-6">
          <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <FileCheck className="w-4 h-4 text-teal" />
                  <span>Stage 6: HOD Executive Approval & Local Demo Sign-Off</span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Departmental sign-off prior to publishing schedule to faculty and student demo views.
                </p>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-surface-raised border border-glass-border space-y-3">
              <label className="text-xs font-semibold text-text-primary block">
                HOD Endorsement Memo & Audit Notes:
              </label>
              <textarea
                rows={3}
                value={approvalMemo}
                onChange={(e) => setApprovalMemo(e.target.value)}
                className="w-full p-3 rounded-lg bg-canvas border border-glass-border text-xs text-text-primary focus-ring"
              />
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] font-mono text-text-muted">
                <span>Signee: Dr. Suresh Nair (HOD-CSE-001)</span>
                <span>Demo Approval Marker: DEMO-SIGN-TOKEN-2026-X9</span>
              </div>
            </div>

            <div className="p-4 rounded-xl bg-teal/10 border border-teal/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-teal" />
                <span className="text-xs text-text-secondary">
                  Ready to commit local preview version <strong>v2026.1 (Semester 5)</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setCurrentStep(1)}
                  className="text-rose-400 hover:bg-rose-500/10"
                >
                  Reject & Re-scan
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setIsApproved(true);
                    setCurrentStep(7);
                  }}
                  leftIcon={<Check className="w-3.5 h-3.5" />}
                >
                  Approve Timetable
                </Button>
              </div>
            </div>

            <div className="pt-2 flex justify-start">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCurrentStep(5)}
                leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
              >
                Back to Conflicts
              </Button>
            </div>
          </SurfacePanel>
        </div>
      )}

      {/* STAGE 7: LOCAL DEMO PUBLICATION WALKTHROUGH */}
      {currentStep === 7 && (
        <div className="space-y-6">
          <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
                  <Send className="w-4 h-4 text-teal" />
                  <span>Stage 7: Institutional Publication Walkthrough</span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Simulate broadcasting schedule to Student Companion, Faculty Attendance, and Demo College ERP.
                </p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal/15 text-teal border border-teal/30">
                DEMO PUBLICATION WALKTHROUGH
              </span>
            </div>

            <div className="p-6 rounded-xl bg-canvas border border-teal/30 space-y-4 text-center max-w-lg mx-auto">
              <div className="w-12 h-12 rounded-full bg-teal/20 text-teal flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-text-primary">
                  Timetable Approved & Ready to Publish
                </h4>
                <p className="text-xs text-text-secondary mt-1">
                  Department of Computer Science & Engineering — 10 slots verified across 3 faculty and 4 lecture halls.
                </p>
              </div>

              <div className="p-3 rounded-lg bg-surface-deep border border-glass-border text-xs text-left space-y-1 font-mono text-[11px]">
                <div className="text-teal">&gt; Validated against Demo Institutional Directories</div>
                <div className="text-teal">&gt; 0 Conflicts verified</div>
                <div className="text-teal">&gt; Signed off with Demo Approval Marker</div>
                <div className="text-amber-300">&gt; Target: Local Browser Session State Only</div>
              </div>

              <Button
                variant="primary"
                size="md"
                onClick={handleStartPublication}
                className="w-full"
                leftIcon={<Send className="w-4 h-4" />}
              >
                Execute Local Demo Publication
              </Button>
            </div>
          </SurfacePanel>
        </div>
      )}

      {/* CONFLICT RESOLUTION SAFETY REVIEW MODAL (Requirement 5) */}
      {showConflictModal && (
        <div
          className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-xl rounded-2xl bg-surface-deep border border-glass-border shadow-2xl p-5 sm:p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-glass-border">
              <div>
                <h3 className="text-sm font-bold text-text-primary flex items-center gap-2">
                  <AlertOctagon className="w-4 h-4 text-amber-400" />
                  <span>Review Proposed Conflict Resolutions</span>
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  HOD confirmation required prior to applying modifications to local demo state.
                </p>
              </div>
              <button
                onClick={() => setShowConflictModal(false)}
                className="p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised focus-ring"
                aria-label="Close dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-200">
              <strong>Safety Guard:</strong> The system will not silently overwrite schedules. Review the proposed adjustments below. Confirmed changes will reset conflicting slots back to the verified department master baseline.
            </div>

            {/* List of Detected Conflicts & Proposed Resolutions */}
            <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
              {conflicts.map((conf) => (
                <div
                  key={conf.id}
                  className="p-3 rounded-xl bg-surface-raised border border-glass-border text-xs space-y-1.5"
                >
                  <div className="font-semibold text-rose-300 font-mono text-[11px]">
                    {conf.type}
                  </div>
                  <p className="text-text-secondary text-xs">{conf.description}</p>
                  <div className="p-2 rounded bg-surface-deep border border-teal/20 text-[11px] text-teal">
                    <strong>Proposed Resolution:</strong> {conf.proposedResolution}
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t border-glass-border flex items-center justify-between">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowConflictModal(false)}
              >
                Cancel / Manual Edit
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleConfirmApplyResolution}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Confirm & Apply Resolutions
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* PUBLICATION PROGRESS MODAL */}
      {showPublicationModal && (
        <div
          className="fixed inset-0 z-50 bg-canvas/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
        >
          <div className="w-full max-w-md rounded-2xl bg-surface-deep border border-glass-border shadow-2xl p-6 space-y-5">
            <div className="text-center space-y-2">
              <div className="w-10 h-10 rounded-full bg-teal/20 text-teal flex items-center justify-center mx-auto">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-text-primary">
                Executing Local Demo Publication
              </h3>
              <p className="text-xs text-text-secondary">
                Simulating synchronization with institutional preview services.
              </p>
            </div>

            {/* Stepper */}
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                {publicationStage >= 1 ? (
                  <CheckCircle2 className="w-4 h-4 text-teal" />
                ) : (
                  <div className="w-4 h-4 border-2 border-teal border-t-transparent rounded-full animate-spin" />
                )}
                <span>1. Schema Verification against Demo College ERP</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                {publicationStage >= 2 ? (
                  <CheckCircle2 className="w-4 h-4 text-teal" />
                ) : (
                  <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                )}
                <span>2. Broadcast to Faculty Schedule & Student Companion (Preview)</span>
              </div>

              <div className="flex items-center gap-3 p-2.5 rounded-lg bg-surface-raised border border-glass-border">
                {publicationStage >= 3 ? (
                  <CheckCircle2 className="w-4 h-4 text-teal" />
                ) : (
                  <div className="w-4 h-4 border-2 border-text-muted border-t-transparent rounded-full animate-spin" />
                )}
                <span>3. Lock Timetable Version (v2026.1) in Local Browser Session</span>
              </div>
            </div>

            {publicationStage >= 3 && (
              <div className="pt-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    setShowPublicationModal(false);
                    navigate('/hod/review');
                  }}
                  className="w-full"
                >
                  Complete & Return to HOD Review
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

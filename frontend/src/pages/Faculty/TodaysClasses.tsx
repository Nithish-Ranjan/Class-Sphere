import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Clock,
  BookOpen,
  Camera,
  MapPin,
  Users,
  Activity,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';

export const TodaysClasses: React.FC = () => {
  const navigate = useNavigate();

  // 6 Scheduled Classes directly from CampusPulse Blueprint Page 16 & 17
  const classesList = [
    {
      id: 'cs301-a',
      time: '10:00 – 11:00 AM',
      subject: 'Database Management Systems',
      shortCode: 'DBMS',
      courseCode: 'CS301',
      section: 'CSE-A',
      room: 'Room 204 (Hardware Lab Block)',
      enrolled: 47,
      activity: { phone: 8, talking: 11, out: 3, total: 22 },
      alertLevel: 'NONE',
      status: 'Active (Demo)',
      attendanceTaken: false,
      isCurrent: true,
      topic: 'Relational Normalization: 3NF & BCNF Fundamentals',
    },
    {
      id: 'cs302-b',
      time: '11:00 – 12:00 PM',
      subject: 'Computer Networks',
      shortCode: 'CN',
      courseCode: 'CS302',
      section: 'CSE-B',
      room: 'Room 307 (Network Systems Wing)',
      enrolled: 47,
      activity: { phone: 2, talking: 15, out: 1, total: 18 },
      alertLevel: 'MEDIUM',
      alertReason: 'Talking events spike detected during protocol demo',
      status: 'Scheduled',
      attendanceTaken: false,
      topic: 'TCP Sliding Window & Flow Control Mechanics',
    },
    {
      id: 'cs303-a',
      time: '12:00 – 01:00 PM',
      subject: 'Java Enterprise Architecture',
      shortCode: 'JAVA',
      courseCode: 'CS303',
      section: 'CSE-A',
      room: 'Room 204 (Hardware Lab Block)',
      enrolled: 47,
      activity: { phone: 1, talking: 2, out: 0, total: 3 },
      alertLevel: 'NONE',
      status: 'Scheduled',
      attendanceTaken: false,
      topic: 'Spring Boot Dependency Injection & Bean Lifecycle',
    },
    {
      id: 'cs304-c',
      time: '02:00 – 03:00 PM',
      subject: 'Operating Systems',
      shortCode: 'OS',
      courseCode: 'CS304',
      section: 'CSE-C',
      room: 'Room 301 (Systems Architecture Lab)',
      enrolled: 47,
      activity: { phone: 6, talking: 3, out: 1, total: 10 },
      alertLevel: 'LOW',
      alertReason: 'Intermittent mobile phone interactions detected',
      status: 'Scheduled',
      attendanceTaken: false,
      topic: 'Virtual Memory Paging & LRU Page Replacement',
    },
    {
      id: 'ma301-a',
      time: '03:00 – 04:00 PM',
      subject: 'Discrete Mathematics',
      shortCode: 'MATHS',
      courseCode: 'MA301',
      section: 'CSE-A',
      room: 'Room 105 (Theory Lecture Hall)',
      enrolled: 47,
      activity: { phone: 0, talking: 1, out: 0, total: 1 },
      alertLevel: 'NONE',
      status: 'Scheduled',
      attendanceTaken: false,
      topic: 'Graph Theory: Euler Paths & Hamiltonian Circuits',
    },
    {
      id: 'cs301-b',
      time: '04:00 – 05:00 PM',
      subject: 'Database Management Systems (Section B)',
      shortCode: 'DBMS-B',
      courseCode: 'CS301',
      section: 'CSE-B',
      room: 'Room 204 (Hardware Lab Block)',
      enrolled: 47,
      activity: { phone: 3, talking: 7, out: 2, total: 12 },
      alertLevel: 'LOW',
      alertReason: 'Mild talking murmur during lab exercise',
      status: 'Scheduled',
      attendanceTaken: false,
      topic: 'Concurrency Control: Two-Phase Locking (2PL)',
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse Blueprint · Feature 16 & 17"
        title="Today's Teaching Schedule"
        description="Comprehensive chronological timeline of all six lecture sessions assigned to Dr. S. Kumar with direct attendance capture and class dashboard controls."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-amber-500/10 text-amber-400 border border-amber-500/25">
              DEMO / BLUEPRINT REFERENCE
            </span>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => navigate('/faculty/daily-overview')}
            >
              Daily Overview (6/6) →
            </Button>
          </div>
        }
      />

      {/* Blueprint Reference Callout Banner */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-teal/10 border border-teal/20 text-teal flex items-center justify-center shrink-0">
            <Calendar className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-text-primary">
              6 Assigned Sessions · All Handled by Dr. S. Kumar
            </h4>
            <p className="text-[11px] text-text-muted mt-0.5">
              Illustrative teaching agenda directly matching CampusPulse Blueprint Page 16 (Complete Faculty Dashboard) and Page 17 (Faculty Daily Overview).
            </p>
          </div>
        </div>

        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-teal shrink-0">
          Blueprint Reference Schedule
        </span>
      </div>

      {/* Class Cards Grid */}
      <div className="space-y-4">
        {classesList.map((item) => (
          <SurfacePanel
            key={item.id}
            variant="deep"
            className={`p-6 sm:p-7 space-y-4 transition-all ${
              item.isCurrent
                ? 'border-2 border-teal/40 bg-surface-deep/90 shadow-glass-card'
                : 'border border-glass-border hover:border-glass-border/80'
            }`}
          >
            {/* Card Header Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-mono text-sm font-bold text-teal px-2.5 py-1 rounded bg-teal/10 border border-teal/25">
                  {item.time}
                </span>
                <span className="text-xs font-semibold uppercase tracking-wider text-text-muted">
                  Section {item.section}
                </span>
                <span className="text-xs text-text-muted">·</span>
                <span className="text-xs text-text-secondary flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-teal" />
                  <span>{item.room}</span>
                </span>
              </div>

              <div className="flex items-center gap-2">
                {item.alertLevel !== 'NONE' && (
                  <span
                    className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold ${
                      item.alertLevel === 'MEDIUM'
                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                        : 'bg-surface-raised text-text-muted border border-glass-border'
                    }`}
                  >
                    {item.alertLevel} ALERT
                  </span>
                )}
                <StatusPill
                  variant={item.isCurrent ? 'present' : 'neutral'}
                  label={item.status}
                  pulse={item.isCurrent}
                />
              </div>
            </div>

            {/* Main Content Info */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1.5 max-w-xl">
                <h3 className="text-xl font-bold tracking-tight text-text-primary">
                  {item.subject}{' '}
                  <span className="font-mono text-sm text-text-muted font-normal">
                    ({item.courseCode})
                  </span>
                </h3>
                <p className="text-xs text-text-secondary">
                  Topic: {item.topic}
                </p>
                {item.alertReason && (
                  <p className="text-[11px] text-amber-300 flex items-center gap-1.5 pt-1">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.alertReason}</span>
                  </p>
                )}
              </div>

              {/* Observable Events Summary */}
              <div className="flex items-center gap-3 bg-surface-raised/60 p-3 rounded-xl border border-glass-border shrink-0 text-xs">
                <div className="text-center px-2">
                  <span className="text-[10px] font-mono text-text-muted block">Phone</span>
                  <span className="font-mono font-bold text-teal">{item.activity.phone}</span>
                </div>
                <div className="w-px h-6 bg-glass-border" />
                <div className="text-center px-2">
                  <span className="text-[10px] font-mono text-text-muted block">Talking</span>
                  <span className="font-mono font-bold text-sky-400">{item.activity.talking}</span>
                </div>
                <div className="w-px h-6 bg-glass-border" />
                <div className="text-center px-2">
                  <span className="text-[10px] font-mono text-text-muted block">Total Events</span>
                  <span className="font-mono font-bold text-text-primary">{item.activity.total}</span>
                </div>
              </div>
            </div>

            {/* Actions Bar */}
            <div className="pt-3 border-t border-glass-border flex flex-wrap items-center justify-between gap-2">
              <span className="text-xs text-text-muted">
                {item.enrolled} Enrolled Candidates in Section {item.section}
              </span>

              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate('/faculty/class-log')}
                >
                  Class Log (Timeline)
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => navigate('/faculty/class-dashboard')}
                >
                  Class Dashboard
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => navigate('/faculty/attendance')}
                  leftIcon={<Camera className="w-3.5 h-3.5" />}
                >
                  Launch Attendance
                </Button>
              </div>
            </div>
          </SurfacePanel>
        ))}
      </div>
    </div>
  );
};

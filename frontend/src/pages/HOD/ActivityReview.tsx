import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Activity,
  Phone,
  MessageSquare,
  LogOut,
  ShieldCheck,
  Filter,
  Clock,
  Building2,
  Users,
  Search,
  Eye,
  Info,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { HOD_CLASSES_LIST, HOD_FACULTY_LIST, HOD_DEPARTMENT_INFO } from './hodMockData';

interface TelemetryStreamEvent {
  id: string;
  type: 'PHONE' | 'TALKING' | 'OUT';
  subjectCode: string;
  room: string;
  facultyName: string;
  timestamp: string;
  deviceNode: string;
}

const SAMPLE_ACTIVITY_STREAM: TelemetryStreamEvent[] = [
  {
    id: 'ACT-01',
    type: 'PHONE',
    subjectCode: 'CS301 (DBMS)',
    room: 'Room 204',
    facultyName: 'Dr. Suresh Kumar',
    timestamp: '10:14 AM',
    deviceNode: 'Demo Node 204-Rear',
  },
  {
    id: 'ACT-02',
    type: 'TALKING',
    subjectCode: 'CS301 (DBMS)',
    room: 'Room 204',
    facultyName: 'Dr. Suresh Kumar',
    timestamp: '10:22 AM',
    deviceNode: 'Demo Node 204-Front',
  },
  {
    id: 'ACT-03',
    type: 'PHONE',
    subjectCode: 'CS302 (CN)',
    room: 'Room 307',
    facultyName: 'Prof. Ananya Nair',
    timestamp: '11:20 AM',
    deviceNode: 'Demo Node 307-Main',
  },
  {
    id: 'ACT-04',
    type: 'OUT',
    subjectCode: 'CS302 (CN)',
    room: 'Room 307',
    facultyName: 'Prof. Ananya Nair',
    timestamp: '11:35 AM',
    deviceNode: 'Demo Node 307-Doorway',
  },
  {
    id: 'ACT-05',
    type: 'TALKING',
    subjectCode: 'CS303 (JAVA)',
    room: 'Room 301',
    facultyName: 'Dr. Rajesh Shetty',
    timestamp: '01:15 PM',
    deviceNode: 'Demo Node 301-Lab',
  },
  {
    id: 'ACT-06',
    type: 'PHONE',
    subjectCode: 'CS301-B (DBMS Lab)',
    room: 'Room 301',
    facultyName: 'Prof. Ananya Nair',
    timestamp: '10:45 AM',
    deviceNode: 'Demo Node 301-Lab',
  },
  {
    id: 'ACT-07',
    type: 'OUT',
    subjectCode: 'CS301 (DBMS)',
    room: 'Room 204',
    facultyName: 'Dr. Suresh Kumar',
    timestamp: '10:48 AM',
    deviceNode: 'Demo Node 204-Doorway',
  },
];

export const ActivityReview: React.FC = () => {
  const navigate = useNavigate();
  const [selectedEventType, setSelectedEventType] = useState<'ALL' | 'PHONE' | 'TALKING' | 'OUT'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Reconciled Blueprint Page 15 aggregates:
  const phoneTotal = HOD_DEPARTMENT_INFO.totalPhoneEvents;     // 26
  const talkingTotal = HOD_DEPARTMENT_INFO.totalTalkingEvents; // 11
  const outTotal = HOD_DEPARTMENT_INFO.totalOutEvents;         // 4
  const overallTotal = HOD_DEPARTMENT_INFO.totalObservableEvents; // 41

  const filteredStream = SAMPLE_ACTIVITY_STREAM.filter((item) => {
    const matchesType = selectedEventType === 'ALL' || item.type === selectedEventType;
    const matchesSearch =
      item.subjectCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.room.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.facultyName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  return (
    <div className="space-y-6 sm:space-y-8 pb-12">
      {/* Header */}
      <PageHeader
        title="Department Activity Telemetry Review"
        subtitle="Department of Computer Science & Engineering — Observable Classroom Occurrences"
        badge={
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs font-mono">
            <Activity className="w-3.5 h-3.5" />
            <span>41 Reconciled Events</span>
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

      {/* Fundamental Privacy Invariant Banner */}
      <div className="p-4 rounded-xl bg-surface-deep border border-teal/30 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-teal" />
            <span className="text-xs font-bold text-teal uppercase tracking-wider">
              Privacy Mandate: Discrete Events Only, Zero Personality Scoring
            </span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-teal/15 text-teal border border-teal/25">
            CAMPUSPULSE PRINCIPLE
          </span>
        </div>
        <p className="text-xs text-text-secondary leading-relaxed">
          ClassSphere adheres strictly to: <em className="text-text-primary">"Monitor important events, not personalities."</em> Events represent discrete physical signals (phone in view, speaking movement, out-of-seat transition). <strong>No attention percentages, behavioral rankings, or punitive metrics</strong> are computed.
        </p>
      </div>

      {/* Explicit Reporting Scope & Technical Disclosure */}
      <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border text-xs text-text-muted space-y-1 font-mono">
        <div className="flex items-center justify-between text-text-secondary">
          <span>Reporting Scope: {HOD_DEPARTMENT_INFO.reportingPeriod}</span>
          <span className="text-teal">Reconciliation Check: 24 + 11 + 6 = 41 Events</span>
        </div>
        <p className="text-[11px] text-text-muted mt-0.5">
          Disclosure: No connected camera sensor generated the illustrative activity events. Data represents sample physical occurrences for administrative demonstration.
        </p>
      </div>

      {/* Aggregate Metric Cards (Reconciled: 26 + 11 + 4 = 41) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        <SurfacePanel variant="deep" className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Total Events</span>
            <Activity className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-text-primary">{overallTotal}</div>
          <span className="text-[11px] text-text-muted mt-1 block">Reconciled Aggregate</span>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Phone Interactions</span>
            <Phone className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-amber-300">{phoneTotal}</div>
          <span className="text-[11px] text-text-muted mt-1 block">14 (Kumar) + 8 (Nair) + 4 (Shetty)</span>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Talking / Discussion</span>
            <MessageSquare className="w-4 h-4 text-teal" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-teal">{talkingTotal}</div>
          <span className="text-[11px] text-text-muted mt-1 block">7 (Kumar) + 2 (Nair) + 2 (Shetty)</span>
        </SurfacePanel>

        <SurfacePanel variant="deep" className="p-4">
          <div className="flex items-center justify-between">
            <span className="text-xs text-text-muted font-medium">Out of Seat</span>
            <LogOut className="w-4 h-4 text-rose-400" />
          </div>
          <div className="mt-1.5 text-2xl font-bold font-mono text-rose-400">{outTotal}</div>
          <span className="text-[11px] text-text-muted mt-1 block">3 (Kumar) + 1 (Nair) + 0 (Shetty)</span>
        </SurfacePanel>
      </div>

      {/* Faculty Activity Breakdown Table (Mathematically Reconciled) */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-glass-border">
          <div>
            <h3 className="text-sm font-semibold text-text-primary">
              Faculty Telemetry Distribution (Reconciled Sum: 41)
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Illustrative Demo Events grouped by assigned instructor across today's 6 completed sessions (matching Blueprint Page 15).
            </p>
          </div>
          <span className="text-xs font-mono text-teal">Blueprint P. 15 Match</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[560px]">
            <thead>
              <tr className="border-b border-glass-border text-[11px] font-mono uppercase text-text-muted">
                <th className="py-2.5 px-3">Faculty Member</th>
                <th className="py-2.5 px-3 text-center">Phone Events</th>
                <th className="py-2.5 px-3 text-center">Talking Events</th>
                <th className="py-2.5 px-3 text-center">Out of Seat</th>
                <th className="py-2.5 px-3 text-center">Total Events</th>
                <th className="py-2.5 px-3">Proportional Distribution</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-glass-border text-xs">
              {HOD_FACULTY_LIST.map((fac) => (
                <tr key={fac.id} className="hover:bg-surface-raised/50">
                  <td className="py-3 px-3">
                    <div className="font-semibold text-text-primary">{fac.name}</div>
                    <div className="text-[11px] font-mono text-text-muted">{fac.designation} (2 sessions today)</div>
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-medium text-amber-300">
                    {fac.phoneEvents}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-medium text-teal">
                    {fac.talkingEvents}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-medium text-rose-400">
                    {fac.outEvents}
                  </td>
                  <td className="py-3 px-3 text-center font-mono font-bold text-text-primary">
                    {fac.eventsCount}
                  </td>
                  <td className="py-3 px-3">
                    <div className="w-36 h-2 rounded-full bg-surface-raised overflow-hidden flex">
                      <div
                        className="bg-amber-400 h-full"
                        style={{ width: `${(fac.phoneEvents / fac.eventsCount) * 100}%` }}
                      />
                      <div
                        className="bg-teal h-full"
                        style={{ width: `${(fac.talkingEvents / fac.eventsCount) * 100}%` }}
                      />
                      <div
                        className="bg-rose-400 h-full"
                        style={{ width: `${(fac.outEvents / fac.eventsCount) * 100}%` }}
                      />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-glass-border bg-surface-raised/40 font-semibold text-xs text-text-primary">
                <td className="py-3 px-3">
                  <div>
                    <div className="font-bold text-text-primary">Total Telemetry Aggregate</div>
                    <div className="text-[11px] text-text-muted font-normal font-mono">
                      Scope: Today's 6 completed classroom sessions across 3 faculty members
                    </div>
                  </div>
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">
                  26 Phone
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-teal">
                  11 Talk
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-rose-400">
                  4 Out
                </td>
                <td className="py-3 px-3 text-center font-mono font-bold text-text-primary">
                  41 Events
                </td>
                <td className="py-3 px-3">
                  <span className="text-[11px] font-mono text-teal">100% Reconciled (24 + 11 + 6)</span>
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </SurfacePanel>

      {/* Live Stream / Chronological Event Log */}
      <SurfacePanel variant="deep" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
          <div>
            <h3 className="text-sm font-semibold text-text-primary flex items-center gap-2">
              <Clock className="w-4 h-4 text-teal" />
              <span>Timestamped Event Audit Trail</span>
            </h3>
            <p className="text-xs text-text-secondary mt-0.5">
              Illustrative Demo Events across classrooms for HOD governance audit.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {(['ALL', 'PHONE', 'TALKING', 'OUT'] as const).map((type) => (
              <button
                key={type}
                onClick={() => setSelectedEventType(type)}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-colors focus-ring ${
                  selectedEventType === type
                    ? 'bg-teal text-canvas font-bold'
                    : 'bg-surface-raised text-text-secondary hover:text-text-primary border border-glass-border'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          {filteredStream.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-surface-raised border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`p-2 rounded-lg ${
                    item.type === 'PHONE'
                      ? 'bg-amber-500/10 text-amber-300'
                      : item.type === 'TALKING'
                      ? 'bg-teal/10 text-teal'
                      : 'bg-rose-500/10 text-rose-400'
                  }`}
                >
                  {item.type === 'PHONE' && <Phone className="w-4 h-4" />}
                  {item.type === 'TALKING' && <MessageSquare className="w-4 h-4" />}
                  {item.type === 'OUT' && <LogOut className="w-4 h-4" />}
                </span>
                <div>
                  <div className="font-semibold text-text-primary">
                    {item.type === 'PHONE'
                      ? 'Phone Interaction (Demo Event)'
                      : item.type === 'TALKING'
                      ? 'Verbal Exchange (Demo Event)'
                      : 'Corridor Exit (Demo Event)'}
                  </div>
                  <div className="text-[11px] text-text-secondary mt-0.5">
                    {item.subjectCode} · {item.facultyName} · {item.room}
                  </div>
                </div>
              </div>

              <div className="text-left sm:text-right font-mono text-xs">
                <div className="text-text-primary font-medium">{item.timestamp}</div>
                <div className="text-[10px] text-text-muted">{item.deviceNode}</div>
              </div>
            </div>
          ))}
        </div>
      </SurfacePanel>
    </div>
  );
};

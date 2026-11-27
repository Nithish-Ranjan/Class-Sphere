import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  Camera,
  Radio,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  ShieldCheck,
  FileCheck2,
  Search,
  Filter,
  X,
  Send,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { NotConnectedState } from '../../components/ui/NotConnectedState';
import { CameraCapture } from '../../components/camera/CameraCapture';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import {
  AttendanceRecordStatus,
  StudentAttendanceHistoryItem,
  StudentAttendanceHistoryResponse,
  StudentSubjectAttendance,
} from '../../types';

export const StudentAttendance: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Active Tab: 'history' (default), 'camera', 'blueprint'
  const [activeTab, setActiveTab] = useState<'history' | 'camera' | 'blueprint'>('history');

  // Attendance History Data State
  const [historyResponse, setHistoryResponse] = useState<StudentAttendanceHistoryResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Available subjects for dropdown filter
  const [subjects, setSubjects] = useState<StudentSubjectAttendance[]>([]);

  // Filter States
  const [subjectId, setSubjectId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PRESENT' | 'LATE' | 'ABSENT' | 'UNVERIFIED'>('ALL');
  const [page, setPage] = useState<number>(1);
  const pageSize = 15;

  // Race-condition guard: tracks active request id so stale responses are discarded
  const activeRequestIdRef = useRef<number>(0);

  // Dispute Filing Modal State
  const [disputeRecord, setDisputeRecord] = useState<StudentAttendanceHistoryItem | null>(null);
  const [disputeReason, setDisputeReason] = useState<string>('');
  const [disputeSubmitting, setDisputeSubmitting] = useState<boolean>(false);
  const [disputeError, setDisputeError] = useState<string | null>(null);
  const [disputeSuccess, setDisputeSuccess] = useState<string | null>(null);

  const handleOpenDispute = (rec: StudentAttendanceHistoryItem) => {
    setDisputeRecord(rec);
    setDisputeReason('');
    setDisputeError(null);
  };

  const handleCloseDispute = () => {
    if (disputeSubmitting) return;
    setDisputeRecord(null);
    setDisputeReason('');
    setDisputeError(null);
  };

  const handleSubmitDispute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!disputeRecord) return;
    if (disputeReason.trim().length < 5) {
      setDisputeError('Please provide a detailed reason (at least 5 characters).');
      return;
    }

    try {
      setDisputeSubmitting(true);
      setDisputeError(null);
      await studentApi.createDispute({
        attendance_record_id: disputeRecord.record_id,
        student_reason: disputeReason.trim(),
      });
      setDisputeSuccess(
        `Dispute successfully filed for ${disputeRecord.subject_name || 'session'} on ${disputeRecord.session_date}. Pending faculty review.`
      );
      setDisputeRecord(null);
      setDisputeReason('');
      fetchAttendanceHistory();
      setTimeout(() => setDisputeSuccess(null), 6000);
    } catch (err: any) {
      setDisputeError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to submit attendance dispute.'
      );
    } finally {
      setDisputeSubmitting(false);
    }
  };

  // Fetch subjects list for filter dropdown
  useEffect(() => {
    let isMounted = true;
    studentApi
      .getSubjectWiseAttendance()
      .then((data) => {
        if (isMounted) setSubjects(data);
      })
      .catch(() => {
        // Fallback: non-fatal if subject list fails
      });
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch Attendance History records
  const fetchAttendanceHistory = useCallback(async () => {
    // Validate date range before sending
    if (startDate && endDate && startDate > endDate) {
      setError('Start date cannot be after end date. Please adjust your date range.');
      setLoading(false);
      return;
    }

    const currentRequestId = ++activeRequestIdRef.current;
    try {
      setLoading(true);
      setError(null);

      const params: any = {
        page,
        limit: pageSize,
      };

      if (subjectId.trim()) params.subject_id = subjectId.trim();
      if (startDate.trim()) params.start_date = startDate.trim();
      if (endDate.trim()) params.end_date = endDate.trim();
      if (statusFilter !== 'ALL') params.status = statusFilter;

      const data = await studentApi.getAttendanceHistory(params);

      // Only apply if this request is still the newest one
      if (currentRequestId === activeRequestIdRef.current) {
        setHistoryResponse(data);
      }
    } catch (err: any) {
      if (currentRequestId === activeRequestIdRef.current) {
        setError(
          err.response?.data?.error?.message ||
            err.message ||
            'Failed to retrieve attendance history records from the institutional ledger.'
        );
      }
    } finally {
      if (currentRequestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  }, [subjectId, startDate, endDate, statusFilter, page]);

  // Fetch whenever filters or pagination change
  useEffect(() => {
    fetchAttendanceHistory();
  }, [fetchAttendanceHistory]);

  // Filter change handlers that automatically reset pagination to page 1
  const handleSubjectChange = (val: string) => {
    setSubjectId(val);
    setPage(1);
  };

  const handleStartDateChange = (val: string) => {
    setStartDate(val);
    setPage(1);
  };

  const handleEndDateChange = (val: string) => {
    setEndDate(val);
    setPage(1);
  };

  const handleStatusFilterChange = (val: 'ALL' | 'PRESENT' | 'LATE' | 'ABSENT' | 'UNVERIFIED') => {
    setStatusFilter(val);
    setPage(1);
  };

  const handleResetFilters = () => {
    setSubjectId('');
    setStartDate('');
    setEndDate('');
    setStatusFilter('ALL');
    setPage(1);
  };

  const isFiltered = Boolean(subjectId || startDate || endDate || statusFilter !== 'ALL');
  const records = historyResponse?.records || [];
  const totalRecords = historyResponse?.total_records ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRecords / pageSize));

  // Helper for status pill variant
  const getStatusVariant = (status: AttendanceRecordStatus) => {
    switch (status) {
      case 'PRESENT':
        return 'present';
      case 'LATE':
        return 'late';
      case 'ABSENT':
        return 'absent';
      case 'UNVERIFIED':
        return 'unverified';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="Student Portal · Verified Attendance Ledgers"
        title="Attendance & Verification Console"
        description="Audit your chronological lecture attendance history, verification confidence metrics, and dispute eligibility."
        actions={
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono uppercase px-2.5 py-1 rounded bg-teal/10 text-teal border border-teal/25">
              Live Database Connected
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

      {/* Dispute Success Notification */}
      {disputeSuccess && (
        <div className="p-4 rounded-xl bg-teal/10 border border-teal/30 flex items-center justify-between gap-3 text-teal animate-in fade-in duration-150">
          <div className="flex items-center gap-2.5">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span className="text-xs sm:text-sm font-medium">{disputeSuccess}</span>
          </div>
          <button
            onClick={() => setDisputeSuccess(null)}
            className="p-1 hover:bg-teal/20 rounded transition-colors text-teal"
            aria-label="Dismiss alert"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Primary Tab Navigation */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-surface-deep border border-glass-border w-fit">
        <button
          onClick={() => setActiveTab('history')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors focus-ring min-h-[36px] ${
            activeTab === 'history'
              ? 'bg-teal text-canvas font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Attendance History</span>
        </button>

        <button
          onClick={() => setActiveTab('camera')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors focus-ring min-h-[36px] ${
            activeTab === 'camera'
              ? 'bg-teal text-canvas font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Live Browser Camera Test</span>
        </button>

        <button
          onClick={() => setActiveTab('blueprint')}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-colors focus-ring min-h-[36px] ${
            activeTab === 'blueprint'
              ? 'bg-teal text-canvas font-semibold shadow-sm'
              : 'text-text-secondary hover:text-text-primary'
          }`}
        >
          <Radio className="w-4 h-4" />
          <span>Blueprint Architecture</span>
        </button>
      </div>

      {/* Tab 1: Live Authenticated Attendance History */}
      {activeTab === 'history' && (
        <div className="space-y-6">
          {/* Filter Toolbar Panel */}
          <SurfacePanel variant="deep" className="p-5 sm:p-6 border border-glass-border space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-glass-border">
              <div className="flex items-center gap-2">
                <Filter className="w-4 h-4 text-teal" />
                <h3 className="text-sm font-semibold text-text-primary">Filter Attendance Ledgers</h3>
              </div>
              {isFiltered && (
                <button
                  onClick={handleResetFilters}
                  className="flex items-center gap-1.5 text-xs text-text-muted hover:text-teal transition-colors font-medium self-start sm:self-auto"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reset All Filters</span>
                </button>
              )}
            </div>

            {/* Filter Inputs Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Subject Filter */}
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">
                  Filter by Subject
                </label>
                <select
                  value={subjectId}
                  onChange={(e) => handleSubjectChange(e.target.value)}
                  className="w-full h-10 bg-surface-raised text-text-primary text-xs rounded-xl border border-input-border px-3 focus-ring"
                >
                  <option value="">All Enrolled Subjects</option>
                  {subjects.map((sub) => (
                    <option key={sub.subject_id} value={sub.subject_id}>
                      {sub.subject_name} ({sub.subject_code})
                    </option>
                  ))}
                </select>
              </div>

              {/* Start Date */}
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => handleStartDateChange(e.target.value)}
                  className="w-full h-10 bg-surface-raised text-text-primary text-xs rounded-xl border border-input-border px-3 focus-ring"
                />
              </div>

              {/* End Date */}
              <div>
                <label className="text-xs font-medium text-text-secondary block mb-1.5">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => handleEndDateChange(e.target.value)}
                  className="w-full h-10 bg-surface-raised text-text-primary text-xs rounded-xl border border-input-border px-3 focus-ring"
                />
              </div>
            </div>

            {/* Attendance Status Filter Pills */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <span className="text-xs text-text-secondary font-medium mr-1">Status:</span>
              {(['ALL', 'PRESENT', 'LATE', 'ABSENT', 'UNVERIFIED'] as const).map((st) => {
                const isSelected = statusFilter === st;
                let colorClasses = 'bg-surface-raised text-text-secondary hover:text-text-primary border-glass-border';
                if (isSelected) {
                  if (st === 'ALL') colorClasses = 'bg-teal text-canvas font-semibold shadow-sm border-teal';
                  else if (st === 'PRESENT') colorClasses = 'bg-emerald-500/20 text-emerald-300 font-semibold border-emerald-500/40';
                  else if (st === 'LATE') colorClasses = 'bg-amber-500/20 text-amber-300 font-semibold border-amber-500/40';
                  else if (st === 'ABSENT') colorClasses = 'bg-rose-500/20 text-rose-300 font-semibold border-rose-500/40';
                  else if (st === 'UNVERIFIED') colorClasses = 'bg-slate-500/30 text-slate-200 font-semibold border-slate-500/50';
                }

                return (
                  <button
                    key={st}
                    onClick={() => handleStatusFilterChange(st)}
                    className={`px-3 py-1.5 rounded-lg text-xs transition-all border ${colorClasses}`}
                  >
                    {st}
                  </button>
                );
              })}
            </div>
          </SurfacePanel>

          {/* Loading Skeleton */}
          {loading && (
            <SurfacePanel variant="deep" className="p-8 space-y-4">
              <div className="flex items-center gap-3 text-teal">
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span className="text-sm font-semibold">Querying verified session ledgers...</span>
              </div>
              <div className="space-y-3 pt-2">
                {[1, 2, 3, 4, 5].map((idx) => (
                  <div
                    key={idx}
                    className="h-16 rounded-xl bg-surface-raised border border-glass-border animate-pulse"
                  />
                ))}
              </div>
            </SurfacePanel>
          )}

          {/* Error State */}
          {!loading && error && (
            <SurfacePanel
              variant="deep"
              className="p-8 border border-rose-500/30 bg-rose-500/5 rounded-3xl space-y-4 text-center"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-rose-500/10 text-rose-400">
                <AlertCircle className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-text-primary">
                  Attendance Telemetry Error
                </h3>
                <p className="text-xs text-text-muted max-w-md mx-auto">{error}</p>
              </div>
              <Button
                variant="secondary"
                size="sm"
                onClick={fetchAttendanceHistory}
                leftIcon={<RefreshCw className="w-4 h-4" />}
              >
                Retry Connection
              </Button>
            </SurfacePanel>
          )}

          {/* Empty History State (No records exist at all) */}
          {!loading && !error && records.length === 0 && !isFiltered && (
            <SurfacePanel variant="deep" className="p-12 text-center rounded-3xl border border-glass-border space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-teal/10 text-teal">
                <Calendar className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-text-primary">
                  No Attendance Records Found
                </h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto">
                  No finalized attendance sessions have been logged for your student account on the institutional ledger yet.
                </p>
              </div>
            </SurfacePanel>
          )}

          {/* No Matching Records State (After filter application) */}
          {!loading && !error && records.length === 0 && isFiltered && (
            <SurfacePanel variant="deep" className="p-12 text-center rounded-3xl border border-glass-border space-y-4">
              <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-surface-raised text-text-muted">
                <Search className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-text-primary">
                  No Matching Attendance Records
                </h3>
                <p className="text-xs text-text-secondary max-w-md mx-auto">
                  No lecture sessions match your selected subject, date range, or attendance status filters.
                </p>
              </div>
              <Button variant="secondary" size="sm" onClick={handleResetFilters} leftIcon={<RotateCcw className="w-4 h-4" />}>
                Reset Filter Criteria
              </Button>
            </SurfacePanel>
          )}

          {/* Data Records Table */}
          {!loading && !error && records.length > 0 && (
            <SurfacePanel variant="deep" className="p-0 border border-glass-border overflow-hidden">
              {/* Header metrics bar */}
              <div className="p-4 sm:p-5 border-b border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-raised/40">
                <div>
                  <h3 className="text-sm font-semibold text-text-primary">
                    Historical Session Transcripts
                  </h3>
                  <p className="text-xs text-text-secondary mt-0.5">
                    Chronological lecture records with multi-modal confidence scores and review status
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-teal bg-teal/10 px-2.5 py-1 rounded border border-teal/20">
                    {totalRecords} Total Record{totalRecords === 1 ? '' : 's'}
                  </span>
                  <span className="text-xs font-mono text-text-muted bg-surface-deep px-2.5 py-1 rounded border border-glass-border">
                    Page {page} of {totalPages}
                  </span>
                </div>
              </div>

              {/* Table Body */}
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-surface-deep/80 text-text-secondary font-semibold uppercase tracking-wider text-[10px] border-b border-glass-border">
                    <tr>
                      <th className="py-3 px-4">Date & Timing</th>
                      <th className="py-3 px-4">Subject & Code</th>
                      <th className="py-3 px-4">Classroom & Faculty</th>
                      <th className="py-3 px-4">Attendance Status</th>
                      <th className="py-3 px-4">Verification Telemetry</th>
                      <th className="py-3 px-4">Dispute / Audit State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-glass-border text-text-primary">
                    {records.map((rec) => (
                      <tr key={rec.record_id} className="hover:bg-surface-raised/50 transition-colors">
                        {/* Date & Timing */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-text-primary block font-mono">
                            {rec.session_date}
                          </span>
                          <span className="text-[11px] font-mono text-text-muted flex items-center gap-1 mt-0.5">
                            <Clock className="w-3 h-3 text-text-muted" />
                            {rec.start_time && rec.end_time
                              ? `${rec.start_time} – ${rec.end_time}`
                              : 'Session Timing Unspecified'}
                          </span>
                        </td>

                        {/* Subject & Code */}
                        <td className="py-3.5 px-4">
                          <span className="font-semibold text-text-primary block">
                            {rec.subject_name || 'Independent / Elective Session'}
                          </span>
                          <span className="text-[11px] font-mono text-text-muted">
                            {rec.subject_code || '—'}
                          </span>
                        </td>

                        {/* Classroom & Faculty */}
                        <td className="py-3.5 px-4">
                          <span className="text-text-primary block">
                            {rec.room_number || 'Room TBD'}
                          </span>
                          <span className="text-[11px] text-text-muted block mt-0.5">
                            {rec.faculty_name || 'Faculty Unassigned'}
                          </span>
                        </td>

                        {/* Attendance Status */}
                        <td className="py-3.5 px-4">
                          <StatusPill
                            variant={getStatusVariant(rec.status)}
                            label={rec.status}
                          />
                        </td>

                        {/* Verification Telemetry & Confidence Score */}
                        <td className="py-3.5 px-4">
                          <div className="space-y-1">
                            {rec.confidence_score !== null && rec.confidence_score !== undefined ? (
                              <span className="inline-flex items-center gap-1.5 text-xs font-mono text-teal">
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>{(rec.confidence_score * 100).toFixed(0)}% Match</span>
                              </span>
                            ) : (
                              <span className="text-[11px] font-mono text-text-muted">
                                Unavailable (Manual / Challenge)
                              </span>
                            )}

                            {rec.manual_override && (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/15 text-blue-400 border border-blue-500/30 block w-fit">
                                <FileCheck2 className="w-3 h-3" />
                                <span>Faculty Override</span>
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Dispute Status / Eligibility */}
                        <td className="py-3.5 px-4">
                          {rec.dispute_id ? (
                            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-mono bg-amber-500/15 text-amber-300 border border-amber-500/30">
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>Dispute: {rec.dispute_status || 'FILED'}</span>
                            </span>
                          ) : rec.can_dispute ? (
                            <button
                              onClick={() => handleOpenDispute(rec)}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-amber-500/15 text-amber-300 hover:bg-amber-500/25 border border-amber-500/30 transition-colors focus-ring cursor-pointer"
                              title="Submit attendance dispute for faculty review"
                            >
                              <AlertTriangle className="w-3.5 h-3.5" />
                              <span>File Dispute</span>
                            </button>
                          ) : rec.status === 'PRESENT' ? (
                            <span className="text-text-muted text-[11px] font-mono">
                              Not applicable (Present)
                            </span>
                          ) : (
                            <span className="text-text-muted text-[11px] font-mono">
                              Ineligible
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination Controls Footer */}
              <div className="p-4 border-t border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface-raised/20">
                <span className="text-xs text-text-secondary font-mono">
                  Showing {Math.min((page - 1) * pageSize + 1, totalRecords)} –{' '}
                  {Math.min(page * pageSize, totalRecords)} of {totalRecords} records
                </span>

                <div className="flex items-center gap-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page <= 1 || loading}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    leftIcon={<ChevronLeft className="w-4 h-4" />}
                  >
                    Previous
                  </Button>

                  <span className="text-xs font-mono text-text-primary px-3 py-1 rounded bg-surface-deep border border-glass-border">
                    {page} / {totalPages}
                  </span>

                  <Button
                    variant="secondary"
                    size="sm"
                    disabled={page >= totalPages || loading}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    rightIcon={<ChevronRight className="w-4 h-4" />}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </SurfacePanel>
          )}
        </div>
      )}

      {/* Tab 2: Live Browser Camera Capture Component */}
      {activeTab === 'camera' && (
        <div className="space-y-6">
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
              Biometric Engine Offline
            </span>
          </div>

          <CameraCapture
            title="Browser Camera Capture Component"
            description="Local WebRTC camera testing. Capture, retake, and confirm workflows run entirely in your local browser."
          />

          <NotConnectedState
            moduleName="Face Embedding & Biometric Matcher"
            serviceType="Biometric Engine"
            explanation="The camera stream runs in your browser. Server-side vector embeddings, facial matching models, and official institutional database commits are not yet connected in this frontend phase."
          />
        </div>
      )}

      {/* Tab 3: Blueprint Architecture Flow */}
      {activeTab === 'blueprint' && (
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
              <span className="text-xs font-mono text-teal bg-teal/10 px-2.5 py-1 rounded border border-teal/20">
                Design Specification
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
                <span className="text-[10px] text-amber-400 block">Manual Confirm / Dispute</span>
              </div>
            </div>
          </SurfacePanel>

          {/* Dispute Integration Notice */}
          <SurfacePanel variant="deep" className="p-6 border border-glass-border space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <h4 className="text-sm font-semibold text-text-primary">
                Dispute & Attendance Review Submissions
              </h4>
            </div>
            <p className="text-xs text-text-secondary leading-relaxed">
              Dispute eligibility indicators and interactive dispute submissions are active in the Attendance History ledger above. Clicking <strong>File Dispute</strong> submits formal verification review requests directly to faculty queues with atomic notification triggers.
            </p>
          </SurfacePanel>
        </div>
      )}

      {/* Interactive Dispute Submission Modal */}
      {disputeRecord && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
          role="dialog"
          aria-modal="true"
          aria-labelledby="dispute-dialog-title"
        >
          <div className="w-full max-w-lg rounded-2xl bg-surface-deep border border-glass-border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-glass-border flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <div>
                  <h3 id="dispute-dialog-title" className="text-sm font-bold text-text-primary">
                    File Attendance Dispute
                  </h3>
                  <p className="text-[11px] text-text-muted">
                    Request formal faculty review and verification
                  </p>
                </div>
              </div>
              <button
                onClick={handleCloseDispute}
                disabled={disputeSubmitting}
                className="p-1 rounded-lg text-text-muted hover:text-text-primary hover:bg-surface-raised transition-colors focus-ring disabled:opacity-50 cursor-pointer"
                aria-label="Close dispute dialog"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmitDispute} className="p-6 space-y-4">
              {/* Context Summary Cards */}
              <div className="p-3.5 rounded-xl bg-surface-raised border border-glass-border grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-mono block">Session Date</span>
                  <span className="font-semibold text-text-primary font-mono">{disputeRecord.session_date}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-mono block">Subject</span>
                  <span className="font-semibold text-text-primary truncate block" title={disputeRecord.subject_name || disputeRecord.subject_code || 'General'}>
                    {disputeRecord.subject_code ? `${disputeRecord.subject_code} · ${disputeRecord.subject_name}` : 'General Session'}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-mono block">Current Status</span>
                  <span className="font-semibold text-rose-400 font-mono">{disputeRecord.status}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-muted uppercase font-mono block">Time / Room</span>
                  <span className="font-semibold text-text-secondary truncate block">
                    {disputeRecord.start_time ? `${disputeRecord.start_time} · ${disputeRecord.room_number || 'Room'}` : (disputeRecord.room_number || 'Classroom')}
                  </span>
                </div>
              </div>

              {/* Error Callout */}
              {disputeError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-400">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{disputeError}</span>
                </div>
              )}

              {/* Reason Input */}
              <div className="space-y-1.5">
                <label htmlFor="dispute-reason" className="block text-xs font-medium text-text-primary">
                  Reason for Dispute <span className="text-rose-400">*</span>
                </label>
                <textarea
                  id="dispute-reason"
                  rows={4}
                  value={disputeReason}
                  onChange={(e) => setDisputeReason(e.target.value)}
                  placeholder="Explain why this attendance status should be revised (e.g., sat in back row, group presentation, camera blind spot)..."
                  disabled={disputeSubmitting}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-surface-deep border border-glass-border text-xs text-text-primary placeholder:text-text-muted focus-ring resize-none"
                  minLength={5}
                  maxLength={1000}
                  required
                />
                <span className="text-[10px] text-text-muted block text-right">
                  {disputeReason.length}/1000 characters (minimum 5)
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-3 pt-2 border-t border-glass-border">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleCloseDispute}
                  disabled={disputeSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={disputeSubmitting}
                  leftIcon={<Send className="w-3.5 h-3.5" />}
                >
                  Submit Dispute
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

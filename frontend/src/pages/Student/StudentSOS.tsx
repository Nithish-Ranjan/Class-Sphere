import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle,
  ShieldAlert,
  MapPin,
  CheckCircle2,
  Clock,
  Info,
  RefreshCw,
  AlertCircle,
  Send,
  Building,
  Check,
} from 'lucide-react';
import { PageHeader } from '../../components/ui/PageHeader';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { StatusPill } from '../../components/ui/StatusPill';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { studentApi } from '../../services/api';
import { SOSIncidentType, StudentSOSIncidentResponse } from '../../types';

export const StudentSOS: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Incidents Data State
  const [incidents, setIncidents] = useState<StudentSOSIncidentResponse[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  // Form State
  const [selectedIncidentType, setSelectedIncidentType] = useState<SOSIncidentType | null>(null);
  const [locationDescription, setLocationDescription] = useState<string>('');
  const [roomId, setRoomId] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submittedIncident, setSubmittedIncident] = useState<StudentSOSIncidentResponse | null>(null);

  // Fetch student's own active/recent incidents
  const fetchIncidents = useCallback(async () => {
    try {
      setLoading(true);
      setFetchError(null);
      const data = await studentApi.getActiveSOSIncidents(20);
      setIncidents(data);
    } catch (err: any) {
      setFetchError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to connect to emergency telemetry services. Please check your network connection.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents]);

  // Handle Form Submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    // Client-side validations
    if (!selectedIncidentType) {
      setSubmitError('Please select an incident type (Someone Fell or Something Happened).');
      return;
    }

    const trimmedLocation = locationDescription.trim();
    if (trimmedLocation.length < 3) {
      setSubmitError('Location description must be at least 3 characters.');
      return;
    }

    try {
      setIsSubmitting(true);
      setSubmitError(null);

      const payload = {
        incident_type: selectedIncidentType,
        location_description: trimmedLocation,
        room_id: roomId.trim() ? roomId.trim() : null,
        notes: notes.trim() ? notes.trim() : null,
      };

      const result = await studentApi.createSOSIncident(payload);

      // On HTTP 201: Record success, show confirmation, reset form, and reload list
      setSubmittedIncident(result);
      setSelectedIncidentType(null);
      setLocationDescription('');
      setRoomId('');
      setNotes('');

      // Refresh incident list to include new incident
      await fetchIncidents();
    } catch (err: any) {
      setSubmitError(
        err.response?.data?.error?.message ||
        err.message ||
        'Failed to submit emergency SOS report. Please try again or reach authorities directly.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Separate incidents into Active vs Resolved History
  const activeIncidents = incidents.filter((i) => i.status !== 'CAMPUS_RESOLVED');
  const resolvedIncidents = incidents.filter((i) => i.status === 'CAMPUS_RESOLVED');

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return d.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      });
    } catch {
      return isoString;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'REPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-500/15 text-rose-700 border border-rose-500/30">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-ping" />
            REPORTED (Pending Verification)
          </span>
        );
      case 'ACKNOWLEDGED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-700 border border-amber-500/30">
            <Clock className="w-3 h-3 text-amber-600" />
            ACKNOWLEDGED (Staff Reviewing)
          </span>
        );
      case 'ESCALATION_REQUESTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-orange-500/15 text-orange-700 border border-orange-500/30">
            <Building className="w-3 h-3 text-orange-600" />
            ESCALATION REQUESTED
          </span>
        );
      case 'EXTERNAL_HANDOFF_PENDING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-700 border border-purple-500/30">
            <Clock className="w-3 h-3 text-purple-600" />
            EXTERNAL HANDOFF PENDING
          </span>
        );
      case 'EXTERNAL_HANDOFF_CONFIRMED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Check className="w-3 h-3 text-indigo-400" />
            EXTERNAL HANDOFF CONFIRMED
          </span>
        );
      case 'CAMPUS_RESOLVED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-700 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            CAMPUS RESOLVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-mono bg-surface-raised text-text-muted border border-glass-border">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      <PageHeader
        eyebrow="CampusPulse · Student Safety"
        title="Emergency SOS & Incident Response"
        description="Submit rapid emergency reports and monitor real-time incident status."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={fetchIncidents}
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button variant="ghost" size="sm" onClick={() => navigate('/student/overview')}>
              ← Overview
            </Button>
          </div>
        }
      />

      {/* Safety & Transparency Notice */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-rose-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-glass">
        <div className="flex items-start sm:items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-text-primary uppercase tracking-wide">
              Official Safety & Emergency Notice
            </h4>
            <p className="text-[11px] text-text-secondary mt-0.5 leading-relaxed">
              Submitting an SOS records your emergency report in ClassSphere. It does not currently guarantee that campus authorities or emergency services have been notified. If you need immediate assistance, contact the appropriate emergency service or campus authority directly.
            </p>
          </div>
        </div>
        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-rose-500/15 text-rose-700 border border-rose-500/30 shrink-0 self-start sm:self-center">
          Notice
        </span>
      </div>

      {/* Submission Confirmation Banner (HTTP 201) */}
      {submittedIncident && (
        <SurfacePanel
          variant="deep"
          className="p-6 rounded-2xl border-2 border-emerald-500/40 bg-emerald-500/5 space-y-4 animate-in slide-in-from-top-2 duration-200"
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary">
                  Emergency Incident Recorded Successfully
                </h3>
                <p className="text-xs text-text-secondary mt-0.5">
                  Your incident has been persisted in institutional safety records.
                </p>
              </div>
            </div>
            <button
              onClick={() => setSubmittedIncident(null)}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Dismiss ✕
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-surface-raised border border-glass-border text-xs">
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted block">Incident Code</span>
              <span className="font-mono font-bold text-teal text-sm">{submittedIncident.incident_code}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted block">Incident Type</span>
              <span className="font-semibold text-text-primary">{submittedIncident.incident_type}</span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted block">Severity</span>
              <span className={`font-semibold ${submittedIncident.severity === 'CRITICAL' ? 'text-rose-600' : 'text-amber-600'}`}>
                {submittedIncident.severity}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase text-text-muted block">Initial Status</span>
              <span className="font-semibold text-text-primary">{submittedIncident.status}</span>
            </div>
          </div>
        </SurfacePanel>
      )}

      {/* SOS Form Card */}
      <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6 border border-glass-border shadow-glass-dropdown">
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-text-primary">Report an Emergency Incident</h2>
          <p className="text-xs text-text-secondary">
            Select the category that best matches the urgent situation on campus.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Incident Category Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Option 1: SOMEONE FELL */}
            <button
              type="button"
              onClick={() => {
                setSelectedIncidentType('FELL');
                setSubmitError(null);
              }}
              className={`p-5 rounded-2xl border-2 text-left space-y-3 transition-all duration-150 active:scale-[0.99] focus-ring ${
                selectedIncidentType === 'FELL'
                  ? 'bg-rose-500/10 border-rose-500 shadow-glass-dropdown'
                  : 'bg-surface-raised border-glass-border hover:border-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-600 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-rose-500/15 text-rose-700 border border-rose-500/30">
                  Critical
                </span>
              </div>
              <div>
                <span className="text-sm font-bold uppercase tracking-wider text-rose-600 block">
                  SOMEONE FELL
                </span>
                <span className="text-xs text-text-secondary mt-1 block">
                  Sudden physical fall, seizure, syncope, or mobility impairment.
                </span>
              </div>
            </button>

            {/* Option 2: SOMETHING HAPPENED */}
            <button
              type="button"
              onClick={() => {
                setSelectedIncidentType('SOMETHING');
                setSubmitError(null);
              }}
              className={`p-5 rounded-2xl border-2 text-left space-y-3 transition-all duration-150 active:scale-[0.99] focus-ring ${
                selectedIncidentType === 'SOMETHING'
                  ? 'bg-amber-500/10 border-amber-500 shadow-glass-dropdown'
                  : 'bg-surface-raised border-glass-border hover:border-amber-500/40'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/25 text-amber-600 flex items-center justify-center">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-amber-500/15 text-amber-700 border border-amber-500/30">
                  High
                </span>
              </div>
              <div>
                <span className="text-sm font-bold uppercase tracking-wider text-amber-600 block">
                  SOMETHING HAPPENED
                </span>
                <span className="text-xs text-text-secondary mt-1 block">
                  Acute medical event, lab hazard, electrical fault, or physical security concern.
                </span>
              </div>
            </button>
          </div>

          {/* Location Description Input (Mandatory) */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-primary flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-teal" />
                Location Description <span className="text-rose-600">*</span>
              </span>
              <span className="text-[11px] text-text-muted">Minimum 3 characters</span>
            </label>
            <input
              type="text"
              value={locationDescription}
              onChange={(e) => {
                setLocationDescription(e.target.value);
                setSubmitError(null);
              }}
              placeholder="e.g. 3rd Floor Hallway outside Chemistry Lab 304, or Central Library 2nd Floor"
              className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-glass-border text-sm text-text-primary placeholder:text-text-muted focus-ring transition-colors"
              disabled={isSubmitting}
            />
          </div>

          {/* Optional Room Identifier */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Building className="w-3.5 h-3.5 text-text-muted" />
                Classroom Room ID / UUID <span className="text-text-muted font-normal">(Optional)</span>
              </span>
              <span className="text-[11px] text-text-muted">Leave empty if outside a classroom</span>
            </label>
            <input
              type="text"
              value={roomId}
              onChange={(e) => {
                setRoomId(e.target.value);
                setSubmitError(null);
              }}
              placeholder="Optional: Enter classroom UUID if known"
              className="w-full px-4 py-2 rounded-xl bg-surface-raised border border-glass-border text-xs text-text-primary placeholder:text-text-muted focus-ring transition-colors font-mono"
              disabled={isSubmitting}
            />
          </div>

          {/* Optional Notes Input */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-text-secondary flex items-center justify-between">
              <span>Additional Details / Notes <span className="text-text-muted font-normal">(Optional)</span></span>
              <span className="text-[11px] text-text-muted">{notes.length} / 2000</span>
            </label>
            <textarea
              value={notes}
              onChange={(e) => {
                setNotes(e.target.value);
                setSubmitError(null);
              }}
              rows={3}
              maxLength={2000}
              placeholder="Describe symptoms, visible hazards, or specific assistance required..."
              className="w-full px-4 py-2.5 rounded-xl bg-surface-raised border border-glass-border text-xs text-text-primary placeholder:text-text-muted focus-ring transition-colors resize-none"
              disabled={isSubmitting}
            />
          </div>

          {/* Error Banner */}
          {submitError && (
            <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center gap-2.5 text-xs text-rose-700">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{submitError}</span>
            </div>
          )}

          {/* Submit Action */}
          <div className="flex items-center justify-between pt-2 border-t border-glass-border">
            <span className="text-[11px] text-text-muted">
              Reporter: <strong className="text-text-primary">{user?.full_name || 'Authenticated Student'}</strong>
            </span>
            <Button
              type="submit"
              variant="danger"
              size="md"
              disabled={isSubmitting || !selectedIncidentType || locationDescription.trim().length < 3}
              leftIcon={
                isSubmitting ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )
              }
            >
              {isSubmitting ? 'Recording Emergency SOS...' : 'Submit Emergency SOS'}
            </Button>
          </div>
        </form>
      </SurfacePanel>

      {/* Incident Status and History Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="text-lg font-bold text-text-primary">Your Emergency Incidents</h3>
            <p className="text-xs text-text-secondary">
              Real-time record of all emergency SOS reports submitted under your student account.
            </p>
          </div>
          <span className="text-xs font-mono text-text-muted">
            Total on record: {incidents.length}
          </span>
        </div>

        {/* Loading State */}
        {loading && (
          <SurfacePanel variant="deep" className="p-10 text-center rounded-2xl border border-glass-border space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-teal/10 text-teal animate-spin">
              <RefreshCw className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-xs font-semibold text-text-primary">Loading Incident History</h4>
              <p className="text-[11px] text-text-muted">
                Retrieving verified emergency telemetry from campus records...
              </p>
            </div>
          </SurfacePanel>
        )}

        {/* API Error State */}
        {!loading && fetchError && (
          <SurfacePanel variant="deep" className="p-8 border border-rose-500/30 bg-rose-500/5 rounded-2xl space-y-3 text-center">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-rose-500/10 text-rose-600">
              <AlertCircle className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-text-primary">Telemetry Retrieval Error</h4>
              <p className="text-xs text-text-muted max-w-md mx-auto">{fetchError}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={fetchIncidents} leftIcon={<RefreshCw className="w-3.5 h-3.5" />}>
              Retry Connection
            </Button>
          </SurfacePanel>
        )}

        {/* Empty State */}
        {!loading && !fetchError && incidents.length === 0 && (
          <SurfacePanel variant="deep" className="p-10 text-center rounded-2xl border border-glass-border space-y-3">
            <div className="inline-flex items-center justify-center w-10 h-10 rounded-full bg-surface-raised border border-glass-border text-text-muted">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            </div>
            <div className="space-y-1">
              <h4 className="text-sm font-semibold text-text-primary">No Incident Reports on File</h4>
              <p className="text-xs text-text-muted max-w-md mx-auto">
                You have not submitted any emergency SOS incidents. Active and historical reports will be displayed here once recorded.
              </p>
            </div>
          </SurfacePanel>
        )}

        {/* Section A: Active Incidents */}
        {!loading && !fetchError && incidents.length > 0 && (
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-rose-600">
                Active Incidents ({activeIncidents.length})
              </h4>
            </div>

            {activeIncidents.length === 0 ? (
              <div className="p-4 rounded-xl bg-surface-deep border border-glass-border text-xs text-text-muted">
                No currently active emergency incidents.
              </div>
            ) : (
              <div className="space-y-3">
                {activeIncidents.map((incident) => (
                  <SurfacePanel
                    key={incident.id}
                    variant="deep"
                    className="p-5 rounded-2xl border border-rose-500/30 space-y-3"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-glass-border">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-600 flex items-center justify-center shrink-0">
                          <AlertTriangle className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-sm text-text-primary">
                              {incident.incident_code}
                            </span>
                            <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-surface-raised border border-glass-border text-text-secondary">
                              {incident.incident_type}
                            </span>
                            <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded ${
                              incident.severity === 'CRITICAL'
                                ? 'bg-rose-500/20 text-rose-700 border border-rose-500/30'
                                : 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                            }`}>
                              {incident.severity}
                            </span>
                          </div>
                          <span className="text-[11px] text-text-muted mt-0.5 block">
                            Reported: {formatTimestamp(incident.reported_at)}
                          </span>
                        </div>
                      </div>

                      <div className="self-start sm:self-auto">
                        {getStatusBadge(incident.status)}
                      </div>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex items-start gap-2 text-text-secondary">
                        <MapPin className="w-3.5 h-3.5 text-teal shrink-0 mt-0.5" />
                        <span className="font-medium text-text-primary">{incident.location_description}</span>
                      </div>

                      {incident.notes && (
                        <div className="p-2.5 rounded-lg bg-surface-raised border border-glass-border text-[11px] text-text-muted">
                          <strong className="text-text-secondary">Notes:</strong> {incident.notes}
                        </div>
                      )}

                      {incident.status === 'EXTERNAL_HANDOFF_CONFIRMED' && (
                        <div className="p-2.5 rounded-lg bg-indigo-500/10 border border-indigo-500/25 text-[11px] text-indigo-300 flex items-center gap-2">
                          <Info className="w-4 h-4 shrink-0" />
                          <span>
                            System records a confirmed external handoff reference. Campus safety and external service response is ongoing.
                          </span>
                        </div>
                      )}
                    </div>
                  </SurfacePanel>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Section B: Resolved History */}
        {!loading && !fetchError && resolvedIncidents.length > 0 && (
          <div className="space-y-4 pt-4 border-t border-glass-border">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-emerald-600">
                Resolved Incident History ({resolvedIncidents.length})
              </h4>
            </div>

            <div className="space-y-3">
              {resolvedIncidents.map((incident) => (
                <SurfacePanel
                  key={incident.id}
                  variant="deep"
                  className="p-4 rounded-xl border border-glass-border opacity-85 hover:opacity-100 transition-opacity space-y-2 text-xs"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-text-primary">{incident.incident_code}</span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-raised border border-glass-border text-text-muted">
                        {incident.incident_type}
                      </span>
                      <span className="text-[11px] text-text-muted">
                        Reported: {formatTimestamp(incident.reported_at)}
                      </span>
                    </div>
                    {getStatusBadge(incident.status)}
                  </div>
                  <div className="flex items-center gap-1.5 text-text-muted text-[11px]">
                    <MapPin className="w-3 h-3 text-teal shrink-0" />
                    <span>{incident.location_description}</span>
                  </div>
                </SurfacePanel>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Emergency Contact Information */}
      <div className="p-4 rounded-2xl bg-surface-deep border border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 text-text-secondary">
          <Info className="w-4 h-4 text-teal shrink-0" />
          <span>
            Institutional Emergency Dispatch: Contact your campus security control room or local emergency medical helpline if life-threatening injury or hazard occurs.
          </span>
        </div>
        <span className="text-[10px] font-mono uppercase px-2.5 py-1 rounded bg-surface-raised border border-glass-border text-text-muted shrink-0">
          Campus Safety
        </span>
      </div>
    </div>
  );
};

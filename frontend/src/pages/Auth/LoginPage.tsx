import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  Info,
  CheckCircle2,
  Phone,
  HelpCircle,
  GraduationCap,
  BookOpen,
  Building,
} from 'lucide-react';
import { useAuth, DEMO_PERSONAS } from '../../context/AuthContext';
import { Role } from '../../types';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { SurfacePanel } from '../../components/ui/SurfacePanel';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginWithCredentials, loginAsDemoPersona } = useAuth();

  React.useEffect(() => {
    document.title = 'Institutional Portal Login · ClassSphere';
  }, []);

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [institutionCode, setInstitutionCode] = useState('INST-DEMO');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [availableRoles, setAvailableRoles] = useState<Role[] | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter both your institutional identifier and password.');
      return;
    }
    if (!institutionCode.trim()) {
      setErrorMessage('Please specify an institution code (e.g. INST-DEMO).');
      return;
    }

    if (availableRoles && availableRoles.length > 1 && !selectedRole) {
      setErrorMessage('Please select one of your authorized roles to continue.');
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const user = await loginWithCredentials(
        identifier.trim(),
        password,
        rememberMe,
        institutionCode.trim(),
        selectedRole || undefined
      );
      if (user.role === 'STUDENT') navigate('/student/overview');
      else if (user.role === 'FACULTY') navigate('/faculty/overview');
      else if (user.role === 'HOD') navigate('/hod/overview');
      else navigate('/student/overview');
    } catch (err: any) {
      const errCode = err.response?.data?.error?.code;
      const errDetails = err.response?.data?.error?.details;

      if (errCode === 'ROLE_SELECTION_REQUIRED') {
        const roles: Role[] = Array.isArray(errDetails) && errDetails.length > 0
          ? errDetails
          : ['STUDENT', 'FACULTY'];
        setAvailableRoles(roles);
        setSelectedRole(roles[0]);
        setErrorMessage(null);
      } else {
        const serverMessage =
          err.response?.data?.error?.message ||
          err.response?.data?.detail ||
          (typeof err.response?.data?.error === 'string' ? err.response?.data?.error : null);
        setErrorMessage(
          serverMessage ||
            'Upstream authentication service is not connected. For local preview, please use the Institutional Sandbox Personas below.'
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectPersona = async (roleKey: 'student' | 'faculty' | 'hod') => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      await loginAsDemoPersona(roleKey);
    } finally {
      setIsLoading(false);
    }
    if (roleKey === 'student') navigate('/student/overview');
    else if (roleKey === 'faculty') navigate('/faculty/overview');
    else if (roleKey === 'hod') navigate('/hod/overview');
  };

  return (
    <div className="min-h-screen w-full bg-canvas flex flex-col lg:flex-row">
      {/* Left Column: Architectural Editorial Identity & Telemetry Graphic */}
      <div className="lg:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-between border-b lg:border-b-0 lg:border-r border-glass-border bg-gradient-to-br from-white via-canvas to-teal/10 relative overflow-hidden">
        {/* Subtle grid pattern background */}
        <div
          className="absolute inset-0 opacity-[0.05] pointer-events-none"
          style={{
            backgroundImage:
              'linear-gradient(rgba(15,23,42,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.5) 1px, transparent 1px)',
            backgroundSize: '32px 32px',
          }}
          aria-hidden="true"
        />

        {/* Top: Brand Header */}
        <div className="relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-surface-raised border border-glass-border flex items-center justify-center text-teal shadow-glass-card">
              <svg
                className="w-6 h-6"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M6 16h5l3-7 4 14 3-7h5"
                  stroke="#0F766E"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <circle cx="18" cy="23" r="2" fill="#0F766E" />
              </svg>
            </div>
            <div>
              <span className="text-xl font-bold tracking-tight text-text-primary">
                Class<span className="text-teal">Sphere</span>
              </span>
              <span className="block text-[11px] font-mono text-text-muted uppercase tracking-wider">
                Institutional Campus OS
              </span>
            </div>
          </div>
        </div>

        {/* Middle: Architectural Statement & Privacy Pillars */}
        <div className="my-10 lg:my-0 max-w-lg relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-teal/10 border border-teal/20 text-teal text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Privacy-Preserving Telemetry Architecture</span>
          </div>

          <h2 className="text-2xl sm:text-4xl font-semibold tracking-tight text-text-primary leading-tight">
            “Monitor important events,{' '}
            <span className="text-teal font-normal underline decoration-teal/40 decoration-2 underline-offset-4">
              not personalities.
            </span>”
          </h2>

          <p className="text-sm sm:text-base text-text-secondary leading-relaxed">
            Engineered for high-integrity campus governance, session timeline logs, and
            transparent attendance verification without compromising student dignity.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            <div className="p-3.5 rounded-xl bg-surface-raised/40 border border-glass-border">
              <div className="text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                <span>Events Only</span>
              </div>
              <p className="text-[11px] text-text-muted leading-normal">
                Observable event counts only. Zero behavioral scores or moral grades.
              </p>
            </div>

            <div className="p-3.5 rounded-xl bg-surface-raised/40 border border-glass-border">
              <div className="text-xs font-semibold text-text-primary mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
                <span>Verified Match Review</span>
              </div>
              <p className="text-[11px] text-text-muted leading-normal">
                Biometrics remain local. Candidate crops require explicit faculty review.
              </p>
            </div>
          </div>
        </div>

        {/* Bottom: Institutional Help & Administration Guidance */}
        <div className="text-xs text-text-muted relative z-10 pt-4 border-t border-glass-border flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <span>Institutional Account Provisioning</span>
          <span className="text-text-secondary">
            Managed through your Department Office & Campus IT Helpdesk
          </span>
        </div>
      </div>

      {/* Right Column: Premium Form & Labeled Sandbox Personas */}
      <div className="lg:w-1/2 p-6 sm:p-10 lg:p-16 flex flex-col justify-center items-center">
        <div className="w-full max-w-md space-y-6">
          <SurfacePanel variant="deep" className="p-6 sm:p-8 space-y-6 shadow-glass-dropdown">
            <div className="space-y-1">
              <h3 className="text-xl font-bold tracking-tight text-text-primary">
                Portal Sign In
              </h3>
              <p className="text-xs text-text-secondary">
                Enter your university identity credentials to enter your role console.
              </p>
            </div>

            {errorMessage && (
              <div
                role="alert"
                className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 text-rose-700 text-xs flex items-start gap-2.5 animate-in fade-in duration-150"
              >
                <Info className="w-4 h-4 shrink-0 mt-0.5 text-rose-700" />
                <span className="leading-relaxed">{errorMessage}</span>
              </div>
            )}

            {/* Standard Credentials Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <Input
                label="Institution Code"
                type="text"
                placeholder="e.g. INST-DEMO"
                value={institutionCode}
                onChange={(e) => {
                  setInstitutionCode(e.target.value);
                  setAvailableRoles(null);
                }}
                leftIcon={<Building className="w-4 h-4" />}
                required
              />

              <Input
                label="Institutional ID or Email"
                type="text"
                placeholder="e.g. 24CS-A01, FAC-001, or user@institution.edu"
                value={identifier}
                onChange={(e) => {
                  setIdentifier(e.target.value);
                  setAvailableRoles(null);
                }}
                leftIcon={<Mail className="w-4 h-4" />}
                required
              />

              <Input
                label="Password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftIcon={<Lock className="w-4 h-4" />}
                rightIcon={
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="p-1 hover:text-text-primary focus-ring rounded"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
                required
              />

              {availableRoles && availableRoles.length > 1 && (
                <div className="p-3.5 rounded-xl bg-teal/10 border border-teal/20 space-y-2.5 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-text-primary flex items-center gap-1.5">
                      <GraduationCap className="w-4 h-4 text-teal" />
                      Multiple Roles Assigned
                    </span>
                    <span className="text-[10px] font-mono text-teal bg-teal/10 px-2 py-0.5 rounded border border-teal/20">
                      Select Active Role
                    </span>
                  </div>
                  <p className="text-[11px] text-text-muted leading-normal">
                    This account possesses multiple roles in the database. Select your active session role:
                  </p>
                  <div className="grid grid-cols-2 gap-2 pt-0.5">
                    {availableRoles.map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setSelectedRole(r)}
                        className={`p-2 rounded-lg text-left border transition-all ${
                          selectedRole === r
                            ? 'bg-teal/20 border-teal text-text-primary ring-1 ring-teal/30'
                            : 'bg-surface-raised border-glass-border text-text-secondary hover:text-text-primary'
                        }`}
                      >
                        <div className="text-xs font-semibold">{r}</div>
                        <div className="text-[10px] text-text-muted">
                          {r === 'STUDENT' ? 'Student Portal' : r === 'FACULTY' ? 'Faculty Portal' : r === 'HOD' ? 'Department Head' : 'Administrator'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer text-text-secondary hover:text-text-primary select-none">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="w-4 h-4 rounded border-input-border bg-surface-deep text-teal focus-ring"
                  />
                  <span>Remember session</span>
                </label>

                <a
                  href="#forgot-credentials"
                  onClick={(e) => {
                    e.preventDefault();
                    setErrorMessage('Please contact your department office or campus IT administration for credential recovery.');
                  }}
                  className="text-text-secondary hover:text-teal transition-colors"
                >
                  Forgot password?
                </a>
              </div>

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full mt-2"
                isLoading={isLoading}
                rightIcon={<ArrowRight className="w-4 h-4" />}
              >
                {availableRoles && selectedRole ? `Authenticate as ${selectedRole}` : 'Authenticate Session'}
              </Button>
            </form>

            {/* Mandatory Requirement: Clearly Labeled Institutional Sandbox Persona Preview */}
            <div className="pt-6 border-t border-glass-border">
              <div className="mb-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-text-primary">
                    Simulated Sandbox Demo Sessions
                  </span>
                  <span className="text-[10px] font-mono text-teal bg-teal/10 px-2 py-0.5 rounded border border-teal/20">
                    Evaluation Demo
                  </span>
                </div>
                <p className="text-[11px] text-text-muted mt-1 leading-normal">
                  Select a persona below to explore the respective portal interface in simulated demo mode. These sessions do not connect to production authentication servers.
                </p>
              </div>

              <div className="space-y-2">
                {/* Student Persona */}
                <button
                  type="button"
                  onClick={() => handleSelectPersona('student')}
                  className="w-full p-2.5 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border flex items-center justify-between transition-colors focus-ring text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-teal/10 text-teal flex items-center justify-center">
                      <GraduationCap className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-primary">
                        {DEMO_PERSONAS.student.full_name}
                      </p>
                      <p className="text-[10px] font-mono text-text-muted">
                        Simulated Student Demo · {DEMO_PERSONAS.student.section}
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs text-teal font-medium">Launch Demo →</span>
                </button>

                {/* Faculty Persona */}
                <button
                  type="button"
                  onClick={() => handleSelectPersona('faculty')}
                  className="w-full p-2.5 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border flex items-center justify-between transition-colors focus-ring text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-700 flex items-center justify-center">
                      <BookOpen className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-primary">
                        {DEMO_PERSONAS.faculty.full_name}
                      </p>
                      <p className="text-[10px] font-mono text-text-muted">
                        Simulated Faculty Demo · CSE Dept
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs text-sky-700 font-medium">Launch Demo →</span>
                </button>

                {/* HOD Persona */}
                <button
                  type="button"
                  onClick={() => handleSelectPersona('hod')}
                  className="w-full p-2.5 rounded-xl bg-surface-raised hover:bg-surface-raised/80 border border-glass-border flex items-center justify-between transition-colors focus-ring text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-800 flex items-center justify-center">
                      <Building className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-text-primary">
                        {DEMO_PERSONAS.hod.full_name}
                      </p>
                      <p className="text-[10px] font-mono text-text-muted">
                        Simulated HOD Demo · Department Head
                      </p>
                    </div>
                  </div>
                  <span className="shrink-0 whitespace-nowrap text-xs text-amber-800 font-medium">Launch Demo →</span>
                </button>
              </div>
            </div>
          </SurfacePanel>

          <p className="text-center text-[11px] text-text-muted">
            ClassSphere Campus OS · Version 1.0.0-phase1 · Academic Security Policy Enforced
          </p>
        </div>
      </div>
    </div>
  );
};

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Compass, ArrowLeft, Home } from 'lucide-react';
import { SurfacePanel } from '../../components/ui/SurfacePanel';
import { Button } from '../../components/ui/Button';

export const NotFoundPage: React.FC = () => {
  const navigate = useNavigate();

  React.useEffect(() => {
    document.title = '404 Page Not Found · ClassSphere';
  }, []);

  return (
    <div className="min-h-screen bg-canvas text-text-primary flex items-center justify-center p-4">
      <SurfacePanel
        variant="deep"
        className="max-w-md w-full p-8 text-center space-y-6 shadow-glass-dropdown"
      >
        <div className="w-16 h-16 rounded-2xl bg-surface-raised border border-glass-border flex items-center justify-center mx-auto text-teal">
          <Compass className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <p className="text-xs font-mono text-teal uppercase tracking-widest">
            Error 404 · Locus Not Found
          </p>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">
            Page Does Not Exist
          </h1>
          <p className="text-sm text-text-secondary leading-relaxed">
            The requested institutional URL or resource is either unmapped, has expired, or requires higher administrative clearance.
          </p>
        </div>

        <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button
            variant="secondary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => navigate(-1)}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Go Back
          </Button>

          <Button
            variant="primary"
            size="md"
            className="w-full sm:w-auto"
            onClick={() => navigate('/')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            ClassSphere Home
          </Button>
        </div>
      </SurfacePanel>
    </div>
  );
};

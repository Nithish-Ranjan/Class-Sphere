import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Camera, CameraOff, RotateCcw, Check, AlertCircle, Shield } from 'lucide-react';
import { Button } from '../ui/Button';
import { SurfacePanel } from '../ui/SurfacePanel';

interface CameraCaptureProps {
  onCapture?: (dataUrl: string) => void;
  title?: string;
  description?: string;
  className?: string;
  initialImage?: string | null;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({
  onCapture,
  title = 'Live Browser Camera Feed',
  description = 'Align your face within the frame. Camera access is strictly managed locally in your browser.',
  className = '',
  initialImage = null,
}) => {
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(initialImage);
  const [cameraState, setCameraState] = useState<'idle' | 'requesting' | 'active' | 'denied' | 'unavailable' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');

  useEffect(() => {
    if (initialImage) {
      setCapturedImage(initialImage);
    }
  }, [initialImage]);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Stop camera tracks helper
  const stopStream = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  }, [stream]);

  // Clean up stream on unmount
  useEffect(() => {
    return () => {
      stopStream();
    };
  }, [stopStream]);

  // Connect stream to video element once stream is available
  useEffect(() => {
    if (stream && videoRef.current) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(() => {});
    }
  }, [stream]);

  const startCamera = async () => {
    setCameraState('requesting');
    setErrorMessage('');
    setCapturedImage(null);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraState('unavailable');
      setErrorMessage('Camera access is not supported by this browser environment or requires HTTPS/localhost.');
      return;
    }

    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user',
        },
        audio: false,
      });
      setStream(mediaStream);
      setCameraState('active');
    } catch (err: any) {
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setCameraState('denied');
        setErrorMessage('Camera permission was denied by the user. Please allow camera access in your browser site settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setCameraState('unavailable');
        setErrorMessage('No camera device was detected on this workstation.');
      } else {
        setCameraState('error');
        setErrorMessage(`Camera error: ${err.message || 'Unable to open media device'}`);
      }
    }
  };

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
      setCapturedImage(dataUrl);
      stopStream();
      setCameraState('idle');
      if (onCapture) {
        onCapture(dataUrl);
      }
    }
  };

  const handleRetake = () => {
    setCapturedImage(null);
    startCamera();
  };

  return (
    <SurfacePanel variant="deep" className={`p-5 sm:p-6 space-y-4 ${className}`}>
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-sm font-semibold text-text-primary flex items-center gap-2">
            <Camera className="w-4 h-4 text-teal" />
            <span>{title}</span>
          </h4>
          <p className="text-xs text-text-secondary mt-0.5">{description}</p>
        </div>

        <div className="flex items-center gap-1.5 text-[11px] font-mono text-text-muted px-2.5 py-1 rounded bg-surface-raised border border-glass-border">
          <Shield className="w-3.5 h-3.5 text-teal" />
          <span>Local Video Device</span>
        </div>
      </div>

      {/* Video Viewport / Capture Canvas */}
      <div className="relative w-full aspect-video rounded-xl bg-canvas border border-glass-border overflow-hidden flex items-center justify-center">
        {/* Hidden canvas for snapshot rendering */}
        <canvas ref={canvasRef} className="hidden" />

        {/* State 1: Active Live Video Stream */}
        {cameraState === 'active' && (
          <div className="relative w-full h-full">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
            {/* Guide overlay */}
            <div className="absolute inset-0 border-2 border-teal/40 rounded-xl pointer-events-none flex items-center justify-center">
              <div className="w-48 h-64 border border-dashed border-teal/60 rounded-full" />
            </div>
            <div className="absolute bottom-3 left-3 px-2 py-0.5 rounded bg-surface-deep/80 backdrop-blur-sm text-[11px] font-mono text-teal border border-teal/30">
              ● LIVE STREAM ACTIVE
            </div>
          </div>
        )}

        {/* State 2: Captured Snapshot Preview */}
        {capturedImage && (
          <div className="relative w-full h-full">
            <img
              src={capturedImage}
              alt="Captured frame"
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 px-2.5 py-1 rounded bg-surface-deep/90 text-teal border border-teal/40 text-[11px] font-medium flex items-center gap-1.5 backdrop-blur-sm">
              <Check className="w-3.5 h-3.5" />
              <span>Local Canvas Frame Captured</span>
            </div>
            <div className="absolute bottom-3 left-3 right-3 p-2.5 rounded-lg bg-surface-deep/95 border border-amber-500/30 backdrop-blur-sm text-[11px] text-text-secondary flex items-center justify-between">
              <span className="font-mono text-amber-700">Biometric Vector Match: NOT CONNECTED</span>
              <span className="text-[10px] text-text-muted">Local preview only</span>
            </div>
          </div>
        )}

        {/* State 3: Idle / Ready to start */}
        {cameraState === 'idle' && !capturedImage && (
          <div className="text-center p-6 space-y-3">
            <div className="w-12 h-12 rounded-full bg-surface-raised border border-glass-border flex items-center justify-center mx-auto text-text-muted">
              <Camera className="w-6 h-6" />
            </div>
            <p className="text-xs text-text-secondary max-w-sm">
              Click below to request secure browser camera access for facial verification.
            </p>
            <Button
              variant="primary"
              size="sm"
              onClick={startCamera}
              leftIcon={<Camera className="w-4 h-4" />}
            >
              Enable Browser Camera
            </Button>
          </div>
        )}

        {/* State 4: Requesting permission */}
        {cameraState === 'requesting' && (
          <div className="text-center p-6 space-y-2">
            <div className="w-8 h-8 border-2 border-teal border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-text-secondary">
              Awaiting camera permission from browser prompt...
            </p>
          </div>
        )}

        {/* State 5: Permission Denied or Device Unavailable */}
        {(cameraState === 'denied' || cameraState === 'unavailable' || cameraState === 'error') && (
          <div className="text-center p-6 space-y-3 max-w-md">
            <div className="w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center mx-auto text-rose-600">
              <CameraOff className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold text-rose-700">Camera Unavailable</p>
              <p className="text-[11px] text-text-secondary mt-1">{errorMessage}</p>
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={startCamera}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Retry Camera Connection
            </Button>
          </div>
        )}
      </div>

      {/* Controls row */}
      <div className="flex items-center justify-between pt-1">
        <span className="text-[11px] text-text-muted">
          {cameraState === 'active'
            ? 'Position face inside the dashed oval and capture'
            : capturedImage
            ? 'Review the captured frame before committing'
            : 'Permission is only active while on this screen'}
        </span>

        <div className="flex items-center gap-2">
          {cameraState === 'active' && (
            <>
              <Button variant="ghost" size="sm" onClick={stopStream}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleCapture}
                leftIcon={<Camera className="w-4 h-4" />}
              >
                Capture Frame
              </Button>
            </>
          )}

          {capturedImage && (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleRetake}
                leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
              >
                Retake Frame
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  alert('Local browser snapshot verified. Biometric vector embeddings, facial matching, and institutional attendance verification remain NOT YET CONNECTED until backend services are integrated.');
                }}
                leftIcon={<Check className="w-3.5 h-3.5" />}
              >
                Inspect Local Snapshot
              </Button>
            </>
          )}
        </div>
      </div>
    </SurfacePanel>
  );
};

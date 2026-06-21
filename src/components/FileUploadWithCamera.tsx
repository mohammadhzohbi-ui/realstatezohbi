import { useState, useRef, useCallback } from 'react';
import { Camera, Paperclip, X, Upload } from 'lucide-react';
import { useIsMobile } from '../hooks/useIsMobile';

interface FileUploadWithCameraProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  buttonText?: string;
  compact?: boolean;
}

export function FileUploadWithCamera({ onFilesSelected, multiple = true, buttonText, compact = false }: FileUploadWithCameraProps) {
  const isMobile = useIsMobile();
  const [showCamera, setShowCamera] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedPhotos, setCapturedPhotos] = useState<File[]>([]);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } }
      });
      setStream(mediaStream);
      setShowCamera(true);
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error('Camera error:', err);
      alert('تعذر الوصول للكاميرا');
    }
  };

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(t => t.stop());
      setStream(null);
    }
    setShowCamera(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (!blob) return;
      const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      setCapturedPhotos(prev => [...prev, file]);
      if (!multiple) {
        onFilesSelected([file]);
        stopCamera();
      }
    }, 'image/jpeg', 0.9);
  }, [multiple, onFilesSelected, stopCamera]);

  const doneCapturing = () => {
    if (capturedPhotos.length > 0) {
      onFilesSelected(capturedPhotos);
    }
    setCapturedPhotos([]);
    stopCamera();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length > 0) {
      onFilesSelected(files);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  if (showCamera) {
    return (
      <div style={{
        position: 'fixed', inset: 0, background: '#000', zIndex: 1000,
        display: 'flex', flexDirection: 'column', touchAction: 'none'
      }}>
        {/* Header */}
        <div style={{
          padding: isMobile ? '16px 12px' : 16,
          paddingTop: isMobile ? 'max(16px, env(safe-area-inset-top, 16px))' : 16,
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          background: 'rgba(0,0,0,0.7)'
        }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#e8e8e8' }}>التقاط صورة</div>
          <button onClick={stopCamera} style={{
            background: 'rgba(255,255,255,0.15)', border: 'none', borderRadius: 10,
            padding: 10, cursor: 'pointer', color: '#fff', minWidth: 40, minHeight: 40
          }}>
            <X size={20} />
          </button>
        </div>

        {/* Video */}
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#000' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>

        {/* Controls */}
        <div style={{
          padding: isMobile ? '16px 12px' : 16,
          paddingBottom: isMobile ? 'max(16px, env(safe-area-inset-bottom, 16px))' : 16,
          background: 'rgba(0,0,0,0.8)', display: 'flex', flexDirection: 'column', gap: 12
        }}>
          {/* Preview thumbnails */}
          {capturedPhotos.length > 0 && (
            <div style={{
              display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0',
              WebkitOverflowScrolling: 'touch'
            }}>
              {capturedPhotos.map((photo, i) => (
                <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={URL.createObjectURL(photo)} alt="" style={{
                    width: isMobile ? 56 : 50, height: isMobile ? 56 : 50,
                    borderRadius: 10, objectFit: 'cover', border: '2px solid rgba(255,255,255,0.2)'
                  }} />
                  <button onClick={() => setCapturedPhotos(prev => prev.filter((_, j) => j !== i))}
                    style={{
                      position: 'absolute', top: -8, right: -8,
                      background: '#ef4444', border: '2px solid #000',
                      borderRadius: '50%', width: 24, height: 24, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                    <X size={12} color="white" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <button onClick={capturePhoto} style={{
              background: 'linear-gradient(135deg, #f97316, #d4952b)', border: 'none',
              borderRadius: 16, padding: isMobile ? 16 : 14, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              minWidth: isMobile ? 90 : 80, minHeight: isMobile ? 90 : 80
            }}>
              <Camera size={isMobile ? 32 : 26} color="white" />
              <span style={{ fontSize: isMobile ? 13 : 11, color: 'white', fontWeight: 600 }}>تصوير</span>
            </button>
            {capturedPhotos.length > 0 && (
              <button onClick={doneCapturing} style={{
                background: '#22c55e', border: 'none', borderRadius: 16,
                padding: isMobile ? 16 : 14, cursor: 'pointer',
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
                minWidth: isMobile ? 90 : 80, minHeight: isMobile ? 90 : 80
              }}>
                <Upload size={isMobile ? 32 : 26} color="white" />
                <span style={{ fontSize: isMobile ? 13 : 11, color: 'white', fontWeight: 600 }}>رفع ({capturedPhotos.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: compact ? 6 : 8, flexDirection: isMobile && compact ? 'column' : 'row' }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '8px 10px' : '10px 14px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px dashed #333',
        borderRadius: 10,
        cursor: 'pointer',
        color: '#888',
        fontSize: compact ? 12 : 13,
        flex: 1,
        justifyContent: 'center',
        minHeight: isMobile ? 44 : 'auto'
      }}>
        <Paperclip size={compact ? 14 : 16} />
        <span>{buttonText || (multiple ? 'رفع ملفات' : 'رفع ملف')}</span>
        <input ref={fileInputRef} type="file" multiple={multiple} style={{ display: 'none' }} onChange={handleFileSelect} />
      </label>
      <button onClick={startCamera} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '8px 12px' : '10px 14px',
        background: 'rgba(249,115,22,0.1)',
        border: '1px solid rgba(249,115,22,0.2)',
        borderRadius: 10,
        cursor: 'pointer',
        color: '#f97316',
        fontSize: compact ? 12 : 13,
        fontWeight: 600,
        minHeight: isMobile ? 44 : 'auto',
        minWidth: isMobile ? 100 : 'auto',
        justifyContent: 'center'
      }}>
        <Camera size={compact ? 14 : 16} />
        <span>تصوير</span>
      </button>
    </div>
  );
}

interface FileUploadProgressProps {
  files: File[];
  onRemove: (index: number) => void;
  compact?: boolean;
}

export function FileUploadProgress({ files, onRemove, compact = false }: FileUploadProgressProps) {
  const isMobile = useIsMobile();
  if (files.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8, maxHeight: isMobile ? 150 : 120, overflowY: 'auto' }}>
      {files.map((f, i) => (
        <div key={i} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: compact ? '8px 10px' : '10px 12px',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: 10
        }}>
          <span style={{ fontSize: compact ? 12 : 14 }}>📄</span>
          <span style={{
            flex: 1, fontSize: compact ? 11 : 12, color: '#ccc',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
          }}>
            {f.name}
          </span>
          <button onClick={() => onRemove(i)} style={{
            background: 'rgba(239,68,68,0.1)', border: 'none',
            borderRadius: 6, cursor: 'pointer', color: '#f87171',
            padding: 6, minWidth: 32, minHeight: 32, display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <X size={compact ? 12 : 14} />
          </button>
        </div>
      ))}
    </div>
  );
}

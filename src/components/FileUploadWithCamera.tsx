import { useState, useRef, useCallback } from 'react';
import { Camera, Paperclip, X, Upload } from 'lucide-react';

interface FileUploadWithCameraProps {
  onFilesSelected: (files: File[]) => void;
  multiple?: boolean;
  buttonText?: string;
  compact?: boolean;
}

export function FileUploadWithCamera({ onFilesSelected, multiple = true, buttonText, compact = false }: FileUploadWithCameraProps) {
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
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.95)', zIndex: 100, display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(0,0,0,0.5)' }}>
          <div style={{ fontWeight: 600, fontSize: 15, color: '#e8e8e8' }}>التقاط صورة</div>
          <button onClick={stopCamera} style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: 8, padding: 8, cursor: 'pointer', color: '#aaa' }}>
            <X size={20} />
          </button>
        </div>
        <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <video ref={videoRef} autoPlay playsInline style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
        <div style={{ padding: 16, background: 'rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          {capturedPhotos.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '4px 0' }}>
              {capturedPhotos.map((photo, i) => (
                <div key={i} style={{ position: 'relative', flexShrink: 0 }}>
                  <img src={URL.createObjectURL(photo)} alt="" style={{ width: 50, height: 50, borderRadius: 8, objectFit: 'cover' }} />
                  <button onClick={() => setCapturedPhotos(prev => prev.filter((_, j) => j !== i))}
                    style={{ position: 'absolute', top: -6, right: -6, background: '#ef4444', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <X size={12} color="white" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <button onClick={capturePhoto} style={{ background: 'linear-gradient(135deg, #f97316, #d4952b)', border: 'none', borderRadius: 12, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80 }}>
              <Camera size={24} color="white" />
              <span style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>تصوير</span>
            </button>
            {capturedPhotos.length > 0 && (
              <button onClick={doneCapturing} style={{ background: '#22c55e', border: 'none', borderRadius: 12, padding: 12, cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 80 }}>
                <Upload size={24} color="white" />
                <span style={{ fontSize: 11, color: 'white', fontWeight: 600 }}>رفع ({capturedPhotos.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', gap: compact ? 6 : 8 }}>
      <label style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '6px 10px' : '8px 12px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px dashed #333',
        borderRadius: 8,
        cursor: 'pointer',
        color: '#888',
        fontSize: compact ? 11 : 12,
        flex: 1,
        justifyContent: 'center'
      }}>
        <Paperclip size={compact ? 12 : 14} />
        <span>{buttonText || (multiple ? 'رفع ملفات' : 'رفع ملف')}</span>
        <input ref={fileInputRef} type="file" multiple={multiple} style={{ display: 'none' }} onChange={handleFileSelect} />
      </label>
      <button onClick={startCamera} style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: compact ? '6px 10px' : '8px 12px',
        background: 'rgba(249,115,22,0.1)',
        border: '1px solid rgba(249,115,22,0.2)',
        borderRadius: 8,
        cursor: 'pointer',
        color: '#f97316',
        fontSize: compact ? 11 : 12,
        fontWeight: 500
      }}>
        <Camera size={compact ? 12 : 14} />
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
  if (files.length === 0) return null;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginTop: 6 }}>
      {files.map((f, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: compact ? '4px 6px' : '6px 8px', background: 'rgba(255,255,255,0.03)', borderRadius: 6 }}>
          <span style={{ fontSize: compact ? 10 : 11, color: '#d4952b' }}>📄</span>
          <span style={{ flex: 1, fontSize: compact ? 10 : 12, color: '#ccc', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.name}</span>
          <button onClick={() => onRemove(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#555', padding: 2 }}>
            <X size={compact ? 12 : 14} />
          </button>
        </div>
      ))}
    </div>
  );
}

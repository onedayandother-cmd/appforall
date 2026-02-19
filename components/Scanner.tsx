import React, { useEffect, useRef, useState } from 'react';
import { Camera, Fingerprint, X, Search, CheckCircle, User, AlertTriangle } from 'lucide-react';
import { Member } from '../types';

interface ScannerProps {
  onScanComplete?: (success: boolean) => void;
  onIdentify?: (member: Member) => void;
  onClose: () => void;
  mode: 'face' | 'fingerprint';
  memberName?: string; // If provided, Verification Mode. If null, Identification Mode.
  candidates?: Member[]; // Required for Identification Mode
}

export const Scanner: React.FC<ScannerProps> = ({ 
  onScanComplete, 
  onIdentify, 
  onClose, 
  mode, 
  memberName, 
  candidates = [] 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [step, setStep] = useState<'scanning' | 'selecting'>('scanning');
  const [progress, setProgress] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [cameraError, setCameraError] = useState<string | null>(null);

  const isVerification = !!memberName;

  useEffect(() => {
    let stream: MediaStream | null = null;

    if (mode === 'face') {
      const startCamera = async () => {
        try {
          if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
             throw new Error("الكاميرا غير مدعومة في هذا المتصفح");
          }
          stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err: any) {
          console.error("Camera error", err);
          setCameraError("تعذر الوصول للكاميرا. تأكد من منح الصلاحيات.");
        }
      };
      startCamera();
    }

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          if (isVerification) {
            setTimeout(() => onScanComplete?.(true), 500);
          } else {
            setStep('selecting');
          }
          return 100;
        }
        return prev + 2; 
      });
    }, 30);

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      clearInterval(interval);
    };
  }, [mode, isVerification, onScanComplete]);

  const handleSelectCandidate = (member: Member) => {
    onIdentify?.(member);
  };

  const filteredCandidates = candidates.filter(c => 
    c.name.includes(searchTerm) || c.phone.includes(searchTerm)
  );

  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center p-4">
      <button 
        onClick={onClose}
        className="absolute top-6 right-6 text-white bg-gray-800 p-2 rounded-full hover:bg-gray-700 z-50"
      >
        <X size={24} />
      </button>

      <div className={`w-full max-w-sm bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700 relative transition-all duration-500 ${step === 'selecting' ? 'h-[80vh]' : ''}`}>
        
        {/* Step 1: Scanning Visuals */}
        {step === 'scanning' && (
          <>
            <div className="h-64 sm:h-80 bg-gray-800 relative flex items-center justify-center overflow-hidden">
              {mode === 'face' ? (
                <>
                  {cameraError ? (
                      <div className="text-center p-4 text-red-400 flex flex-col items-center">
                          <AlertTriangle size={48} className="mb-2" />
                          <p>{cameraError}</p>
                      </div>
                  ) : (
                    <>
                        <video 
                            ref={videoRef} 
                            autoPlay 
                            playsInline 
                            muted 
                            className="absolute inset-0 w-full h-full object-cover opacity-60"
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-48 h-48 border-2 border-indigo-500 rounded-full animate-pulse relative">
                                <div className="absolute top-0 left-0 w-full h-1 bg-indigo-400 opacity-50 animate-ping" style={{animationDuration: '2s'}}></div>
                            </div>
                        </div>
                    </>
                  )}
                  <div className="absolute bottom-4 left-0 right-0 text-center text-white font-medium drop-shadow-md">
                    جاري المسح والتعرف...
                  </div>
                </>
              ) : (
                <div className="flex flex-col items-center justify-center relative w-full h-full">
                  <Fingerprint size={120} className="text-purple-500/80" />
                  {/* Scanning Line Animation */}
                  <div 
                    className="absolute w-full h-1 bg-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.8)] opacity-70"
                    style={{
                        top: `${progress}%`,
                        transition: 'top 0.03s linear'
                    }}
                  ></div>
                  <div className="mt-8 text-white font-medium animate-pulse">ضع إصبعك على المستشعر</div>
                </div>
              )}
            </div>

            <div className="p-6 text-center">
              <h3 className="text-xl font-bold text-white mb-2">
                {isVerification ? memberName : 'جاري التعرف على المخدوم...'}
              </h3>
              
              <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden mb-2">
                <div 
                  className={`h-full transition-all duration-75 ${mode === 'face' ? 'bg-indigo-500' : 'bg-purple-500'}`}
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500">{progress}% مكتمل</p>
            </div>
          </>
        )}

        {/* Step 2: Selection (Simulation of AI Result) */}
        {step === 'selecting' && (
          <div className="flex flex-col h-full bg-white">
            <div className="p-4 bg-indigo-600 text-white">
              <h3 className="text-lg font-bold mb-1">نتائج التعرف</h3>
              <p className="text-indigo-200 text-xs">يرجى تأكيد هوية المخدوم</p>
            </div>
            
            <div className="p-3 border-b border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="بحث..."
                  className="w-full pl-8 pr-4 py-2 bg-gray-100 rounded-lg text-sm text-right focus:outline-none"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  autoFocus
                />
                <Search className="absolute left-2 top-2.5 text-gray-400" size={16} />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {filteredCandidates.map(member => (
                <button
                  key={member.id}
                  onClick={() => handleSelectCandidate(member)}
                  className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-indigo-50 border border-transparent hover:border-indigo-100 transition-colors text-right"
                >
                  <div className="w-12 h-12 rounded-full bg-gray-200 overflow-hidden flex-shrink-0">
                    {member.photoUrl ? (
                      <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400">
                        <User size={24} />
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="font-bold text-gray-800">{member.name}</div>
                    <div className="text-xs text-gray-500">{member.phone}</div>
                  </div>
                  <div className="mr-auto text-indigo-600">
                    <CheckCircle size={20} />
                  </div>
                </button>
              ))}
              {filteredCandidates.length === 0 && (
                <div className="text-center py-8 text-gray-400 text-sm">
                  لم يتم العثور على نتائج
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
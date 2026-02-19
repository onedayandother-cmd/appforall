import React, { useState, useRef, useEffect } from 'react';
// تصحيح الاستيراد وإضافة علامات الاقتباس الصحيحة
import { GoogleGenerativeAI, Modality } from '@google/generative-ai';
import { Sparkles, ImagePlus, Video, Image as ImageIcon, Search, MapPin, Mic, FileVideo, Brain, Speaker, Upload, Loader2, Play, X } from 'lucide-react';

type ToolType = 'EDIT_IMG' | 'VEO' | 'GEN_IMG' | 'SEARCH' | 'MAPS' | 'LIVE' | 'VIDEO_ANALYSIS' | 'THINKING' | 'TTS';

interface AIStudioClient {
  hasSelectedApiKey: () => Promise<boolean>;
  openSelectKey: () => Promise<void>;
}

export const AIAssistant: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolType>('EDIT_IMG');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string>('');
  const [mediaUrl, setMediaUrl] = useState<string>('');
  
  const [inputText, setInputText] = useState('');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [fileBase64, setFileBase64] = useState<string>('');
  
  const [imgSize, setImgSize] = useState<'1K' | '2K' | '4K'>('1K');
  const [groundingChunks, setGroundingChunks] = useState<any[]>([]);

  const [isLiveConnected, setIsLiveConnected] = useState(false);
  const [liveLog, setLiveLog] = useState<string[]>([]);
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const resetState = () => {
    setLoading(false);
    setResponse('');
    setMediaUrl('');
    setInputText('');
    setUploadedFile(null);
    setFileBase64('');
    setGroundingChunks([]);
    setLiveLog([]);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setUploadedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        const res = reader.result as string;
        setFileBase64(res.split(',')[1]);
      };
      reader.readAsDataURL(file);
    }
  };

  const getClient = async (requiresPaidKey = false) => {
    const aistudio = (window as any).aistudio as AIStudioClient | undefined;
    if (requiresPaidKey && aistudio) {
        const hasKey = await aistudio.hasSelectedApiKey();
        if (!hasKey) {
            await aistudio.openSelectKey();
        }
    }
    // تأكد من ضبط API_KEY في إعدادات GitHub أو البيئة المحلية
    return new GoogleGenerativeAI(process.env.API_KEY || '');
  };

  const executeAction = async () => {
    const aistudio = (window as any).aistudio as AIStudioClient | undefined;
    if (!process.env.API_KEY && !aistudio) {
        alert("API Key missing");
        return;
    }
    setLoading(true);
    setResponse('');
    setMediaUrl('');
    setGroundingChunks([]);

    try {
        const genAI = await getClient();
        
        if (activeTool === 'EDIT_IMG') {
            if (!fileBase64) return alert('Please upload an image');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent([
                { inlineData: { mimeType: uploadedFile?.type || 'image/jpeg', data: fileBase64 } },
                inputText || 'تعديل هذه الصورة'
            ]);
            setResponse(result.response.text());

        } else if (activeTool === 'SEARCH') {
            if (!inputText) return alert('أدخل سؤالك');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
            const result = await model.generateContent(inputText);
            setResponse(result.response.text());

        } else if (activeTool === 'THINKING') {
            if (!inputText) return alert('أدخل سؤالاً معقداً');
            const model = genAI.getGenerativeModel({ model: "gemini-1.5-pro" });
            const result = await model.generateContent(inputText);
            setResponse(result.response.text());

        } else if (activeTool === 'TTS') {
            if (!inputText) return alert('أدخل نصاً');
            setResponse("جاري تحويل النص إلى صوت...");
            // ملاحظة: TTS غالباً يتطلب إعدادات خاصة بالمكتبة
        }

    } catch (e: any) {
        console.error(e);
        setResponse('حدث خطأ: ' + e.message);
    } finally {
        setLoading(false);
    }
  };

  // مساعدات الصوت
  function playBase64Audio(b64: string) {
      const audio = new Audio("data:audio/mp3;base64," + b64);
      audio.play().catch(e => console.error("Playback error", e));
  }

  const tools = [
    { id: 'EDIT_IMG', label: 'تعديل صور', icon: ImagePlus },
    { id: 'VEO', label: 'تحريك (Veo)', icon: Video },
    { id: 'GEN_IMG', label: 'توليد صور', icon: ImageIcon },
    { id: 'SEARCH', label: 'بحث', icon: Search },
    { id: 'MAPS', label: 'خرائط', icon: MapPin },
    { id: 'LIVE', label: 'محادثة', icon: Mic },
    { id: 'VIDEO_ANALYSIS', label: 'تحليل فيديو', icon: FileVideo },
    { id: 'THINKING', label: 'تفكير عميق', icon: Brain },
    { id: 'TTS', label: 'قراءة نص', icon: Speaker },
  ] as const;

  return (
    <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto w-full flex flex-col h-screen font-cairo" dir="rtl">
      <h1 className="text-2xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
        <Sparkles className="text-amber-500" /> المساعد الذكي
      </h1>

      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
        {tools.map(t => (
            <button
                key={t.id}
                onClick={() => { setActiveTool(t.id); resetState(); }}
                className={`flex flex-col items-center min-w-[4.5rem] p-3 rounded-xl transition-all ${activeTool === t.id ? 'bg-indigo-600 text-white shadow-lg' : 'bg-white text-gray-500 border border-gray-100'}`}
            >
                <t.icon size={24} className="mb-1" />
                <span className="text-[10px] font-bold whitespace-nowrap">{t.label}</span>
            </button>
        ))}
      </div>

      <div className="flex-1 bg-white rounded-2xl shadow-sm border border-gray-100 p-4 overflow-y-auto">
        {(activeTool === 'EDIT_IMG' || activeTool === 'VEO' || activeTool === 'VIDEO_ANALYSIS') && (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    {activeTool === 'VIDEO_ANALYSIS' ? 'رفع فيديو' : 'رفع صورة'}
                </label>
                <div className="flex items-center justify-center w-full">
                    <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-50 hover:bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6">
                            <Upload className="w-8 h-8 mb-3 text-gray-400" />
                            <p className="text-xs text-gray-500">{uploadedFile ? uploadedFile.name : 'اضغط للرفع'}</p>
                        </div>
                        <input type="file" className="hidden" accept={activeTool === 'VIDEO_ANALYSIS' ? "video/*" : "image/*"} onChange={handleFileChange} />
                    </label>
                </div>
            </div>
        )}

        {activeTool !== 'LIVE' && activeTool !== 'VEO' && (
            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                    الوصف أو السؤال
                </label>
                <textarea
                    value={inputText}
                    onChange={e => setInputText(e.target.value)}
                    className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 text-sm"
                    rows={3}
                    placeholder="اكتب هنا..."
                />
            </div>
        )}

        {activeTool !== 'LIVE' && (
            <button 
                onClick={executeAction}
                disabled={loading}
                className="w-full bg-indigo-600 text-white py-3 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-bold mb-4 disabled:opacity-50"
            >
                {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />}
                تنفيذ
            </button>
        )}

        {response && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-sm whitespace-pre-wrap mt-4">
                {response}
            </div>
        )}

        {mediaUrl && (
            <div className="mt-4 rounded-xl overflow-hidden border border-gray-200">
                {activeTool === 'VEO' ? (
                    <video src={mediaUrl} controls className="w-full" />
                ) : (
                    <img src={mediaUrl} alt="Generated" className="w-full" />
                )
            </div>
        )}
      </div>
    </div>
  );
};

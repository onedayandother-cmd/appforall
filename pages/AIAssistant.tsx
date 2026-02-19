import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Sparkles, ImagePlus, Video, Image as ImageIcon, Search, MapPin, Mic, FileVideo, Brain, Speaker, Upload, Loader2, Play } from 'lucide-react';

export const AIAssistant: React.FC = () => {
  const [activeTool, setActiveTool] = useState('EDIT_IMG');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [inputText, setInputText] = useState('');
  const [fileBase64, setFileBase64] = useState('');

  const executeAction = async () => {
    if (!inputText && !fileBase64) return alert("الرجاء إدخال نص أو رفع ملف");
    setLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent([inputText || "تحليل"]);
      setResponse(result.response.text());
    } catch (e: any) {
      setResponse("خطأ: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  const tools = [
    { id: 'EDIT_IMG', label: 'تعديل صور', icon: ImagePlus },
    { id: 'SEARCH', label: 'بحث', icon: Search },
    { id: 'THINKING', label: 'تفكير عميق', icon: Brain },
    { id: 'TTS', label: 'قراءة نص', icon: Speaker },
  ];

  return (
    <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto w-full flex flex-col min-h-screen font-cairo" dir="rtl">
      <h1 className="text-2xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
        <Sparkles className="text-amber-500" /> المساعد الذكي
      </h1>
      <div className="flex gap-2 overflow-x-auto pb-4 mb-2 no-scrollbar">
        {tools.map(t => (
          <button key={t.id} onClick={() => setActiveTool(t.id)} className={`flex flex-col items-center min-w-[4.5rem] p-3 rounded-xl ${activeTool === t.id ? 'bg-indigo-600 text-white' : 'bg-white text-gray-500 border'}`}>
            <t.icon size={24} />
            <span className="text-[10px] font-bold mt-1">{t.label}</span>
          </button>
        ))}
      </div>
      <div className="flex-1 bg-white rounded-2xl shadow-sm border p-4">
        <textarea value={inputText} onChange={e => setInputText(e.target.value)} className="w-full p-3 border rounded-xl mb-4 text-right" rows={4} placeholder="اكتب سؤالك هنا..." />
        <button onClick={executeAction} disabled={loading} className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2">
          {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />} تنفيذ
        </button>
        {response && <div className="bg-gray-50 p-4 rounded-xl border mt-4 text-right text-sm">{response}</div>}
      </div>
    </div>
  );
};

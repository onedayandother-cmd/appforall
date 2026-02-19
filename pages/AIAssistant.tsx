import React, { useState } from 'react';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Sparkles, Loader2, Play } from 'lucide-react';

export const AIAssistant: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [inputText, setInputText] = useState('');

  const executeAction = async () => {
    if (!inputText) return alert("الرجاء كتابة سؤالك");
    setLoading(true);
    try {
      const genAI = new GoogleGenerativeAI(process.env.API_KEY || '');
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(inputText);
      setResponse(result.response.text());
    } catch (e: any) {
      setResponse("خطأ: تأكد من إعداد API Key بشكل صحيح");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pb-24 pt-4 px-4 max-w-4xl mx-auto w-full flex flex-col min-h-screen font-cairo" dir="rtl">
      <h1 className="text-2xl font-bold text-indigo-800 mb-4 flex items-center gap-2">
        <Sparkles className="text-amber-500" /> المساعد الذكي
      </h1>
      <div className="bg-white rounded-2xl shadow-sm border p-4">
        <textarea 
          value={inputText} 
          onChange={(e: any) => setInputText(e.target.value)} 
          className="w-full p-3 border rounded-xl mb-4 text-right" 
          rows={4} 
          placeholder="كيف يمكنني مساعدتك في برنامج صعوبات التعلم اليوم؟" 
        />
        <button 
          onClick={executeAction} 
          disabled={loading} 
          className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
        >
          {loading ? <Loader2 className="animate-spin" /> : <Play size={20} />} تنفيذ
        </button>
        {response && (
          <div className="bg-gray-50 p-4 rounded-xl border mt-4 text-right text-sm whitespace-pre-wrap">
            {response}
          </div>
        )}
      </div>
    </div>
  );
};

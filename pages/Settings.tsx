import React, { useState, useEffect, useRef } from 'react';
import { MeetingConfig } from '../types';
import { getConfig, saveConfig, exportData, importData } from '../utils/storage';
import { Save, Clock, Award, AlertCircle, Database, Upload, Download, RefreshCw, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react';
import { DEFAULT_CONFIG } from '../constants';

export const Settings: React.FC = () => {
  const [config, setConfig] = useState<MeetingConfig>(getConfig());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [restoreStatus, setRestoreStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setConfig(getConfig());
  }, []);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation: Ensure points are descending logically
    if (config.pointsOnTime < config.pointsLate15 || 
        config.pointsLate15 < config.pointsLate30 || 
        config.pointsLate30 < config.pointsLate) {
        setError("خطأ: يجب أن تكون النقاط تنازلية (الحضور المبكر > تأخير بسيط > تأخير متوسط > تأخير كبير)");
        setTimeout(() => setError(null), 5000);
        return;
    }

    saveConfig(config);
    setSaved(true);
    setError(null);
    setTimeout(() => setSaved(false), 3000);
  };

  const handleChange = (field: keyof MeetingConfig, value: string | number) => {
    setConfig(prev => ({ ...prev, [field]: value }));
  };

  const handleResetPoints = () => {
      if(confirm('هل أنت متأكد من استعادة القيم الافتراضية للنقاط؟')) {
          setConfig(prev => ({
              ...prev,
              pointsOnTime: DEFAULT_CONFIG.pointsOnTime,
              pointsLate15: DEFAULT_CONFIG.pointsLate15,
              pointsLate30: DEFAULT_CONFIG.pointsLate30,
              pointsLate: DEFAULT_CONFIG.pointsLate
          }));
      }
  };

  const handleExport = () => {
    const jsonString = exportData();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Youssef_Seddik_Backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (evt) => {
        const content = evt.target?.result as string;
        const success = importData(content);
        setRestoreStatus(success ? 'success' : 'error');
        if (success) {
            setTimeout(() => window.location.reload(), 2000); // Reload to reflect data
        }
      };
      reader.readAsText(file);
    }
  };

  // Helper to handle number inputs gracefully
  const handleNumberInput = (field: keyof MeetingConfig, val: string) => {
      const intVal = parseInt(val);
      handleChange(field, isNaN(intVal) ? 0 : intVal);
  }

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-800 mb-6">إعدادات الخدمة</h1>

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Time Configuration */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4 text-indigo-600">
            <Clock size={24} />
            <h2 className="text-lg font-bold">موعد الاجتماع</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">وقت البدء الرسمي</label>
              <input 
                type="time" 
                required
                value={config.startTime}
                onChange={(e) => handleChange('startTime', e.target.value)}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 text-lg" 
              />
              <p className="text-xs text-gray-500 mt-2">يتم حساب التأخير بناءً على هذا الموعد.</p>
            </div>
          </div>
        </div>

        {/* Points Configuration */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden">
          <div className="flex items-center justify-between mb-4">
             <div className="flex items-center gap-3 text-amber-600">
                <Award size={24} />
                <h2 className="text-lg font-bold">توزيع النقاط</h2>
             </div>
             <button 
                type="button"
                onClick={handleResetPoints}
                className="text-xs text-gray-500 flex items-center gap-1 hover:text-amber-600 transition"
             >
                <RefreshCw size={14} />
                استعادة الافتراضي
             </button>
          </div>
          
          <div className="space-y-4">
            <div className="bg-amber-50 p-3 rounded-lg flex items-start gap-2 mb-2">
                <AlertTriangle size={18} className="text-amber-600 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-800">
                    يمكنك تخصيص النقاط الممنوحة لكل حالة حضور. تأكد من أن النقاط تتناقص مع زيادة مدة التأخير للحفاظ على منطقية النظام.
                </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center border-b border-gray-50 pb-4">
              <div>
                <label className="block font-medium text-gray-800">حضور مبكر / في الميعاد</label>
                <p className="text-xs text-gray-500">قبل الموعد المحدد</p>
              </div>
              <input 
                type="number" 
                min="0"
                required
                value={config.pointsOnTime}
                onChange={(e) => handleNumberInput('pointsOnTime', e.target.value)}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-amber-500 text-lg font-bold text-green-600" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center border-b border-gray-50 pb-4">
              <div>
                <label className="block font-medium text-gray-800">تأخير بسيط</label>
                <p className="text-xs text-gray-500">تأخير أقل من 15 دقيقة</p>
              </div>
              <input 
                type="number" 
                min="0"
                required
                value={config.pointsLate15}
                onChange={(e) => handleNumberInput('pointsLate15', e.target.value)}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-amber-500 text-lg font-bold text-blue-600" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center border-b border-gray-50 pb-4">
              <div>
                <label className="block font-medium text-gray-800">تأخير متوسط</label>
                <p className="text-xs text-gray-500">تأخير من 15 إلى 30 دقيقة</p>
              </div>
              <input 
                type="number" 
                min="0"
                required
                value={config.pointsLate30}
                onChange={(e) => handleNumberInput('pointsLate30', e.target.value)}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-amber-500 text-lg font-bold text-amber-600" 
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-center">
              <div>
                <label className="block font-medium text-gray-800">تأخير كبير</label>
                <p className="text-xs text-gray-500">تأخير أكثر من 30 دقيقة</p>
              </div>
              <input 
                type="number" 
                min="0"
                required
                value={config.pointsLate}
                onChange={(e) => handleNumberInput('pointsLate', e.target.value)}
                className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-amber-500 text-lg font-bold text-red-600" 
              />
            </div>
          </div>
        </div>

        {/* Data Management (Backup/Restore) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <div className="flex items-center gap-3 mb-4 text-blue-600">
            <Database size={24} />
            <h2 className="text-lg font-bold">إدارة البيانات</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <button 
              type="button"
              onClick={handleExport}
              className="flex items-center justify-center gap-2 p-4 border border-blue-100 bg-blue-50 text-blue-700 rounded-xl hover:bg-blue-100 transition"
            >
              <Download size={20} />
              <span>تحميل نسخة احتياطية</span>
            </button>
            
            <div className="relative">
              <input 
                type="file" 
                ref={fileInputRef} 
                className="hidden" 
                accept=".json"
                onChange={handleImport}
              />
              <button 
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2 p-4 border border-gray-200 bg-gray-50 text-gray-700 rounded-xl hover:bg-gray-100 transition"
              >
                <Upload size={20} />
                <span>استعادة نسخة احتياطية</span>
              </button>
              {restoreStatus === 'success' && (
                <div className="absolute top-full left-0 right-0 text-center text-xs text-green-600 mt-1 font-bold">تم الاستعادة بنجاح! جاري التحديث...</div>
              )}
               {restoreStatus === 'error' && (
                <div className="absolute top-full left-0 right-0 text-center text-xs text-red-600 mt-1 font-bold">فشل في استعادة الملف</div>
              )}
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-4">
            تنبيه: استعادة النسخة الاحتياطية ستقوم بحذف البيانات الحالية واستبدالها بالبيانات الموجودة في الملف.
          </p>
        </div>

        <button 
          type="submit" 
          className="w-full bg-indigo-600 text-white py-4 rounded-xl hover:bg-indigo-700 transition flex items-center justify-center gap-2 font-bold text-lg shadow-lg shadow-indigo-200"
        >
          <Save size={24} />
          حفظ التغييرات
        </button>

        {saved && (
          <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-gray-800 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-fade-in-up z-50">
            <CheckCircle2 size={20} className="text-green-400" />
            <span>تم حفظ الإعدادات بنجاح</span>
          </div>
        )}

        {error && (
            <div className="fixed bottom-24 left-1/2 transform -translate-x-1/2 bg-red-600 text-white px-6 py-3 rounded-full shadow-xl flex items-center gap-2 animate-fade-in-up z-50">
                <XCircle size={20} className="text-white" />
                <span>{error}</span>
            </div>
        )}
      </form>
    </div>
  );
};
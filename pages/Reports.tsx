import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import { getAttendance, getMembers, getFollowUpLogs } from '../utils/storage';
import { Download, FileSpreadsheet, PhoneCall, AlertCircle, CheckCircle } from 'lucide-react';
import { CHURCH_NAME, APP_NAME } from '../constants';

export const Reports: React.FC = () => {
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const members = getMembers();
  const attendance = getAttendance();
  const followUpLogs = getFollowUpLogs();

  // Prepare data for chart (Last 4 weeks logic simplified to last 5 distinct dates)
  const chartData = useMemo(() => {
    const groupedByDate: Record<string, number> = {};
    attendance.forEach(a => {
      groupedByDate[a.dateStr] = (groupedByDate[a.dateStr] || 0) + 1;
    });

    return Object.keys(groupedByDate)
      .sort()
      .slice(-5) // Last 5 meetings
      .map(date => ({
        date: new Date(date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
        count: groupedByDate[date]
      }));
  }, [attendance]);

  // Export Logic
  const performExport = () => {
    const wb = XLSX.utils.book_new();

    // Sheet 1: Members Summary (Points total, Attendance %)
    const summaryData = members.map(m => {
      const myAttendance = attendance.filter(a => a.memberId === m.id);
      const totalPoints = myAttendance.reduce((sum, a) => sum + a.points, 0);
      return {
        "الاسم": m.name,
        "الموبايل": m.phone,
        "تاريخ الميلاد": m.dob,
        "العنوان": m.address,
        "الكلية": m.college,
        "السنة الدراسية": m.year,
        "أب الاعتراف": m.confessionFather,
        "عدد مرات الحضور": myAttendance.length,
        "إجمالي النقاط": totalPoints
      };
    });
    const wsSummary = XLSX.utils.json_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, wsSummary, "بيانات المخدومين");

    // Sheet 2: Detailed Logs
    const logsData = attendance.map(a => {
      const m = members.find(mem => mem.id === a.memberId);
      return {
        "التاريخ": a.dateStr,
        "الوقت": new Date(a.timestamp).toLocaleTimeString('ar-EG'),
        "الاسم": m ? m.name : 'غير معروف',
        "النقاط": a.points,
        "الطريقة": a.method === 'face' ? 'وجه' : (a.method === 'fingerprint' ? 'بصمة' : 'يدوي')
      };
    });
    const wsLogs = XLSX.utils.json_to_sheet(logsData);
    XLSX.utils.book_append_sheet(wb, wsLogs, "سجل الحضور");

    // Sheet 3: Follow Up Logs (NEW)
    const followUpData = followUpLogs.map(log => {
      const m = members.find(mem => mem.id === log.memberId);
      return {
        "التاريخ": new Date(log.timestamp).toLocaleDateString('ar-EG'),
        "الوقت": new Date(log.timestamp).toLocaleTimeString('ar-EG'),
        "اسم الخادم": log.servantName,
        "اسم المخدوم": m ? m.name : 'غير معروف',
        "نوع التواصل": log.type === 'call' ? 'مكالمة' : (log.type === 'message' ? 'رسالة' : 'زيارة'),
        "ملاحظات": log.note
      };
    });
    const wsFollowUp = XLSX.utils.json_to_sheet(followUpData);
    XLSX.utils.book_append_sheet(wb, wsFollowUp, "سجل الافتقاد");

    // Save
    XLSX.writeFile(wb, `Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportConfirm(false);
  };

  return (
    <div className="pb-20 pt-6 px-4 max-w-4xl mx-auto w-full">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold text-gray-800">{CHURCH_NAME}</h1>
        <h2 className="text-indigo-600 font-medium">{APP_NAME}</h2>
      </div>

      {/* Export Card - Redesigned for Prominence */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white mb-8 shadow-xl relative overflow-hidden">
        {/* Background Decor */}
        <FileSpreadsheet className="absolute -left-6 -bottom-6 text-white opacity-10" size={140} />
        <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full blur-2xl -mr-10 -mt-10"></div>
        
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-center sm:text-right">
            <h3 className="font-bold text-2xl mb-2 flex items-center justify-center sm:justify-start gap-2">
               <FileSpreadsheet />
               تصدير البيانات
            </h3>
            <p className="text-emerald-100 text-sm opacity-90 max-w-md leading-relaxed">
              تحميل شيت إكسيل شامل يحتوي على بيانات المخدومين، سجل الحضور الكامل، وسجلات الافتقاد والمتابعة.
            </p>
          </div>
          
          <button 
            onClick={() => setShowExportConfirm(true)}
            className="bg-white text-emerald-700 px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg hover:bg-emerald-50 active:scale-95 transition-all flex items-center gap-2 whitespace-nowrap"
          >
            <Download size={20} />
            تحميل التقرير
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <div className="text-3xl font-bold text-gray-800">{members.length}</div>
          <div className="text-gray-500 text-sm">إجمالي المخدومين</div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center">
          <div className="text-3xl font-bold text-gray-800">{attendance.length}</div>
          <div className="text-gray-500 text-sm">إجمالي مرات الحضور</div>
        </div>
      </div>
      
      <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm text-center mb-8 flex flex-col items-center justify-center">
          <div className="flex items-center gap-2 text-orange-600 mb-2">
            <PhoneCall size={20} />
            <span className="font-bold">نشاط الافتقاد</span>
          </div>
          <div className="text-3xl font-bold text-gray-800">{followUpLogs.length}</div>
          <div className="text-gray-500 text-sm">إجمالي محاولات التواصل</div>
      </div>

      {/* Chart */}
      <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-80">
        <h3 className="font-bold text-gray-800 mb-6">معدل الحضور (آخر اجتماعات)</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="date" 
              axisLine={false} 
              tickLine={false} 
              tick={{fill: '#64748b', fontSize: 12}} 
              dy={10}
            />
            <YAxis hide />
            <Tooltip 
              cursor={{fill: '#f8fafc'}}
              contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'}}
            />
            <Bar 
              dataKey="count" 
              fill="#4f46e5" 
              radius={[6, 6, 0, 0]} 
              barSize={32}
            />
          </BarChart>
        </ResponsiveContainer>
        {chartData.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center text-gray-400 text-sm">
            لا توجد بيانات كافية
          </div>
        )}
      </div>

      {/* Confirmation Modal */}
      {showExportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4 backdrop-blur-sm animate-fade-in-up">
            <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl transform transition-all scale-100">
                <div className="flex flex-col items-center text-center mb-6">
                    <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
                        <AlertCircle size={32} />
                    </div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد التصدير</h3>
                    <p className="text-gray-500 text-sm leading-relaxed">
                        هل أنت متأكد من رغبتك في تحميل التقرير؟
                        <br/>
                        <span className="text-amber-600 font-bold text-xs mt-2 block bg-amber-50 p-1 rounded">
                            تنبيه: الملف يحتوي على بيانات شخصية للمخدومين
                        </span>
                    </p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        onClick={() => setShowExportConfirm(false)}
                        className="py-3 px-4 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition"
                    >
                        إلغاء
                    </button>
                    <button
                        onClick={performExport}
                        className="py-3 px-4 bg-emerald-600 text-white rounded-xl font-bold hover:bg-emerald-700 transition flex items-center justify-center gap-2"
                    >
                       <Download size={18} /> تحميل
                    </button>
                </div>
            </div>
        </div>
      )}
    </div>
  );
};
import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import { getAttendance, getMembers, getFollowUpLogs } from '../utils/storage';
import { Download, FileSpreadsheet, PhoneCall, AlertCircle } from 'lucide-react';
import { CHURCH_NAME, APP_NAME } from '../constants';

export const Reports: React.FC = () => {
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const members = getMembers();
  const attendance = getAttendance();
  const followUpLogs = getFollowUpLogs();

  const chartData = useMemo(() => {
    const groupedByDate: Record<string, number> = {};
    attendance.forEach((a: any) => {
      groupedByDate[a.dateStr] = (groupedByDate[a.dateStr] || 0) + 1;
    });

    return Object.keys(groupedByDate)
      .sort()
      .slice(-5)
      .map((date: string) => ({
        date: new Date(date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
        count: groupedByDate[date]
      }));
  }, [attendance]);

  const performExport = () => {
    const wb = XLSX.utils.book_new();

    const summaryData = members.map((m: any) => {
      const myAttendance = attendance.filter((a: any) => a.memberId === m.id);
      const totalPoints = myAttendance.reduce((sum: number, a: any) => sum + a.points, 0);
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

    const logsData = attendance.map((a: any) => {
      const m = members.find((mem: any) => mem.id === a.memberId);
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

    const followUpData = followUpLogs.map((log: any) => {
      const m = members.find((mem: any) => mem.id === log.memberId);
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

    XLSX.writeFile(wb, `Reports_${new Date().toISOString().split('T')[0]}.xlsx`);
    setShowExportConfirm(false);
  };

  return (
    <div className="pb-20 pt-6 px-4 max-w-4xl mx-auto w-full font-cairo" dir="rtl">
      <div className="mb-8 text-center">
        <h1 className="text-xl font-bold text-gray-800">{CHURCH_NAME}</h1>
        <h2 className="text-indigo-600 font-medium">{APP_NAME}</h2>
      </div>

      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white mb-8 shadow-xl relative overflow-hidden">
        <FileSpreadsheet className="absolute -left-6 -bottom-6 text-white opacity-10" size={140} />
        <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="text-right">
            <h3 className="font-bold text-2xl mb-2 flex items-center gap-2">
              <FileSpreadsheet /> تصدير البيانات
            </h3>
            <p className="text-emerald-100 text-sm opacity-90">
              تحميل شيت إكسيل شامل يحتوي على بيانات المخدومين وسجلات الحضور والافتقاد.
            </p>
          </div>
          <button 
            onClick={() => setShowExportConfirm(true)}
            className="bg-white text-emerald-700 px-8 py-3.5 rounded-xl font-bold text-sm shadow-lg"
          >
            تحميل التقرير
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="bg-white p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-gray-800">{members.length}</div>
          <div className="text-gray-500 text-sm">إجمالي المخدومين</div>
        </div>
        <div className="bg-white p-4 rounded-xl border text-center">
          <div className="text-3xl font-bold text-gray-800">{attendance.length}</div>
          <div className="text-gray-500 text-sm">إجمالي الحضور</div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border h-80 relative mb-8">
        <h3 className="font-bold text-gray-800 mb-6 text-right">معدل الحضور</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{fontSize: 12}} />
            <Tooltip />
            <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {showExportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl">
            <div className="flex flex-col items-center text-center mb-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mb-4 text-emerald-600">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">تأكيد التصدير</h3>
              <p className="text-gray-500 text-sm">هل أنت متأكد من رغبتك في تحميل التقرير؟</p>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <button onClick={() => setShowExportConfirm(false)} className="py-3 bg-gray-100 text-gray-700 rounded-xl font-bold">إلغاء</button>
              <button onClick={performExport} className="py-3 bg-emerald-600 text-white rounded-xl font-bold">تحميل</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

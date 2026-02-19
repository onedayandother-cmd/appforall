import React, { useMemo, useState } from 'react';
import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import * as XLSX from 'xlsx';
import { getAttendance, getMembers } from '../utils/storage';
import { Download, FileSpreadsheet, AlertCircle } from 'lucide-react';

export const Reports: React.FC = () => {
  const [showExportConfirm, setShowExportConfirm] = useState(false);
  const members = getMembers();
  const attendance = getAttendance();

  const chartData = useMemo(() => {
    const grouped: Record<string, number> = {};
    attendance.forEach((a: any) => { grouped[a.dateStr] = (grouped[a.dateStr] || 0) + 1; });
    return Object.keys(grouped).sort().slice(-5).map((d: string) => ({ date: d, count: grouped[d] }));
  }, [attendance]);

  const performExport = () => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(members);
    XLSX.utils.book_append_sheet(wb, ws, "المخدومين");
    XLSX.writeFile(wb, `Report_${new Date().toLocaleDateString()}.xlsx`);
    setShowExportConfirm(false);
  };

  return (
    <div className="pb-20 pt-6 px-4 max-w-4xl mx-auto w-full font-cairo" dir="rtl">
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-3xl p-6 text-white mb-8 shadow-xl">
        <h3 className="font-bold text-2xl mb-2 flex items-center gap-2"><FileSpreadsheet /> تصدير البيانات</h3>
        <p className="text-emerald-100 text-sm mb-4">تحميل شيت إكسيل شامل لبيانات الحضور والافتقاد.</p>
        <button onClick={() => setShowExportConfirm(true)} className="bg-white text-emerald-700 px-8 py-2 rounded-xl font-bold">تحميل التقرير</button>
      </div>

      <div className="bg-white p-6 rounded-2xl shadow-sm border h-80 mb-8">
        <h3 className="font-bold mb-4 text-right">معدل الحضور</h3>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" />
            <Tooltip />
            <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {showExportConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-2xl text-center">
            <AlertCircle size={48} className="mx-auto text-emerald-600 mb-4" />
            <h3 className="text-xl font-bold mb-2">تأكيد التصدير</h3>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowExportConfirm(false)} className="flex-1 py-3 bg-gray-100 rounded-xl">إلغاء</button>
              <button onClick={performExport} className="flex-1 py-3 bg-emerald-600 text-white rounded-xl">تحميل</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

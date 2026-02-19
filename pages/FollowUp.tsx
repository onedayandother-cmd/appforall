import React, { useState, useEffect, useMemo } from 'react';
import { Member, AttendanceRecord, FollowUpLog, User } from '../types';
import { getMembers, getAttendance, getFollowUpLogs, saveFollowUpLog, getCurrentUser, getUsers } from '../utils/storage';
import { Phone, MessageCircle, Clock, CheckCircle2, User as UserIcon, PhoneCall, Calendar, Plus, X, Filter } from 'lucide-react';

export const FollowUp: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [logs, setLogs] = useState<FollowUpLog[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [filterWeeks, setFilterWeeks] = useState(2);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [note, setNote] = useState('');
  const [interactionType, setInteractionType] = useState<'call' | 'message' | 'visit'>('call');
  
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Filter by Responsible Servant (default to self if not admin, or 'ALL')
  const [selectedServantFilter, setSelectedServantFilter] = useState<string>('ALL');

  useEffect(() => {
    refreshData();
    setUsers(getUsers());
    // Set default filter: if servant, show their group. If admin, show ALL.
    if (currentUser && currentUser.role !== 'ADMIN') {
        setSelectedServantFilter(currentUser.username);
    }
  }, []);

  const refreshData = () => {
    setMembers(getMembers());
    setAttendance(getAttendance());
    setLogs(getFollowUpLogs());
  };

  const absentees = useMemo(() => {
    const today = new Date();
    // Get unique meeting dates sorted descending
    const distinctDates = Array.from(new Set(attendance.map(a => a.dateStr))).sort().reverse();
    
    // Consider only the last N meetings based on filter
    const targetDates = distinctDates.slice(0, 5); // Look at last 5 meetings context

    const result: { member: Member, missedCount: number, lastAttended: string | null }[] = [];

    members.forEach(m => {
        // Apply Servant Filter
        if (selectedServantFilter !== 'ALL' && m.responsibleServant !== selectedServantFilter) {
            return; // Skip if not assigned to selected servant
        }

        let missedConsecutive = 0;
        let lastAttendedDate = null;

        // Check recent history
        for (const date of distinctDates) {
             const attended = attendance.some(a => a.memberId === m.id && a.dateStr === date);
             if (attended) {
                 lastAttendedDate = date;
                 break; // Stop counting consecutive absence
             } else {
                 missedConsecutive++;
             }
        }

        if (missedConsecutive >= filterWeeks) {
            result.push({
                member: m,
                missedCount: missedConsecutive,
                lastAttended: lastAttendedDate
            });
        }
    });

    return result.sort((a, b) => b.missedCount - a.missedCount);
  }, [members, attendance, filterWeeks, selectedServantFilter]);

  const handleSaveLog = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !note) return;

    const user = getCurrentUser();
    const log: FollowUpLog = {
        id: Date.now().toString(),
        memberId: selectedMember.id,
        timestamp: Date.now(),
        note: note,
        servantName: user?.name || 'خادم',
        type: interactionType
    };

    saveFollowUpLog(log);
    setSelectedMember(null);
    setNote('');
    refreshData();
  };

  const getLastLog = (memberId: string) => {
      const memberLogs = logs.filter(l => l.memberId === memberId).sort((a, b) => b.timestamp - a.timestamp);
      return memberLogs.length > 0 ? memberLogs[0] : null;
  };

  const openWhatsApp = (phone: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('01')) clean = '2' + clean;
    window.open(`https://wa.me/${clean}`, '_blank');
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <PhoneCall className="text-orange-500" />
            الافتقاد والمتابعة
        </h1>
      </div>

      {/* Filters Section */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 mb-6 space-y-4">
        
        {/* Servant Filter (Visible to Admin, or just read-only info for servant) */}
        {isAdmin ? (
            <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                    <Filter size={16} /> تصفية حسب الخادم المسؤول:
                </label>
                <select 
                    value={selectedServantFilter}
                    onChange={(e) => setSelectedServantFilter(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm"
                >
                    <option value="ALL">عرض الكل</option>
                    {users.map(u => (
                        <option key={u.username} value={u.username}>{u.name}</option>
                    ))}
                    <option value="">غير معين</option>
                </select>
            </div>
        ) : (
            <div className="text-sm text-gray-500 bg-gray-50 p-2 rounded-lg border border-gray-200">
                يتم عرض المخدومين في مجموعتك فقط.
            </div>
        )}

        {/* Weeks Filter */}
        <div>
            <label className="text-sm font-medium text-gray-700 mb-2 block">عرض الغائبين منذ:</label>
            <div className="flex gap-2">
                {[1, 2, 3, 4].map(num => (
                    <button
                        key={num}
                        onClick={() => setFilterWeeks(num)}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition ${filterWeeks === num ? 'bg-orange-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
                    >
                        {num} {num === 1 ? 'أسبوع' : 'أسابيع'}
                    </button>
                ))}
            </div>
        </div>
      </div>

      {/* List */}
      <div className="space-y-4">
        {absentees.map(({ member, missedCount, lastAttended }) => {
            const lastLog = getLastLog(member.id);
            return (
                <div key={member.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col gap-3">
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 bg-gray-100 rounded-full overflow-hidden">
                                {member.photoUrl ? <img src={member.photoUrl} className="w-full h-full object-cover" /> : <UserIcon size={24} className="m-auto mt-3 text-gray-400" />}
                            </div>
                            <div>
                                <h3 className="font-bold text-gray-800">{member.name}</h3>
                                <div className="text-xs text-red-500 font-medium">غائب {missedCount} مرات متتالية</div>
                                <div className="text-xs text-gray-400">آخر حضور: {lastAttended || 'لم يحضر'}</div>
                            </div>
                        </div>
                        <div className="flex gap-2">
                            <button onClick={() => openWhatsApp(member.phone)} className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100">
                                <MessageCircle size={20} />
                            </button>
                            <a href={`tel:${member.phone}`} className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100">
                                <Phone size={20} />
                            </a>
                        </div>
                    </div>

                    {lastLog && (
                        <div className="bg-orange-50 p-2 rounded-lg text-xs text-orange-800 border border-orange-100 flex items-start gap-2">
                            <Clock size={12} className="mt-0.5" />
                            <div>
                                <span className="font-bold">{lastLog.servantName}:</span> {lastLog.note}
                                <div className="text-orange-600 opacity-70 mt-1">{new Date(lastLog.timestamp).toLocaleDateString('ar-EG')}</div>
                            </div>
                        </div>
                    )}

                    <button 
                        onClick={() => {
                            setSelectedMember(member);
                            if (lastLog) {
                                setNote(`متابعة بخصوص: ${lastLog.note}`);
                            } else {
                                const dateText = lastAttended ? new Date(lastAttended).toLocaleDateString('ar-EG') : 'فترة طويلة';
                                setNote(`متابعة بخصوص الغياب منذ ${dateText}`);
                            }
                        }}
                        className="w-full py-2 border-t border-gray-100 text-indigo-600 font-bold text-sm hover:bg-gray-50 rounded-b-lg flex items-center justify-center gap-2"
                    >
                        <Plus size={16} /> تسجيل ملاحظة افتقاد
                    </button>
                </div>
            )
        })}
        {absentees.length === 0 && (
            <div className="text-center py-10 text-gray-400">
                <CheckCircle2 size={48} className="mx-auto mb-2 text-green-200" />
                لا يوجد غائبين لهذه الفترة
                {selectedServantFilter !== 'ALL' && <div className="text-xs mt-2">في المجموعة المحددة</div>}
            </div>
        )}
      </div>

      {/* Modal */}
      {selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in-up">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold">تسجيل متابعة: {selectedMember.name}</h3>
                      <button onClick={() => setSelectedMember(null)}><X size={20} className="text-gray-400" /></button>
                  </div>
                  <form onSubmit={handleSaveLog} className="p-4 space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">نوع التواصل</label>
                          <div className="flex gap-2">
                              {(['call', 'message', 'visit'] as const).map(t => (
                                  <button
                                    key={t}
                                    type="button"
                                    onClick={() => setInteractionType(t)}
                                    className={`flex-1 py-2 rounded-lg text-sm font-bold border ${interactionType === t ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-600 border-gray-200'}`}
                                  >
                                      {t === 'call' ? 'مكالمة' : (t === 'message' ? 'رسالة' : 'زيارة')}
                                  </button>
                              ))}
                          </div>
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">ملاحظات</label>
                          <textarea 
                            required
                            value={note}
                            onChange={e => setNote(e.target.value)}
                            className="w-full border rounded-xl p-3 h-24 focus:ring-2 focus:ring-indigo-500"
                            placeholder="نتيجة الاتصال..."
                          ></textarea>
                      </div>
                      <button type="submit" className="w-full bg-indigo-600 text-white py-3 rounded-xl font-bold hover:bg-indigo-700">
                          حفظ
                      </button>
                  </form>
              </div>
          </div>
      )}
    </div>
  );
};
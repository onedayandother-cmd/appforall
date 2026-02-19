import React, { useState, useEffect } from 'react';
import { Member, AttendanceRecord, Announcement, MeetingSegment, ScheduledNotification } from '../types';
import { getMembers, getAttendance, saveAttendance, deleteAttendance, getConfig, getAnnouncements, saveAnnouncement, getAgendaForDate, saveSegment, deleteSegment, getCurrentUser, getScheduledNotifications, saveScheduledNotification, deleteScheduledNotification } from '../utils/storage';
import { Scanner } from '../components/Scanner';
import { calculatePoints, getMeetingStatus } from '../utils/scoring';
import { Search, ScanFace, Fingerprint, CheckCircle, Clock, User, ChevronDown, AlertTriangle, Calendar, PhoneCall, Gift, Megaphone, Send, X, Trash2, CalendarClock, PenSquare, Plus, StickyNote, ChevronRight, ChevronLeft, Cross, Music, BookOpen, Gamepad2, Coffee, HandHeart, Bird, Timer } from 'lucide-react';

// Icon Mapping
const SEGMENT_ICONS: Record<string, React.ElementType> = {
    'cross': Cross,
    'prayer': HandHeart,
    'dove': Bird,
    'worship': Music,
    'book': BookOpen,
    'game': Gamepad2,
    'break': Coffee,
    'default': CalendarClock
};

const ICON_OPTIONS = [
    { id: 'cross', label: 'صليب', icon: Cross },
    { id: 'dove', label: 'حمامة', icon: Bird },
    { id: 'prayer', label: 'صلاة', icon: HandHeart },
    { id: 'worship', label: 'ترانيم', icon: Music },
    { id: 'book', label: 'درس', icon: BookOpen },
    { id: 'game', label: 'لعب', icon: Gamepad2 },
    { id: 'break', label: 'راحة', icon: Coffee },
];

export const Dashboard: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [todayAttendance, setTodayAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  
  // Stats Lists
  const [absentMembers, setAbsentMembers] = useState<{member: Member, weeks: number}[]>([]);
  const [upcomingBirthdays, setUpcomingBirthdays] = useState<Member[]>([]);

  // Scanner state
  const [scannerMode, setScannerMode] = useState<'face' | 'fingerprint' | null>(null);
  const [isIdentificationMode, setIsIdentificationMode] = useState(false);
  
  const [notification, setNotification] = useState<{msg: string, points: number} | null>(null);
  const [showManualSearch, setShowManualSearch] = useState(false);

  // Animation State
  const [isCountAnimating, setIsCountAnimating] = useState(false);

  // Announcement & Notification State
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [scheduledNotifications, setScheduledNotifications] = useState<ScheduledNotification[]>([]);
  const [showAnnouncementModal, setShowAnnouncementModal] = useState(false);
  const [announcementForm, setAnnouncementForm] = useState({ title: '', body: '', target: 'ALL', scheduleDate: '', scheduleTime: '' });
  const [broadcastQueue, setBroadcastQueue] = useState<Member[]>([]);
  const [currentBroadcastIndex, setCurrentBroadcastIndex] = useState(0);

  // Agenda State
  // Initialize default date to Friday 13th Feb 2026 as requested
  // Using noon to prevent timezone shifts
  const [selectedDate, setSelectedDate] = useState<Date>(new Date(2026, 1, 13, 12, 0, 0)); 
  const [agenda, setAgenda] = useState<MeetingSegment[]>([]);
  const [currentSegmentId, setCurrentSegmentId] = useState<string | null>(null);
  const [isAgendaModalOpen, setIsAgendaModalOpen] = useState(false);
  const [newSegment, setNewSegment] = useState<Partial<MeetingSegment>>({ title: '', startTime: '', endTime: '', servantName: '', notes: '', icon: 'default' });

  const config = getConfig();
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Helper to get local date string YYYY-MM-DD
  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  useEffect(() => {
    loadData();
    refreshAnnouncements();
  }, []);

  const refreshAnnouncements = () => {
    setAnnouncements(getAnnouncements());
    setScheduledNotifications(getScheduledNotifications().filter(n => n.status === 'pending').sort((a,b) => a.scheduledTime - b.scheduledTime));
  };

  useEffect(() => {
    // Load Agenda whenever selectedDate changes
    const dateStr = getLocalDateStr(selectedDate);
    const loadedAgenda = getAgendaForDate(dateStr);
    setAgenda(loadedAgenda);
    updateCurrentSegment(loadedAgenda, dateStr);

    // Update current segment every minute
    const interval = setInterval(() => updateCurrentSegment(loadedAgenda, dateStr), 60000);
    return () => clearInterval(interval);
  }, [selectedDate]);

  // Trigger animation when attendance count changes
  useEffect(() => {
    if (todayAttendance.length > 0) {
        setIsCountAnimating(true);
        const timer = setTimeout(() => setIsCountAnimating(false), 300);
        return () => clearTimeout(timer);
    }
  }, [todayAttendance.length]);

  const loadData = () => {
    const allMembers = getMembers();
    const allAttendance = getAttendance();
    const todayStr = getLocalDateStr(new Date());
    
    setMembers(allMembers);
    setTodayAttendance(allAttendance.filter(a => a.dateStr === todayStr));

    calculateStats(allMembers, allAttendance);
  };

  const calculateStats = (allMembers: Member[], allAttendance: AttendanceRecord[]) => {
    // 1. Calculate Birthdays (Next 7 days)
    const today = new Date();
    const nextWeek = new Date();
    nextWeek.setDate(today.getDate() + 7);

    const bdays = allMembers.filter(m => {
        if (!m.dob) return false;
        const dob = new Date(m.dob);
        const currentYearDob = new Date(today.getFullYear(), dob.getMonth(), dob.getDate());
        return currentYearDob >= today && currentYearDob <= nextWeek;
    });
    setUpcomingBirthdays(bdays);

    // 2. Calculate Absentees (Missed last 2 meetings at least)
    // Get unique meeting dates sorted desc
    const distinctDates = Array.from(new Set(allAttendance.map(a => a.dateStr))).sort().reverse();
    
    // Check last 3 meetings
    const recentMeetings = distinctDates.slice(0, 3);
    
    if (recentMeetings.length > 0) {
        const absents: {member: Member, weeks: number}[] = [];
        allMembers.forEach(m => {
            // Check if attended today
            const attendedToday = allAttendance.some(a => a.memberId === m.id && a.dateStr === getLocalDateStr(new Date()));
            if (attendedToday) return;

            let missedCount = 0;
            for (const date of recentMeetings) {
                const attended = allAttendance.some(a => a.memberId === m.id && a.dateStr === date);
                if (!attended) missedCount++;
                else break; // Reset if attended recently
            }

            if (missedCount >= 2) {
                absents.push({ member: m, weeks: missedCount });
            }
        });
        setAbsentMembers(absents.sort((a, b) => b.weeks - a.weeks).slice(0, 5)); // Top 5
    } else {
        setAbsentMembers([]);
    }
  };

  // --- Agenda Logic ---
  const changeWeek = (direction: 'prev' | 'next') => {
      const newDate = new Date(selectedDate);
      newDate.setDate(selectedDate.getDate() + (direction === 'next' ? 7 : -7));
      setSelectedDate(newDate);
  };

  const updateCurrentSegment = (currentAgenda: MeetingSegment[], agendaDateStr: string) => {
      const now = new Date();
      const todayStr = getLocalDateStr(now);

      // Only highlight active segment if we are looking at TODAY's agenda
      if (todayStr !== agendaDateStr) {
          setCurrentSegmentId(null);
          return;
      }

      const currentMinutes = now.getHours() * 60 + now.getMinutes();
      
      const segment = currentAgenda.find(seg => {
          const [startH, startM] = seg.startTime.split(':').map(Number);
          const [endH, endM] = seg.endTime.split(':').map(Number);
          const startTotal = startH * 60 + startM;
          const endTotal = endH * 60 + endM;
          return currentMinutes >= startTotal && currentMinutes < endTotal;
      });
      
      setCurrentSegmentId(segment ? segment.id : null);
  };

  const handleAddSegment = (e: React.FormEvent) => {
      e.preventDefault();
      if (!newSegment.title || !newSegment.startTime || !newSegment.endTime) return;
      
      const newItem: MeetingSegment = {
          id: Date.now().toString(),
          dateStr: getLocalDateStr(selectedDate),
          title: newSegment.title,
          startTime: newSegment.startTime,
          endTime: newSegment.endTime,
          servantName: newSegment.servantName,
          notes: newSegment.notes,
          icon: newSegment.icon || 'default'
      };
      
      saveSegment(newItem);
      
      // Refresh local state
      const dateStr = getLocalDateStr(selectedDate);
      setAgenda(getAgendaForDate(dateStr));
      
      setNewSegment({ title: '', startTime: '', endTime: '', servantName: '', notes: '', icon: 'default' });
  };

  const handleDeleteSegment = (id: string) => {
      if(confirm('حذف هذه الفقرة؟')) {
          deleteSegment(id);
          const dateStr = getLocalDateStr(selectedDate);
          setAgenda(getAgendaForDate(dateStr));
      }
  };


  const handleMemberSelect = (member: Member) => {
    if (todayAttendance.find(a => a.memberId === member.id)) {
      alert('تم تسجيل حضور هذا المخدوم اليوم بالفعل');
      return;
    }
    // Manual selection -> then verify
    setSelectedMember(member);
    setIsIdentificationMode(false);
  };

  const startIdentification = (mode: 'face' | 'fingerprint') => {
    setScannerMode(mode);
    setIsIdentificationMode(true);
    setSelectedMember(null);
  };

  const recordAttendance = (member: Member, method: 'face' | 'fingerprint' | 'manual') => {
    const now = new Date();
    const points = calculatePoints(now, config);
    const todayStr = getLocalDateStr(now);
    
    // Double check duplication
    if (todayAttendance.find(a => a.memberId === member.id)) {
        alert('تم تسجيل حضور هذا المخدوم بالفعل');
        setScannerMode(null);
        return;
    }

    const record: AttendanceRecord = {
      id: Date.now().toString(),
      memberId: member.id,
      timestamp: now.getTime(),
      dateStr: todayStr,
      points: points,
      method: method
    };

    saveAttendance(record);
    setNotification({ msg: getMeetingStatus(now, config), points });
    
    // Cleanup
    setScannerMode(null);
    setSelectedMember(null);
    setSearchTerm('');
    loadData();

    // Clear notification after 3s
    setTimeout(() => setNotification(null), 3000);
  };

  const handleDeleteAttendance = (recordId: string) => {
    if(confirm("هل أنت متأكد من حذف هذا السجل؟")) {
      deleteAttendance(recordId);
      loadData();
    }
  };

  // Callback for Verification Mode (Select -> Scan)
  const handleVerificationComplete = (success: boolean) => {
    if (success && selectedMember && scannerMode) {
      recordAttendance(selectedMember, scannerMode);
    } else {
      setScannerMode(null);
    }
  };

  // Callback for Identification Mode (Scan -> Identify)
  const handleIdentificationComplete = (member: Member) => {
    if (member && scannerMode) {
      recordAttendance(member, scannerMode);
    }
  };

  // --- Announcement & Scheduling Logic ---
  const handleAnnouncementSubmit = () => {
    if(!announcementForm.title || !announcementForm.body) return;

    // Check if scheduled
    if (announcementForm.scheduleDate && announcementForm.scheduleTime) {
        const scheduleDateTime = new Date(`${announcementForm.scheduleDate}T${announcementForm.scheduleTime}`).getTime();
        
        if (scheduleDateTime <= Date.now()) {
            alert('يجب اختيار وقت في المستقبل');
            return;
        }

        const newNotif: ScheduledNotification = {
            id: Date.now().toString(),
            title: announcementForm.title,
            body: announcementForm.body,
            targetGroup: announcementForm.target,
            status: 'pending',
            scheduledTime: scheduleDateTime
        };
        
        saveScheduledNotification(newNotif);
        refreshAnnouncements();
        setShowAnnouncementModal(false);
        setAnnouncementForm({ title: '', body: '', target: 'ALL', scheduleDate: '', scheduleTime: '' });
        alert('تم جدولة الإشعار بنجاح');
        return;
    }

    // Direct Send Logic (Existing)
    let targets: Member[] = [];
    if (announcementForm.target === 'ALL') {
        targets = members;
    } else if (announcementForm.target === 'ABSENT') {
        const attendedIds = new Set(todayAttendance.map(a => a.memberId));
        targets = members.filter(m => !attendedIds.has(m.id));
    } else {
        targets = members.filter(m => m.year === announcementForm.target);
    }

    if (targets.length === 0) {
        alert('لا يوجد مخدومين في هذه الفئة');
        return;
    }

    const announcement: Announcement = {
        id: Date.now().toString(),
        title: announcementForm.title,
        body: announcementForm.body,
        targetGroup: announcementForm.target,
        recipientCount: targets.length,
        timestamp: Date.now()
    };
    saveAnnouncement(announcement);
    
    setBroadcastQueue(targets);
    setCurrentBroadcastIndex(0);
    setShowAnnouncementModal(false);
    setAnnouncementForm({ title: '', body: '', target: 'ALL', scheduleDate: '', scheduleTime: '' });
    refreshAnnouncements();
  };

  const handleDeleteNotification = (id: string) => {
      if(confirm('إلغاء هذا الإشعار المجدول؟')) {
          deleteScheduledNotification(id);
          refreshAnnouncements();
      }
  };

  const sendNextBroadcast = () => {
      const member = broadcastQueue[currentBroadcastIndex];
      const text = `*${announcementForm.title}*\n\n${announcementForm.body}`;
      openWhatsApp(member.phone, text);
  };

  const filteredMembers = members.filter(m => 
    m.name.includes(searchTerm) || m.phone.includes(searchTerm)
  );

  const candidates = members.filter(m => {
    const alreadyAttended = todayAttendance.some(a => a.memberId === m.id);
    const hasBiometric = scannerMode === 'face' 
        ? m.hasFaceId 
        : (m.fingerprintCount && m.fingerprintCount > 0);
    return !alreadyAttended && hasBiometric;
  });

  const countPendingWithoutBiometrics = members.filter(m => !todayAttendance.some(a => a.memberId === m.id) && (scannerMode === 'face' ? !m.hasFaceId : !(m.fingerprintCount && m.fingerprintCount > 0))).length;

  const formatTime = (timeStr: string) => {
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h);
    const suffix = hour >= 12 ? 'م' : 'ص';
    const displayHour = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
    return `${displayHour}:${m} ${suffix}`;
  }

  const openWhatsApp = (phone: string, text?: string) => {
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('01')) clean = '2' + clean;
    const url = `https://wa.me/${clean}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
    window.open(url, '_blank');
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto w-full">
      {/* Header Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-indigo-600 rounded-2xl p-4 text-white shadow-lg relative overflow-hidden transition-all">
          <div className="text-indigo-200 text-sm mb-1 relative z-10">الحضور اليوم</div>
          <div className={`text-3xl font-bold relative z-10 transition-all duration-300 origin-bottom-left ${isCountAnimating ? 'scale-125 text-yellow-300' : ''}`}>
            {todayAttendance.length}
          </div>
          {/* Subtle Background Animation */}
           <div className={`absolute -right-4 -bottom-4 bg-white opacity-10 rounded-full transition-all duration-500 ease-out ${isCountAnimating ? 'w-32 h-32' : 'w-24 h-24'}`}></div>
        </div>
        <div className="bg-white rounded-2xl p-4 text-gray-800 shadow-sm border border-gray-100">
           <div className="text-gray-500 text-sm mb-1">موعد البدء</div>
           <div className="text-3xl font-bold text-indigo-600" dir="ltr">{formatTime(config.startTime)}</div>
        </div>
      </div>

      {/* --- AGENDA TIMELINE SECTION --- */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-6">
          <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                  <CalendarClock className="text-indigo-600" size={20} />
                  برنامج اليوم
              </h3>
              {isAdmin && (
                  <button onClick={() => setIsAgendaModalOpen(true)} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg flex items-center gap-1">
                      <PenSquare size={14} /> تعديل
                  </button>
              )}
          </div>
          
          {/* Date Navigation */}
          <div className="bg-indigo-50 px-4 py-2 flex items-center justify-between border-b border-indigo-100">
             <button 
               onClick={() => changeWeek('prev')} 
               className="flex items-center gap-1 p-2 hover:bg-indigo-100 rounded text-indigo-600 text-xs font-bold"
             >
                <ChevronRight size={16} className="rtl:rotate-180" />
                أسبوع سابق
             </button>
             <div className="flex flex-col items-center">
                <div className="text-sm font-bold text-indigo-800">
                   {selectedDate.toLocaleDateString('ar-EG', { weekday: 'long' })}
                </div>
                <div className="text-xs text-indigo-500">
                   {selectedDate.toLocaleDateString('ar-EG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </div>
             </div>
             <button 
                onClick={() => changeWeek('next')} 
                className="flex items-center gap-1 p-2 hover:bg-indigo-100 rounded text-indigo-600 text-xs font-bold"
             >
                أسبوع تالي
                <ChevronLeft size={16} className="rtl:rotate-180" />
             </button>
          </div>

          <div className="p-4 relative min-h-[150px]">
              <div className="absolute top-4 bottom-4 right-7 w-0.5 bg-gray-200"></div>
              <div className="space-y-6">
                  {agenda.map((item, idx) => {
                      const isActive = item.id === currentSegmentId;
                      const IconComponent = item.icon && SEGMENT_ICONS[item.icon] ? SEGMENT_ICONS[item.icon] : SEGMENT_ICONS['default'];
                      return (
                          <div key={item.id} className={`relative flex items-start gap-4 ${isActive ? 'opacity-100' : 'opacity-80'}`}>
                              <div className={`z-10 w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 mt-1 bg-white ${isActive ? 'border-indigo-500 text-indigo-600 shadow-md' : 'border-gray-300 text-gray-400'}`}>
                                  <IconComponent size={14} />
                              </div>
                              <div className={`flex-1 rounded-xl p-3 border transition-all ${isActive ? 'bg-indigo-50 border-indigo-200 shadow-sm' : 'bg-white border-gray-100'}`}>
                                  <div className="flex justify-between items-start mb-1">
                                      <h4 className={`font-bold ${isActive ? 'text-indigo-800' : 'text-gray-800'}`}>{item.title}</h4>
                                      <span className="text-xs font-bold font-mono bg-white px-2 py-0.5 rounded border border-gray-100" dir="ltr">
                                          {formatTime(item.startTime)} - {formatTime(item.endTime)}
                                      </span>
                                  </div>
                                  <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                      {item.servantName && (
                                          <div className="flex items-center gap-1">
                                              <User size={12} /> {item.servantName}
                                          </div>
                                      )}
                                      {item.notes && (
                                          <div className="flex items-center gap-1 text-gray-400">
                                              <StickyNote size={12} /> {item.notes}
                                          </div>
                                      )}
                                  </div>
                              </div>
                          </div>
                      )
                  })}
                  {agenda.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-6 text-gray-400">
                          <CalendarClock size={40} className="mb-2 opacity-20" />
                          <p className="text-sm">لم يتم إضافة جدول لهذا التاريخ</p>
                          {isAdmin && (
                            <button onClick={() => setIsAgendaModalOpen(true)} className="mt-2 text-xs text-indigo-600 font-bold hover:underline">
                              + إضافة فقرات
                            </button>
                          )}
                      </div>
                  )}
              </div>
          </div>
      </div>

      {/* --- Action Cards (Birthdays & Absentees) --- */}
      {(upcomingBirthdays.length > 0 || absentMembers.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {/* Birthdays */}
            {upcomingBirthdays.length > 0 && (
                <div className="bg-gradient-to-br from-pink-50 to-rose-50 border border-pink-100 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-pink-600 font-bold mb-3 flex items-center gap-2">
                        <Gift size={18} /> أعياد ميلاد الأسبوع
                    </h3>
                    <div className="space-y-2">
                        {upcomingBirthdays.map(m => (
                            <div key={m.id} className="bg-white p-2 rounded-lg flex justify-between items-center text-sm shadow-sm">
                                <span className="font-medium text-gray-700">{m.name}</span>
                                <span className="text-xs bg-pink-100 text-pink-600 px-2 py-1 rounded-full">
                                    {new Date(m.dob).getDate()}/{new Date(m.dob).getMonth() + 1}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Follow Up (Eftaqad) */}
            {absentMembers.length > 0 && (
                <div className="bg-gradient-to-br from-orange-50 to-amber-50 border border-orange-100 rounded-2xl p-4 shadow-sm">
                    <h3 className="text-orange-600 font-bold mb-3 flex items-center gap-2">
                        <PhoneCall size={18} /> يحتاجون للافتقاد
                    </h3>
                    <div className="space-y-2">
                        {absentMembers.map(item => (
                            <div key={item.member.id} className="bg-white p-2 rounded-lg flex justify-between items-center text-sm shadow-sm">
                                <div className="flex flex-col">
                                    <span className="font-medium text-gray-700">{item.member.name}</span>
                                    <span className="text-xs text-gray-400">غائب منذ {item.weeks} اجتماعات</span>
                                </div>
                                <button 
                                    onClick={() => openWhatsApp(item.member.phone)}
                                    className="text-green-600 hover:bg-green-50 p-1.5 rounded-full"
                                >
                                    <PhoneCall size={16} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
      )}

      {/* Announcements Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg mb-8">
        <div className="flex justify-between items-center mb-4">
            <h3 className="font-bold text-lg flex items-center gap-2">
                <Megaphone size={20} className="text-yellow-300" />
                تنبيهات وإعلانات
            </h3>
            <button 
                onClick={() => { setAnnouncementForm({ title: '', body: '', target: 'ALL', scheduleDate: '', scheduleTime: '' }); setShowAnnouncementModal(true); }}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 px-3 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1"
            >
                <Send size={12} /> إرسال جديد
            </button>
        </div>
        
        {/* Pending Notifications List */}
        {scheduledNotifications.length > 0 && (
             <div className="mb-4 bg-white bg-opacity-10 rounded-xl p-3 border border-white border-opacity-20">
                 <h4 className="text-xs font-bold opacity-80 mb-2 flex items-center gap-1"><Timer size={12}/> إشعارات مجدولة</h4>
                 <div className="space-y-2">
                     {scheduledNotifications.map(n => (
                         <div key={n.id} className="flex justify-between items-center bg-black bg-opacity-20 rounded-lg p-2 text-xs">
                             <div>
                                 <div className="font-bold">{n.title}</div>
                                 <div className="opacity-70">{new Date(n.scheduledTime).toLocaleString('ar-EG', { month: 'short', day: 'numeric', hour: 'numeric', minute:'numeric'})}</div>
                             </div>
                             <button onClick={() => handleDeleteNotification(n.id)} className="text-red-300 hover:text-red-100 p-1"><X size={14}/></button>
                         </div>
                     ))}
                 </div>
             </div>
        )}
        
        {announcements.length > 0 ? (
            <div className="space-y-3">
                {announcements.slice(0, 1).map(ann => (
                    <div key={ann.id} className="bg-white bg-opacity-10 p-3 rounded-xl backdrop-blur-sm border border-white border-opacity-10">
                        <div className="flex justify-between items-start mb-1">
                            <h4 className="font-bold text-sm">{ann.title}</h4>
                            <span className="text-[10px] opacity-70">{new Date(ann.timestamp).toLocaleDateString('ar-EG')}</span>
                        </div>
                        <p className="text-xs opacity-90 line-clamp-2">{ann.body}</p>
                        <div className="mt-2 text-[10px] opacity-60 flex gap-2">
                            <span>المستلمين: {ann.recipientCount}</span>
                            <span>الفئة: {ann.targetGroup === 'ALL' ? 'الكل' : ann.targetGroup}</span>
                        </div>
                    </div>
                ))}
            </div>
        ) : (
            <p className="text-xs opacity-60 text-center py-2">لا توجد إعلانات سابقة</p>
        )}
      </div>

      <h2 className="text-xl font-bold text-gray-800 mb-4">تسجيل الحضور</h2>

      {/* Main Action Buttons (Identification Mode) */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <button 
          onClick={() => startIdentification('face')}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition active:scale-95"
        >
          <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center mb-3">
             <ScanFace size={32} className="text-indigo-600" />
          </div>
          <span className="font-bold text-gray-800">بصمة الوجه</span>
          <span className="text-xs text-gray-500 mt-1">تعرف تلقائي</span>
        </button>

        <button 
          onClick={() => startIdentification('fingerprint')}
          className="flex flex-col items-center justify-center p-6 bg-white rounded-2xl shadow-sm border border-purple-100 hover:border-purple-300 hover:shadow-md transition active:scale-95"
        >
          <div className="w-16 h-16 bg-purple-50 rounded-full flex items-center justify-center mb-3">
             <Fingerprint size={32} className="text-purple-600" />
          </div>
          <span className="font-bold text-gray-800">بصمة الإصبع</span>
          <span className="text-xs text-gray-500 mt-1">ماسح البصمة</span>
        </button>
      </div>

      {/* Manual Search Toggle */}
      <div className="mb-4">
        <button 
          onClick={() => setShowManualSearch(!showManualSearch)}
          className="flex items-center gap-2 text-gray-500 text-sm font-medium hover:text-indigo-600 transition"
        >
          <ChevronDown size={16} className={`transform transition ${showManualSearch ? 'rotate-180' : ''}`} />
          تسجيل يدوي / بحث
        </button>
      </div>

      {/* Manual Search Section */}
      {showManualSearch && (
        <div className="animate-fade-in-down">
          <div className="relative mb-4">
            <input
              type="text"
              placeholder="ابحث بالاسم..."
              className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
          </div>

          <div className="space-y-3">
            {searchTerm && filteredMembers.map(member => {
              const isAttended = todayAttendance.some(a => a.memberId === member.id);
              return (
                <button
                  key={member.id}
                  disabled={isAttended}
                  onClick={() => handleMemberSelect(member)}
                  className={`w-full text-right p-3 rounded-xl flex items-center justify-between border ${isAttended ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100 shadow-sm hover:border-indigo-300'}`}
                >
                  <div className="flex items-center gap-3">
                     <div className="w-10 h-10 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center">
                       {member.photoUrl ? (
                         <img src={member.photoUrl} alt="" className="w-full h-full object-cover" />
                       ) : (
                         <User size={20} className="text-gray-400" />
                       )}
                     </div>
                     <span className="font-semibold text-gray-800">{member.name}</span>
                  </div>
                  {isAttended ? (
                    <span className="text-green-600 text-sm flex items-center gap-1"><CheckCircle size={16}/> مسجل</span>
                  ) : (
                    <span className="text-indigo-600 text-sm">تسجيل</span>
                  )}
                </button>
              )
            })}
             {searchTerm && filteredMembers.length === 0 && (
              <p className="text-center text-gray-400 py-2 text-sm">لا يوجد نتائج</p>
            )}
          </div>
        </div>
      )}

      {/* Action Sheet for Verification Mode */}
      {selectedMember && !isIdentificationMode && !scannerMode && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end sm:items-center justify-center p-4">
           <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 animate-fade-in-up">
              <div className="flex flex-col items-center mb-6">
                 <div className="w-20 h-20 rounded-full bg-gray-100 overflow-hidden mb-3 border-4 border-indigo-50">
                    {selectedMember.photoUrl ? (
                      <img src={selectedMember.photoUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <User size={32} className="text-gray-400" />
                    )}
                 </div>
                 <h3 className="text-center text-xl font-bold text-gray-900">{selectedMember.name}</h3>
                 <p className="text-center text-gray-500 text-sm">تأكيد الحضور</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <button 
                  onClick={() => { setScannerMode('face'); setIsIdentificationMode(false); setSelectedMember(selectedMember); }}
                  className="p-4 bg-indigo-50 rounded-xl hover:bg-indigo-100 text-indigo-700 font-bold text-sm flex flex-col items-center gap-2"
                >
                  <ScanFace size={24} />
                  بصمة الوجه
                </button>
                <button 
                  onClick={() => { setScannerMode('fingerprint'); setIsIdentificationMode(false); setSelectedMember(selectedMember); }}
                  className="p-4 bg-purple-50 rounded-xl hover:bg-purple-100 text-purple-700 font-bold text-sm flex flex-col items-center gap-2"
                >
                  <Fingerprint size={24} />
                  بصمة الإصبع
                </button>
              </div>
              <button 
                onClick={() => setSelectedMember(null)}
                className="w-full mt-4 py-3 text-gray-500 hover:bg-gray-50 rounded-lg font-medium"
              >
                إلغاء
              </button>
           </div>
        </div>
      )}

      {/* Agenda Edit Modal */}
      {isAgendaModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                  <div className="p-4 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                      <div className="flex flex-col">
                         <h3 className="font-bold text-gray-800">تعديل جدول الاجتماع</h3>
                         <span className="text-xs text-indigo-600">{selectedDate.toLocaleDateString('ar-EG')}</span>
                      </div>
                      <button onClick={() => setIsAgendaModalOpen(false)}><X size={20} className="text-gray-400"/></button>
                  </div>
                  
                  {/* Add New Segment Form */}
                  <div className="p-4 bg-indigo-50 border-b border-indigo-100">
                      <form onSubmit={handleAddSegment} className="space-y-2">
                          <input 
                              required
                              placeholder="اسم الفقرة (مثل: ترانيم)"
                              className="w-full p-2 rounded-lg border border-indigo-200 text-sm"
                              value={newSegment.title}
                              onChange={e => setNewSegment({...newSegment, title: e.target.value})}
                          />
                          <div className="flex gap-2">
                              <input 
                                  required
                                  type="time"
                                  className="w-1/2 p-2 rounded-lg border border-indigo-200 text-sm"
                                  value={newSegment.startTime}
                                  onChange={e => setNewSegment({...newSegment, startTime: e.target.value})}
                              />
                              <input 
                                  required
                                  type="time"
                                  className="w-1/2 p-2 rounded-lg border border-indigo-200 text-sm"
                                  value={newSegment.endTime}
                                  onChange={e => setNewSegment({...newSegment, endTime: e.target.value})}
                              />
                          </div>
                          
                          {/* Icon Selection */}
                          <div>
                             <label className="text-xs text-gray-500 block mb-1">اختر أيقونة</label>
                             <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                                {ICON_OPTIONS.map(opt => {
                                   const Icon = opt.icon;
                                   const isSelected = newSegment.icon === opt.id;
                                   return (
                                       <button
                                          key={opt.id}
                                          type="button"
                                          onClick={() => setNewSegment({...newSegment, icon: opt.id})}
                                          className={`flex flex-col items-center min-w-[3rem] p-2 rounded-lg border transition ${isSelected ? 'bg-indigo-100 border-indigo-400 text-indigo-700' : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'}`}
                                       >
                                           <Icon size={18} />
                                           <span className="text-[10px] mt-1">{opt.label}</span>
                                       </button>
                                   )
                                })}
                             </div>
                          </div>

                          <input 
                              placeholder="اسم الخادم (اختياري)"
                              className="w-full p-2 rounded-lg border border-indigo-200 text-sm"
                              value={newSegment.servantName}
                              onChange={e => setNewSegment({...newSegment, servantName: e.target.value})}
                          />
                           <input 
                              placeholder="ملاحظات (اختياري)"
                              className="w-full p-2 rounded-lg border border-indigo-200 text-sm"
                              value={newSegment.notes}
                              onChange={e => setNewSegment({...newSegment, notes: e.target.value})}
                          />
                          <button type="submit" className="w-full bg-indigo-600 text-white p-2 rounded-lg font-bold text-sm flex items-center justify-center gap-1 hover:bg-indigo-700">
                              <Plus size={16}/> إضافة فقرة
                          </button>
                      </form>
                  </div>

                  {/* List of Segments */}
                  <div className="flex-1 overflow-y-auto p-4 space-y-2">
                      {agenda.map(item => {
                          const IconComponent = item.icon && SEGMENT_ICONS[item.icon] ? SEGMENT_ICONS[item.icon] : SEGMENT_ICONS['default'];
                          return (
                              <div key={item.id} className="bg-white border border-gray-200 p-3 rounded-xl flex items-center justify-between">
                                  <div className="flex items-center gap-3">
                                      <div className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500">
                                          <IconComponent size={16} />
                                      </div>
                                      <div>
                                          <div className="font-bold text-gray-800 text-sm">{item.title}</div>
                                          <div className="text-xs text-gray-500 font-mono mt-0.5">{item.startTime} - {item.endTime}</div>
                                          {item.servantName && <div className="text-xs text-indigo-600 mt-1">{item.servantName}</div>}
                                      </div>
                                  </div>
                                  <button onClick={() => handleDeleteSegment(item.id)} className="text-red-400 hover:text-red-600 p-2">
                                      <Trash2 size={16}/>
                                  </button>
                              </div>
                          )
                      })}
                      {agenda.length === 0 && <p className="text-center text-xs text-gray-400 py-4">لا توجد فقرات لهذا اليوم</p>}
                  </div>
              </div>
          </div>
      )}

      {/* Create Announcement Modal */}
      {showAnnouncementModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
            <div className="bg-white rounded-2xl w-full max-w-md animate-fade-in-up">
                <div className="p-4 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="font-bold text-gray-800">إنشاء إعلان جديد</h3>
                    <button onClick={() => setShowAnnouncementModal(false)}><X size={20} className="text-gray-400"/></button>
                </div>
                <div className="p-4 space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">عنوان الإعلان</label>
                        <input 
                            value={announcementForm.title}
                            onChange={e => setAnnouncementForm({...announcementForm, title: e.target.value})}
                            className="w-full p-2 border rounded-lg"
                            placeholder="مثال: موعد الرحلة القادمة"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">الفئة المستهدفة</label>
                        <select 
                            value={announcementForm.target}
                            onChange={e => setAnnouncementForm({...announcementForm, target: e.target.value})}
                            className="w-full p-2 border rounded-lg"
                        >
                            <option value="ALL">جميع المخدومين</option>
                            <option value="ABSENT">الغائبين اليوم</option>
                            <option value="الأولى">الفرقة الأولى</option>
                            <option value="الثانية">الفرقة الثانية</option>
                            <option value="الثالثة">الفرقة الثالثة</option>
                            <option value="الرابعة">الفرقة الرابعة</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">نص الرسالة</label>
                        <textarea 
                            value={announcementForm.body}
                            onChange={e => setAnnouncementForm({...announcementForm, body: e.target.value})}
                            className="w-full p-2 border rounded-lg h-24"
                            placeholder="اكتب تفاصيل الإعلان هنا..."
                        />
                    </div>
                    
                    {/* Schedule Section */}
                    <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-100">
                        <label className="block text-xs font-bold text-indigo-800 mb-2 flex items-center gap-1">
                            <Clock size={12}/> جدولة الإرسال (اختياري)
                        </label>
                        <div className="flex gap-2">
                            <input 
                                type="date"
                                className="flex-1 p-2 text-sm border rounded-lg"
                                value={announcementForm.scheduleDate}
                                onChange={e => setAnnouncementForm({...announcementForm, scheduleDate: e.target.value})}
                            />
                            <input 
                                type="time"
                                className="flex-1 p-2 text-sm border rounded-lg"
                                value={announcementForm.scheduleTime}
                                onChange={e => setAnnouncementForm({...announcementForm, scheduleTime: e.target.value})}
                            />
                        </div>
                        <p className="text-[10px] text-gray-500 mt-1">اترك الحقول فارغة للإرسال الفوري</p>
                    </div>

                    <button 
                        onClick={handleAnnouncementSubmit}
                        className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 flex justify-center items-center gap-2"
                    >
                        {(announcementForm.scheduleDate && announcementForm.scheduleTime) ? (
                            <><Timer size={18} /> جدولة الإشعار</>
                        ) : (
                            <><Send size={18} /> بدء الإرسال</>
                        )}
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Broadcast Queue Modal */}
      {broadcastQueue.length > 0 && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black bg-opacity-90 p-4">
              <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl">
                  <div className="bg-indigo-600 p-4 text-white text-center">
                      <h3 className="font-bold">جاري الإرسال</h3>
                      <div className="text-indigo-200 text-xs mt-1">
                          مستلم {currentBroadcastIndex + 1} من {broadcastQueue.length}
                      </div>
                  </div>
                  <div className="p-6 text-center">
                      <div className="w-16 h-16 bg-gray-100 rounded-full mx-auto mb-3 flex items-center justify-center">
                          {broadcastQueue[currentBroadcastIndex].photoUrl ? (
                              <img src={broadcastQueue[currentBroadcastIndex].photoUrl} className="w-full h-full rounded-full object-cover"/>
                          ) : (
                              <User size={32} className="text-gray-400" />
                          )}
                      </div>
                      <h4 className="font-bold text-lg mb-1">{broadcastQueue[currentBroadcastIndex].name}</h4>
                      <div className="text-gray-500 mb-6">{broadcastQueue[currentBroadcastIndex].phone}</div>
                      
                      <button 
                        onClick={sendNextBroadcast}
                        className="w-full bg-green-500 hover:bg-green-600 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 mb-3"
                      >
                          <Send size={20} />
                          إرسال عبر واتساب
                      </button>
                      
                      <div className="flex gap-3">
                          <button 
                            onClick={() => {
                                if (currentBroadcastIndex < broadcastQueue.length - 1) {
                                    setCurrentBroadcastIndex(prev => prev + 1);
                                } else {
                                    setBroadcastQueue([]);
                                }
                            }}
                            className="flex-1 py-3 bg-gray-100 text-gray-600 rounded-xl font-medium"
                          >
                             {currentBroadcastIndex < broadcastQueue.length - 1 ? 'تخطي' : 'إنهاء'}
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
      
      {/* Scanner Overlay */}
      {scannerMode && (
        <Scanner 
          mode={scannerMode}
          onClose={() => setScannerMode(null)}
          onScanComplete={handleVerificationComplete}
          onIdentify={handleIdentificationComplete}
          memberName={selectedMember?.name}
          candidates={candidates}
        />
      )}
    </div>
  );
};
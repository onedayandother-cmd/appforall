import React, { useState, useEffect, useMemo } from 'react';
import { Member, AttendanceRecord } from '../types';
import { getMembers, getAttendance } from '../utils/storage';
import { Trophy, Medal, Crown, Dices, User, Sparkles, Shuffle } from 'lucide-react';
import confetti from 'canvas-confetti';

export const Activities: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [activeTab, setActiveTab] = useState<'leaderboard' | 'picker'>('leaderboard');
  const [leaderboardPeriod, setLeaderboardPeriod] = useState<'month' | 'all'>('month');

  // Random Picker State
  const [pickerResult, setPickerResult] = useState<Member | null>(null);
  const [isSpinning, setIsSpinning] = useState(false);

  useEffect(() => {
    setMembers(getMembers());
    setAttendance(getAttendance());
  }, []);

  // Helper to match Dashboard date logic (Local Time)
  const getLocalDateStr = (date: Date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // --- Leaderboard Logic ---
  const leaderboardData = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Map to store EARNED points (ignoring redemptions)
    const pointsMap: Record<string, number> = {};

    attendance.forEach(record => {
      const recordDate = new Date(record.timestamp);
      
      let shouldInclude = true;
      if (leaderboardPeriod === 'month') {
        shouldInclude = recordDate.getMonth() === currentMonth && recordDate.getFullYear() === currentYear;
      }

      if (shouldInclude) {
        pointsMap[record.memberId] = (pointsMap[record.memberId] || 0) + record.points;
      }
    });

    // Convert to array and sort
    return Object.entries(pointsMap)
      .map(([id, points]) => {
        const member = members.find(m => m.id === id);
        return { member, points };
      })
      .filter(item => item.member) // Filter out deleted members
      .sort((a, b) => b.points - a.points)
      .slice(0, 10); // Top 10
  }, [attendance, members, leaderboardPeriod]);

  // --- Random Picker Logic ---
  const handleRandomPick = () => {
    // Get attendees for TODAY using local date string logic
    const todayStr = getLocalDateStr(new Date());
    
    const todayAttendeesIds = new Set(
        attendance.filter(a => a.dateStr === todayStr).map(a => a.memberId)
    );
    const presentMembers = members.filter(m => todayAttendeesIds.has(m.id));

    if (presentMembers.length === 0) {
      alert("لا يوجد حضور مسجل اليوم لإجراء القرعة!");
      return;
    }

    setIsSpinning(true);
    setPickerResult(null);

    // Simulation effect
    let counter = 0;
    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * presentMembers.length);
      setPickerResult(presentMembers[randomIdx]);
      counter++;
      if (counter > 20) {
        clearInterval(interval);
        setIsSpinning(false);
        fireConfetti();
      }
    }, 100);
  };

  const fireConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#FFD700', '#FFA500', '#FF4500']
    });
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto w-full">
      <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
        <Trophy className="text-yellow-500" />
        الأنشطة والمسابقات
      </h1>

      {/* Tabs */}
      <div className="flex bg-white p-1 rounded-xl shadow-sm border border-gray-100 mb-6">
        <button
          onClick={() => setActiveTab('leaderboard')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'leaderboard' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Crown size={18} /> لوحة الشرف
        </button>
        <button
          onClick={() => setActiveTab('picker')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition flex items-center justify-center gap-2 ${activeTab === 'picker' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-500 hover:bg-gray-50'}`}
        >
          <Dices size={18} /> قرعة عشوائية
        </button>
      </div>

      {/* --- LEADERBOARD TAB --- */}
      {activeTab === 'leaderboard' && (
        <div className="animate-fade-in-up">
           <div className="flex justify-center mb-6">
             <div className="bg-gray-100 p-1 rounded-xl flex text-xs font-bold shadow-inner">
               <button 
                 onClick={() => setLeaderboardPeriod('month')}
                 className={`px-4 py-1.5 rounded-lg transition ${leaderboardPeriod === 'month' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
               >
                 هذا الشهر
               </button>
               <button 
                 onClick={() => setLeaderboardPeriod('all')}
                 className={`px-4 py-1.5 rounded-lg transition ${leaderboardPeriod === 'all' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500'}`}
               >
                 الكل
               </button>
             </div>
           </div>

           <div className="space-y-3">
             {leaderboardData.map((item, index) => {
               const member = item.member;
               if (!member) return null;
               
               const rank = index + 1;
               
               // Default Styles
               let containerClasses = "bg-white border-gray-100";
               let rankDisplay = <span className="font-bold text-gray-400 w-6 text-center text-lg">{rank}</span>;
               let photoBorder = "border-gray-100";
               let textClass = "text-gray-800";
               let badgeColor = "bg-indigo-50 text-indigo-600";

               // Top 3 Styles
               if (rank === 1) {
                 containerClasses = "bg-gradient-to-r from-yellow-50 via-white to-yellow-50 border-yellow-200 shadow-md transform scale-[1.02] z-10";
                 rankDisplay = <Crown size={28} className="text-yellow-500 fill-yellow-500 animate-pulse" />;
                 photoBorder = "border-yellow-400 ring-2 ring-yellow-100";
                 textClass = "text-gray-900";
                 badgeColor = "bg-yellow-100 text-yellow-700";
               } else if (rank === 2) {
                 containerClasses = "bg-gradient-to-r from-slate-50 to-white border-slate-200 shadow-sm";
                 rankDisplay = <Medal size={24} className="text-slate-400 fill-slate-200" />;
                 photoBorder = "border-slate-300 ring-1 ring-slate-100";
                 badgeColor = "bg-slate-100 text-slate-600";
               } else if (rank === 3) {
                 containerClasses = "bg-gradient-to-r from-orange-50 to-white border-orange-200 shadow-sm";
                 rankDisplay = <Medal size={24} className="text-amber-600 fill-amber-100" />;
                 photoBorder = "border-amber-300 ring-1 ring-amber-100";
                 badgeColor = "bg-amber-100 text-amber-700";
               }

               return (
                 <div key={member.id} className={`relative p-3 sm:p-4 rounded-2xl border flex items-center justify-between transition-all duration-200 hover:shadow-md ${containerClasses}`}>
                    <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                       {/* Rank Icon */}
                       <div className="flex items-center justify-center w-8 shrink-0">
                         {rankDisplay}
                       </div>

                       {/* Photo with Badge */}
                       <div className="relative shrink-0">
                           <div className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full p-0.5 bg-white border-2 ${photoBorder} shadow-sm overflow-hidden`}>
                              {member.photoUrl ? (
                                <img src={member.photoUrl} className="w-full h-full rounded-full object-cover" />
                              ) : (
                                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-400">
                                   <User size={24} />
                                </div>
                              )}
                           </div>
                           {rank <= 3 && (
                               <div className={`absolute -bottom-1 -right-1 w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center text-[10px] sm:text-xs font-bold text-white border-2 border-white shadow-sm ${rank === 1 ? 'bg-yellow-500' : rank === 2 ? 'bg-slate-400' : 'bg-amber-600'}`}>
                                   {rank}
                               </div>
                           )}
                       </div>
                       
                       {/* Details */}
                       <div className="min-w-0 flex-1">
                         <h3 className={`font-bold truncate ${textClass} text-sm sm:text-base`}>{member.name}</h3>
                         <div className="text-xs text-gray-500 flex items-center gap-1.5 mt-0.5">
                            <span className="truncate opacity-80">{member.year}</span>
                            {member.college && (
                                <>
                                  <span className="w-1 h-1 rounded-full bg-gray-300 shrink-0"></span>
                                  <span className="truncate opacity-80">{member.college}</span>
                                </>
                            )}
                         </div>
                       </div>
                    </div>
                    
                    {/* Points Badge */}
                    <div className={`flex flex-col items-center justify-center px-3 py-1.5 rounded-xl ml-2 shrink-0 ${badgeColor}`}>
                       <div className="text-lg sm:text-xl font-bold leading-none">{item.points}</div>
                       <div className="text-[9px] sm:text-[10px] font-medium opacity-80 mt-0.5">نقطة</div>
                    </div>
                 </div>
               );
             })}

             {leaderboardData.length === 0 && (
               <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                 <Trophy size={48} className="mx-auto mb-2 opacity-20" />
                 لا توجد بيانات للنقاط في هذه الفترة
               </div>
             )}
           </div>
        </div>
      )}

      {/* --- RANDOM PICKER TAB --- */}
      {activeTab === 'picker' && (
        <div className="animate-fade-in-up flex flex-col items-center py-8">
           <div className={`w-48 h-48 rounded-full flex items-center justify-center mb-8 border-8 shadow-xl transition-all duration-100 ${isSpinning ? 'border-indigo-400 scale-105' : 'border-gray-200 bg-white'}`}>
              {pickerResult ? (
                 <div className="flex flex-col items-center">
                    <div className="w-24 h-24 rounded-full overflow-hidden mb-2 bg-gray-100 border-4 border-white shadow-sm">
                       {pickerResult.photoUrl ? (
                         <img src={pickerResult.photoUrl} className="w-full h-full object-cover" />
                       ) : (
                         <User size={48} className="text-gray-400 m-auto mt-4" />
                       )}
                    </div>
                    <h3 className="font-bold text-gray-800 text-center text-sm px-2 line-clamp-1">{pickerResult.name}</h3>
                 </div>
              ) : (
                 <div className="text-center text-gray-300">
                    <Shuffle size={48} className="mx-auto mb-2" />
                    <span className="text-xs font-bold">اضغط للبدء</span>
                 </div>
              )}
           </div>

           <button 
             onClick={handleRandomPick}
             disabled={isSpinning}
             className="bg-indigo-600 text-white px-8 py-4 rounded-2xl font-bold text-lg shadow-lg hover:bg-indigo-700 active:scale-95 disabled:opacity-50 transition flex items-center gap-2"
           >
             {isSpinning ? (
               <>جاري الاختيار...</>
             ) : (
               <><Sparkles size={24} /> اختيار عشوائي</>
             )}
           </button>
           
           <p className="text-xs text-gray-500 mt-6 text-center max-w-xs">
             * يتم الاختيار عشوائياً من قائمة الحضور المسجلين اليوم فقط.
           </p>
        </div>
      )}

    </div>
  );
};
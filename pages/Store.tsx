import React, { useState, useEffect, useMemo } from 'react';
import { Member, RedemptionRecord, GiftItem, AttendanceRecord } from '../types';
import { getMembers, saveRedemption, getRedemptions, getCurrentUser, deleteRedemption, getGifts, saveGift, deleteGift, getAttendance } from '../utils/storage';
import { ShoppingBag, Search, Gift, MinusCircle, User, History, Trash2, X, AlertTriangle, Settings, Plus, Tag } from 'lucide-react';

export const Store: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  const [gifts, setGifts] = useState<GiftItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  
  // Redemption Form
  const [giftName, setGiftName] = useState('');
  const [pointsCost, setPointsCost] = useState<number | ''>('');
  const [activeTab, setActiveTab] = useState<'redeem' | 'history'>('redeem');

  // Gift Management Form
  const [newGift, setNewGift] = useState({ name: '', cost: '' });

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  useEffect(() => {
    refreshData();
  }, []);

  const refreshData = () => {
    setMembers(getMembers());
    setRedemptions(getRedemptions());
    setGifts(getGifts());
    setAttendance(getAttendance());
  };

  const memberBalances = useMemo(() => {
    // Calculate totals in a single pass for performance
    const earnedMap: Record<string, number> = {};
    attendance.forEach(a => {
        earnedMap[a.memberId] = (earnedMap[a.memberId] || 0) + a.points;
    });

    const spentMap: Record<string, number> = {};
    redemptions.forEach(r => {
        spentMap[r.memberId] = (spentMap[r.memberId] || 0) + r.pointsCost;
    });

    const balances: Record<string, { earned: number, spent: number, current: number }> = {};
    members.forEach(m => {
        const earned = earnedMap[m.id] || 0;
        const spent = spentMap[m.id] || 0;
        balances[m.id] = { earned, spent, current: earned - spent };
    });
    return balances;
  }, [members, redemptions, attendance]);

  const sortedMembers = useMemo(() => {
    return members.filter(m => 
        m.name.includes(searchTerm) || m.phone.includes(searchTerm)
    ).sort((a, b) => {
        const balanceA = memberBalances[a.id]?.current || 0;
        const balanceB = memberBalances[b.id]?.current || 0;
        return balanceB - balanceA; // Highest balance first
    });
  }, [members, searchTerm, memberBalances]);

  const handleSelectMember = (member: Member) => {
    setSelectedMember(member);
    setIsModalOpen(true);
    setGiftName('');
    setPointsCost('');
    setActiveTab('redeem');
  };

  const handleRedeem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !giftName || !pointsCost) return;

    const cost = Number(pointsCost);

    if (cost <= 0) {
        alert("يجب أن تكون التكلفة أكبر من صفر");
        return;
    }

    const balance = memberBalances[selectedMember.id].current;

    if (cost > balance) {
        alert("رصيد النقاط غير كافي!");
        return;
    }

    const record: RedemptionRecord = {
        id: Date.now().toString(),
        memberId: selectedMember.id,
        giftName,
        pointsCost: cost,
        timestamp: Date.now(),
        servantName: getCurrentUser()?.name || 'مسؤول'
    };

    saveRedemption(record);
    
    // Reset/Close
    setGiftName('');
    setPointsCost('');
    refreshData(); // Refresh to update balance
    alert("تم خصم النقاط بنجاح");
  };

  const handleDeleteRedemption = (id: string) => {
      if(confirm('هل أنت متأكد من حذف هذه العملية؟ سيتم استرجاع النقاط تلقائياً لرصيد المخدوم.')) {
          deleteRedemption(id);
          refreshData();
      }
  };

  // Gift Management Handlers
  const handleAddGift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGift.name || !newGift.cost) return;

    saveGift({
        id: Date.now().toString(),
        name: newGift.name,
        cost: Number(newGift.cost)
    });
    setNewGift({ name: '', cost: '' });
    refreshData();
  };

  const handleDeleteGift = (id: string) => {
      if(confirm('هل أنت متأكد من حذف هذه الهدية من القائمة؟')) {
          deleteGift(id);
          refreshData();
      }
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <div className="bg-yellow-100 p-2 rounded-full text-yellow-600">
                <ShoppingBag size={28} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-gray-800">متجر النقاط</h1>
                <p className="text-sm text-gray-500">استبدال النقاط بالهدايا</p>
            </div>
        </div>
        {isAdmin && (
            <button 
                onClick={() => setIsManageModalOpen(true)}
                className="bg-white border border-gray-200 text-gray-600 p-2 rounded-xl shadow-sm hover:bg-gray-50 hover:text-indigo-600 transition flex items-center gap-2"
            >
                <Settings size={20} />
                <span className="hidden sm:inline text-sm font-bold">إدارة الهدايا</span>
            </button>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <input
          type="text"
          placeholder="ابحث عن مخدوم..."
          className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-yellow-500 focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
      </div>

      {/* Members List */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {sortedMembers.map(member => {
            const balance = memberBalances[member.id] || { current: 0 };
            return (
                <button
                    key={member.id}
                    onClick={() => handleSelectMember(member)}
                    className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm hover:border-yellow-400 transition flex items-center justify-between text-right group"
                >
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center overflow-hidden border-2 border-transparent group-hover:border-yellow-200">
                            {member.photoUrl ? (
                                <img src={member.photoUrl} className="w-full h-full object-cover" />
                            ) : (
                                <User size={24} className="text-gray-400" />
                            )}
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800 group-hover:text-yellow-700 transition">{member.name}</h3>
                            <div className="text-xs text-gray-500">{member.year}</div>
                        </div>
                    </div>
                    <div className="text-center">
                        <div className="text-xl font-bold text-yellow-600">{balance.current}</div>
                        <div className="text-[10px] text-gray-400">نقطة</div>
                    </div>
                </button>
            )
        })}
        {sortedMembers.length === 0 && (
            <div className="col-span-full text-center py-10 text-gray-400">
                لا يوجد مخدومين بهذا الاسم
            </div>
        )}
      </div>

      {/* Manage Gifts Modal */}
      {isManageModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                  <div className="p-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800 flex items-center gap-2">
                          <Gift size={20} className="text-indigo-600" />
                          إدارة قائمة الهدايا
                      </h3>
                      <button onClick={() => setIsManageModalOpen(false)}><X size={20} className="text-gray-400 hover:text-red-500" /></button>
                  </div>
                  
                  <div className="p-4 bg-white border-b border-gray-100">
                      <form onSubmit={handleAddGift} className="flex gap-2">
                          <input 
                            required
                            placeholder="اسم الهدية"
                            value={newGift.name}
                            onChange={e => setNewGift({...newGift, name: e.target.value})}
                            className="flex-grow p-2 border rounded-lg text-sm"
                          />
                          <input 
                            required
                            type="number"
                            placeholder="النقاط"
                            value={newGift.cost}
                            onChange={e => setNewGift({...newGift, cost: e.target.value})}
                            className="w-20 p-2 border rounded-lg text-sm"
                          />
                          <button type="submit" className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700">
                              <Plus size={20} />
                          </button>
                      </form>
                  </div>

                  <div className="flex-1 overflow-y-auto p-4 space-y-2 bg-gray-50">
                      {gifts.length > 0 ? (
                          gifts.map(gift => (
                              <div key={gift.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center shadow-sm">
                                  <div className="flex items-center gap-2">
                                      <Tag size={16} className="text-gray-400" />
                                      <span className="font-bold text-gray-700">{gift.name}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                      <span className="bg-yellow-100 text-yellow-700 px-2 py-1 rounded text-xs font-bold">{gift.cost} نقطة</span>
                                      <button onClick={() => handleDeleteGift(gift.id)} className="text-gray-400 hover:text-red-500">
                                          <Trash2 size={16} />
                                      </button>
                                  </div>
                              </div>
                          ))
                      ) : (
                          <div className="text-center text-gray-400 py-8">لا توجد هدايا مسجلة</div>
                      )}
                  </div>
              </div>
          </div>
      )}

      {/* Redeem Modal */}
      {isModalOpen && selectedMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
              <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-yellow-500 to-orange-500 p-6 text-white text-center relative">
                      <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 text-white/80 hover:text-white bg-white/10 rounded-full p-1"><X size={20}/></button>
                      
                      <div className="w-20 h-20 bg-white rounded-full mx-auto mb-3 p-1 shadow-lg">
                          {selectedMember.photoUrl ? (
                              <img src={selectedMember.photoUrl} className="w-full h-full rounded-full object-cover" />
                          ) : (
                              <div className="w-full h-full rounded-full bg-gray-100 flex items-center justify-center text-gray-400"><User size={32}/></div>
                          )}
                      </div>
                      <h2 className="font-bold text-xl">{selectedMember.name}</h2>
                      <div className="inline-block bg-black/20 px-3 py-1 rounded-full text-sm mt-2 backdrop-blur-sm">
                          الرصيد الحالي: <span className="font-bold text-yellow-200 text-lg">{memberBalances[selectedMember.id]?.current || 0}</span>
                      </div>
                  </div>

                  {/* Tabs */}
                  <div className="flex border-b border-gray-100">
                      <button 
                        onClick={() => setActiveTab('redeem')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'redeem' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-400'}`}
                      >
                          <Gift size={16} className="inline mx-1"/> صرف هدية
                      </button>
                      <button 
                        onClick={() => setActiveTab('history')}
                        className={`flex-1 py-3 text-sm font-bold border-b-2 transition ${activeTab === 'history' ? 'border-yellow-500 text-yellow-600' : 'border-transparent text-gray-400'}`}
                      >
                          <History size={16} className="inline mx-1"/> السجل
                      </button>
                  </div>

                  {/* Content */}
                  <div className="p-6 overflow-y-auto flex-1 bg-gray-50">
                      {activeTab === 'redeem' ? (
                          <form onSubmit={handleRedeem} className="space-y-4">
                               {/* Dynamic Presets */}
                               <div className="mb-4">
                                   <label className="block text-xs font-bold text-gray-500 mb-2">هدايا سريعة:</label>
                                   <div className="flex flex-wrap gap-2">
                                       {gifts.map(p => (
                                           <button
                                              key={p.id}
                                              type="button"
                                              onClick={() => { setGiftName(p.name); setPointsCost(p.cost); }}
                                              className="px-3 py-1.5 bg-white border border-gray-200 rounded-lg text-xs hover:border-yellow-400 hover:bg-yellow-50 transition"
                                           >
                                               {p.name} ({p.cost})
                                           </button>
                                       ))}
                                       {gifts.length === 0 && <span className="text-xs text-gray-400">لا توجد هدايا مضافة</span>}
                                   </div>
                               </div>

                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم الهدية / السبب</label>
                                  <input 
                                    required 
                                    value={giftName}
                                    onChange={e => setGiftName(e.target.value)}
                                    className="w-full p-3 border rounded-xl"
                                    placeholder="مثال: نوت بوك"
                                  />
                              </div>
                              <div>
                                  <label className="block text-sm font-medium text-gray-700 mb-1">تكلفتها بالنقاط</label>
                                  <input 
                                    required 
                                    type="number"
                                    min="1"
                                    value={pointsCost}
                                    onChange={e => setPointsCost(Number(e.target.value))}
                                    className="w-full p-3 border rounded-xl"
                                    placeholder="0"
                                  />
                              </div>

                              <button 
                                type="submit" 
                                className="w-full bg-yellow-500 text-white py-3 rounded-xl font-bold hover:bg-yellow-600 shadow-lg shadow-yellow-200 transition flex items-center justify-center gap-2 mt-4"
                              >
                                  <MinusCircle size={20} />
                                  تأكيد الخصم
                              </button>
                          </form>
                      ) : (
                          <div className="space-y-3">
                              {redemptions.filter(r => r.memberId === selectedMember.id).length > 0 ? (
                                  redemptions
                                  .filter(r => r.memberId === selectedMember.id)
                                  .sort((a,b) => b.timestamp - a.timestamp)
                                  .map(r => (
                                      <div key={r.id} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                                          <div>
                                              <div className="font-bold text-gray-800">{r.giftName}</div>
                                              <div className="text-xs text-gray-400 flex gap-2">
                                                  <span>{new Date(r.timestamp).toLocaleDateString('ar-EG')}</span>
                                                  <span>• بواسطة: {r.servantName || 'غير معروف'}</span>
                                              </div>
                                          </div>
                                          <div className="flex items-center gap-3">
                                              <span className="text-red-500 font-bold">-{r.pointsCost}</span>
                                              <button onClick={() => handleDeleteRedemption(r.id)} className="text-gray-300 hover:text-red-500">
                                                  <Trash2 size={16} />
                                              </button>
                                          </div>
                                      </div>
                                  ))
                              ) : (
                                  <div className="text-center py-8 text-gray-400">
                                      <AlertTriangle size={32} className="mx-auto mb-2 opacity-50"/>
                                      لم يتم صرف أي نقاط بعد
                                  </div>
                              )}
                          </div>
                      )}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};
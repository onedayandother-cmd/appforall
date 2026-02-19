import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Member, User, AttendanceRecord, RedemptionRecord } from '../types';
import { getMembers, saveMember, deleteMember, getUsers, getCurrentUser, getAttendance, getRedemptions } from '../utils/storage';
import { Plus, Search, Trash2, User as UserIcon, Edit2, GraduationCap, Phone, Camera, Image as ImageIcon, ScanFace, Fingerprint, CheckCircle, X, MessageCircle, CheckSquare, Square, Send, Copy, Power, PowerOff, CreditCard, QrCode, Users, Printer, RefreshCcw, Award, Loader2 } from 'lucide-react';
import { CHURCH_NAME, APP_NAME } from '../constants';
import QRCode from 'react-qr-code';

export const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [users, setUsers] = useState<User[]>([]); // List of servants
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [redemptions, setRedemptions] = useState<RedemptionRecord[]>([]);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  // Messaging & Selection State
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isMsgModalOpen, setIsMsgModalOpen] = useState(false);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false); // Bulk Assign Modal
  const [selectedServantForBulk, setSelectedServantForBulk] = useState('');
  const [messageText, setMessageText] = useState('');

  // ID Card State
  const [viewCardMember, setViewCardMember] = useState<Member | null>(null);

  // Biometric Recording State
  const [recordingMode, setRecordingMode] = useState<'face' | 'fingerprint' | null>(null);
  const [recordingProgress, setRecordingProgress] = useState(0);
  const [scanStatus, setScanStatus] = useState<'scanning' | 'success'>('scanning'); // New state for UX
  const [scanningMemberId, setScanningMemberId] = useState<string | null>(null); 
  const videoRef = useRef<HTMLVideoElement>(null);

  const [formData, setFormData] = useState<Partial<Member>>({
    name: '', dob: '', phone: '', address: '', college: '', year: '', confessionFather: '', photoUrl: '', hasFaceId: false, fingerprintCount: 0, responsibleServant: ''
  });

  useEffect(() => {
    refreshMembers();
    setUsers(getUsers());
    setAttendance(getAttendance());
    setRedemptions(getRedemptions());
  }, []);

  const refreshMembers = () => {
    setMembers(getMembers());
  };

  const memberBalances = useMemo(() => {
    const balances: Record<string, number> = {};
    // Initialize with 0
    members.forEach(m => balances[m.id] = 0);
    
    // Add earned points
    attendance.forEach(a => {
        if (balances[a.memberId] !== undefined) {
            balances[a.memberId] += a.points;
        }
    });
    
    // Subtract spent points
    redemptions.forEach(r => {
        if (balances[r.memberId] !== undefined) {
            balances[r.memberId] -= r.pointsCost;
        }
    });
    
    return balances;
  }, [members, attendance, redemptions]);

  // Biometric Recording Logic
  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    let stream: MediaStream | null = null;

    if (recordingMode) {
      setRecordingProgress(0);
      setScanStatus('scanning');
      
      if (recordingMode === 'face') {
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } })
          .then(s => {
            stream = s;
            if (videoRef.current) videoRef.current.srcObject = stream;
          })
          .catch(err => console.error("Camera error", err));
      }

      interval = setInterval(() => {
        setRecordingProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setScanStatus('success'); // Show success state

            // Delay saving to show success animation
            setTimeout(() => {
              if (scanningMemberId) {
                // Update existing member via list
                const currentMembers = getMembers();
                const memberIndex = currentMembers.findIndex(m => m.id === scanningMemberId);
                if (memberIndex >= 0) {
                   const member = currentMembers[memberIndex];
                   const updatedMember = { ...member };
                   if (recordingMode === 'face') {
                       updatedMember.hasFaceId = true;
                   } else if (recordingMode === 'fingerprint') {
                       // Increment fingerprint count
                       updatedMember.fingerprintCount = (updatedMember.fingerprintCount || 0) + 1;
                   }
                   saveMember(updatedMember);
                   refreshMembers();
                }
              } else {
                // Update form data (new/edit modal)
                if (recordingMode === 'face') {
                    setFormData(prev => ({ ...prev, hasFaceId: true }));
                } else if (recordingMode === 'fingerprint') {
                    setFormData(prev => ({ ...prev, fingerprintCount: (prev.fingerprintCount || 0) + 1 }));
                }
              }
              
              if (stream) stream.getTracks().forEach(t => t.stop());
              setRecordingMode(null);
              setScanningMemberId(null);
            }, 1200); // 1.2s delay for success message
            
            return 100;
          }
          // Slightly random progress for realism
          return prev + Math.random() * 3 + 1; 
        });
      }, 50);
    }

    return () => {
      clearInterval(interval);
      if (stream) stream.getTracks().forEach(t => t.stop());
    };
  }, [recordingMode, scanningMemberId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;

    const newMember: Member = {
      id: editingId || Date.now().toString(),
      name: formData.name,
      dob: formData.dob || '',
      phone: formData.phone || '',
      address: formData.address || '',
      college: formData.college || '',
      year: formData.year || '',
      confessionFather: formData.confessionFather || '',
      responsibleServant: formData.responsibleServant || '',
      photoUrl: formData.photoUrl,
      hasFaceId: formData.hasFaceId || false,
      fingerprintCount: formData.fingerprintCount || 0,
    };

    saveMember(newMember);
    setIsModalOpen(false);
    setEditingId(null);
    setFormData({});
    refreshMembers();
  };

  const handleEdit = (member: Member) => {
    setFormData(member);
    setEditingId(member.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا المخدوم؟')) {
      deleteMember(id);
      refreshMembers();
    }
  };

  const toggleBiometric = (member: Member, type: 'face') => {
    const updatedMember = { ...member };
    if (type === 'face') {
      updatedMember.hasFaceId = !member.hasFaceId;
    }
    saveMember(updatedMember);
    refreshMembers();
  };

  const handleResetFingerprints = (member: Member) => {
      if(confirm('هل أنت متأكد من حذف جميع البصمات المسجلة لهذا المخدوم؟')) {
          const updatedMember = { ...member, fingerprintCount: 0 };
          saveMember(updatedMember);
          refreshMembers();
      }
  };

  const clearFormFingerprints = () => {
      if(confirm('هل أنت متأكد من حذف البصمات؟')) {
          setFormData(prev => ({ ...prev, fingerprintCount: 0 }));
      }
  };

  const openNewModal = () => {
    setEditingId(null);
    setFormData({
      name: '', dob: '', phone: '', address: '', college: '', year: '', confessionFather: '', responsibleServant: '', photoUrl: '', hasFaceId: false, fingerprintCount: 0
    });
    setIsModalOpen(true);
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const img = new Image();
        img.src = reader.result as string;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const maxWidth = 300;
          const scale = maxWidth / img.width;
          const width = maxWidth;
          const height = img.height * scale;

          canvas.width = width;
          canvas.height = height;
          ctx?.drawImage(img, 0, 0, width, height);
          
          const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
          setFormData(prev => ({ ...prev, photoUrl: compressedBase64 }));
        };
      };
      reader.readAsDataURL(file);
    }
  };

  // --- Print Card Logic ---
  const handlePrintCard = () => {
    if (!viewCardMember) return;

    const printWindow = window.open('', '_blank', 'width=450,height=700');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html dir="rtl">
      <head>
        <meta charset="UTF-8">
        <title>ID Card - ${viewCardMember.name}</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
        <style>
          body { font-family: 'Cairo', sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          @media print {
            .no-print { display: none; }
          }
        </style>
      </head>
      <body class="bg-gray-100 flex items-center justify-center min-h-screen">
        <div class="bg-white rounded-3xl w-full max-w-[350px] overflow-hidden shadow-none border border-gray-300">
          <!-- Card Header -->
          <div class="h-32 bg-indigo-700 relative">
              <div class="absolute inset-0 opacity-20" style="background-image: url('https://www.transparenttextures.com/patterns/cubes.png')"></div>
              <div class="absolute top-4 right-4 text-white text-right">
                <div class="font-bold text-xs">${CHURCH_NAME}</div>
                <div class="font-light text-[10px]">${APP_NAME}</div>
              </div>
          </div>
          
          <!-- Profile Image -->
          <div class="relative -mt-14 mb-4 flex justify-center">
              <div class="w-28 h-28 rounded-full border-4 border-white shadow-sm overflow-hidden bg-white">
                  ${viewCardMember.photoUrl ? 
                    `<img src="${viewCardMember.photoUrl}" class="w-full h-full object-cover" />` : 
                    `<div class="w-full h-full flex items-center justify-center text-gray-300 bg-gray-100">
                       <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
                     </div>`
                  }
              </div>
          </div>

          <!-- Content -->
          <div class="pb-6 px-6 text-center">
              <h2 class="text-2xl font-bold text-gray-800 mb-1">${viewCardMember.name}</h2>
              <p class="text-indigo-600 font-medium text-sm mb-4">${viewCardMember.year}</p>

              <div class="grid grid-cols-2 gap-4 mb-6 text-right text-sm bg-gray-50 p-3 rounded-xl border border-gray-100">
                  <div>
                      <div class="text-gray-400 text-xs">الكلية</div>
                      <div class="font-bold text-gray-700">${viewCardMember.college}</div>
                  </div>
                  <div>
                      <div class="text-gray-400 text-xs">رقم الموبايل</div>
                      <div class="font-bold text-gray-700" dir="ltr">${viewCardMember.phone}</div>
                  </div>
              </div>

              <!-- QR Code -->
              <div class="flex flex-col items-center justify-center">
                  <div id="qrcode-container" class="bg-white p-2 rounded-xl border border-gray-200 mb-2">
                     <!-- QR SVG injected here -->
                  </div>
                  <div class="text-[10px] text-gray-400 font-mono tracking-widest">
                      ID: ${viewCardMember.id.substring(0, 8).toUpperCase()}
                  </div>
              </div>
          </div>
        </div>
      </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();

    // Grab SVG from current DOM and inject
    const currentQr = document.getElementById('card-qr-wrapper');
    const svg = currentQr?.querySelector('svg');
    
    if (svg && printWindow.document.getElementById('qrcode-container')) {
        const cloned = svg.cloneNode(true);
        printWindow.document.getElementById('qrcode-container')!.appendChild(cloned);
    }

    // Trigger Print after a slight delay to ensure styles load (mostly Tailwind via CDN)
    setTimeout(() => {
        printWindow.print();
        // printWindow.close(); // Optional: keep open for manual checking
    }, 1000);
  };

  // --- WhatsApp & Selection Logic ---

  const toggleSelection = (id: string) => {
    const newSet = new Set(selectedIds);
    if (newSet.has(id)) {
      newSet.delete(id);
    } else {
      newSet.add(id);
    }
    setSelectedIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === filteredMembers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredMembers.map(m => m.id)));
    }
  };

  const handleBulkAssignServant = () => {
      if (!selectedServantForBulk) return;
      
      const updatedMembers = getMembers();
      selectedIds.forEach(id => {
          const index = updatedMembers.findIndex(m => m.id === id);
          if (index !== -1) {
              updatedMembers[index].responsibleServant = selectedServantForBulk;
          }
      });
      
      // Save all (simulated batch save)
      localStorage.setItem('youssef_seddik_members', JSON.stringify(updatedMembers));
      
      setMembers(updatedMembers);
      setIsAssignModalOpen(false);
      setSelectedIds(new Set());
      setSelectedServantForBulk('');
      alert('تم تعيين الخادم المسؤول بنجاح');
  };

  const formatPhoneForWa = (phone: string) => {
    // Assume Egypt numbers if starts with 01
    let clean = phone.replace(/\D/g, '');
    if (clean.startsWith('01')) {
      return '2' + clean;
    }
    return clean;
  };

  const openWhatsApp = (phone: string, text: string = '') => {
    const formatted = formatPhoneForWa(phone);
    const url = `https://wa.me/${formatted}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  };

  const filteredMembers = members.filter(m => 
    m.name.includes(searchTerm) || m.phone.includes(searchTerm)
  );

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">بيانات المخدومين</h1>
        <button 
          onClick={openNewModal}
          className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="relative mb-4">
        <input
          type="text"
          placeholder="بحث بالاسم أو رقم الهاتف..."
          className="w-full pl-4 pr-10 py-3 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Search className="absolute left-3 top-3.5 text-gray-400" size={20} />
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-20 left-4 right-4 z-30 bg-gray-900 text-white p-4 rounded-xl shadow-2xl flex flex-col sm:flex-row gap-3 items-center justify-between animate-fade-in-up">
          <div className="font-bold flex items-center gap-2">
              <CheckSquare size={20} className="text-indigo-400"/>
              {selectedIds.size} مخدوم محدد
          </div>
          <div className="flex gap-2 w-full sm:w-auto">
             {isAdmin && (
                <button 
                    onClick={() => setIsAssignModalOpen(true)}
                    className="flex-1 sm:flex-none bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold transition text-sm"
                >
                    <Users size={18} />
                    تعيين خادم
                </button>
             )}
            <button 
                onClick={() => setIsMsgModalOpen(true)}
                className="flex-1 sm:flex-none bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 font-bold transition text-sm"
            >
                <MessageCircle size={18} />
                واتساب
            </button>
          </div>
        </div>
      )}

      {/* Select All / List Header */}
      <div className="flex items-center gap-3 mb-2 px-1">
        <button onClick={toggleSelectAll} className="flex items-center gap-2 text-gray-500 text-sm">
          {selectedIds.size === filteredMembers.length && filteredMembers.length > 0 ? (
            <CheckSquare className="text-indigo-600" size={20} />
          ) : (
            <Square size={20} />
          )}
          تحديد الكل
        </button>
      </div>

      <div className="space-y-4">
        {filteredMembers.map((member) => {
          const isSelected = selectedIds.has(member.id);
          // Find servant name
          const responsible = users.find(u => u.username === member.responsibleServant);
          const fpCount = member.fingerprintCount || 0;
          
          return (
            <div key={member.id} className={`bg-white p-4 rounded-xl shadow-sm border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${isSelected ? 'border-indigo-500 ring-1 ring-indigo-500 bg-indigo-50' : 'border-gray-100'}`}>
              <div className="flex items-start gap-4 w-full">
                {/* Checkbox area */}
                <button onClick={() => toggleSelection(member.id)} className="mt-1 sm:mt-0 text-gray-400 hover:text-indigo-600">
                  {isSelected ? <CheckSquare className="text-indigo-600" size={24} /> : <Square size={24} />}
                </button>

                <div className="w-16 h-16 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600 shrink-0 overflow-hidden border border-indigo-100">
                  {member.photoUrl ? (
                    <img src={member.photoUrl} alt={member.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon size={28} />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex justify-between items-start">
                      <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                        {member.name}
                      </h3>
                      <div className="bg-yellow-50 text-yellow-700 px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 border border-yellow-200 shadow-sm whitespace-nowrap ml-2">
                          <Award size={14} className="text-yellow-600" />
                          {(memberBalances[member.id] || 0).toLocaleString()}
                      </div>
                  </div>
                  
                  {responsible && (
                      <div className="text-xs text-indigo-600 font-bold mb-1 flex items-center gap-1">
                          <Users size={12} />
                          مسؤول: {responsible.name}
                      </div>
                  )}
                  
                  {/* Biometric Toggles & Scan Button */}
                  <div className="flex flex-wrap gap-2 my-1.5 items-center">
                     {/* Face ID Toggle */}
                     <button 
                       onClick={(e) => { e.stopPropagation(); toggleBiometric(member, 'face'); }}
                       className={`px-2 py-1 rounded-md border flex items-center gap-1.5 text-[10px] font-bold transition-colors ${member.hasFaceId ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-50 text-gray-400 border-gray-200 hover:bg-gray-100'}`}
                       title="تبديل حالة بصمة الوجه"
                     >
                       <ScanFace size={14} />
                       {member.hasFaceId ? 'مفعل' : 'معطل'}
                     </button>

                     {/* Fingerprint Status Badge */}
                     <div 
                       className={`px-2 py-1 rounded-md border flex items-center gap-1.5 text-[10px] font-bold transition-colors ${fpCount > 0 ? 'bg-purple-50 text-purple-700 border-purple-200' : 'bg-gray-50 text-gray-400 border-gray-200'}`}
                     >
                       <Fingerprint size={14} />
                       {fpCount > 0 ? `${fpCount} بصمات` : 'لا يوجد بصمات'}
                     </div>

                     {/* Add Fingerprint Button */}
                     <button 
                       onClick={(e) => { 
                           e.stopPropagation(); 
                           setScanningMemberId(member.id);
                           setRecordingMode('fingerprint'); 
                       }}
                       className="w-6 h-6 flex items-center justify-center bg-purple-100 text-purple-700 border border-purple-200 rounded-md hover:bg-purple-200 transition"
                       title="إضافة بصمة جديدة"
                     >
                        <Plus size={14} />
                     </button>

                     {/* Reset Fingerprints Button */}
                     {fpCount > 0 && (
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleResetFingerprints(member); }}
                          className="w-6 h-6 flex items-center justify-center bg-red-50 text-red-500 border border-red-100 rounded-md hover:bg-red-100 transition"
                          title="مسح جميع البصمات"
                        >
                            <Trash2 size={12} />
                        </button>
                     )}
                  </div>

                  <div className="text-sm text-gray-500 flex flex-wrap gap-2 mt-1">
                     <span className="flex items-center gap-1"><Phone size={14}/> {member.phone}</span>
                     <span className="flex items-center gap-1"><GraduationCap size={14}/> {member.college}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-2 border-t sm:border-t-0 pt-3 sm:pt-0 mt-2 sm:mt-0 border-gray-100">
                <button 
                  onClick={() => setViewCardMember(member)}
                  className="p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition"
                  title="عرض الكارنيه"
                >
                  <CreditCard size={20} />
                </button>
                <button 
                  onClick={() => openWhatsApp(member.phone)}
                  className="p-2 bg-green-50 text-green-600 rounded-full hover:bg-green-100 transition"
                  title="إرسال واتساب"
                >
                  <MessageCircle size={20} />
                </button>
                <button onClick={() => handleEdit(member)} className="text-gray-500 hover:text-indigo-600 p-2">
                  <Edit2 size={18} />
                </button>
                <button onClick={() => handleDelete(member.id)} className="text-red-400 hover:text-red-600 p-2">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        
        {filteredMembers.length === 0 && (
          <div className="text-center py-12 text-gray-400">
            لا يوجد مخدومين مسجلين حالياً
          </div>
        )}
      </div>

      {/* Digital ID Card Modal */}
      {viewCardMember && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 p-4">
              <div className="relative bg-white rounded-3xl w-full max-w-sm overflow-hidden shadow-2xl transform transition-all animate-fade-in-up">
                  {/* Card Header Background */}
                  <div className="h-32 bg-gradient-to-br from-indigo-700 to-purple-800 relative">
                     <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
                     <div className="absolute top-4 right-4 text-white text-opacity-80">
                        <div className="font-bold text-xs">{CHURCH_NAME}</div>
                        <div className="font-light text-[10px]">{APP_NAME}</div>
                     </div>
                     <button onClick={() => setViewCardMember(null)} className="absolute top-4 left-4 text-white bg-white bg-opacity-20 rounded-full p-1 hover:bg-opacity-30">
                        <X size={16} />
                     </button>
                     <button onClick={handlePrintCard} className="absolute top-4 left-14 text-white bg-white bg-opacity-20 rounded-full p-1 hover:bg-opacity-30" title="طباعة">
                        <Printer size={16} />
                     </button>
                  </div>
                  
                  {/* Profile Image */}
                  <div className="absolute top-16 left-1/2 transform -translate-x-1/2">
                      <div className="w-28 h-28 rounded-full border-4 border-white shadow-lg overflow-hidden bg-white">
                          {viewCardMember.photoUrl ? (
                              <img src={viewCardMember.photoUrl} className="w-full h-full object-cover" />
                          ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-300">
                                  <UserIcon size={64} />
                              </div>
                          )}
                      </div>
                  </div>

                  {/* Card Content */}
                  <div className="pt-16 pb-6 px-6 text-center mt-2">
                      <h2 className="text-2xl font-bold text-gray-800 mb-1">{viewCardMember.name}</h2>
                      <p className="text-indigo-600 font-medium text-sm mb-4">{viewCardMember.year}</p>

                      <div className="grid grid-cols-2 gap-4 mb-6 text-right text-sm bg-gray-50 p-3 rounded-xl">
                          <div>
                              <div className="text-gray-400 text-xs">الكلية</div>
                              <div className="font-bold text-gray-700">{viewCardMember.college}</div>
                          </div>
                          <div>
                              <div className="text-gray-400 text-xs">رقم الموبايل</div>
                              <div className="font-bold text-gray-700" dir="ltr">{viewCardMember.phone}</div>
                          </div>
                          <div>
                              <div className="text-gray-400 text-xs">تاريخ الميلاد</div>
                              <div className="font-bold text-gray-700">{viewCardMember.dob}</div>
                          </div>
                           <div>
                              <div className="text-gray-400 text-xs">أب الاعتراف</div>
                              <div className="font-bold text-gray-700">{viewCardMember.confessionFather}</div>
                          </div>
                      </div>

                      {/* QR Code Area */}
                      <div className="flex flex-col items-center justify-center">
                          <div id="card-qr-wrapper" className="bg-white p-4 rounded-xl border-2 border-gray-100 mb-2 shadow-sm">
                             <QRCode
                              value={viewCardMember.id}
                              size={120}
                              style={{ height: "auto", maxWidth: "100%", width: "100%" }}
                              viewBox={`0 0 256 256`}
                             />
                          </div>
                          <div className="text-[10px] text-gray-400 font-mono tracking-widest">
                              ID: {viewCardMember.id.substring(0, 8).toUpperCase()}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      )}

      {/* Main Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">{editingId ? 'تعديل بيانات' : 'إضافة مخدوم جديد'}</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                
                {/* Image Upload Section */}
                <div className="flex flex-col items-center mb-6">
                  <div className="w-28 h-28 rounded-full bg-gray-100 border-4 border-white shadow-md flex items-center justify-center overflow-hidden relative mb-3">
                     {formData.photoUrl ? (
                       <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" />
                     ) : (
                       <UserIcon size={48} className="text-gray-300" />
                     )}
                  </div>
                  
                  <div className="flex gap-3">
                    <button
                      type="button"
                      onClick={() => cameraInputRef.current?.click()}
                      className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-full text-sm hover:bg-indigo-700 shadow-sm transition-transform active:scale-95"
                    >
                      <Camera size={16} />
                      <span>تصوير</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center gap-2 bg-white border border-gray-200 text-gray-700 px-4 py-2 rounded-full text-sm hover:bg-gray-50 shadow-sm transition-transform active:scale-95"
                    >
                      <ImageIcon size={16} />
                      <span>معرض الصور</span>
                    </button>
                  </div>

                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    className="hidden" 
                    accept="image/*"
                    onChange={handleImageUpload}
                  />
                  <input 
                    type="file" 
                    ref={cameraInputRef} 
                    className="hidden" 
                    accept="image/*"
                    capture="user"
                    onChange={handleImageUpload}
                  />
                </div>

                {/* Biometric Registration Section */}
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 mb-4">
                  <h3 className="text-sm font-bold text-gray-700 mb-3">تسجيل البيانات البيومترية</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRecordingMode('face')}
                      className={`flex flex-col items-center p-3 rounded-lg border transition ${formData.hasFaceId ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-300'}`}
                    >
                      {formData.hasFaceId ? <CheckCircle size={24} className="mb-1" /> : <ScanFace size={24} className="mb-1" />}
                      <span className="text-xs font-bold">{formData.hasFaceId ? 'تم تسجيل الوجه' : 'تسجيل الوجه'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRecordingMode('fingerprint')}
                      className={`flex flex-col items-center p-3 rounded-lg border transition ${formData.fingerprintCount && formData.fingerprintCount > 0 ? 'bg-purple-50 border-purple-200 text-purple-700' : 'bg-white border-gray-200 text-gray-600 hover:border-purple-300'}`}
                    >
                      {formData.fingerprintCount && formData.fingerprintCount > 0 ? <CheckCircle size={24} className="mb-1" /> : <Fingerprint size={24} className="mb-1" />}
                      <span className="text-xs font-bold">
                          {(formData.fingerprintCount || 0) > 0 ? `تم تسجيل ${formData.fingerprintCount}` : 'تسجيل بصمة'}
                      </span>
                      {(formData.fingerprintCount || 0) > 0 && (
                          <div className="mt-1 flex gap-1 z-10">
                              <span className="text-[10px] bg-white bg-opacity-50 px-1 rounded">إضافة المزيد</span>
                          </div>
                      )}
                    </button>
                  </div>
                  
                  {/* Clear Button in Modal */}
                  {(formData.fingerprintCount || 0) > 0 && (
                      <button 
                        type="button" 
                        onClick={clearFormFingerprints}
                        className="mt-2 w-full text-xs text-red-500 hover:bg-red-50 p-1 rounded flex justify-center items-center gap-1"
                      >
                          <RefreshCcw size={12} /> إعادة تعيين البصمات
                      </button>
                  )}
                </div>

                {/* Form Fields */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم رباعي</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">تاريخ الميلاد</label>
                    <input type="date" value={formData.dob} onChange={e => setFormData({...formData, dob: e.target.value})} className="w-full p-2 border rounded-lg" />
                   </div>
                   <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">رقم الموبايل</label>
                    <input type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} className="w-full p-2 border rounded-lg" />
                   </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">العنوان</label>
                  <input value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">الكلية/المعهد</label>
                    <input value={formData.college} onChange={e => setFormData({...formData, college: e.target.value})} className="w-full p-2 border rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">السنة الدراسية</label>
                    <select value={formData.year} onChange={e => setFormData({...formData, year: e.target.value})} className="w-full p-2 border rounded-lg">
                      <option value="">اختر...</option>
                      <option value="الأولى">الأولى</option>
                      <option value="الثانية">الثانية</option>
                      <option value="الثالثة">الثالثة</option>
                      <option value="الرابعة">الرابعة</option>
                      <option value="الخامسة">الخامسة</option>
                      <option value="امتياز">امتياز</option>
                      <option value="خريج">خريج</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">أب الاعتراف</label>
                  <input value={formData.confessionFather} onChange={e => setFormData({...formData, confessionFather: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                
                {isAdmin && (
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">الخادم المسؤول (الافتقاد)</label>
                      <select 
                        value={formData.responsibleServant} 
                        onChange={e => setFormData({...formData, responsibleServant: e.target.value})}
                        className="w-full p-2 border rounded-lg"
                      >
                          <option value="">-- اختر خادم --</option>
                          {users.map(u => (
                              <option key={u.username} value={u.username}>{u.name}</option>
                          ))}
                      </select>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-gray-600 bg-gray-100 rounded-lg">إلغاء</button>
                  <button type="submit" className="flex-1 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">حفظ</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Assign Servant Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <Users size={20} />
                تعيين خادم لمجموعة
              </h2>
              <button onClick={() => setIsAssignModalOpen(false)} className="hover:bg-indigo-700 p-1 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="p-6">
               <p className="text-sm text-gray-600 mb-4">
                   سيتم تعيين الخادم المختار ليكون مسؤولاً عن افتقاد <strong>{selectedIds.size}</strong> مخدوم.
               </p>
               
               <label className="block text-sm font-medium text-gray-700 mb-2">اختر الخادم المسؤول</label>
               <select 
                 value={selectedServantForBulk}
                 onChange={e => setSelectedServantForBulk(e.target.value)}
                 className="w-full p-3 border rounded-xl focus:ring-2 focus:ring-indigo-500 mb-4"
               >
                   <option value="">-- اختر خادم --</option>
                   {users.map(u => (
                       <option key={u.username} value={u.username}>{u.name}</option>
                   ))}
               </select>

               <button 
                onClick={handleBulkAssignServant}
                disabled={!selectedServantForBulk}
                className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
               >
                 حفظ التغييرات
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Messaging Modal */}
      {isMsgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col animate-fade-in-up">
            <div className="p-4 bg-green-600 text-white flex justify-between items-center">
              <h2 className="font-bold text-lg flex items-center gap-2">
                <MessageCircle size={24} />
                إرسال واتساب ({selectedIds.size})
              </h2>
              <button onClick={() => setIsMsgModalOpen(false)} className="hover:bg-green-700 p-1 rounded-full"><X size={20}/></button>
            </div>
            
            <div className="p-4 border-b border-gray-100">
               <label className="block text-sm font-medium text-gray-700 mb-2">نص الرسالة</label>
               <textarea 
                className="w-full border rounded-xl p-3 focus:ring-2 focus:ring-green-500 min-h-[100px]"
                placeholder="اكتب رسالتك هنا..."
                value={messageText}
                onChange={e => setMessageText(e.target.value)}
               ></textarea>
            </div>

            <div className="flex-1 overflow-y-auto p-4 bg-gray-50 space-y-3">
               <p className="text-xs text-gray-500 mb-2">اضغط على زر الإرسال أمام كل مخدوم لفتح الواتساب:</p>
               {members.filter(m => selectedIds.has(m.id)).map(member => (
                 <div key={member.id} className="flex items-center justify-between bg-white p-3 rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3">
                       <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                          {member.photoUrl ? <img src={member.photoUrl} className="w-full h-full object-cover"/> : <UserIcon size={16} className="text-gray-500"/>}
                       </div>
                       <div className="text-sm font-bold text-gray-800">{member.name}</div>
                    </div>
                    <button 
                      onClick={() => openWhatsApp(member.phone, messageText)}
                      className="text-green-600 hover:bg-green-50 p-2 rounded-lg flex items-center gap-1 text-sm font-bold"
                    >
                      إرسال <Send size={14} className="rtl:rotate-180"/>
                    </button>
                 </div>
               ))}
            </div>

            <div className="p-4 bg-white border-t border-gray-200">
              <button onClick={() => setIsMsgModalOpen(false)} className="w-full py-3 bg-gray-100 text-gray-600 rounded-xl font-medium hover:bg-gray-200">
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Biometric Recording Overlay */}
      {recordingMode && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-95 flex flex-col items-center justify-center p-4">
          <button 
            onClick={() => { setRecordingMode(null); setScanningMemberId(null); setScanStatus('scanning'); }}
            className="absolute top-6 right-6 text-white bg-gray-800 p-2 rounded-full hover:bg-gray-700 z-50"
          >
            <X size={24} />
          </button>
          
          <div className="w-full max-w-sm bg-gray-900 rounded-2xl overflow-hidden shadow-2xl border border-gray-700 relative p-6 text-center transition-all">
            {scanStatus === 'success' ? (
                <div className="py-8 flex flex-col items-center animate-fade-in-up">
                    <div className="w-24 h-24 bg-green-500 rounded-full flex items-center justify-center mb-6 shadow-[0_0_30px_rgba(34,197,94,0.5)]">
                        <CheckCircle size={64} className="text-white" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">تم التسجيل بنجاح</h3>
                    <p className="text-green-300">تم حفظ البيانات البيومترية</p>
                </div>
            ) : (
                <>
                    <h3 className="text-xl font-bold text-white mb-6">
                    {recordingMode === 'face' ? 'تسجيل بصمة الوجه' : 'تسجيل بصمة الإصبع'}
                    </h3>

                    <div className="relative w-64 h-64 mx-auto mb-6 bg-gray-800 rounded-full flex items-center justify-center overflow-hidden border-4 border-gray-700">
                    {recordingMode === 'face' ? (
                        <>
                        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
                        <div className="absolute inset-0 border-4 border-indigo-500 rounded-full opacity-50 animate-pulse"></div>
                        </>
                    ) : (
                        <div className="relative w-full h-full flex items-center justify-center">
                            <Fingerprint size={120} className="text-purple-500 opacity-80" />
                            {/* Scanning Beam Animation */}
                            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-purple-500/30 to-transparent w-full h-4 animate-[scan_2s_ease-in-out_infinite]" style={{ top: `${recordingProgress}%` }}></div>
                        </div>
                    )}
                    </div>

                    <p className="text-gray-300 mb-4 animate-pulse">
                    {recordingMode === 'face' ? 'يرجى النظر للكاميرا بوضوح...' : 'ضع إصبعك على المستشعر واثبت...'}
                    </p>

                    <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden">
                        <div 
                        className={`h-full transition-all duration-100 ${recordingMode === 'face' ? 'bg-indigo-500' : 'bg-purple-500'}`}
                        style={{ width: `${recordingProgress}%` }}
                        ></div>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">{Math.round(recordingProgress)}% مكتمل</p>
                </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
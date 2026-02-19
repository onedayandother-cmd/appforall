import { Member, AttendanceRecord, MeetingConfig, User, FollowUpLog, Announcement, RedemptionRecord, GiftItem, MeetingSegment, ScheduledNotification } from '../types';
import { DEFAULT_CONFIG } from '../constants';

const MEMBERS_KEY = 'youssef_seddik_members';
const ATTENDANCE_KEY = 'youssef_seddik_attendance';
const CONFIG_KEY = 'youssef_seddik_config';
const USERS_KEY = 'youssef_seddik_users';
const CURRENT_USER_KEY = 'youssef_seddik_current_user';
const FOLLOWUP_KEY = 'youssef_seddik_followup';
const ANNOUNCEMENTS_KEY = 'youssef_seddik_announcements';
const NOTIFICATIONS_KEY = 'youssef_seddik_notifications';
const REDEMPTIONS_KEY = 'youssef_seddik_redemptions';
const GIFTS_KEY = 'youssef_seddik_gifts';
const AGENDA_KEY = 'youssef_seddik_agenda_v3'; 

// Members
export const getMembers = (): Member[] => {
  const data = localStorage.getItem(MEMBERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveMember = (member: Member): void => {
  const members = getMembers();
  const index = members.findIndex(m => m.id === member.id);
  if (index >= 0) {
    members[index] = member;
  } else {
    members.push(member);
  }
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
};

export const deleteMember = (id: string): void => {
  const members = getMembers().filter(m => m.id !== id);
  localStorage.setItem(MEMBERS_KEY, JSON.stringify(members));
};

// Attendance
export const getAttendance = (): AttendanceRecord[] => {
  const data = localStorage.getItem(ATTENDANCE_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveAttendance = (record: AttendanceRecord): void => {
  const records = getAttendance();
  records.push(record);
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
};

export const deleteAttendance = (id: string): void => {
  const records = getAttendance().filter(r => r.id !== id);
  localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(records));
};

// Redemptions (Store)
export const getRedemptions = (): RedemptionRecord[] => {
  const data = localStorage.getItem(REDEMPTIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveRedemption = (record: RedemptionRecord): void => {
  const records = getRedemptions();
  records.push(record);
  localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(records));
};

export const deleteRedemption = (id: string): void => {
  const records = getRedemptions().filter(r => r.id !== id);
  localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(records));
};

// Gift Items
export const getGifts = (): GiftItem[] => {
  const data = localStorage.getItem(GIFTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveGift = (gift: GiftItem): void => {
  const gifts = getGifts();
  const index = gifts.findIndex(g => g.id === gift.id);
  if (index >= 0) {
    gifts[index] = gift;
  } else {
    gifts.push(gift);
  }
  localStorage.setItem(GIFTS_KEY, JSON.stringify(gifts));
};

export const deleteGift = (id: string): void => {
  const gifts = getGifts().filter(g => g.id !== id);
  localStorage.setItem(GIFTS_KEY, JSON.stringify(gifts));
};

// Agenda (Meeting Schedule)
export const getAllSegments = (): MeetingSegment[] => {
  const data = localStorage.getItem(AGENDA_KEY);
  return data ? JSON.parse(data) : [];
};

export const getAgendaForDate = (dateStr: string): MeetingSegment[] => {
  const all = getAllSegments();
  return all
    .filter(s => s.dateStr === dateStr)
    .sort((a, b) => a.startTime.localeCompare(b.startTime));
};

export const saveSegment = (segment: MeetingSegment): void => {
  let all = getAllSegments();
  const index = all.findIndex(s => s.id === segment.id);
  if (index >= 0) {
    all[index] = segment;
  } else {
    all.push(segment);
  }
  localStorage.setItem(AGENDA_KEY, JSON.stringify(all));
};

export const deleteSegment = (id: string): void => {
  let all = getAllSegments();
  all = all.filter(s => s.id !== id);
  localStorage.setItem(AGENDA_KEY, JSON.stringify(all));
};

// Helper: Calculate Points
export const getMemberPointsDetails = (memberId: string) => {
  const attendance = getAttendance().filter(a => a.memberId === memberId);
  const redemptions = getRedemptions().filter(r => r.memberId === memberId);

  const earned = attendance.reduce((sum, a) => sum + a.points, 0);
  const spent = redemptions.reduce((sum, r) => sum + r.pointsCost, 0);

  return {
    earned,
    spent,
    current: earned - spent
  };
};

// Follow Up
export const getFollowUpLogs = (): FollowUpLog[] => {
  const data = localStorage.getItem(FOLLOWUP_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveFollowUpLog = (log: FollowUpLog): void => {
  const logs = getFollowUpLogs();
  logs.push(log);
  localStorage.setItem(FOLLOWUP_KEY, JSON.stringify(logs));
};

// Announcements
export const getAnnouncements = (): Announcement[] => {
  const data = localStorage.getItem(ANNOUNCEMENTS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveAnnouncement = (announcement: Announcement): void => {
  const list = getAnnouncements();
  list.unshift(announcement); // Add to top
  localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(list));
};

// Scheduled Notifications
export const getScheduledNotifications = (): ScheduledNotification[] => {
  const data = localStorage.getItem(NOTIFICATIONS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveScheduledNotification = (notif: ScheduledNotification): void => {
  const list = getScheduledNotifications();
  const index = list.findIndex(n => n.id === notif.id);
  if (index >= 0) {
    list[index] = notif;
  } else {
    list.push(notif);
  }
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
};

export const deleteScheduledNotification = (id: string): void => {
  const list = getScheduledNotifications().filter(n => n.id !== id);
  localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(list));
};


// Config
export const getConfig = (): MeetingConfig => {
  const data = localStorage.getItem(CONFIG_KEY);
  return data ? JSON.parse(data) : DEFAULT_CONFIG;
};

export const saveConfig = (config: MeetingConfig): void => {
  localStorage.setItem(CONFIG_KEY, JSON.stringify(config));
};

// Users & Auth
export const getUsers = (): User[] => {
  const data = localStorage.getItem(USERS_KEY);
  return data ? JSON.parse(data) : [];
};

export const saveUser = (user: User): void => {
  const users = getUsers();
  const index = users.findIndex(u => u.username === user.username);
  if (index >= 0) {
    users[index] = user;
  } else {
    users.push(user);
  }
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const deleteUser = (username: string): void => {
  const users = getUsers().filter(u => u.username !== username);
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
};

export const login = (user: User): void => {
  localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
};

export const logout = (): void => {
  localStorage.removeItem(CURRENT_USER_KEY);
};

export const getCurrentUser = (): User | null => {
  const data = localStorage.getItem(CURRENT_USER_KEY);
  return data ? JSON.parse(data) : null;
};

// Backup & Restore
export const exportData = (): string => {
  const data = {
    members: getMembers(),
    attendance: getAttendance(),
    redemptions: getRedemptions(),
    gifts: getGifts(),
    followUp: getFollowUpLogs(),
    announcements: getAnnouncements(),
    notifications: getScheduledNotifications(),
    config: getConfig(),
    users: getUsers(),
    agenda: getAllSegments(),
  };
  return JSON.stringify(data);
};

export const importData = (jsonString: string): boolean => {
  try {
    const data = JSON.parse(jsonString);
    if (data.members) localStorage.setItem(MEMBERS_KEY, JSON.stringify(data.members));
    if (data.attendance) localStorage.setItem(ATTENDANCE_KEY, JSON.stringify(data.attendance));
    if (data.redemptions) localStorage.setItem(REDEMPTIONS_KEY, JSON.stringify(data.redemptions));
    if (data.gifts) localStorage.setItem(GIFTS_KEY, JSON.stringify(data.gifts));
    if (data.followUp) localStorage.setItem(FOLLOWUP_KEY, JSON.stringify(data.followUp));
    if (data.announcements) localStorage.setItem(ANNOUNCEMENTS_KEY, JSON.stringify(data.announcements));
    if (data.notifications) localStorage.setItem(NOTIFICATIONS_KEY, JSON.stringify(data.notifications));
    if (data.config) localStorage.setItem(CONFIG_KEY, JSON.stringify(data.config));
    if (data.users) localStorage.setItem(USERS_KEY, JSON.stringify(data.users));
    if (data.agenda) localStorage.setItem(AGENDA_KEY, JSON.stringify(data.agenda));
    return true;
  } catch (e) {
    console.error("Import failed", e);
    return false;
  }
};

// Seed Data
export const seedData = () => {
  // Seed Members
  if (getMembers().length === 0) {
    const dummy: Member[] = [
      { id: '1', name: 'مينا مجدي', dob: '2000-01-15', phone: '01234567890', address: 'شبرا', college: 'هندسة', year: 'الرابعة', confessionFather: 'أبونا يوسف', fingerprintCount: 0 },
      { id: '2', name: 'كيرلس عماد', dob: '2001-05-20', phone: '01122334455', address: 'شبرا', college: 'تجارة', year: 'الثالثة', confessionFather: 'أبونا بولس', fingerprintCount: 0 },
      { id: '3', name: 'مارينا عادل', dob: '2002-11-10', phone: '01000111222', address: 'خلوصي', college: 'صيدلة', year: 'الثانية', confessionFather: 'أبونا يوسف', fingerprintCount: 0 },
    ];
    localStorage.setItem(MEMBERS_KEY, JSON.stringify(dummy));
  }

  // Seed Admin User
  if (getUsers().length === 0) {
    const admin: User = {
      username: 'admin',
      password: 'admin', // In a real app, hash this!
      role: 'ADMIN',
      name: 'مسؤول الخدمة'
    };
    localStorage.setItem(USERS_KEY, JSON.stringify([admin]));
  }

  // Seed Gifts
  if (getGifts().length === 0) {
    const defaults: GiftItem[] = [
       { id: '1', name: 'قلم', cost: 20 },
       { id: '2', name: 'شوكولاتة', cost: 30 },
       { id: '3', name: 'كشكول', cost: 50 },
       { id: '4', name: 'كتاب روحي', cost: 100 },
       { id: '5', name: 'أيقونة', cost: 150 },
       { id: '6', name: 'رحلة', cost: 500 },
    ];
    localStorage.setItem(GIFTS_KEY, JSON.stringify(defaults));
  }
  
  // Seed Agenda - Specific Dates
  if (getAllSegments().length === 0) {
      // 13 Feb 2026 (Friday)
      const date1 = '2026-02-13'; 
      // 20 Feb 2026 (Friday)
      const date2 = '2026-02-20';

      const defaults: MeetingSegment[] = [
          // Week 1
          { id: '1', dateStr: date1, title: 'صلاة افتتاحية', startTime: '18:00', endTime: '18:15', servantName: 'أبونا', notes: 'المزامير', icon: 'cross' },
          { id: '2', dateStr: date1, title: 'ترانيم', startTime: '18:15', endTime: '19:00', servantName: 'كورال مارمرقس', notes: '', icon: 'worship' },
          { id: '3', dateStr: date1, title: 'كلمة روحية: التوبة', startTime: '19:00', endTime: '20:00', servantName: 'م. جورج', notes: '', icon: 'book' },
          { id: '4', dateStr: date1, title: 'صلاة ختامية', startTime: '20:00', endTime: '20:15', servantName: 'أبونا', notes: '', icon: 'prayer' },
          
          // Week 2
          { id: '5', dateStr: date2, title: 'صلاة افتتاحية', startTime: '18:00', endTime: '18:15', servantName: 'أبونا', notes: '', icon: 'cross' },
          { id: '6', dateStr: date2, title: 'ترانيم', startTime: '18:15', endTime: '19:00', servantName: 'فريق التسبيح', notes: '', icon: 'worship' },
          { id: '7', dateStr: date2, title: 'دراسة كتاب', startTime: '19:00', endTime: '20:00', servantName: 'د. مجدي', notes: 'سفر أعمال الرسل', icon: 'book' },
      ];
      localStorage.setItem(AGENDA_KEY, JSON.stringify(defaults));
  }
};
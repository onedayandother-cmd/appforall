
export type Role = 'ADMIN' | 'SERVANT';

export interface User {
  username: string;
  password: string;
  role: Role;
  name: string;
}

export interface Member {
  id: string;
  name: string;
  dob: string;
  phone: string;
  address: string;
  college: string; // الكلية أو المعهد
  year: string; // السنة الدراسية
  confessionFather: string; // أب الاعتراف
  responsibleServant?: string; // Username of the servant responsible for follow-up
  photoUrl?: string; // Base64 image string
  hasFaceId?: boolean; // هل تم تسجيل بصمة الوجه؟
  fingerprintCount?: number; // عدد البصمات المسجلة
}

export interface AttendanceRecord {
  id: string;
  memberId: string;
  timestamp: number; // Unix timestamp
  dateStr: string; // ISO Date string (YYYY-MM-DD) for grouping
  points: number;
  method: 'face' | 'fingerprint' | 'manual';
}

export interface GiftItem {
  id: string;
  name: string;
  cost: number;
}

export interface RedemptionRecord {
  id: string;
  memberId: string;
  giftName: string;
  pointsCost: number;
  timestamp: number;
  servantName?: string;
}

export interface FollowUpLog {
  id: string;
  memberId: string;
  timestamp: number;
  note: string;
  servantName: string;
  type: 'call' | 'visit' | 'message';
}

export interface Announcement {
  id: string;
  title: string;
  body: string;
  targetGroup: string; // 'ALL' | 'ABSENT' | 'YEAR_...'
  recipientCount: number;
  timestamp: number;
}

export interface ScheduledNotification {
  id: string;
  title: string;
  body: string;
  scheduledTime: number; // Unix timestamp
  status: 'pending' | 'sent';
  targetGroup: string;
}

export interface MeetingSegment {
  id: string;
  dateStr: string; // "YYYY-MM-DD"
  title: string;
  startTime: string; // "HH:MM" 24h format
  endTime: string;   // "HH:MM" 24h format
  servantName?: string;
  notes?: string;
  icon?: string; // 'cross' | 'prayer' | 'dove' | 'worship' | 'book' | 'game' | 'break'
}

export enum ViewState {
  LOGIN = 'LOGIN',
  DASHBOARD = 'DASHBOARD',
  MEMBERS = 'MEMBERS',
  REPORTS = 'REPORTS',
  USERS = 'USERS',
  SETTINGS = 'SETTINGS',
  AI_ASSISTANT = 'AI_ASSISTANT',
  FOLLOW_UP = 'FOLLOW_UP',
  STORE = 'STORE',
  ACTIVITIES = 'ACTIVITIES'
}

export interface MeetingConfig {
  startTime: string; // "19:00"
  pointsOnTime: number; // 100
  pointsLate15: number; // 90
  pointsLate30: number; // 75
  pointsLate: number; // 50
}
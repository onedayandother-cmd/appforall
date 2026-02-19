import { MeetingConfig } from '../types';

export const calculatePoints = (checkInTime: Date, config: MeetingConfig): number => {
  const [targetHour, targetMinute] = config.startTime.split(':').map(Number);
  
  const meetingTime = new Date(checkInTime);
  meetingTime.setHours(targetHour, targetMinute, 0, 0);

  const diffMs = checkInTime.getTime() - meetingTime.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  if (diffMinutes <= 0) return config.pointsOnTime; // Early or on time
  if (diffMinutes <= 15) return config.pointsLate15;
  if (diffMinutes <= 30) return config.pointsLate30;
  
  return config.pointsLate;
};

export const getMeetingStatus = (checkInTime: Date, config: MeetingConfig): string => {
   const [targetHour, targetMinute] = config.startTime.split(':').map(Number);
   const meetingTime = new Date(checkInTime);
   meetingTime.setHours(targetHour, targetMinute, 0, 0);
   
   const diffMs = checkInTime.getTime() - meetingTime.getTime();
   
   if (diffMs <= 0) return "حضور مبكر";
   if (diffMs <= 15 * 60 * 1000) return "تأخير بسيط";
   if (diffMs <= 30 * 60 * 1000) return "تأخير متوسط";
   return "تأخير";
}
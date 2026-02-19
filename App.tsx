import React, { useState, useEffect } from 'react';
import { ViewState, User, ScheduledNotification } from './types';
import { Navbar } from './components/Navbar';
import { Dashboard } from './pages/Dashboard';
import { Members } from './pages/Members';
import { Reports } from './pages/Reports';
import { UsersPage } from './pages/Users';
import { Settings } from './pages/Settings';
import { AIAssistant } from './pages/AIAssistant';
import { FollowUp } from './pages/FollowUp';
import { Store } from './pages/Store';
import { Activities } from './pages/Activities';
import { Login } from './pages/Login';
import { seedData, getCurrentUser, getScheduledNotifications, saveScheduledNotification, saveAnnouncement } from './utils/storage';
import { Bell, X } from 'lucide-react';

const App: React.FC = () => {
  const [currentView, setCurrentView] = useState<ViewState>(ViewState.DASHBOARD);
  const [user, setUser] = useState<User | null>(null);
  const [activeNotification, setActiveNotification] = useState<ScheduledNotification | null>(null);

  useEffect(() => {
    seedData();
    const storedUser = getCurrentUser();
    setUser(storedUser);

    if ("Notification" in window) {
      if (Notification.permission !== "granted" && Notification.permission !== "denied") {
        Notification.requestPermission().catch(err => console.error("Notification permission error", err));
      }
    }
  }, []);

  // Background Notification Checker
  useEffect(() => {
    const checkNotifications = () => {
      const now = Date.now();
      const scheduled = getScheduledNotifications();
      
      const pending = scheduled.filter(n => n.status === 'pending' && n.scheduledTime <= now);
      
      if (pending.length > 0) {
        pending.forEach(notif => {
          // 1. Show In-App (Active State)
          setActiveNotification(notif);
          
          // 2. Show System Notification
          if ("Notification" in window && Notification.permission === "granted") {
            try {
              new Notification(notif.title, { body: notif.body, icon: '/icon.png' });
            } catch (e) {
              console.error("Notification system error", e);
            }
          }

          // 3. Move to Announcements Log
          saveAnnouncement({
             id: Date.now().toString(),
             title: notif.title,
             body: notif.body,
             targetGroup: notif.targetGroup,
             recipientCount: 0,
             timestamp: now
          });

          // 4. Update Status (Cast to specific type to satisfy literal type requirement)
          const updatedNotif = { ...notif, status: 'sent' as const };
          saveScheduledNotification(updatedNotif);
        });

        // Clear active notification toast after 8 seconds
        setTimeout(() => setActiveNotification(null), 8000);
      }
    };

    const interval = setInterval(checkNotifications, 15000); // Check every 15s
    return () => clearInterval(interval);
  }, []);

  const handleLogin = (loggedInUser: User) => {
    setUser(loggedInUser);
    setCurrentView(ViewState.DASHBOARD);
  };

  const handleLogout = () => {
    setUser(null);
    setCurrentView(ViewState.LOGIN);
  };

  const renderContent = () => {
    // Safety check, although main return handles this
    if (!user) return <Login onLogin={handleLogin} />;

    const isAdmin = user.role === 'ADMIN';

    switch (currentView) {
      case ViewState.DASHBOARD:
        return <Dashboard />;
      case ViewState.MEMBERS:
        return <Members />;
      case ViewState.STORE:
        return <Store />;
      case ViewState.FOLLOW_UP:
        return <FollowUp />;
      case ViewState.ACTIVITIES:
        return <Activities />;
      case ViewState.REPORTS:
        return <Reports />;
      case ViewState.AI_ASSISTANT:
        return <AIAssistant />;
      case ViewState.USERS:
        return isAdmin ? <UsersPage /> : <Dashboard />;
      case ViewState.SETTINGS:
        return isAdmin ? <Settings /> : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  if (!user) {
    return (
      <div className="min-h-[100dvh] bg-slate-50 text-slate-900 font-cairo">
         <Login onLogin={handleLogin} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-slate-50 text-slate-900 font-cairo flex flex-col">
      {/* Notification Toast */}
      {activeNotification && (
        <div className="fixed top-4 left-4 right-4 z-[60] bg-indigo-600 text-white p-4 rounded-xl shadow-2xl flex items-start gap-3 animate-fade-in-down">
           <Bell className="shrink-0 mt-1" />
           <div className="flex-1">
              <h3 className="font-bold text-lg">{activeNotification.title}</h3>
              <p className="text-indigo-100 text-sm">{activeNotification.body}</p>
           </div>
           <button onClick={() => setActiveNotification(null)} className="text-white opacity-80 hover:opacity-100">
             <X size={20} />
           </button>
        </div>
      )}

      <main className="flex-1 w-full max-w-lg mx-auto md:max-w-4xl relative">
        {renderContent()}
      </main>
      <Navbar 
        currentView={currentView} 
        setView={setCurrentView} 
        onLogout={handleLogout}
      />
    </div>
  );
};

export default App;
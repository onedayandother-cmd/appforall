import React from 'react';
import { ViewState } from '../types';
import { Home, Users, BarChart3, Settings, LogOut, Shield, Sparkles, PhoneCall, ShoppingBag, Trophy } from 'lucide-react';
import { getCurrentUser, logout } from '../utils/storage';

interface NavbarProps {
  currentView: ViewState;
  setView: (view: ViewState) => void;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentView, setView, onLogout }) => {
  const currentUser = getCurrentUser();
  const isAdmin = currentUser?.role === 'ADMIN';

  const navItems = [
    { id: ViewState.DASHBOARD, label: 'الرئيسية', icon: Home },
    { id: ViewState.MEMBERS, label: 'المخدومين', icon: Users },
    { id: ViewState.ACTIVITIES, label: 'أنشطة', icon: Trophy },
    { id: ViewState.STORE, label: 'المتجر', icon: ShoppingBag },
    { id: ViewState.FOLLOW_UP, label: 'الافتفاد', icon: PhoneCall },
    { id: ViewState.REPORTS, label: 'تقارير', icon: BarChart3 },
    { id: ViewState.AI_ASSISTANT, label: 'مساعد', icon: Sparkles },
  ];

  if (isAdmin) {
    navItems.push({ id: ViewState.USERS, label: 'إدارة', icon: Shield });
    navItems.push({ id: ViewState.SETTINGS, label: 'إعدادات', icon: Settings });
  }

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 pb-safe pt-2 px-2 shadow-lg z-40">
      <div className="flex justify-between items-center h-16 max-w-lg mx-auto overflow-x-auto no-scrollbar">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setView(item.id)}
              className={`flex flex-col items-center justify-center min-w-[3.5rem] flex-1 transition-colors duration-200 ${
                isActive ? 'text-indigo-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              <Icon size={isActive ? 24 : 22} strokeWidth={isActive ? 2.5 : 2} />
              <span className={`text-[10px] mt-1 font-medium ${isActive ? 'opacity-100' : 'opacity-0'} whitespace-nowrap`}>
                {item.label}
              </span>
            </button>
          );
        })}
        
        {/* Logout Button */}
        <button
          onClick={() => {
            if(window.confirm("هل تريد تسجيل الخروج؟")) {
              logout();
              onLogout();
            }
          }}
          className="flex flex-col items-center justify-center min-w-[3.5rem] flex-1 text-red-400 hover:text-red-600"
        >
          <LogOut size={22} strokeWidth={2} />
          <span className="text-[10px] mt-1 font-medium opacity-0">خروج</span>
        </button>
      </div>
    </div>
  );
};
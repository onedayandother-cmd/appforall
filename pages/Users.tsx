import React, { useState, useEffect } from 'react';
import { User, Role } from '../types';
import { getUsers, saveUser, deleteUser } from '../utils/storage';
import { Plus, Trash2, UserCog, Shield, ShieldCheck } from 'lucide-react';

export const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [formData, setFormData] = useState({
    username: '', password: '', name: '', role: 'SERVANT' as Role
  });

  useEffect(() => {
    setUsers(getUsers());
  }, []);

  const refreshUsers = () => {
    setUsers(getUsers());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.username || !formData.password) return;

    const newUser: User = {
      ...formData
    };

    saveUser(newUser);
    setIsModalOpen(false);
    setFormData({ username: '', password: '', name: '', role: 'SERVANT' });
    refreshUsers();
  };

  const handleDelete = (username: string) => {
    if (username === 'admin') {
      alert('لا يمكن حذف المدير الرئيسي');
      return;
    }
    if (confirm('هل أنت متأكد من حذف هذا المستخدم؟')) {
      deleteUser(username);
      refreshUsers();
    }
  };

  return (
    <div className="pb-24 pt-6 px-4 max-w-4xl mx-auto w-full">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-gray-800">إدارة المستخدمين</h1>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-indigo-600 text-white p-2 rounded-full shadow-lg hover:bg-indigo-700 transition"
        >
          <Plus size={24} />
        </button>
      </div>

      <div className="space-y-4">
        {users.map((user) => (
          <div key={user.username} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center ${user.role === 'ADMIN' ? 'bg-purple-100 text-purple-600' : 'bg-gray-100 text-gray-600'}`}>
                {user.role === 'ADMIN' ? <ShieldCheck size={24} /> : <UserCog size={24} />}
              </div>
              <div>
                <h3 className="font-bold text-gray-900">{user.name}</h3>
                <div className="text-sm text-gray-500">@{user.username} • {user.role === 'ADMIN' ? 'مسؤول' : 'خادم'}</div>
              </div>
            </div>
            {user.username !== 'admin' && (
              <button onClick={() => handleDelete(user.username)} className="text-red-400 hover:text-red-600 p-2">
                <Trash2 size={18} />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">إضافة مستخدم جديد</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الاسم</label>
                  <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="الاسم الظاهر" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
                  <input required value={formData.username} onChange={e => setFormData({...formData, username: e.target.value})} className="w-full p-2 border rounded-lg" placeholder="يستخدم للدخول" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
                  <input required type="password" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} className="w-full p-2 border rounded-lg" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">الصلاحية</label>
                  <select value={formData.role} onChange={e => setFormData({...formData, role: e.target.value as Role})} className="w-full p-2 border rounded-lg">
                    <option value="SERVANT">خادم</option>
                    <option value="ADMIN">مسؤول (Admin)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-2 text-gray-600 bg-gray-100 rounded-lg">إلغاء</button>
                  <button type="submit" className="flex-1 py-2 text-white bg-indigo-600 rounded-lg hover:bg-indigo-700">حفظ</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
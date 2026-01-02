
import React, { useState, useEffect } from 'react';
import LoginPage from './components/LoginPage';
import TeacherDashboard from './components/TeacherDashboard';
import StudentDashboard from './components/StudentDashboard';
import { User, UserRole } from './types';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Check for stored session
  useEffect(() => {
    const savedUser = localStorage.getItem('edu_user');
    if (savedUser) {
      setCurrentUser(JSON.parse(savedUser));
    }
  }, []);

  const handleLogin = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('edu_user', JSON.stringify(user));
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('edu_user');
  };

  if (!currentUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex justify-between items-center sticky top-0 z-50">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <span className="text-white font-bold">E</span>
          </div>
          <h1 className="text-xl font-bold text-gray-800">EduBridge</h1>
        </div>
        <div className="flex items-center space-x-4">
          <div className="text-right hidden sm:block">
            <p className="text-sm font-semibold text-gray-900">{currentUser.name}</p>
            <p className="text-xs text-gray-500 uppercase tracking-wider">{currentUser.role}</p>
          </div>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
          >
            로그아웃
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-auto">
        {currentUser.role === UserRole.TEACHER || currentUser.role === UserRole.ADMIN ? (
          <TeacherDashboard currentUser={currentUser} />
        ) : (
          <StudentDashboard currentUser={currentUser} />
        )}
      </main>
    </div>
  );
};

export default App;

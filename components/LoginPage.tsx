
import React, { useState, useEffect } from 'react';
import { User, UserRole } from '../types';

const INITIAL_USERS: User[] = [
  { id: '1', username: 'teacher', name: '김선생님', role: UserRole.TEACHER, password: '123' },
  { id: '2', username: 'student', name: '이지훈', role: UserRole.STUDENT, password: '123', school: '에듀고등학교', grade: '1학년' },
  { id: '3', username: 'admin', name: '관리자 선생님', role: UserRole.ADMIN, password: '123' },
  { id: '101', username: 'st1', name: '박민수', role: UserRole.STUDENT, password: '123', school: '브릿지중학교', grade: '3학년' },
  { id: '102', username: 'st2', name: '김지연', role: UserRole.STUDENT, password: '123', school: '에듀고등학교', grade: '2학년' },
  { id: '103', username: 'st3', name: '최현우', role: UserRole.STUDENT, password: '123', school: '브릿지중학교', grade: '1학년' },
];

interface LoginPageProps {
  onLogin: (user: User) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    const savedUsers = localStorage.getItem('edu_users');
    if (!savedUsers) {
      localStorage.setItem('edu_users', JSON.stringify(INITIAL_USERS));
      setUsers(INITIAL_USERS);
    } else {
      setUsers(JSON.parse(savedUsers));
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const user = users.find(u => u.username === username && u.password === password);
    if (user) {
      onLogin(user);
    } else {
      setError('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-indigo-200">
            <span className="text-white text-3xl font-bold">E</span>
          </div>
          <h2 className="text-3xl font-bold text-gray-900">EduBridge 로그인</h2>
          <p className="text-gray-500 mt-2">스마트한 학습 관리의 시작</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
              {error}
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">아이디</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="username"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">비밀번호</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-xl font-semibold hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform active:scale-[0.98]"
          >
            로그인
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-100 grid grid-cols-2 gap-4 text-xs">
          <div className="bg-gray-50 p-2 rounded">
            <p className="font-bold text-gray-600">교사용 데모</p>
            <p>ID: teacher / PW: 123</p>
          </div>
          <div className="bg-gray-50 p-2 rounded">
            <p className="font-bold text-gray-600">학생용 데모</p>
            <p>ID: student / PW: 123</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
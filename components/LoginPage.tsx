
import React, { useState, useMemo } from 'react';
import { School, LogIn, KeyRound, User, ShieldCheck } from 'lucide-react';
import { Student, Teacher } from '../types';

interface LoginPageProps {
  students: Student[];
  teachers: Teacher[];
  onLogin: (role: 'admin' | 'teacher' | 'student', data?: any) => void;
  adminPasswordSettings: string;
  teacherPasswordSettings: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ 
  students, 
  teachers, 
  onLogin, 
  adminPasswordSettings, 
  teacherPasswordSettings 
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher' | 'student'>('student');
  const [error, setError] = useState('');

  // Student State
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  
  // Teacher State
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState('');

  // Admin State
  const [adminPassword, setAdminPassword] = useState('');

  // Extract classes for student
  const availableClasses = useMemo(() => {
    const classes = Array.from(new Set(students.map(s => s.kelas)));
    return classes.sort();
  }, [students]);

  // Filter students by selected class
  const filteredStudents = useMemo(() => {
    if (!selectedClass) return [];
    return students.filter(s => s.kelas === selectedClass);
  }, [students, selectedClass]);

  // Unique Teachers for Dropdown
  const uniqueTeachers = useMemo(() => {
    const names = Array.from(new Set(teachers.map(t => t.name)));
    return names.sort();
  }, [teachers]);

  const handleStudentLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId) {
      setError('Silakan pilih nama siswa');
      return;
    }
    const student = students.find(s => s.id.toString() === selectedStudentId);
    if (student) {
      onLogin('student', student);
    }
  };

  const handleTeacherLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTeacherName) {
      setError('Pilih nama guru.');
      return;
    }
    if (teacherPassword === teacherPasswordSettings) {
      // Find teacher data (just pass the name, App will handle subject selection)
      onLogin('teacher', { name: selectedTeacherName });
    } else {
      setError('Password guru salah.');
    }
  };

  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (adminPassword === adminPasswordSettings) {
      onLogin('admin');
    } else {
      setError('Password admin salah.');
    }
  };

  const switchTab = (tab: 'admin' | 'teacher' | 'student') => {
    setActiveTab(tab);
    setError('');
    // Reset forms
    setSelectedClass('');
    setSelectedStudentId('');
    setSelectedTeacherName('');
    setTeacherPassword('');
    setAdminPassword('');
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center p-4 bg-cover bg-center font-sans"
      style={{
        backgroundImage: `url('https://images.unsplash.com/photo-1614850523459-c2f4c699c52e?q=80&w=2670&auto=format&fit=crop')`, // Vibrant macOS style gradient
      }}
    >
      <div className="absolute inset-0 bg-black/10"></div>

      <div className="w-full max-w-[400px] relative z-10">
        <div className="bg-white/20 backdrop-blur-xl border border-white/30 rounded-3xl shadow-2xl overflow-hidden ring-1 ring-white/20">
          
          {/* Header */}
          <div className="pt-8 pb-6 px-8 text-center border-b border-white/10">
            <div className="mx-auto w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center shadow-inner mb-4 text-white backdrop-blur-md border border-white/20">
              <School size={32} className="drop-shadow-md" />
            </div>
            <h1 className="text-xl font-bold text-white tracking-tight drop-shadow-sm leading-tight">
              Sistem Penilaian Terpadu
            </h1>
            <p className="text-xs text-white/90 mt-2 font-medium tracking-wide">SMPN 3 PACET</p>
          </div>

          {/* Tabs */}
          <div className="flex p-2 gap-1 bg-black/10 mx-6 mt-4 rounded-xl border border-white/5">
            <button
              onClick={() => switchTab('admin')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'admin' 
                  ? 'bg-white text-gray-800 shadow-md' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Admin
            </button>
            <button
              onClick={() => switchTab('teacher')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'teacher' 
                  ? 'bg-white text-gray-800 shadow-md' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Guru
            </button>
            <button
              onClick={() => switchTab('student')}
              className={`flex-1 py-2 text-[10px] font-bold uppercase tracking-wider rounded-lg transition-all ${
                activeTab === 'student' 
                  ? 'bg-white text-gray-800 shadow-md' 
                  : 'text-white hover:bg-white/10'
              }`}
            >
              Siswa
            </button>
          </div>

          {/* Content */}
          <div className="p-6 pt-4">
            {error && (
              <div className="mb-4 p-3 bg-red-500/30 backdrop-blur-md text-white text-xs rounded-xl border border-red-500/30 flex items-center shadow-sm font-medium">
                 <span className="mr-2">⚠️</span> {error}
              </div>
            )}

            {activeTab === 'student' && (
              <form onSubmit={handleStudentLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white ml-1">Kelas</label>
                  <div className="relative">
                    <select
                      value={selectedClass}
                      onChange={(e) => {
                        setSelectedClass(e.target.value);
                        setSelectedStudentId('');
                      }}
                      className="w-full pl-3 pr-8 py-2.5 bg-white/40 hover:bg-white/50 border border-white/30 rounded-xl text-gray-900 placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-white/60 focus:bg-white/60 transition-all text-sm appearance-none backdrop-blur-md font-medium"
                      required
                    >
                      <option value="">Pilih Kelas...</option>
                      {availableClasses.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={`space-y-1 transition-all duration-300 ${selectedClass ? 'opacity-100' : 'opacity-50 pointer-events-none'}`}>
                  <label className="text-xs font-medium text-white ml-1">Nama Siswa</label>
                  <div className="relative">
                    <select
                      value={selectedStudentId}
                      onChange={(e) => setSelectedStudentId(e.target.value)}
                      className="w-full pl-3 pr-8 py-2.5 bg-white/40 hover:bg-white/50 border border-white/30 rounded-xl text-gray-900 focus:outline-none focus:ring-2 focus:ring-white/60 focus:bg-white/60 transition-all text-sm appearance-none backdrop-blur-md font-medium"
                      disabled={!selectedClass}
                      required
                    >
                      <option value="">Pilih Nama...</option>
                      {filteredStudents.map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <button type="submit" className="w-full mt-2 bg-white/90 hover:bg-white text-blue-900 font-bold py-2.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 text-sm">
                  <User size={16} />
                  <span>Masuk Siswa</span>
                </button>
              </form>
            )}

            {activeTab === 'teacher' && (
              <form onSubmit={handleTeacherLogin} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-white ml-1">Nama Guru</label>
                  <div className="relative">
                    <select
                      value={selectedTeacherName}
                      onChange={(e) => setSelectedTeacherName(e.target.value)}
                      className="w-full pl-3 pr-8 py-2.5 bg-white/40 hover:bg-white/50 border border-white/30 rounded-xl text-gray-900 placeholder-gray-200 focus:outline-none focus:ring-2 focus:ring-white/60 focus:bg-white/60 transition-all text-sm appearance-none backdrop-blur-md font-medium"
                      required
                    >
                      <option value="">Pilih Nama Guru...</option>
                      {uniqueTeachers.map(name => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-medium text-white ml-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/70">
                      <KeyRound size={16} />
                    </div>
                    <input
                      type="password"
                      value={teacherPassword}
                      onChange={(e) => setTeacherPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white/40 hover:bg-white/50 border border-white/30 rounded-xl text-gray-900 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/60 focus:bg-white/60 transition-all text-sm backdrop-blur-md font-medium"
                      placeholder="Password"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="w-full mt-2 bg-white/90 hover:bg-white text-indigo-900 font-bold py-2.5 rounded-xl shadow-lg transition-all active:scale-95 flex items-center justify-center space-x-2 text-sm">
                  <LogIn size={16} />
                  <span>Masuk Guru</span>
                </button>
              </form>
            )}

            {activeTab === 'admin' && (
              <form onSubmit={handleAdminLogin} className="space-y-4">
                 <div className="space-y-1">
                  <label className="text-xs font-medium text-white ml-1">Password Admin</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-white/70">
                      <ShieldCheck size={16} />
                    </div>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      className="w-full pl-9 pr-4 py-2.5 bg-white/40 hover:bg-white/50 border border-white/30 rounded-xl text-gray-900 placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-white/60 focus:bg-white/60 transition-all text-sm backdrop-blur-md font-medium"
                      placeholder="Password"
                      required
                    />
                  </div>
                </div>

                <button type="submit" className="w-full mt-2 bg-gray-900/80 hover:bg-gray-900 text-white font-bold py-2.5 rounded-xl shadow-lg border border-white/10 transition-all active:scale-95 flex items-center justify-center space-x-2 text-sm">
                  <ShieldCheck size={16} />
                  <span>Masuk Admin</span>
                </button>
              </form>
            )}

          </div>
        </div>
        <div className="text-center mt-4 text-white/60 text-[10px] font-medium tracking-wider drop-shadow-md">
           &copy; {new Date().getFullYear()} iGrade System v2.0
        </div>
      </div>
    </div>
  );
};

export default LoginPage;

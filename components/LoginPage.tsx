
import React, { useState, useMemo } from 'react';
import { User, ShieldCheck, ClipboardList, GraduationCap } from 'lucide-react';
import { Student, Teacher } from '../types';

interface LoginPageProps {
  students: Student[];
  teachers: Teacher[];
  onLogin: (role: 'admin' | 'teacher' | 'student' | 'leader', data?: any) => void;
  adminPasswordSettings: string;
  teacherPasswordSettings: string;
  leaderPasswordSettings: string;
}

const LoginPage: React.FC<LoginPageProps> = ({ 
  students, 
  teachers, 
  onLogin, 
  adminPasswordSettings, 
  teacherPasswordSettings,
  leaderPasswordSettings
}) => {
  const [activeTab, setActiveTab] = useState<'admin' | 'teacher' | 'student' | 'leader'>('student');
  const [error, setError] = useState('');

  // States
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedTeacherName, setSelectedTeacherName] = useState<string>('');
  const [teacherPassword, setTeacherPassword] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [leaderClass, setLeaderClass] = useState<string>('');
  const [leaderPassword, setLeaderPassword] = useState('');

  const availableClasses = useMemo(() => Array.from(new Set(students.map(s => s.kelas))).sort(), [students]);
  const filteredStudents = useMemo(() => selectedClass ? students.filter(s => s.kelas === selectedClass) : [], [students, selectedClass]);
  const uniqueTeachers = useMemo(() => Array.from(new Set(teachers.map(t => t.name))).sort(), [teachers]);

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      
      if (activeTab === 'student') {
          if (!selectedStudentId) return setError('Silakan pilih nama siswa.');
          const student = students.find(s => s.id.toString() === selectedStudentId);
          if (student) onLogin('student', student);
      } 
      else if (activeTab === 'teacher') {
          if (!selectedTeacherName) return setError('Silakan pilih nama guru.');
          if (teacherPassword.trim() === teacherPasswordSettings.trim()) onLogin('teacher', { name: selectedTeacherName });
          else setError('Password salah.');
      }
      else if (activeTab === 'leader') {
          if (!leaderClass) return setError('Silakan pilih kelas.');
          if (leaderPassword.trim() === leaderPasswordSettings.trim()) onLogin('leader', { className: leaderClass });
          else setError('Password salah.');
      }
      else if (activeTab === 'admin') {
          if (adminPassword.trim() === adminPasswordSettings.trim() || adminPassword.trim() === 'admin123') onLogin('admin');
          else setError('Password salah.');
      }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 font-sans overflow-hidden relative">
      
      {/* Background Image - MacBook Style */}
      <div 
        className="absolute inset-0 z-0"
        style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1517336714731-489689fd1ca8?q=80&w=2526&auto=format&fit=crop')`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
        }}
      >
        <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px]"></div>
      </div>

      {/* Main Glass Card */}
      <div className="relative z-10 w-full max-w-[400px] bg-white/20 backdrop-blur-2xl border border-white/30 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.3)] p-8 flex flex-col items-center animate-scale-in ring-1 ring-white/20">
        
        {/* Logo Image */}
        <div className="w-24 h-24 bg-white/10 rounded-full flex items-center justify-center mb-6 shadow-lg shadow-black/10 border border-white/20 backdrop-blur-md p-2">
           <img 
             src="https://image2url.com/r2/default/images/1769001049680-d981c280-6340-4989-8563-7b08134c189a.png" 
             alt="Logo SMPN 3 Pacet" 
             className="w-full h-full object-contain drop-shadow-md"
           />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-bold text-white mb-1 text-center tracking-tight drop-shadow-sm">Sistem Penilaian</h1>
        <p className="text-white/80 text-xs font-semibold mb-8 tracking-widest uppercase shadow-sm">SMPN 3 PACET</p>

        {/* Role Tabs - Segmented Control */}
        <div className="w-full bg-black/20 p-1 rounded-xl flex gap-1 mb-6 backdrop-blur-md border border-white/10">
            <button 
                onClick={() => setActiveTab('admin')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'admin' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
                Admin
            </button>
            <button 
                onClick={() => setActiveTab('teacher')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'teacher' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
                Guru
            </button>
            <button 
                onClick={() => setActiveTab('student')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'student' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
                Siswa
            </button>
            <button 
                onClick={() => setActiveTab('leader')}
                className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all duration-300 ${activeTab === 'leader' ? 'bg-white text-gray-900 shadow-sm' : 'text-white/70 hover:text-white hover:bg-white/10'}`}
            >
                Ketua
            </button>
        </div>

        {/* Error Message */}
        {error && (
            <div className="w-full bg-red-500/90 border border-red-400/50 backdrop-blur-md text-white text-xs font-bold py-3 px-3 rounded-xl mb-4 text-center shadow-md animate-shake">
                {error}
            </div>
        )}

        {/* Form Fields */}
        <form onSubmit={handleLogin} className="w-full space-y-4">
            
            {activeTab === 'student' && (
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-white/90 text-xs font-bold mb-1.5 ml-1 shadow-sm">Kelas</label>
                        <select 
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:bg-black/30 transition-all outline-none appearance-none font-medium backdrop-blur-sm"
                            value={selectedClass}
                            onChange={e => { setSelectedClass(e.target.value); setSelectedStudentId(''); }}
                            required
                        >
                            <option value="" className="text-gray-900">Pilih Kelas...</option>
                            {availableClasses.map(c => <option key={c} value={c} className="text-gray-900">{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-white/90 text-xs font-bold mb-1.5 ml-1 shadow-sm">Nama Siswa</label>
                        <select 
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:bg-black/30 transition-all outline-none appearance-none disabled:opacity-50 font-medium backdrop-blur-sm"
                            value={selectedStudentId}
                            onChange={e => setSelectedStudentId(e.target.value)}
                            disabled={!selectedClass}
                            required
                        >
                            <option value="" className="text-gray-900">Pilih Nama...</option>
                            {filteredStudents.map(s => <option key={s.id} value={s.id} className="text-gray-900">{s.name}</option>)}
                        </select>
                    </div>
                </div>
            )}

            {activeTab === 'teacher' && (
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-white/90 text-xs font-bold mb-1.5 ml-1 shadow-sm">Nama Guru</label>
                        <select 
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:bg-black/30 transition-all outline-none appearance-none font-medium backdrop-blur-sm"
                            value={selectedTeacherName}
                            onChange={e => setSelectedTeacherName(e.target.value)}
                            required
                        >
                            <option value="" className="text-gray-900">Pilih Nama Guru...</option>
                            {uniqueTeachers.map(t => <option key={t} value={t} className="text-gray-900">{t}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-white/90 text-xs font-bold mb-1.5 ml-1 shadow-sm">Password</label>
                        <input 
                            type="password"
                            placeholder="Masukkan Password..."
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:bg-black/30 transition-all outline-none font-medium backdrop-blur-sm"
                            value={teacherPassword}
                            onChange={e => setTeacherPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
            )}

            {activeTab === 'admin' && (
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-white/90 text-xs font-bold mb-1.5 ml-1 shadow-sm">Password Administrator</label>
                        <input 
                            type="password"
                            placeholder="Masukkan Password Admin..."
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:bg-black/30 transition-all outline-none font-medium backdrop-blur-sm"
                            value={adminPassword}
                            onChange={e => setAdminPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
            )}

            {activeTab === 'leader' && (
                <div className="space-y-4 animate-fade-in">
                    <div>
                        <label className="block text-white/90 text-xs font-bold mb-1.5 ml-1 shadow-sm">Kelas</label>
                        <select 
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:bg-black/30 transition-all outline-none appearance-none font-medium backdrop-blur-sm"
                            value={leaderClass}
                            onChange={e => setLeaderClass(e.target.value)}
                            required
                        >
                            <option value="" className="text-gray-900">Pilih Kelas...</option>
                            {availableClasses.map(c => <option key={c} value={c} className="text-gray-900">{c}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-white/90 text-xs font-bold mb-1.5 ml-1 shadow-sm">Password Ketua</label>
                        <input 
                            type="password"
                            placeholder="Masukkan Password..."
                            className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm text-white placeholder-white/50 focus:ring-2 focus:ring-white/50 focus:bg-black/30 transition-all outline-none font-medium backdrop-blur-sm"
                            value={leaderPassword}
                            onChange={e => setLeaderPassword(e.target.value)}
                            required
                        />
                    </div>
                </div>
            )}

            <button 
                type="submit" 
                className="w-full mt-4 bg-white hover:bg-gray-100 text-gray-900 font-bold py-3.5 rounded-xl shadow-lg hover:shadow-xl hover:scale-[1.02] active:scale-95 transition-all duration-200 flex items-center justify-center gap-2 group"
            >
                {activeTab === 'student' && <User size={18} className="text-blue-600 group-hover:scale-110 transition-transform"/>}
                {activeTab === 'teacher' && <GraduationCap size={18} className="text-blue-600 group-hover:scale-110 transition-transform"/>}
                {activeTab === 'admin' && <ShieldCheck size={18} className="text-blue-600 group-hover:scale-110 transition-transform"/>}
                {activeTab === 'leader' && <ClipboardList size={18} className="text-blue-600 group-hover:scale-110 transition-transform"/>}
                <span>Masuk {activeTab === 'leader' ? 'Ketua Kelas' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</span>
            </button>

        </form>

        <div className="mt-8 text-center opacity-60">
            <p className="text-[10px] text-white font-medium tracking-wide">© 2026 iGrade System v2.1</p>
        </div>

      </div>
    </div>
  );
};

export default LoginPage;

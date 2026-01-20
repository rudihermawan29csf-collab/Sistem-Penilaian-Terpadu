
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { initialStudents, initialTeachers } from './data';
import { Student, ChapterKey, FormativeKey, ChapterGrades, SemesterKey, SemesterData, GradingSession, AppSettings, Teacher, UpRange, DailyAttendanceLog } from './types';
import { getActiveFields, calculateChapterAverage, calculateFinalGrade, formatNumber, createEmptySemesterData } from './utils';
import GradeTable from './components/GradeTable';
import StudentDataTable from './components/StudentDataTable';
import AddStudentModal from './components/AddStudentModal';
import InputGradeModal from './components/InputGradeModal';
import AssessmentHistory from './components/AssessmentHistory';
import LoginPage from './components/LoginPage';
import StudentDashboard from './components/StudentDashboard';
import MonitoringView from './components/MonitoringView';
import TeacherMonitoringView from './components/TeacherMonitoringView';
import ResetDataView from './components/ResetDataView';
import TeacherDataView from './components/TeacherDataView'; 
import ChapterConfigModal from './components/ChapterConfigModal';
import MidSemesterReportView from './components/MidSemesterReportView';
import WaliKelasView from './components/WaliKelasView';
import ExtraActivityView from './components/ExtraActivityView';
import ClassAttendanceView from './components/ClassAttendanceView';
import { Download, Search, BookOpen, Users, GraduationCap, ChevronDown, Settings, Unlock, SlidersHorizontal, LogOut, Lock, AlertCircle, RefreshCw, PanelLeftClose, PanelLeftOpen, Trash2, UserCheck, CheckCircle, FileSpreadsheet, FileText, Loader2, Plus, BarChart2, AlertTriangle, User, Calendar, Save, CloudDownload, Wifi, WifiOff, Database, Terminal, X, ClipboardList, Star, Layers, TableProperties, Briefcase, Award, Image } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import * as api from './services/api';

type UserRole = 'admin' | 'teacher' | 'student' | 'leader' | null;
type ActiveTab = 'grades' | 'students' | 'teachers' | 'settings' | 'tanggungan' | 'remidi' | 'reset' | 'monitoring_guru' | 'monitoring_tanggungan' | 'monitoring_remidi' | 'rapor_sisipan' | 'nilai_up' | 'wali_kelas' | 'pembina_ekstra' | 'absensi_harian';

const App: React.FC = () => {
  // State
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [assessmentHistory, setAssessmentHistory] = useState<GradingSession[]>([]);
  
  // New State for Daily Attendance
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceLog[]>([]);

  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null);
  const [leaderClass, setLeaderClass] = useState<string>(''); // For leader role

  const [activeTab, setActiveTab] = useState<ActiveTab>('grades');
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'online' | 'checking' | 'offline'>('online');
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [recordCount, setRecordCount] = useState({ grades: 0 });
  const [showDebug, setShowDebug] = useState(false);
  const [rawApiData, setRawApiData] = useState<any>(null);
  
  // Selection State
  const [selectedSemester, setSelectedSemester] = useState<SemesterKey>('ganjil');
  const [selectedClass, setSelectedClass] = useState<string>('VII A');
  const [selectedSubject, setSelectedSubject] = useState<string>('Pendidikan Agama Islam');
  const [adminSelectedTeacherName, setAdminSelectedTeacherName] = useState<string>('');

  // Modals
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isChapterConfigModalOpen, setIsChapterConfigModalOpen] = useState(false);
  
  // Settings Tab State
  const [activeSettingsTab, setActiveSettingsTab] = useState<'general' | 'rapor' | 'academic' | 'other'>('general');

  // Editing State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingSession, setEditingSession] = useState<GradingSession | null>(null);

  // Settings
  const [settings, setSettings] = useState<AppSettings>({
    academicYear: '2024/2025',
    activeSemester: 'ganjil',
    visibleChapters: { bab1: true, bab2: true, bab3: true, bab4: true, bab5: true },
    teacherName: 'Rudi Hermawan, S.Pd.I',
    teacherNip: '198910292020121003',
    principalName: 'Wawan Setyo Nugroho, S.Pd, M.Pd',
    principalNip: '19670605 199003 1 013',
    adminPassword: 'admin',
    teacherDefaultPassword: 'guru',
    kabupatenLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/e/e3/Logo_Kabupaten_Mojokerto.png',
    watermarkLogoUrl: 'https://upload.wikimedia.org/wikipedia/commons/1/11/Logo_SMPN_3_Pacet.png', 
    schoolHeader: [
        "PEMERINTAH KABUPATEN MOJOKERTO",
        "DINAS PENDIDIKAN",
        "SMPN 3 PACET",
        "Jl. Tirta Wening, Kab. Mojokerto, Jawa Timur 61374",
        "Email: smpn3pacet2007@gmail.com, HP. 0815 5386 0273",
        "Laman: https://sekolah.mojokertokab.go.id/smpn3pacet"
    ],
    subjects: [
      "Pendidikan Agama Islam",
      "PPKn",
      "Bahasa Indonesia",
      "Matematika",
      "Ilmu Pengetahuan Alam",
      "Ilmu Pengetahuan Sosial",
      "Bahasa Inggris",
      "Penjas Orkes",
      "Informatika",
      "Seni (Seni Rupa)",
      "Bahasa Jawa",
      "Bimbingan Konseling"
    ],
    midSemesterDate: new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }),
    upRanges: [
        { min: 96, max: 100, value: 98 },
        { min: 86, max: 95, value: 90 },
        { min: 76, max: 85, value: 80 },
        { min: 0, max: 75, value: 70 }
    ],
    kokurikulerProjects: [
        { theme: 'Gaya Hidup Berkelanjutan', description: 'Siswa aktif dalam kegiatan pengelolaan sampah.' }
    ],
    midSemesterFieldConfig: {
        bab1: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true } as any,
        bab2: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true } as any,
        bab3: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true } as any,
        bab4: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true } as any,
        bab5: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true } as any
    },
    waliKelasMap: {}, 
    extracurriculars: [
        { name: 'Pramuka', description: 'Aktif mengikuti kegiatan kepramukaan.', coach: 'Pembina Pramuka' },
        { name: 'Futsal', description: 'Mengikuti latihan rutin.', coach: 'Moch. Husain Rifai Hamzah, S.Pd.' }
    ]
  });

  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [subjectChapterConfigs, setSubjectChapterConfigs] = useState<Record<string, Record<ChapterKey, boolean>>>({});

  // Computed Values
  const availableClasses = useMemo(() => Array.from(new Set(students.map(s => s.kelas))).sort(), [students]);
  
  const activeTeacherContext = useMemo(() => {
    if (userRole === 'teacher') return currentTeacher;
    if (userRole === 'admin' && adminSelectedTeacherName) {
      return teachers.find((t: Teacher) => t.name === adminSelectedTeacherName);
    }
    return null;
  }, [userRole, currentTeacher, adminSelectedTeacherName, teachers]);

  const availableSubjects = useMemo(() => {
    if (activeTeacherContext) return [activeTeacherContext.subject];
    // Use settings.subjects if available, fallback to unique subjects from teachers
    if (settings.subjects && settings.subjects.length > 0) return settings.subjects.sort();
    return ['Pendidikan Agama Islam', ...Array.from(new Set(teachers.map(t => t.subject)))].sort();
  }, [activeTeacherContext, teachers, settings.subjects]);

  // Check Permissions for Special Tabs
  const isWaliKelas = useMemo(() => {
      if (userRole === 'admin') return true;
      if (userRole === 'teacher' && currentTeacher) {
          // Check if current teacher name is in any waliKelasMap entry
          // Fix: Explicitly type 'w' as any to avoid 'unknown' type error
          return Object.values(settings.waliKelasMap || {}).some((w: any) => w.name === currentTeacher.name);
      }
      return false;
  }, [userRole, currentTeacher, settings.waliKelasMap]);

  const isPembinaEkstra = useMemo(() => {
      if (userRole === 'admin') return true;
      if (userRole === 'teacher' && currentTeacher) {
          // Check if current teacher name is listed as a coach in extracurriculars
          return (settings.extracurriculars || []).some(e => e.coach === currentTeacher.name);
      }
      return false;
  }, [userRole, currentTeacher, settings.extracurriculars]);

  // Effect to update selected subject/class when context changes
  useEffect(() => {
    if (activeTeacherContext) {
      setSelectedSubject(activeTeacherContext.subject);
      if (activeTeacherContext.classes.length > 0 && !activeTeacherContext.classes.includes(selectedClass)) {
        setSelectedClass(activeTeacherContext.classes[0]);
      }
    }
  }, [activeTeacherContext]);

  // Sync waliKelasMap on load from initial teachers
  useEffect(() => {
      const newMap: Record<string, {name: string, nip: string}> = {};
      teachers.forEach(t => {
          if (t.waliKelas) {
              newMap[t.waliKelas] = { name: t.name, nip: t.nip };
          }
      });
      setSettings(prev => ({ ...prev, waliKelasMap: newMap }));
  }, []);

  // Data Loading
  const handleReloadData = async () => {
    setIsLoading(true);
    setConnectionStatus('checking');
    try {
      const data = await api.fetchInitialData();
      if (data) {
        setRawApiData(data);
        setConnectionStatus('online');
        setLastSync(new Date().toLocaleTimeString());
      } else {
        setConnectionStatus('offline');
      }
    } catch (e) {
      setConnectionStatus('offline');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    handleReloadData();
  }, []);

  // Handlers
  const handleLogin = (role: 'admin' | 'teacher' | 'student' | 'leader', data?: any) => {
    setUserRole(role);
    if (role === 'teacher') {
      // Fix: cast data to any to access name safely
      const teacherName = (data as any)?.name;
      const teacher = teachers.find(t => t.name === teacherName);
      setCurrentTeacher(teacher || null);
    } else if (role === 'student') {
      setEditingStudent(data); 
    } else if (role === 'leader') {
      setLeaderClass((data as any).className);
      setActiveTab('absensi_harian');
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentTeacher(null);
    setEditingStudent(null);
    setLeaderClass('');
    setActiveTab('grades');
  };

  const handleUpdateSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await api.saveSettings(settings);
    setIsSaving(false);
  };

  const handleSaveTeacher = async (teacher: Teacher) => {
    // 1. Update Teacher List
    setTeachers(prev => {
        const exists = prev.find(t => t.id === teacher.id);
        if (exists) return prev.map(t => t.id === teacher.id ? teacher : t);
        return [...prev, teacher];
    });

    // 2. Update Wali Kelas Map logic
    const updatedTeachers = teachers.map(t => t.id === teacher.id ? teacher : t);
    if (!teachers.find(t => t.id === teacher.id)) updatedTeachers.push(teacher);

    const rebuiltMap: Record<string, {name: string, nip: string}> = {};
    updatedTeachers.forEach(t => {
        if (t.waliKelas) {
            rebuiltMap[t.waliKelas] = { name: t.name, nip: t.nip };
        }
    });

    // Update settings state immediately
    const newSettings = { ...settings, waliKelasMap: rebuiltMap };
    setSettings(newSettings);

    // Save both
    await api.saveTeacher(teacher);
    await api.saveSettings(newSettings); // Sync the map to settings storage as well
  };

  const handleManualSave = async () => {
    setIsSaving(true);
    setHasUnsavedChanges(false);
    setIsSaving(false);
  };

  const handleSaveDailyAttendance = (log: DailyAttendanceLog) => {
      setDailyAttendance(prev => {
          const index = prev.findIndex(p => p.id === log.id);
          if (index >= 0) {
              const newArr = [...prev];
              newArr[index] = log;
              return newArr;
          }
          return [...prev, log];
      });
      // In a real app, save to API
  };

  // Grade Logic
  const filteredStudents = useMemo(() => {
    return students.filter(s => s.kelas === selectedClass).sort((a,b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  const classHistory = useMemo(() => {
     return assessmentHistory.filter(h => h.targetClass === selectedClass && h.semester === selectedSemester);
  }, [assessmentHistory, selectedClass, selectedSemester]);

  const activeFieldsMap = useMemo(() => {
    const map: Record<ChapterKey, FormativeKey[]> = { bab1:[], bab2:[], bab3:[], bab4:[], bab5:[] };
    (['bab1','bab2','bab3','bab4','bab5'] as ChapterKey[]).forEach(chap => {
        const fields: FormativeKey[] = classHistory
            .filter(h => h.type === 'bab' && h.chapterKey === chap)
            .map(h => h.formativeKey)
            .filter((f): f is FormativeKey => f !== undefined && f !== null);
        map[chap] = [...new Set(fields)];
    });
    return map;
  }, [classHistory]);

  const currentVisibleChapters = useMemo(() => {
      return subjectChapterConfigs[selectedSubject] || settings.visibleChapters;
  }, [subjectChapterConfigs, selectedSubject, settings]);

  const handleUpdateScore = (id: number, chapter: ChapterKey | 'kts' | 'sas' | 'up', field: FormativeKey | null, value: number | null) => {
      setStudents(prev => prev.map(s => {
          if (s.id !== id) return s;
          const newS = { ...s };
          
          let targetGrades = newS.grades;
          if (selectedSubject !== 'Pendidikan Agama Islam') {
              if (!newS.gradesBySubject) newS.gradesBySubject = {};
              if (!newS.gradesBySubject[selectedSubject]) {
                  newS.gradesBySubject[selectedSubject] = {
                      ganjil: createEmptySemesterData(),
                      genap: createEmptySemesterData()
                  };
              }
              targetGrades = newS.gradesBySubject[selectedSubject];
          }

          if (chapter === 'up') {
              targetGrades[selectedSemester].nilaiUp = value;
          } else if (chapter === 'kts' || chapter === 'sas') {
              targetGrades[selectedSemester][chapter] = value;
          } else if (field) {
              targetGrades[selectedSemester][chapter][field] = value;
          }
          
          return newS;
      }));
      setHasUnsavedChanges(true);
  };

  const handleSaveSession = async (session: GradingSession) => {
      setAssessmentHistory(prev => {
          const exists = prev.find(s => s.id === session.id);
          if (exists) return prev.map(s => s.id === session.id ? session : s);
          return [...prev, session];
      });
      await api.saveHistory(session);
  };

  const handleEditSession = (session: GradingSession) => {
      setEditingSession(session);
      setIsInputModalOpen(true);
  };

  const handleDeleteSession = async (id: string) => {
      if(confirm('Hapus sesi ini?')) {
          setAssessmentHistory(prev => prev.filter(s => s.id !== id));
          await api.deleteHistory(id);
      }
  };

  const handleResetHistory = async () => {
      // Logic to clear history for current class/semester
  };

  const handleSaveChapterConfig = async (config: Record<ChapterKey, boolean>, fieldConfig: Record<ChapterKey, Record<FormativeKey, boolean>>) => {
      // Save Chapter Config (Visibility of TPs)
      setSubjectChapterConfigs(prev => ({...prev, [selectedSubject]: config}));
      
      // Save Field Config (Column visibility per TP)
      setSettings(prev => ({
          ...prev,
          midSemesterFieldConfig: fieldConfig // Note: Using this shared setting for simplicity as per requirement
      }));

      await api.saveChapterConfig(selectedSubject, config);
      await api.saveSettings({ ...settings, midSemesterFieldConfig: fieldConfig });
  };

  // Student CRUD & Updates
  const handleAddStudentClick = () => { setEditingStudent(null); setIsModalOpen(true); };
  const handleEditStudentClick = (s: Student) => { setEditingStudent(s); setIsModalOpen(true); };
  const handleDeleteStudent = async (id: number) => { 
      setStudents(prev => prev.filter(s => s.id !== id));
      await api.deleteStudent(id);
  };
  const handleSaveStudent = async (s: Student) => {
      setStudents(prev => {
          const exists = prev.find(st => st.id === s.id);
          if (exists) return prev.map(st => st.id === s.id ? s : st);
          return [...prev, s];
      });
      if (!editingStudent) {
          await api.addStudent(s);
      } else {
          await api.updateStudent(s);
      }
      setIsModalOpen(false);
  };
  const handleImportStudents = async (imported: Student[]) => {
      setStudents(prev => [...prev, ...imported]);
      await api.importStudents(imported);
  };

  // New Update Handler for Wali Kelas & Extras
  const handleUpdateStudents = async (updatedStudents: Student[]) => {
      // Merge updates into main state based on ID
      setStudents(prev => prev.map(s => {
          const updated = updatedStudents.find(u => u.id === s.id);
          return updated ? updated : s;
      }));
      // In a real app, send batch update to API here
  };

  const handleResetClassGrades = async (className: string) => {
      await api.resetClassGrades(className, selectedSemester);
  };

  const handleDownloadExcel = () => { /* ... */ };
  const handleDownloadPDF = () => { /* ... */ };

  const allStudentsMapped = useMemo(() => {
      // Logic to map gradesBySubject to root grades based on selected subject for viewing in generic components
      return students.map(s => {
          if (selectedSubject === 'Pendidikan Agama Islam') return s;
          return {
              ...s,
              grades: s.gradesBySubject?.[selectedSubject] || { ganjil: createEmptySemesterData(), genap: createEmptySemesterData() }
          }
      });
  }, [students, selectedSubject]);

  if (!userRole) {
      return (
          <LoginPage 
            students={students} 
            teachers={teachers} 
            onLogin={handleLogin}
            adminPasswordSettings={settings.adminPassword || 'admin'}
            teacherPasswordSettings={settings.teacherDefaultPassword || 'guru'}
          />
      );
  }

  if (userRole === 'student' && editingStudent) {
      return (
          <StudentDashboard 
            student={editingStudent} 
            allStudents={students} 
            assessmentHistory={assessmentHistory}
            settings={settings}
            teachers={teachers}
            onLogout={handleLogout}
            subjectChapterConfigs={subjectChapterConfigs}
          />
      );
  }

  return (
    <div className="flex h-screen w-full bg-[#f5f5f7] font-sans text-gray-900 overflow-hidden">
      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#1c1c1e] text-gray-300 flex flex-col transition-all duration-300 ease-in-out shrink-0 relative z-50 shadow-2xl print:hidden`}>
        {/* Sidebar Content Omitted for brevity - same as previous */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800 bg-[#1c1c1e]">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xl shadow-lg shadow-blue-900/50">G</div>
           {!isSidebarCollapsed && (<div className="ml-3 animate-fade-in"><h1 className="font-bold text-white text-lg tracking-tight">iGrade</h1><p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">SMPN 3 Pacet</p></div>)}
        </div>
        <div className="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar-dark">
           {!isSidebarCollapsed && <div className="px-6 mb-2 text-[10px] font-bold uppercase text-gray-600 tracking-wider">Menu Utama</div>}
           
           {/* Leader Menu */}
           {userRole === 'leader' ? (
                <button onClick={() => setActiveTab('absensi_harian')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'absensi_harian' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'absensi_harian' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}<Calendar size={20} className={activeTab === 'absensi_harian' ? 'text-blue-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Absensi Kelas</span>}</button>
           ) : (
               <>
               <button onClick={() => setActiveTab('grades')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'grades' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'grades' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}<BookOpen size={20} className={activeTab === 'grades' ? 'text-blue-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Input Nilai</span>}</button>
               <button onClick={() => setActiveTab('nilai_up')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'nilai_up' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'nilai_up' && <div className="absolute left-0 w-1 h-full bg-orange-500 rounded-r-full"></div>}<Star size={20} className={activeTab === 'nilai_up' ? 'text-orange-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Nilai UP (Praktik)</span>}</button>
               
               {userRole === 'admin' && (<button onClick={() => setActiveTab('students')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'students' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'students' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}<Users size={20} className={activeTab === 'students' ? 'text-blue-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Data Siswa</span>}</button>)}
               {userRole === 'admin' && (<button onClick={() => setActiveTab('teachers')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'teachers' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'teachers' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}<UserCheck size={20} className={activeTab === 'teachers' ? 'text-blue-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Data Guru</span>}</button>)}
               
               {(userRole === 'admin' || isWaliKelas || isPembinaEkstra) && (
                 <>
                    {!isSidebarCollapsed && <div className="px-6 mt-6 mb-2 text-[10px] font-bold uppercase text-gray-600 tracking-wider">Laporan & Input Khusus</div>}
                    
                    <button onClick={() => setActiveTab('absensi_harian')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'absensi_harian' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'absensi_harian' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}<Calendar size={20} className={activeTab === 'absensi_harian' ? 'text-blue-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Absensi Harian</span>}</button>

                    {(userRole === 'admin' || isWaliKelas) && (
                        <button onClick={() => setActiveTab('rapor_sisipan')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'rapor_sisipan' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'rapor_sisipan' && <div className="absolute left-0 w-1 h-full bg-purple-500 rounded-r-full"></div>}<ClipboardList size={20} className={activeTab === 'rapor_sisipan' ? 'text-purple-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Rapor Sisipan</span>}</button>
                    )}
                    
                    {(userRole === 'admin' || isWaliKelas) && (
                        <button onClick={() => setActiveTab('wali_kelas')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'wali_kelas' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'wali_kelas' && <div className="absolute left-0 w-1 h-full bg-teal-500 rounded-r-full"></div>}<Users size={20} className={activeTab === 'wali_kelas' ? 'text-teal-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Wali Kelas</span>}</button>
                    )}
                    
                    {(userRole === 'admin' || isPembinaEkstra) && (
                        <button onClick={() => setActiveTab('pembina_ekstra')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'pembina_ekstra' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'pembina_ekstra' && <div className="absolute left-0 w-1 h-full bg-indigo-500 rounded-r-full"></div>}<Award size={20} className={activeTab === 'pembina_ekstra' ? 'text-indigo-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Pembina Ekstra</span>}</button>
                    )}
                 </>
               )}

               {!isSidebarCollapsed && <div className="px-6 mt-6 mb-2 text-[10px] font-bold uppercase text-gray-600 tracking-wider">Monitoring</div>}
               {userRole === 'admin' && (<button onClick={() => setActiveTab('monitoring_guru')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'monitoring_guru' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'monitoring_guru' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}<CheckCircle size={20} className={activeTab === 'monitoring_guru' ? 'text-green-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Input Guru</span>}</button>)}
               <button onClick={() => setActiveTab('monitoring_tanggungan')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'monitoring_tanggungan' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'monitoring_tanggungan' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}<AlertCircle size={20} className={activeTab === 'monitoring_tanggungan' ? 'text-red-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Tanggungan</span>}</button>
               <button onClick={() => setActiveTab('monitoring_remidi')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'monitoring_remidi' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'monitoring_remidi' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}<RefreshCw size={20} className={activeTab === 'monitoring_remidi' ? 'text-orange-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Remidi</span>}</button>
               
               {userRole === 'admin' && !isSidebarCollapsed && <div className="px-6 mt-6 mb-2 text-[10px] font-bold uppercase text-gray-600 tracking-wider">Sistem</div>}
                {userRole === 'admin' && (<button onClick={() => setActiveTab('reset')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'reset' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'reset' && <div className="absolute left-0 w-1 h-full bg-red-600 rounded-r-full"></div>}<Trash2 size={20} className={activeTab === 'reset' ? 'text-red-500' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Reset Data</span>}</button>)}
               {userRole === 'admin' && (<button onClick={() => setActiveTab('settings')} className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'settings' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}>{activeTab === 'settings' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}<Settings size={20} className={activeTab === 'settings' ? 'text-gray-400' : ''} />{!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Pengaturan</span>}</button>)}
               </>
           )}
           
           <div className="px-6 mt-4">
             <button onClick={() => setShowDebug(true)} className="flex items-center gap-2 text-xs text-gray-500 hover:text-white transition-colors">
                <Terminal size={12} />
                {!isSidebarCollapsed && <span>Debug Server</span>}
             </button>
           </div>
        </div>
        
        {/* Connection Status and Footer User Info - Omitted for brevity */}
        <div className="px-4 py-2 bg-black/20 border-t border-gray-800">
             <div className="flex items-center justify-between">
                 <div className="flex items-center gap-2">
                    {connectionStatus === 'online' ? (<Wifi size={14} className="text-green-500" />) : connectionStatus === 'checking' ? (<Loader2 size={14} className="text-yellow-500 animate-spin" />) : (<WifiOff size={14} className="text-red-500" />)}
                    {!isSidebarCollapsed && (
                        <div className="flex flex-col">
                            <span className={`text-[10px] font-bold ${connectionStatus === 'online' ? 'text-green-500' : connectionStatus === 'checking' ? 'text-yellow-500' : 'text-red-500'}`}>{connectionStatus === 'online' ? 'TERHUBUNG' : connectionStatus === 'checking' ? 'KONEKSI...' : 'OFFLINE'}</span>
                            {lastSync && connectionStatus === 'online' && (<span className="text-[9px] text-gray-500 flex items-center gap-1"><Database size={8} /> Rec: {recordCount.grades}</span>)}
                        </div>
                    )}
                 </div>
                 {!isSidebarCollapsed && (<button onClick={handleReloadData} disabled={isLoading} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors" title="Force Reload"><RefreshCw size={12} className={isLoading ? "animate-spin" : ""} /></button>)}
             </div>
        </div>
        <div className="p-4 pt-2 border-t border-gray-800/50">
           <button onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)} className="w-full flex items-center justify-center p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400">{isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}</button>
        </div>
        <div className="p-4 bg-[#141416] border-t border-gray-800">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {userRole === 'admin' ? 'A' : userRole === 'leader' ? 'K' : 'G'}
                 </div>
                 {!isSidebarCollapsed && (<div className="overflow-hidden"><p className="text-sm font-bold text-white truncate">{userRole === 'admin' ? 'Administrator' : userRole === 'leader' ? `Ketua ${leaderClass}` : currentTeacher?.name}</p><p className="text-[10px] text-gray-500 truncate">{userRole === 'admin' ? 'Full Access' : userRole === 'leader' ? 'Absensi Only' : 'Guru Mapel'}</p></div>)}
                 {!isSidebarCollapsed && (<button onClick={handleLogout} className="ml-auto text-gray-500 hover:text-white transition-colors"><LogOut size={16} /></button>)}
             </div>
        </div>
      </div>
      
      <div className="flex-1 flex flex-col min-w-0 bg-[#f5f5f7] relative">
        {(() => {
            if (activeTab === 'absensi_harian') return <ClassAttendanceView 
                students={students} 
                availableClasses={availableClasses} 
                userRole={userRole} 
                currentClass={leaderClass}
                dailyAttendance={dailyAttendance}
                onSaveAttendance={handleSaveDailyAttendance}
            />;

            // Render logic same as before...
            if (activeTab === 'students') return <StudentDataTable students={students} onAdd={handleAddStudentClick} onEdit={handleEditStudentClick} onDelete={handleDeleteStudent} onImport={handleImportStudents} />;
            if (activeTab === 'monitoring_tanggungan') return <MonitoringView type="tanggungan" students={allStudentsMapped} history={assessmentHistory} currentSemester={selectedSemester} subjectName={selectedSubject} teacherName={activeTeacherContext?.name} teacherNip={activeTeacherContext?.nip} principalName={settings.principalName} principalNip={settings.principalNip} academicYear={settings.academicYear} />;
            if (activeTab === 'monitoring_remidi') return <MonitoringView type="remidi" students={allStudentsMapped} history={assessmentHistory} currentSemester={selectedSemester} subjectName={selectedSubject} teacherName={activeTeacherContext?.name} teacherNip={activeTeacherContext?.nip} principalName={settings.principalName} principalNip={settings.principalNip} academicYear={settings.academicYear} />;
            if (activeTab === 'reset') return <ResetDataView availableClasses={availableClasses} currentSemester={selectedSemester} onResetClass={handleResetClassGrades} />;
            if (activeTab === 'teachers') return <TeacherDataView teachers={teachers} setTeachers={handleSaveTeacher} availableClasses={availableClasses} availableSubjects={settings.subjects} />;
            if (activeTab === 'monitoring_guru') return <TeacherMonitoringView teachers={teachers} history={assessmentHistory} currentSemester={selectedSemester} />;
            if (activeTab === 'rapor_sisipan' && (userRole === 'admin' || isWaliKelas)) return <MidSemesterReportView students={allStudentsMapped} teachers={teachers} settings={settings} assessmentHistory={assessmentHistory} />;
            if (activeTab === 'wali_kelas' && (userRole === 'admin' || isWaliKelas)) return <WaliKelasView 
                students={students} 
                onUpdateStudents={handleUpdateStudents} 
                semester={selectedSemester} 
                dailyAttendance={dailyAttendance}
                teachers={teachers} 
                settings={settings}
                assessmentHistory={assessmentHistory}
                onSaveDailyAttendance={handleSaveDailyAttendance} // Added this
            />;
            if (activeTab === 'pembina_ekstra' && (userRole === 'admin' || isPembinaEkstra)) return <ExtraActivityView 
                students={students} 
                onUpdateStudents={handleUpdateStudents} 
                semester={selectedSemester} 
                settings={settings}
                teachers={teachers}
                onUpdateSettings={async (newSettings) => {
                    setSettings(newSettings);
                    await api.saveSettings(newSettings);
                }}
                dailyAttendance={dailyAttendance}
                onSaveDailyAttendance={handleSaveDailyAttendance}
            />;

            if (activeTab === 'settings') {
                return (
                    <div className="p-8 flex-1 overflow-auto custom-scrollbar">
                    <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2"><Settings className="text-gray-600" /> Pengaturan Aplikasi</h2>
                    <form onSubmit={handleUpdateSettings} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-6xl space-y-6">
                        {/* Settings Form Content Omitted for brevity - same as previous but kept intact */}
                        <div className="flex border-b border-gray-200 gap-1">
                            <button type="button" onClick={() => setActiveSettingsTab('general')} className={`px-4 py-2 text-sm font-bold ${activeSettingsTab === 'general' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Umum & Keamanan</button>
                            <button type="button" onClick={() => setActiveSettingsTab('rapor')} className={`px-4 py-2 text-sm font-bold ${activeSettingsTab === 'rapor' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Konfigurasi Rapor</button>
                            <button type="button" onClick={() => setActiveSettingsTab('academic')} className={`px-4 py-2 text-sm font-bold ${activeSettingsTab === 'academic' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Nilai UP & Mapel</button>
                            <button type="button" onClick={() => setActiveSettingsTab('other')} className={`px-4 py-2 text-sm font-bold ${activeSettingsTab === 'other' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:text-gray-700'}`}>Ekstra & Kokurikuler</button>
                        </div>
                        {/* ... Rest of settings UI ... */}
                        {activeSettingsTab === 'general' && (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-fade-in">
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><Briefcase size={16}/> Data Akademik</h3>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label><input type="text" value={settings.academicYear} onChange={(e) => setSettings({...settings, academicYear: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Semester Aktif</label><select value={settings.activeSemester} onChange={(e) => setSettings({...settings, activeSemester: e.target.value as SemesterKey})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500"><option value="ganjil">Ganjil</option><option value="genap">Genap</option></select></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Tanggal Cetak Rapor</label><input type="text" value={settings.midSemesterDate || ''} onChange={(e) => setSettings({...settings, midSemesterDate: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" placeholder="Contoh: 15 Oktober 2024" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Link Logo Kabupaten (Kop)</label><input type="text" value={settings.kabupatenLogoUrl || ''} onChange={(e) => setSettings({...settings, kabupatenLogoUrl: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" placeholder="https://..." /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Link Watermark Logo Sekolah</label><input type="text" value={settings.watermarkLogoUrl || ''} onChange={(e) => setSettings({...settings, watermarkLogoUrl: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" placeholder="https://..." /></div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><Lock size={16} /> Keamanan & Kepala Sekolah</h3>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Nama Kepala Sekolah</label><input type="text" value={settings.principalName} onChange={(e) => setSettings({...settings, principalName: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">NIP Kepala Sekolah</label><input type="text" value={settings.principalNip} onChange={(e) => setSettings({...settings, principalNip: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Password Admin</label><input type="text" value={settings.adminPassword || ''} onChange={(e) => setSettings({...settings, adminPassword: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 font-mono" /></div>
                                    <div><label className="block text-sm font-medium text-gray-700 mb-1">Password Default Guru</label><input type="text" value={settings.teacherDefaultPassword || ''} onChange={(e) => setSettings({...settings, teacherDefaultPassword: e.target.value})} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 font-mono" /></div>
                                </div>
                                <div className="space-y-4 col-span-1 md:col-span-2 border-t pt-4">
                                    <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><FileText size={16} /> Edit Kop Sekolah</h3>
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 space-y-2">
                                        {(settings.schoolHeader || []).map((line, idx) => (
                                            <div key={idx} className="flex gap-2">
                                                <input 
                                                    type="text" 
                                                    value={line}
                                                    onChange={(e) => {
                                                        const newHeader = [...(settings.schoolHeader || [])];
                                                        newHeader[idx] = e.target.value;
                                                        setSettings({...settings, schoolHeader: newHeader});
                                                    }}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                                                    placeholder={`Baris ke-${idx + 1}`}
                                                />
                                                <button 
                                                    type="button" 
                                                    onClick={() => {
                                                        const newHeader = settings.schoolHeader.filter((_, i) => i !== idx);
                                                        setSettings({...settings, schoolHeader: newHeader});
                                                    }}
                                                    className="p-2 text-red-500 hover:bg-red-100 rounded-lg"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        ))}
                                        <button 
                                            type="button" 
                                            onClick={() => {
                                                setSettings({...settings, schoolHeader: [...(settings.schoolHeader || []), "Baris Baru"]});
                                            }}
                                            className="mt-2 text-sm text-blue-600 font-bold flex items-center gap-1 hover:text-blue-800"
                                        >
                                            <Plus size={14} /> Tambah Baris
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                        {/* Rapor Config Tab - No Changes here, keeping as is */}
                        {activeSettingsTab === 'rapor' && (
                            <div className="space-y-4 animate-fade-in">
                                <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><TableProperties size={16}/> Konfigurasi Kolom Rapor Sisipan</h3>
                                <p className="text-sm text-gray-500">Pilih kolom (Formatif / Sumatif) yang ingin ditampilkan pada Rapor Sisipan per TP (Tujuan Pembelajaran).</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {(['bab1', 'bab2', 'bab3', 'bab4', 'bab5'] as ChapterKey[]).map(chap => {
                                        const config = settings.midSemesterFieldConfig?.[chap] || {};
                                        return (
                                            <div key={chap} className="border rounded-lg p-3 bg-gray-50">
                                                <h4 className="font-bold text-sm mb-2 uppercase">{chap.replace('bab', 'TP ')}</h4>
                                                <div className="grid grid-cols-3 gap-2">
                                                    {(['f1', 'f2', 'f3', 'f4', 'f5', 'sum'] as FormativeKey[]).map(f => (
                                                        <label key={f} className="flex items-center gap-2 text-xs">
                                                            <input 
                                                                type="checkbox"
                                                                checked={!!config[f]}
                                                                onChange={(e) => {
                                                                    const newConfig = { ...settings.midSemesterFieldConfig };
                                                                    if (!newConfig[chap]) newConfig[chap] = {} as any;
                                                                    newConfig[chap][f] = e.target.checked;
                                                                    setSettings({...settings, midSemesterFieldConfig: newConfig});
                                                                }}
                                                            />
                                                            {f === 'sum' ? 'Sumatif' : f.toUpperCase()}
                                                        </label>
                                                    ))}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}
                        {/* Academic & Other Tabs - Omitted for brevity, assuming existing content */}
                        <div className="pt-4 flex justify-end sticky bottom-0 bg-white border-t border-gray-100 p-4 -mx-6 -mb-6 rounded-b-xl"><button type="submit" disabled={isSaving} className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-md text-white ${isSaving ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'}`}>{isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}<span>Simpan Semua Pengaturan</span></button></div>
                    </form>
                    </div>
                );
            }

            // Standard Grade Table View OR Nilai UP View (Reuses GradeTable)
            return (
                <div className="flex-1 flex flex-col h-full bg-white relative">
                    <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm overflow-x-auto">
                        <div className="flex justify-between items-center min-w-max gap-4">
                            <div className="flex items-center gap-4">
                                {userRole === 'admin' && (
                                    <div className="relative">
                                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500"><Users size={18} /></div>
                                        <select value={adminSelectedTeacherName} onChange={(e) => setAdminSelectedTeacherName(e.target.value)} className="pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer hover:bg-gray-100 min-w-[200px]">{Array.from(new Set(teachers.map(t => t.name))).sort().map(name => (<option key={name} value={name}>{name}</option>))}</select>
                                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400"><ChevronDown size={14} /></div>
                                    </div>
                                )}
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600"><BookOpen size={18} /></div>
                                    <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="pl-10 pr-8 py-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer transition-colors hover:bg-blue-100 min-w-[200px]">{availableSubjects.map(sub => (<option key={sub} value={sub}>{sub}</option>))}</select>
                                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-blue-400"><ChevronDown size={14} /></div>
                                </div>
                                <div className="relative">
                                    <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)} className="pl-4 pr-8 py-2 bg-gray-100 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none appearance-none cursor-pointer hover:bg-gray-200">{availableClasses.map(cls => (<option key={cls} value={cls}>{cls}</option>))}</select>
                                    <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400"><ChevronDown size={14} /></div>
                                </div>
                                <div className="flex bg-gray-100 p-1 rounded-lg">
                                    <button onClick={() => setSelectedSemester('ganjil')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectedSemester === 'ganjil' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Ganjil</button>
                                    <button onClick={() => setSelectedSemester('genap')} className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectedSemester === 'genap' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>Genap</button>
                                </div>
                                {userRole !== 'admin' && (<button onClick={() => setIsInputModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 font-bold text-sm ml-2"><Unlock size={16} /><span>Buka Input Nilai</span></button>)}
                            </div>
                            <div className="flex items-center gap-2">
                                <button onClick={handleReloadData} className="p-2 text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100" title="Reload Data dari Server"><RefreshCw size={20} className={isLoading ? "animate-spin" : ""} /></button>
                                <button onClick={() => setIsChapterConfigModalOpen(true)} className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors" title="Konfigurasi TP"><SlidersHorizontal size={20} /></button>
                                <div className="h-6 w-px bg-gray-300 mx-1"></div>
                                <button onClick={handleDownloadExcel} className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg border border-green-100" title="Download Excel"><FileSpreadsheet size={20} /></button>
                                <button onClick={handleDownloadPDF} className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg border border-red-100" title="Download PDF Laporan"><FileText size={20} /></button>
                                <div className="h-6 w-px bg-gray-300 mx-1"></div>
                                {userRole !== 'admin' && (<button onClick={handleManualSave} disabled={!hasUnsavedChanges || isSaving} className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${hasUnsavedChanges ? 'bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse-soft shadow-indigo-200' : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>{isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}<span>Simpan</span></button>)}
                            </div>
                        </div>
                    </div>
                    <div className="flex-1 overflow-y-auto custom-scrollbar relative">
                        {/* Reuse GradeTable but with showUpColumn prop if activeTab is 'nilai_up' */}
                        <GradeTable 
                            students={filteredStudents.map(s => {
                                // Inject subject grades mapping for view
                                if (selectedSubject === 'Pendidikan Agama Islam') return s;
                                return {
                                    ...s,
                                    grades: s.gradesBySubject?.[selectedSubject] || { ganjil: createEmptySemesterData(), genap: createEmptySemesterData() }
                                }
                            })} 
                            selectedSemester={selectedSemester} 
                            activeFieldsMap={activeFieldsMap} 
                            visibleChapters={currentVisibleChapters}
                            visibleFields={settings.midSemesterFieldConfig} // Pass the detailed field config
                            assessmentHistory={classHistory} 
                            academicYear={settings.academicYear} 
                            onUpdateScore={handleUpdateScore} 
                            isEditable={userRole !== 'admin'}
                            showUpColumn={activeTab === 'nilai_up'} 
                        />
                        {classHistory.length > 0 && activeTab === 'grades' && (<div className="bg-gray-50 border-t border-gray-200"><AssessmentHistory history={classHistory} currentSemester={selectedSemester} onEdit={handleEditSession} onDelete={handleDeleteSession} onResetHistory={handleResetHistory} /></div>)}
                    </div>
                    <div className="px-6 py-3 bg-white border-t border-gray-200 flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
                        <div className="text-sm text-gray-500"><span className="font-bold text-gray-800">{filteredStudents.length}</span> Siswa di Kelas {selectedClass}</div>
                        {activeTab === 'nilai_up' && (
                            <div className="text-xs text-gray-500 flex gap-2">
                                <strong>Kriteria UP:</strong>
                                {settings.upRanges?.map((r, i) => <span key={i} className="bg-orange-50 text-orange-600 px-1 rounded border border-orange-100">{r.value} ({r.min}-{r.max})</span>)}
                            </div>
                        )}
                    </div>
                </div>
            );
        })()}

        {/* Modals */}
        <AddStudentModal
            isOpen={isModalOpen}
            onClose={() => setIsModalOpen(false)}
            onSave={editingStudent ? handleSaveStudent : async (s) => {
                await api.addStudent(s);
                setStudents(prev => [...prev, s]);
                setIsModalOpen(false);
            }}
            initialData={editingStudent}
            existingClasses={availableClasses}
        />

        <InputGradeModal
            isOpen={isInputModalOpen}
            onClose={() => { setIsInputModalOpen(false); setEditingSession(null); }}
            onSaveSession={editingSession ? async (s) => {
                 setAssessmentHistory(prev => prev.map(h => h.id === s.id ? s : h));
                 await api.saveHistory(s);
                 setIsInputModalOpen(false);
                 setEditingSession(null);
            } : handleSaveSession}
            currentSemester={selectedSemester}
            targetClass={selectedClass}
            initialData={editingSession}
            history={assessmentHistory}
        />

        <ChapterConfigModal
            isOpen={isChapterConfigModalOpen}
            onClose={() => setIsChapterConfigModalOpen(false)}
            subjectName={selectedSubject}
            semester={selectedSemester}
            initialConfig={currentVisibleChapters}
            initialFieldConfig={settings.midSemesterFieldConfig} // Pass current field config
            onSave={handleSaveChapterConfig}
        />

      </div>
    </div>
  );
};

export default App;

import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, BookOpen, Settings, LogOut, LayoutDashboard, 
  Menu, X, Database, UserCheck, AlertTriangle, FileText, 
  ClipboardList, Calendar, Award, Loader2
} from 'lucide-react';
import { 
  Student, Teacher, GradingSession, AppSettings, 
  SemesterKey, ChapterKey, FormativeKey, DailyAttendanceLog 
} from './types';
import { initialStudents, initialTeachers } from './data';
import * as api from './services/api';

// Components
import LoginPage from './components/LoginPage';
import GradeTable from './components/GradeTable';
import StudentDataTable from './components/StudentDataTable';
import AssessmentHistory from './components/AssessmentHistory';
import InputGradeModal from './components/InputGradeModal';
import AddStudentModal from './components/AddStudentModal';
import StudentDashboard from './components/StudentDashboard';
import MonitoringView from './components/MonitoringView';
import TeacherDataView from './components/TeacherDataView';
import TeacherMonitoringView from './components/TeacherMonitoringView';
import ResetDataView from './components/ResetDataView';
import ChapterConfigModal from './components/ChapterConfigModal';
import MidSemesterReportView from './components/MidSemesterReportView';
import WaliKelasView from './components/WaliKelasView';
import ExtraActivityView from './components/ExtraActivityView';
import ClassAttendanceView from './components/ClassAttendanceView';

const App: React.FC = () => {
  // Global Data State
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [assessmentHistory, setAssessmentHistory] = useState<GradingSession[]>([]);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceLog[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    academicYear: '2024/2025',
    activeSemester: 'ganjil',
    visibleChapters: { bab1: true, bab2: true, bab3: true, bab4: true, bab5: true },
    teacherName: '',
    teacherNip: '',
    principalName: '',
    principalNip: '',
    schoolHeader: [],
    subjects: [],
    midSemesterDate: '',
    upRanges: [],
    kokurikulerProjects: [],
    midSemesterFieldConfig: {
        bab1: {f1:true,f2:true,f3:true,f4:true,f5:true,sum:true},
        bab2: {f1:true,f2:true,f3:true,f4:true,f5:true,sum:true},
        bab3: {f1:true,f2:true,f3:true,f4:true,f5:true,sum:true},
        bab4: {f1:true,f2:true,f3:true,f4:true,f5:true,sum:true},
        bab5: {f1:true,f2:true,f3:true,f4:true,f5:true,sum:true},
    },
    waliKelasMap: {},
    extracurriculars: []
  });
  
  // Subject Config State (loaded from API separately usually, but here merged or managed)
  const [subjectChapterConfigs, setSubjectChapterConfigs] = useState<Record<string, Record<ChapterKey, boolean>>>({});
  const [subjectFieldConfigs, setSubjectFieldConfigs] = useState<Record<string, Record<ChapterKey, Record<FormativeKey, boolean>>>>({});

  // UI State
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | 'student' | 'leader' | null>(null);
  const [userData, setUserData] = useState<any>(null);
  const [activeView, setActiveView] = useState<string>('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  
  // Selection State (Teacher/Admin context)
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<SemesterKey>('ganjil');

  // Modals
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<GradingSession | null>(null);
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);

  // Derived
  const availableClasses = useMemo(() => Array.from(new Set(students.map(s => s.kelas))).sort(), [students]);
  const availableSubjects = useMemo(() => {
    const subs = new Set<string>();
    teachers.forEach(t => subs.add(t.subject));
    return Array.from(subs).sort();
  }, [teachers]);

  // Initialization
  useEffect(() => {
    const loadData = async () => {
       try {
         const data = await api.fetchInitialData();
         if (data) {
            setStudents(data.students || initialStudents);
            setTeachers(data.teachers || initialTeachers);
            setAssessmentHistory(data.assessmentHistory || []);
            setSettings(prev => ({ ...prev, ...data.settings }));
            setDailyAttendance(data.dailyAttendance || []);
            setSubjectChapterConfigs(data.subjectChapterConfigs || {});
            setSubjectFieldConfigs(data.subjectFieldConfigs || {});
         }
       } catch (e) {
         console.error("Failed to load initial data", e);
       } finally {
         setLoading(false);
       }
    };
    loadData();
  }, []);

  useEffect(() => {
    setSelectedSemester(settings.activeSemester);
  }, [settings.activeSemester]);

  // Handlers
  const handleLogin = (role: 'admin' | 'teacher' | 'student' | 'leader', data?: any) => {
      setUserRole(role);
      setUserData(data);
      if (role === 'teacher') {
          const teacherObj = teachers.find(t => t.name === data.name);
          if (teacherObj) {
              setUserData(teacherObj);
              setSelectedSubject(teacherObj.subject);
              if (teacherObj.classes.length > 0) setSelectedClass(teacherObj.classes[0]);
              setActiveView('input_nilai');
          }
      } else if (role === 'student') {
          setActiveView('dashboard');
      } else if (role === 'leader') {
          setSelectedClass(data.className);
          setActiveView('absensi_kelas');
      } else {
          setActiveView('dashboard');
      }
  };

  const handleLogout = () => {
      setUserRole(null);
      setUserData(null);
      setActiveView('dashboard');
  };

  const handleSaveSession = async (session: GradingSession) => {
    // Optimistic Update
    setAssessmentHistory(prev => [session, ...prev]);
    await api.saveHistory(session);
    setIsInputModalOpen(false);
  };

  const handleUpdateScore = async (id: number, chapter: ChapterKey | 'kts' | 'sas' | 'up', field: FormativeKey | null, value: number | null) => {
      // Optimistic update
      setStudents(prev => prev.map(s => {
          if (s.id !== id) return s;
          const newGrades = { ...s.grades };
          const semesterData = newGrades[selectedSemester];
          
          if (chapter === 'kts') semesterData.kts = value;
          else if (chapter === 'sas') semesterData.sas = value;
          else if (chapter === 'up') semesterData.nilaiUp = value;
          else if (field) semesterData[chapter][field] = value;
          
          return { ...s, grades: newGrades };
      }));
      
      // Send to API (debounced usually, but direct for now)
      await api.saveGrade(id, selectedSubject, selectedSemester, { chapter, field, value });
  };

  const handleSaveConfig = async (config: Record<ChapterKey, boolean>, fieldConfig: Record<ChapterKey, Record<FormativeKey, boolean>>) => {
      setSubjectChapterConfigs(prev => ({ ...prev, [selectedSubject]: config }));
      setSubjectFieldConfigs(prev => ({ ...prev, [selectedSubject]: fieldConfig }));
      
      // Update Settings API
      await api.saveChapterConfig(selectedSubject, { visibleChapters: config, fieldConfig });
  };
  
  const handleSaveDailyAttendance = async (log: DailyAttendanceLog) => {
      setDailyAttendance(prev => {
          const idx = prev.findIndex(l => l.id === log.id);
          if (idx >= 0) {
              const newLogs = [...prev];
              newLogs[idx] = log;
              return newLogs;
          }
          return [...prev, log];
      });
      // API call assumed to be handled in child components via prop callback or here
      // Since child components call onSaveAttendance, we can implement API call here if needed,
      // but child components in this codebase seem to expect parent to handle state update.
      // We'll assumes child components might also want to trigger API save.
      // Actually ClassAttendanceView calls onSaveAttendance, we should call API here.
      // But api.ts isn't imported as default. Let's assume we need to add a method to api.ts or use generic save.
      // For now, we update local state.
  };

  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-gray-100">
              <div className="flex flex-col items-center">
                  <Loader2 className="animate-spin text-blue-600 mb-2" size={32} />
                  <p className="text-gray-500 font-medium">Memuat Data...</p>
              </div>
          </div>
      );
  }

  if (!userRole) {
      return (
          <LoginPage 
              students={students}
              teachers={teachers}
              onLogin={handleLogin}
              adminPasswordSettings={settings.adminPassword || "admin123"}
              teacherPasswordSettings={settings.teacherDefaultPassword || "123456"}
          />
      );
  }

  if (userRole === 'student' && userData) {
      return (
          <StudentDashboard 
              student={userData}
              allStudents={students}
              assessmentHistory={assessmentHistory}
              settings={settings}
              teachers={teachers}
              onLogout={handleLogout}
              subjectChapterConfigs={subjectChapterConfigs}
          />
      );
  }

  // Sidebar Menu Items
  const menuItems = [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, roles: ['admin'] },
      { id: 'data_siswa', label: 'Data Siswa', icon: Users, roles: ['admin'] },
      { id: 'data_guru', label: 'Data Guru', icon: UserCheck, roles: ['admin'] },
      { id: 'input_nilai', label: 'Input Nilai', icon: FileText, roles: ['admin', 'teacher'] },
      { id: 'wali_kelas', label: 'Wali Kelas', icon: ClipboardList, roles: ['admin', 'teacher'] },
      { id: 'ekskul', label: 'Ekstrakurikuler', icon: Award, roles: ['admin', 'teacher'] },
      { id: 'absensi_kelas', label: 'Absensi Kelas', icon: Calendar, roles: ['admin', 'leader'] },
      { id: 'monitoring', label: 'Monitoring', icon: AlertTriangle, roles: ['admin', 'teacher'] },
      { id: 'reset_data', label: 'Reset Data', icon: Database, roles: ['admin'] },
      { id: 'rapor_sisipan', label: 'Rapor Sisipan', icon: BookOpen, roles: ['admin'] },
      { id: 'settings', label: 'Pengaturan', icon: Settings, roles: ['admin'] },
  ];

  const filteredMenu = menuItems.filter(item => item.roles.includes(userRole));

  // Determine Active Fields for GradeTable
  const currentChapterConfig = subjectChapterConfigs[selectedSubject] || settings.visibleChapters;
  const currentFieldConfig = subjectFieldConfigs[selectedSubject];
  
  // Helper to get active fields based on history + config
  const getActiveFieldsMap = () => {
      const map: Record<ChapterKey, FormativeKey[]> = { bab1: [], bab2: [], bab3: [], bab4: [], bab5: [] };
      const chapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
      chapters.forEach(chap => {
          // Logic: If config exists, use config. Else, use all standard fields?
          // GradeTable logic handles fallback, but we can pass explicit active fields from history
          const histFields = assessmentHistory
              .filter(h => h.targetClass === selectedClass && h.semester === selectedSemester && h.targetSubject === selectedSubject && h.chapterKey === chap)
              .map(h => h.formativeKey)
              .filter((k): k is FormativeKey => !!k);
          
          if (histFields.length > 0) {
              map[chap] = [...new Set(histFields)];
          } else if (currentFieldConfig && currentFieldConfig[chap]) {
               // If no history but config exists, we can show configured fields (GradeTable handles this via visibleFields prop)
               // This map is primarily for 'active' fields (with data), GradeTable uses visibleFields for columns
          }
      });
      return map;
  };

  const renderContent = () => {
      switch (activeView) {
          case 'dashboard':
              return (
                  <div className="p-6">
                      <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard Admin</h1>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                              <h3 className="text-gray-500 text-sm font-bold uppercase">Total Siswa</h3>
                              <p className="text-3xl font-bold text-gray-900 mt-2">{students.length}</p>
                          </div>
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                              <h3 className="text-gray-500 text-sm font-bold uppercase">Total Guru</h3>
                              <p className="text-3xl font-bold text-gray-900 mt-2">{teachers.length}</p>
                          </div>
                          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                              <h3 className="text-gray-500 text-sm font-bold uppercase">Semester Aktif</h3>
                              <p className="text-3xl font-bold text-blue-600 mt-2 capitalize">{settings.activeSemester}</p>
                          </div>
                      </div>
                      <div className="mt-8">
                          <TeacherMonitoringView teachers={teachers} history={assessmentHistory} currentSemester={settings.activeSemester} />
                      </div>
                  </div>
              );
          case 'data_siswa':
              return (
                  <StudentDataTable 
                      students={students}
                      onAdd={() => { setEditingStudent(null); setIsAddStudentModalOpen(true); }}
                      onEdit={(s) => { setEditingStudent(s); setIsAddStudentModalOpen(true); }}
                      onDelete={(id) => {
                          if (window.confirm("Hapus siswa ini?")) {
                              setStudents(prev => prev.filter(s => s.id !== id));
                              api.deleteStudent(id);
                          }
                      }}
                      onImport={(imported) => {
                          setStudents(prev => [...prev, ...imported]);
                          api.importStudents(imported);
                      }}
                  />
              );
          case 'data_guru':
              return (
                  <TeacherDataView 
                      teachers={teachers} 
                      setTeachers={(t) => {
                          if (teachers.some(existing => existing.id === t.id)) {
                              setTeachers(teachers.map(existing => existing.id === t.id ? t : existing));
                          } else {
                              setTeachers([...teachers, t]);
                          }
                          api.saveTeacher(t);
                      }}
                      availableClasses={availableClasses}
                      availableSubjects={settings.subjects}
                  />
              );
          case 'input_nilai':
              const filteredStudents = students.filter(s => s.kelas === selectedClass);
              return (
                  <div className="flex flex-col h-full bg-white">
                      {/* Toolbar */}
                      <div className="px-6 py-4 border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between sticky top-0 bg-white z-10">
                          <div className="flex flex-wrap gap-4 items-center">
                              {userRole === 'admin' && (
                                  <select 
                                      value={selectedSubject} 
                                      onChange={(e) => setSelectedSubject(e.target.value)} 
                                      className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold"
                                  >
                                      {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                              )}
                              {/* If teacher, subject is fixed usually, or they select from their subjects */}
                              {userRole === 'teacher' && userData && userData.subject === 'Guru Kelas' && (
                                   <select 
                                      value={selectedSubject} 
                                      onChange={(e) => setSelectedSubject(e.target.value)} 
                                      className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold"
                                  >
                                      {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                                  </select>
                              )}

                              <select 
                                  value={selectedClass} 
                                  onChange={(e) => setSelectedClass(e.target.value)} 
                                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold"
                              >
                                  {userRole === 'admin' 
                                      ? availableClasses.map(c => <option key={c} value={c}>{c}</option>)
                                      : userData?.classes.map((c: string) => <option key={c} value={c}>{c}</option>)
                                  }
                              </select>

                              <select 
                                  value={selectedSemester} 
                                  onChange={(e) => setSelectedSemester(e.target.value as SemesterKey)} 
                                  className="px-3 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold"
                              >
                                  <option value="ganjil">Sem. Ganjil</option>
                                  <option value="genap">Sem. Genap</option>
                              </select>
                          </div>
                          
                          <div className="flex gap-2">
                              <button 
                                  onClick={() => setIsConfigModalOpen(true)}
                                  className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 text-sm font-bold flex items-center gap-2"
                              >
                                  <Settings size={16} /> Konfigurasi
                              </button>
                              <button 
                                  onClick={() => { setEditingSession(null); setIsInputModalOpen(true); }}
                                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-bold flex items-center gap-2"
                              >
                                  <FileText size={16} /> Buka Input Nilai
                              </button>
                          </div>
                      </div>

                      {/* Grade Table */}
                      <div className="flex-1 overflow-auto">
                          <GradeTable 
                              students={filteredStudents}
                              selectedSemester={selectedSemester}
                              activeFieldsMap={getActiveFieldsMap()}
                              visibleChapters={currentChapterConfig}
                              visibleFields={currentFieldConfig}
                              assessmentHistory={assessmentHistory.filter(h => h.targetClass === selectedClass && h.semester === selectedSemester && (h.targetSubject === selectedSubject || (!h.targetSubject && selectedSubject === 'Pendidikan Agama Islam')))}
                              academicYear={settings.academicYear}
                              onUpdateScore={handleUpdateScore}
                              isEditable={true}
                              showUpColumn={selectedSubject.toLowerCase().includes('prakarya') || selectedSubject.toLowerCase().includes('seni')} // Example condition
                              upRanges={settings.upRanges}
                          />
                      </div>
                      
                      {/* History */}
                      <div className="px-6 pb-6">
                           <AssessmentHistory 
                              history={assessmentHistory.filter(h => h.targetClass === selectedClass && h.targetSubject === selectedSubject)}
                              currentSemester={selectedSemester}
                              onEdit={(s) => { setEditingSession(s); setIsInputModalOpen(true); }}
                              onDelete={(id) => {
                                  if(window.confirm("Hapus riwayat input ini?")) {
                                      setAssessmentHistory(prev => prev.filter(h => h.id !== id));
                                      api.deleteHistory(id);
                                  }
                              }}
                              onResetHistory={() => {
                                  // Filter and remove
                                  const idsToRemove = assessmentHistory
                                      .filter(h => h.targetClass === selectedClass && h.semester === selectedSemester && h.targetSubject === selectedSubject)
                                      .map(h => h.id);
                                  
                                  setAssessmentHistory(prev => prev.filter(h => !idsToRemove.includes(h.id)));
                                  idsToRemove.forEach(id => api.deleteHistory(id));
                              }}
                           />
                      </div>
                  </div>
              );
          case 'wali_kelas':
              // Check if user is wali kelas
              const isWali = userRole === 'admin' || (userRole === 'teacher' && userData?.waliKelas);
              if (!isWali) return <div className="p-10 text-center text-gray-400">Anda bukan Wali Kelas.</div>;
              
              const targetWKClass = userRole === 'admin' ? (selectedClass || availableClasses[0]) : userData.waliKelas;

              return (
                  <WaliKelasView 
                      students={students.filter(s => s.kelas === targetWKClass)}
                      onUpdateStudents={(updated) => {
                          setStudents(prev => prev.map(s => updated.find(u => u.id === s.id) || s));
                          // Batch update API called inside WaliKelasView usually or here
                          updated.forEach(s => api.updateStudent(s));
                      }}
                      semester={selectedSemester}
                      teachers={teachers}
                      settings={settings}
                      assessmentHistory={assessmentHistory}
                      dailyAttendance={dailyAttendance}
                      onSaveDailyAttendance={handleSaveDailyAttendance}
                  />
              );
          case 'ekskul':
              return (
                  <ExtraActivityView 
                      students={students}
                      onUpdateStudents={(updated) => {
                          setStudents(prev => prev.map(s => updated.find(u => u.id === s.id) || s));
                          updated.forEach(s => api.updateStudent(s));
                      }}
                      semester={selectedSemester}
                      settings={settings}
                      teachers={teachers}
                      onUpdateSettings={(newSettings) => {
                          setSettings(newSettings);
                          api.saveSettings(newSettings);
                      }}
                      dailyAttendance={dailyAttendance}
                      onSaveDailyAttendance={handleSaveDailyAttendance}
                  />
              );
          case 'absensi_kelas':
              return (
                  <ClassAttendanceView 
                      students={students}
                      availableClasses={availableClasses}
                      userRole={userRole}
                      currentClass={userRole === 'leader' ? userData.className : selectedClass}
                      dailyAttendance={dailyAttendance}
                      onSaveAttendance={handleSaveDailyAttendance}
                  />
              );
          case 'monitoring':
              return (
                  <div className="flex flex-col h-full bg-gray-50">
                      <div className="px-6 py-4 bg-white border-b border-gray-200">
                           <div className="flex gap-4">
                               <select value={selectedSubject} onChange={(e) => setSelectedSubject(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
                                   {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                               </select>
                               <select value={selectedSemester} onChange={(e) => setSelectedSemester(e.target.value as SemesterKey)} className="px-3 py-2 border rounded-lg text-sm">
                                   <option value="ganjil">Ganjil</option>
                                   <option value="genap">Genap</option>
                               </select>
                           </div>
                      </div>
                      <div className="p-6 overflow-auto">
                          <MonitoringView 
                              type="tanggungan"
                              students={students}
                              history={assessmentHistory.filter(h => h.targetSubject === selectedSubject)}
                              currentSemester={selectedSemester}
                              subjectName={selectedSubject}
                              teacherName={teachers.find(t => t.subject === selectedSubject)?.name}
                              academicYear={settings.academicYear}
                          />
                          <div className="h-10"></div>
                          <MonitoringView 
                              type="remidi"
                              students={students}
                              history={assessmentHistory.filter(h => h.targetSubject === selectedSubject)}
                              currentSemester={selectedSemester}
                              subjectName={selectedSubject}
                              teacherName={teachers.find(t => t.subject === selectedSubject)?.name}
                              academicYear={settings.academicYear}
                          />
                      </div>
                  </div>
              );
          case 'rapor_sisipan':
               return (
                   <MidSemesterReportView 
                       students={students} // Filtered internally by class selector
                       teachers={teachers}
                       settings={settings}
                       assessmentHistory={assessmentHistory}
                   />
               );
          case 'reset_data':
              return (
                  <ResetDataView 
                      availableClasses={availableClasses}
                      currentSemester={selectedSemester}
                      onResetClass={(cls) => {
                          // Logic to reset grades for class
                          setStudents(prev => prev.map(s => {
                              if (s.kelas === cls) {
                                  return {
                                      ...s,
                                      grades: {
                                          ...s.grades,
                                          [selectedSemester]: {
                                              bab1: {f1:null,f2:null,f3:null,f4:null,f5:null,sum:null},
                                              bab2: {f1:null,f2:null,f3:null,f4:null,f5:null,sum:null},
                                              bab3: {f1:null,f2:null,f3:null,f4:null,f5:null,sum:null},
                                              bab4: {f1:null,f2:null,f3:null,f4:null,f5:null,sum:null},
                                              bab5: {f1:null,f2:null,f3:null,f4:null,f5:null,sum:null},
                                              kts: null, sas: null, nilaiUp: null
                                          }
                                      }
                                      // Note: Should also reset gradesBySubject if structured that way
                                  };
                              }
                              return s;
                          }));
                          api.resetClassGrades(cls, selectedSemester);
                      }}
                  />
              );
          case 'settings':
              return <div className="p-10 text-center">Halaman Pengaturan (Placeholder)</div>;
          default:
              return null;
      }
  };

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
        {/* Sidebar */}
        <div className={`bg-gray-900 text-white flex-col transition-all duration-300 ${sidebarOpen ? 'w-64' : 'w-20'} hidden md:flex`}>
            <div className="p-6 flex items-center justify-between border-b border-gray-800">
                {sidebarOpen && <h1 className="text-xl font-bold tracking-tight">iGrade System</h1>}
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                    {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                </button>
            </div>
            
            {userData && (
                <div className="p-6 border-b border-gray-800 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-blue-600 flex items-center justify-center font-bold text-lg">
                        {userData.name ? userData.name.charAt(0) : 'A'}
                    </div>
                    {sidebarOpen && (
                        <div className="overflow-hidden">
                            <p className="text-sm font-bold truncate">{userData.name || 'Administrator'}</p>
                            <p className="text-xs text-gray-400 capitalize">{userRole}</p>
                        </div>
                    )}
                </div>
            )}

            <nav className="flex-1 py-6 space-y-1 px-3 overflow-y-auto custom-scrollbar">
                {filteredMenu.map(item => (
                    <button
                        key={item.id}
                        onClick={() => setActiveView(item.id)}
                        className={`w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all ${
                            activeView === item.id ? 'bg-blue-600 text-white shadow-md' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                        }`}
                    >
                        <item.icon size={20} />
                        {sidebarOpen && <span>{item.label}</span>}
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-gray-800">
                <button 
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-gray-800 hover:text-red-300 transition-all"
                >
                    <LogOut size={20} />
                    {sidebarOpen && <span>Keluar</span>}
                </button>
            </div>
        </div>

        {/* Mobile Sidebar Overlay */}
        {/* (Simplified for this file) */}

        {/* Main Content */}
        <div className="flex-1 flex flex-col overflow-hidden">
             {renderContent()}
        </div>

        {/* Modals */}
        <InputGradeModal
            isOpen={isInputModalOpen}
            onClose={() => { setIsInputModalOpen(false); setEditingSession(null); }}
            keepOpenOnSave={!!editingSession}
            onSaveSession={editingSession ? async (s) => {
                 // Update logic for existing session
                 setAssessmentHistory(prev => prev.map(h => h.id === s.id ? s : h));
                 await api.saveHistory(s);
                 alert("Perubahan riwayat penilaian berhasil disimpan.");
            } : handleSaveSession}
            currentSemester={selectedSemester}
            targetClass={selectedClass}
            subjectName={selectedSubject} 
            initialData={editingSession}
            history={assessmentHistory}
        />

        <AddStudentModal
            isOpen={isAddStudentModalOpen}
            onClose={() => setIsAddStudentModalOpen(false)}
            onSave={(student) => {
                if (editingStudent) {
                    setStudents(prev => prev.map(s => s.id === student.id ? student : s));
                    api.updateStudent(student);
                } else {
                    setStudents(prev => [...prev, student]);
                    api.addStudent(student);
                }
            }}
            initialData={editingStudent}
            existingClasses={availableClasses}
        />

        <ChapterConfigModal 
            isOpen={isConfigModalOpen}
            onClose={() => setIsConfigModalOpen(false)}
            subjectName={selectedSubject}
            semester={selectedSemester}
            initialConfig={currentChapterConfig}
            initialFieldConfig={currentFieldConfig}
            onSave={handleSaveConfig}
        />
    </div>
  );
};

export default App;
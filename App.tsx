
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  Student, Teacher, AppSettings, GradingSession, ChapterKey, FormativeKey, 
  SemesterKey, SemesterData, DailyAttendanceLog 
} from './types';
import { initialStudents, initialTeachers } from './data';
import * as api from './services/api';

// Components
import LoginPage from './components/LoginPage';
import StudentDashboard from './components/StudentDashboard';
import GradeTable from './components/GradeTable';
import InputGradeModal from './components/InputGradeModal';
import AssessmentHistory from './components/AssessmentHistory';
import StudentDataTable from './components/StudentDataTable';
import AddStudentModal from './components/AddStudentModal';
import MonitoringView from './components/MonitoringView';
import TeacherDataView from './components/TeacherDataView';
import TeacherMonitoringView from './components/TeacherMonitoringView';
import ResetDataView from './components/ResetDataView';
import ChapterConfigModal from './components/ChapterConfigModal';
import WaliKelasView from './components/WaliKelasView';
import ExtraActivityView from './components/ExtraActivityView';
import ClassAttendanceView from './components/ClassAttendanceView';
import SettingsView from './components/SettingsView';
import MidSemesterReportView from './components/MidSemesterReportView';
import GuideModal from './components/GuideModal';

import { 
  LayoutDashboard, Users, GraduationCap, Settings, LogOut, 
  Menu, X, ClipboardList, BookOpen, AlertCircle, Database, Calendar, Printer, Award, School, ChevronRight, ChevronLeft, Star, RefreshCw, Download, FileSpreadsheet, Save, CheckCircle, HelpCircle, WifiOff, RefreshCcw, Cloud, CloudOff, HardDrive, RefreshCw as SyncIcon, UploadCloud
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { calculateFinalGrade } from './utils';

// --- Sidebar Components ---
const SectionLabel = ({ label, collapsed }: { label: string, collapsed?: boolean }) => (
  <div className={`px-3 py-2 text-xs font-bold text-indigo-300/70 uppercase tracking-wider mt-4 first:mt-2 transition-opacity duration-200 ${collapsed ? 'opacity-0 h-0 overflow-hidden py-0 mt-0' : 'opacity-100'}`}>
    {label}
  </div>
);

const SidebarItem = ({ id, label, icon: Icon, active, onClick, collapsed }: { id: string, label: string, icon: React.ElementType, active: boolean, onClick: () => void, collapsed?: boolean }) => (
  <button 
    onClick={onClick}
    title={collapsed ? label : ''}
    className={`w-full flex items-center ${collapsed ? 'justify-center px-0' : 'space-x-3 px-3'} py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
        active 
        ? 'bg-white/10 text-white shadow-sm border border-white/10' 
        : 'text-indigo-100 hover:bg-white/5 hover:text-white'
    }`}
  >
    <Icon size={20} className={`transition-transform duration-200 ${active ? 'text-white' : 'text-indigo-300 group-hover:text-white'} ${collapsed ? '' : active ? 'scale-110' : ''}`} />
    {!collapsed && <span>{label}</span>}
    {active && !collapsed && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>}
  </button>
);

const defaultSettings: AppSettings = {
  academicYear: '2024/2025',
  activeSemester: 'ganjil',
  visibleChapters: { bab1: true, bab2: true, bab3: true, bab4: true, bab5: true },
  teacherName: 'Administrator',
  teacherNip: '-',
  principalName: 'Kepala Sekolah',
  principalNip: '-',
  schoolHeader: [
      "PEMERINTAH KABUPATEN MOJOKERTO", 
      "DINAS PENDIDIKAN", 
      "SMPN 3 PACET",
      "Jl. Tirta Wening, Kab. Mojokerto, Jawa Timur 61374",
      "Email: smpn3pacet2007@gmail.com, HP. 0815 5386 0273",
      "Laman: https://sekolah.mojokertokab.go.id/smpn3pacet"
  ],
  subjects: [],
  midSemesterDate: {
      ganjil: '15 Oktober 2024',
      genap: '15 Maret 2025'
  },
  upRanges: [
      { min: 0, max: 10, value: 70 },
      { min: 11, max: 20, value: 72 },
      { min: 21, max: 30, value: 74 },
      { min: 31, max: 40, value: 75 },
      { min: 41, max: 50, value: 76 },
      { min: 51, max: 60, value: 78 },
      { min: 61, max: 65, value: 80 },
      { min: 66, max: 70, value: 84 },
      { min: 71, max: 75, value: 86 },
      { min: 76, max: 80, value: 88 },
      { min: 81, max: 85, value: 90 },
      { min: 86, max: 90, value: 92 },
      { min: 91, max: 95, value: 96 },
      { min: 96, max: 100, value: 98 }
  ],
  kokurikulerProjects: {
      ganjil: [{ theme: "Gaya Hidup Berkelanjutan", description: "Projek pembuatan kompos dari sampah organik sekolah." }],
      genap: [{ theme: "Kearifan Lokal", description: "Eksplorasi budaya Majapahit." }]
  },
  midSemesterFieldConfig: {
      bab1: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true },
      bab2: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true },
      bab3: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true },
      bab4: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true },
      bab5: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true },
  },
  waliKelasMap: {},
  extracurriculars: [],
  lastUpdated: 0
};

const LOCAL_STORAGE_KEY = 'igrade_data_backup_v2';

const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [offlineMode, setOfflineMode] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'local' | 'disconnected'>('disconnected');
  const [showOfflineBanner, setShowOfflineBanner] = useState(true); 
  const [userRole, setUserRole] = useState<'admin' | 'teacher' | 'student' | 'leader' | null>(null);
  const [userData, setUserData] = useState<any>(null);

  // Data States
  const [students, setStudents] = useState<Student[]>(initialStudents);
  const [teachers, setTeachers] = useState<Teacher[]>(initialTeachers);
  const [assessmentHistory, setAssessmentHistory] = useState<GradingSession[]>([]);
  const [settings, setSettings] = useState<AppSettings>(defaultSettings);
  const [dailyAttendance, setDailyAttendance] = useState<DailyAttendanceLog[]>([]);
  
  const [subjectChapterConfigs, setSubjectChapterConfigs] = useState<Record<string, Record<ChapterKey, boolean>>>({});
  const [subjectFieldConfigs, setSubjectFieldConfigs] = useState<Record<string, Record<ChapterKey, Record<FormativeKey, boolean>>>>({});

  // UI State
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); 
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  
  // Teacher/View Context State
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<GradingSession | null>(null);

  // Admin Specific State
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // --- LOCAL STORAGE HELPERS ---
  const saveToLocalStorage = useCallback(() => {
      // Ensure we save the timestamp of this backup
      const dataToSave = {
          students,
          teachers,
          history: assessmentHistory,
          settings, 
          dailyAttendance,
          chapterConfigs: subjectChapterConfigs,
          fieldConfigs: subjectFieldConfigs,
          timestamp: new Date().getTime() 
      };
      try {
          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
          console.warn("Storage full or unavailable", e);
      }
  }, [students, teachers, assessmentHistory, settings, dailyAttendance, subjectChapterConfigs, subjectFieldConfigs]);

  // Auto-save to LocalStorage on changes (Debounced)
  useEffect(() => {
      if (loading) return; 
      const timer = setTimeout(() => {
          saveToLocalStorage();
      }, 2000);
      return () => clearTimeout(timer);
  }, [students, teachers, assessmentHistory, settings, dailyAttendance, subjectChapterConfigs, subjectFieldConfigs, saveToLocalStorage, loading]);


  // --- INITIALIZATION & SYNC LOGIC ---
  const loadData = useCallback(async () => {
    setLoading(true);
    setOfflineMode(false);
    
    // 1. Load Local Storage
    let localData: any = null;
    try {
        const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (stored) {
            localData = JSON.parse(stored);
        }
    } catch (e) { console.warn("Failed to read local storage"); }

    // 2. Load API Data
    const apiData = await api.fetchInitialData();
    
    let finalData = null;
    let status: 'connected' | 'local' | 'disconnected' = 'disconnected';

    if (apiData && localData) {
        // CONFLICT RESOLUTION
        const localTime = localData.settings?.lastUpdated || 0;
        const serverTime = apiData.settings?.lastUpdated || 0;

        if (localTime > serverTime) {
            console.log("Using Local Data (Newer than Server)", localTime, serverTime);
            finalData = localData;
            status = 'local'; // Temporarily local to allow force sync
            setSyncMessage("Data lokal lebih baru. Mohon upload data ke server (Tombol di atas).");
        } else {
            console.log("Using Server Data (Newer or Equal)");
            finalData = apiData;
            status = 'connected';
        }
    } else if (apiData) {
        finalData = apiData;
        status = 'connected';
    } else if (localData) {
        finalData = localData;
        status = 'local';
        setOfflineMode(true);
        setShowOfflineBanner(true);
    }

    if (finalData) {
        setConnectionStatus(status);
        if (finalData.students) setStudents(finalData.students);
        if (finalData.teachers) setTeachers(finalData.teachers);
        if (finalData.history) setAssessmentHistory(finalData.history);
        if (finalData.settings) {
            let loadedSettings = finalData.settings;
            // Migrations
            if (Array.isArray(loadedSettings.kokurikulerProjects)) {
                loadedSettings.kokurikulerProjects = {
                    ganjil: loadedSettings.kokurikulerProjects,
                    genap: []
                };
            }
            if (typeof loadedSettings.midSemesterDate === 'string') {
                loadedSettings.midSemesterDate = {
                    ganjil: loadedSettings.midSemesterDate,
                    genap: loadedSettings.midSemesterDate
                };
            }
            setSettings(prev => ({ ...prev, ...loadedSettings }));
        }
        if (finalData.chapterConfigs) setSubjectChapterConfigs(finalData.chapterConfigs);
        if (finalData.fieldConfigs) setSubjectFieldConfigs(finalData.fieldConfigs);
        if (finalData.dailyAttendance) setDailyAttendance(finalData.dailyAttendance);
    } else {
        setConnectionStatus('disconnected');
        setOfflineMode(true);
        setShowOfflineBanner(true);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleRetryConnection = () => {
      loadData();
  };

  const handleForceUpload = async () => {
      if(!window.confirm("PERHATIAN: Ini akan menimpa data di Google Sheets dengan data yang ada di laptop ini. Pastikan URL Script sudah benar. Lanjutkan?")) return;
      
      setSyncMessage("Mengupload semua data lokal ke server...");
      
      // Update timestamp before sending
      const now = new Date().getTime();
      const newSettings = { ...settings, lastUpdated: now };
      setSettings(newSettings);

      const success = await api.syncFullData(
          students,
          teachers,
          assessmentHistory,
          newSettings,
          dailyAttendance,
          subjectChapterConfigs,
          subjectFieldConfigs
      );

      if (success) {
          alert("Berhasil! Data telah tersimpan di server (cloud). Sekarang perangkat lain bisa mengakses data ini.");
          setSyncMessage(null);
          setConnectionStatus('connected');
          setOfflineMode(false);
      } else {
          alert("Gagal upload. Periksa koneksi internet atau pastikan URL Script API di 'services/api.ts' sudah benar.");
          setSyncMessage(null);
      }
  };

  // Helper to update timestamp in settings
  const updateTimestamp = () => {
      const now = new Date().getTime();
      setSettings(prev => ({ ...prev, lastUpdated: now }));
      return now;
  };

  // ... (Login, Logout logic omitted for brevity, keeping same)
  const handleLogin = (role: 'admin' | 'teacher' | 'student' | 'leader', data?: any) => {
    setUserRole(role);
    
    if (role === 'teacher') {
        const teacher = teachers.find(t => t.name === data.name);
        if (teacher) {
            setUserData(teacher);
            setSelectedSubject(teacher.subject);
            // Default selected class to first one they teach
            if (teacher.classes.length > 0) setSelectedClass(teacher.classes[0]);
        } else {
            // Fallback
            setUserData({ 
                name: data.name, 
                classes: [], 
                subject: 'Mapel Umum',
                nip: '-'
            }); 
        }
        setActiveTab('dashboard'); 
    } else if (role === 'admin') {
        setUserData({ name: 'Administrator' });
        setSelectedSubject('Pendidikan Agama Islam');
        if (students.length > 0) {
             const uniqueClasses = Array.from(new Set(students.map(s => s.kelas))).sort();
             if (uniqueClasses.length > 0) setSelectedClass(uniqueClasses[0]);
        }
        setActiveTab('dashboard'); 
    } else {
        setUserData(data);
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setUserData(null);
    setActiveTab('dashboard');
    setIsSidebarOpen(false);
  };

  // ... (Other handlers omitted for brevity, keeping same) ...
  const handleUpdateScore = async (id: number, chapter: ChapterKey | 'kts' | 'sas' | 'up', field: FormativeKey | null, value: number | null) => {
    // Update Local State
    setStudents(prev => prev.map(student => {
      if (student.id === id) {
        const newGrades = { ...student.grades };
        const semesterData = { ...newGrades[settings.activeSemester] };
        const isPAI = selectedSubject === 'Pendidikan Agama Islam';
        let targetSemesterData: any;
        
        if (isPAI) {
            targetSemesterData = semesterData;
        } else {
            if (!student.gradesBySubject) student.gradesBySubject = {};
            if (!student.gradesBySubject[selectedSubject]) {
                student.gradesBySubject[selectedSubject] = {
                    ganjil: { bab1: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null }, bab2: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null }, bab3: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null }, bab4: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null }, bab5: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null }, kts: null, sas: null, nilaiUp: null },
                    genap: { bab1: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null }, bab2: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null }, bab3: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null }, bab4: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null }, bab5: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null }, kts: null, sas: null, nilaiUp: null }
                };
            }
            targetSemesterData = { ...student.gradesBySubject[selectedSubject][settings.activeSemester] };
        }

        if (chapter === 'kts') targetSemesterData.kts = value;
        else if (chapter === 'sas') targetSemesterData.sas = value;
        else if (chapter === 'up') targetSemesterData.nilaiUp = value;
        else if (field) targetSemesterData[chapter][field] = value;

        if (isPAI) {
            newGrades[settings.activeSemester] = targetSemesterData;
            student.grades = newGrades;
        } else {
            student.gradesBySubject![selectedSubject][settings.activeSemester] = targetSemesterData;
        }
        
        // Optimistic update API call
        api.saveGrade(student.id, selectedSubject, settings.activeSemester, targetSemesterData).then(success => {
            if (!success && connectionStatus === 'connected') setConnectionStatus('local');
            else if (success) setConnectionStatus('connected');
        });
        
        return student;
      }
      return student;
    }));
    
    updateTimestamp();
  };

  const handleManualSave = async () => {
      if (connectionStatus === 'connected') {
          const ts = updateTimestamp();
          await api.saveSettings({...settings, lastUpdated: ts});
          setShowSaveSuccess(true);
          setTimeout(() => setShowSaveSuccess(false), 2000);
      } else if (connectionStatus === 'local') {
          // If in local mode, manual save triggers force sync prompt
          if(window.confirm("Koneksi server belum aktif. Ingin mencoba upload paksa data lokal ke server?")) {
              handleForceUpload();
          }
      } else {
          alert("Gagal menyimpan: Tidak terhubung ke server.");
      }
  };

  const handleSaveSession = (session: GradingSession) => {
    if (assessmentHistory.some(h => h.id === session.id)) {
        setAssessmentHistory(prev => prev.map(h => h.id === session.id ? session : h));
    } else {
        setAssessmentHistory(prev => [...prev, session]);
    }
    updateTimestamp();
    api.saveHistory(session).then(ok => setConnectionStatus(ok ? 'connected' : 'local'));
    setEditingSession(null);
    setIsInputModalOpen(false);
  };

  const handleDeleteHistory = (id: string) => {
      setAssessmentHistory(prev => prev.filter(h => h.id !== id));
      updateTimestamp();
      api.deleteHistory(id).then(ok => setConnectionStatus(ok ? 'connected' : 'local'));
  };

  const handleResetHistory = () => {
    const idsToDelete = assessmentHistory.filter(h => 
        h.semester === settings.activeSemester && 
        h.targetClass === selectedClass && 
        (h.targetSubject === selectedSubject || (!h.targetSubject && selectedSubject === 'Pendidikan Agama Islam'))
    ).map(h => h.id);

    setAssessmentHistory(prev => prev.filter(h => !idsToDelete.includes(h.id)));
    updateTimestamp();
    idsToDelete.forEach(id => api.deleteHistory(id));
  };

  const handleSaveStudent = (student: Student) => {
      updateTimestamp();
      if (editingStudent) {
          setStudents(prev => prev.map(s => s.id === student.id ? student : s));
          api.updateStudent(student).then(ok => setConnectionStatus(ok ? 'connected' : 'local'));
      } else {
          setStudents(prev => [...prev, student]);
          api.addStudent(student).then(ok => setConnectionStatus(ok ? 'connected' : 'local'));
      }
      setIsAddStudentModalOpen(false);
      setEditingStudent(null);
  };

  const handleDeleteStudent = (id: number) => {
      setStudents(prev => prev.filter(s => s.id !== id));
      updateTimestamp();
      api.deleteStudent(id).then(ok => setConnectionStatus(ok ? 'connected' : 'local'));
  };

  const handleImportStudents = (newStudents: Student[]) => {
      const mergedStudents = [...students];
      newStudents.forEach(ns => {
          const idx = mergedStudents.findIndex(s => s.nis === ns.nis);
          if (idx >= 0) {
              mergedStudents[idx] = { ...mergedStudents[idx], ...ns };
          } else {
              mergedStudents.push(ns);
          }
      });
      setStudents(mergedStudents);
      updateTimestamp();
      api.importStudents(newStudents).then(ok => setConnectionStatus(ok ? 'connected' : 'local'));
  };

  const handleUpdateStudentsBulk = (updatedStudents: Student[]) => {
      setStudents(updatedStudents);
      updateTimestamp();
      updatedStudents.forEach(s => api.updateStudent(s));
  };

  const handleSaveChapterConfig = (config: Record<ChapterKey, boolean>, fieldConfig: Record<ChapterKey, Record<FormativeKey, boolean>>) => {
      setSubjectChapterConfigs(prev => ({ ...prev, [selectedSubject]: config }));
      setSubjectFieldConfigs(prev => ({ ...prev, [selectedSubject]: fieldConfig }));
      updateTimestamp();
      api.saveChapterConfig(selectedSubject, { visibleChapters: config, fieldConfig }).then(ok => setConnectionStatus(ok ? 'connected' : 'local'));
  };

  const handleResetClass = (className: string) => {
      setStudents(prev => prev.map(s => {
          if (s.kelas === className) { return s; }
          return s;
      }));
      updateTimestamp();
      api.resetClassGrades(className, settings.activeSemester).then(ok => setConnectionStatus(ok ? 'connected' : 'local'));
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
      const now = new Date().getTime();
      const settingsWithTs = { ...newSettings, lastUpdated: now };
      setSettings(settingsWithTs);
      const ok = await api.saveSettings(settingsWithTs);
      setConnectionStatus(ok ? 'connected' : 'local');
  };

  const handleSaveDailyAttendance = (log: DailyAttendanceLog) => {
      setDailyAttendance(prev => {
          const idx = prev.findIndex(l => l.id === log.id);
          if (idx >= 0) {
              const newLogs = [...prev];
              newLogs[idx] = log;
              return newLogs;
          }
          return [...prev, log];
      });
      updateTimestamp();
  };

  // ... (Download handlers omitted for brevity, keeping same) ...
  const getFilteredStudents = () => selectedClass ? students.filter(s => s.kelas === selectedClass) : [];

  const handleDownloadGradeTableExcel = () => {
      const targets = getFilteredStudents();
      const activeFields = getActiveFieldsMap();
      const visible = getVisibleChapters();
      
      const headerRow1: any[] = ["No", "NIS", "Nama"];
      const headerRow2: any[] = [null, null, null];
      const merges: any[] = [
          { s: { r: 0, c: 0 }, e: { r: 1, c: 0 } },
          { s: { r: 0, c: 1 }, e: { r: 1, c: 1 } },
          { s: { r: 0, c: 2 }, e: { r: 1, c: 2 } },
      ];

      let currentColIndex = 3;

      (['bab1', 'bab2', 'bab3', 'bab4', 'bab5'] as ChapterKey[]).forEach(c => {
          if (visible[c]) {
              const fields = activeFields[c];
              if (fields.length > 0) {
                  headerRow1.push(c.replace('bab', 'TP ').toUpperCase());
                  for (let i = 1; i < fields.length; i++) {
                      headerRow1.push(null);
                  }
                  merges.push({
                      s: { r: 0, c: currentColIndex },
                      e: { r: 0, c: currentColIndex + fields.length - 1 }
                  });
                  fields.forEach(f => {
                      headerRow2.push(f === 'sum' ? 'Sum' : f.toUpperCase());
                  });
                  currentColIndex += fields.length;
              } else {
                  headerRow1.push(c.replace('bab', 'TP ').toUpperCase());
                  headerRow2.push('-');
                  currentColIndex++;
              }
          }
      });

      headerRow1.push("KTS"); headerRow2.push(null);
      merges.push({ s: { r: 0, c: currentColIndex }, e: { r: 1, c: currentColIndex } });
      currentColIndex++;

      headerRow1.push("SAS"); headerRow2.push(null);
      merges.push({ s: { r: 0, c: currentColIndex }, e: { r: 1, c: currentColIndex } });
      currentColIndex++;

      headerRow1.push("NA"); headerRow2.push(null);
      merges.push({ s: { r: 0, c: currentColIndex }, e: { r: 1, c: currentColIndex } });
      currentColIndex++;

      if (activeTab === 'nilai_up') {
          headerRow1.push("Nilai UP"); headerRow2.push(null);
          merges.push({ s: { r: 0, c: currentColIndex }, e: { r: 1, c: currentColIndex } });
          currentColIndex++;
      }

      const dataRows = targets.map((s, idx) => {
          const grades = selectedSubject === 'Pendidikan Agama Islam' ? s.grades[settings.activeSemester] : (s.gradesBySubject?.[selectedSubject]?.[settings.activeSemester]);
          const row = [idx + 1, s.nis, s.name];
          
          if (!grades) return row;

          (['bab1', 'bab2', 'bab3', 'bab4', 'bab5'] as ChapterKey[]).forEach(c => {
              if (visible[c]) {
                  const fields = activeFields[c];
                  if (fields.length > 0) {
                      fields.forEach(f => {
                          const val = grades[c][f];
                          row.push(val !== null ? val : '-');
                      });
                  } else {
                      row.push('-'); 
                  }
              }
          });

          row.push(grades.kts !== null ? grades.kts : '-');
          row.push(grades.sas !== null ? grades.sas : '-');
          const na = calculateFinalGrade(grades, activeFields, visible);
          row.push(na !== null ? na : '-');
          
          if (activeTab === 'nilai_up') row.push(grades.nilaiUp !== null ? grades.nilaiUp : '-');

          return row;
      });

      const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
      ws['!merges'] = merges;
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Nilai ${selectedClass}`);
      XLSX.writeFile(wb, `Nilai_${selectedSubject}_${selectedClass}.xlsx`);
  };

  const handleDownloadGradeTablePDF = () => {
      const targets = getFilteredStudents();
      if (targets.length === 0) return;

      const doc = new jsPDF({ orientation: 'l', format: 'legal' });
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("REKAP NILAI AKADEMIK", 175, 15, { align: "center" });
      
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Mata Pelajaran: ${selectedSubject}`, 14, 25);
      doc.text(`Kelas: ${selectedClass}`, 14, 30);
      doc.text(`Semester: ${settings.activeSemester === 'ganjil' ? 'Ganjil' : 'Genap'}`, 14, 35);
      doc.text(`Tahun Ajaran: ${settings.academicYear}`, 14, 40);

      const activeFields = getActiveFieldsMap();
      const visible = getVisibleChapters();
      
      const headerRow1: any[] = [
          { content: 'No', rowSpan: 2, styles: { halign: 'center' } }, 
          { content: 'Nama', rowSpan: 2, styles: { halign: 'left' } }
      ];
      const headerRow2: any[] = [];

      (['bab1', 'bab2', 'bab3', 'bab4', 'bab5'] as ChapterKey[]).forEach(c => {
          if (visible[c]) {
              const fields = activeFields[c];
              if (fields.length > 0) {
                  headerRow1.push({ 
                      content: c.replace('bab', 'TP ').toUpperCase(), 
                      colSpan: fields.length,
                      styles: { halign: 'center' }
                  });
                  fields.forEach(f => {
                      headerRow2.push({
                          content: f === 'sum' ? 'Sum' : f.toUpperCase(),
                          styles: { halign: 'center' }
                      });
                  });
              } else {
                  headerRow1.push({ content: c.replace('bab', 'TP '), rowSpan: 2 });
              }
          }
      });

      headerRow1.push({ content: 'KTS', rowSpan: 2 });
      headerRow1.push({ content: 'SAS', rowSpan: 2 });
      headerRow1.push({ content: 'NA', rowSpan: 2 });
      if (activeTab === 'nilai_up') headerRow1.push({ content: 'UP', rowSpan: 2 });

      const body = targets.map((s, idx) => {
          const grades = selectedSubject === 'Pendidikan Agama Islam' ? s.grades[settings.activeSemester] : (s.gradesBySubject?.[selectedSubject]?.[settings.activeSemester]);
          if (!grades) return [];

          const row = [idx + 1, s.name];
          
          (['bab1', 'bab2', 'bab3', 'bab4', 'bab5'] as ChapterKey[]).forEach(c => {
              if (visible[c]) {
                  const fields = activeFields[c];
                  if (fields.length > 0) {
                      fields.forEach(f => {
                          const val = grades[c][f];
                          row.push(val !== null ? val : '-');
                      });
                  } else {
                      row.push('-'); 
                  }
              }
          });

          row.push(grades.kts !== null ? grades.kts : '-');
          row.push(grades.sas !== null ? grades.sas : '-');
          const na = calculateFinalGrade(grades, activeFields, visible);
          row.push(na !== null ? na : '-');
          
          if (activeTab === 'nilai_up') row.push(grades.nilaiUp !== null ? grades.nilaiUp : '-');

          return row;
      });

      autoTable(doc, {
          startY: 45,
          head: [headerRow1, headerRow2],
          body: body,
          theme: 'grid',
          styles: { fontSize: 8, cellPadding: 1 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center', valign: 'middle', lineWidth: 0.1, lineColor: 255 },
          columnStyles: { 0: { halign: 'center', cellWidth: 10 } }
      });

      let yPos = (doc as any).lastAutoTable.finalY + 10;
      if (yPos > 170) { 
          doc.addPage();
          yPos = 20;
      }

      let teacherName = settings.teacherName;
      let teacherNip = settings.teacherNip;
      
      const subjectTeacher = teachers.find(t => t.subject === selectedSubject && t.classes.includes(selectedClass));
      if (subjectTeacher) {
          teacherName = subjectTeacher.name;
          teacherNip = subjectTeacher.nip;
      } else if (selectedSubject === 'Pendidikan Agama Islam' && userData?.subject === 'Pendidikan Agama Islam') {
          teacherName = userData.name;
          teacherNip = userData.nip || '-';
      }

      const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const pageWidth = doc.internal.pageSize.width;
      const rightX = pageWidth - 60;
      const leftX = 40;

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      doc.text(`Mojokerto, ${date}`, rightX, yPos, { align: 'center' });
      doc.text("Guru Mata Pelajaran", rightX, yPos + 5, { align: 'center' });

      doc.text("Mengetahui,", leftX, yPos, { align: 'center' });
      doc.text("Kepala Sekolah", leftX, yPos + 5, { align: 'center' });

      yPos += 25;

      doc.setFont("helvetica", "bold");
      doc.text(teacherName, rightX, yPos, { align: 'center' });
      doc.text(settings.principalName, leftX, yPos, { align: 'center' });

      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${teacherNip || '-'}`, rightX, yPos + 5, { align: 'center' });
      doc.text(`NIP. ${settings.principalNip}`, leftX, yPos + 5, { align: 'center' });

      doc.save(`Nilai_${selectedSubject}_${selectedClass}.pdf`);
  };

  const getActiveFieldsMap = () => {
    const map: Record<ChapterKey, FormativeKey[]> = { bab1: [], bab2: [], bab3: [], bab4: [], bab5: [] };
    const chapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
    const fieldConfig = subjectFieldConfigs[selectedSubject] || settings.midSemesterFieldConfig;

    chapters.forEach(chap => {
        if (fieldConfig && fieldConfig[chap]) {
             map[chap] = Object.entries(fieldConfig[chap])
                .filter(([_, active]) => active)
                .map(([f]) => f as FormativeKey);
        } else {
             const relevantHistory = assessmentHistory.filter(h => 
                h.targetClass === selectedClass && 
                h.semester === settings.activeSemester && 
                (h.targetSubject === selectedSubject || (!h.targetSubject && selectedSubject === 'Pendidikan Agama Islam')) &&
                h.type === 'bab' && 
                h.chapterKey === chap
            );
            map[chap] = relevantHistory.map(h => h.formativeKey).filter((f): f is FormativeKey => f !== undefined);
        }
    });
    return map;
  };

  const getVisibleChapters = () => {
      return subjectChapterConfigs[selectedSubject] || settings.visibleChapters;
  };

  // --- UI RENDER ---
  if (loading) {
      return (
          <div className="min-h-screen flex items-center justify-center bg-[#f5f5f7]">
              <div className="flex flex-col items-center gap-4">
                  <div className="w-10 h-10 border-4 border-[#007aff] border-t-transparent rounded-full animate-spin"></div>
                  <p className="text-gray-500 font-medium text-sm tracking-wide">Memuat Data...</p>
              </div>
          </div>
      );
  }

  if (!userRole) {
    return (
      <>
        {/* Offline Banner logic omitted for brevity as it is unchanged */}
        <LoginPage 
            students={students}
            teachers={teachers}
            onLogin={handleLogin}
            adminPasswordSettings={settings.adminPassword || 'admin123'}
            teacherPasswordSettings={settings.teacherDefaultPassword || '123456'}
            leaderPasswordSettings={settings.leaderPassword || '123456'} 
        />
      </>
    );
  }

  // Student & Leader Views omitted for brevity as they are unchanged

  // --- ADMIN & TEACHER LAYOUT ---

  const handleSidebarClick = (id: string) => {
      setActiveTab(id);
      setIsSidebarOpen(false);
  };

  return (
    <div className="h-screen bg-[#f5f5f7] flex overflow-hidden font-sans text-gray-900">
        {/* ... Sidebar and other UI omitted, focusing on TeacherDataView ... */}
        
        {/* Main Content Area */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
             {/* ... */}
             <main className="flex-1 flex flex-col min-h-0 bg-white/50 relative overflow-hidden backdrop-blur-[2px]">
                 {/* ... */}
                 
                 {activeTab === 'teachers' && userRole === 'admin' && (
                     <TeacherDataView 
                        teachers={teachers}
                        setTeachers={(t) => {
                             if (teachers.some(existing => existing.id === t.id)) {
                                 setTeachers(prev => prev.map(old => old.id === t.id ? t : old));
                                 updateTimestamp(); // <--- CRITICAL FIX FOR PERSISTENCE
                                 api.saveTeacher(t);
                             } else {
                                 setTeachers(prev => [...prev, t]);
                                 updateTimestamp(); // <--- CRITICAL FIX FOR PERSISTENCE
                                 api.saveTeacher(t);
                             }
                        }}
                        availableClasses={Array.from(new Set(students.map(s => s.kelas))).sort()}
                        availableSubjects={Array.from(new Set([...teachers.map(t => t.subject), ...(settings.subjects || [])])).sort()} 
                     />
                 )}
                 
                 {/* ... */}
             </main>
        </div>
        
        {/* ... Modals ... */}
    </div>
  );
};

export default App;

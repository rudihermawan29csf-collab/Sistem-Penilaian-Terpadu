
import React, { useState, useEffect, useMemo } from 'react';
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
  Menu, X, ClipboardList, BookOpen, AlertCircle, Database, Calendar, Printer, Award, School, ChevronRight, Star, RefreshCw, Download, FileSpreadsheet, Save, CheckCircle, HelpCircle, Loader2
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { calculateFinalGrade } from './utils';

// --- Sidebar Components ---
const SectionLabel = ({ label }: { label: string }) => (
  <div className="px-3 py-2 text-xs font-bold text-indigo-300/70 uppercase tracking-wider mt-4 first:mt-2">
    {label}
  </div>
);

const SidebarItem = ({ id, label, icon: Icon, active, onClick }: { id: string, label: string, icon: React.ElementType, active: boolean, onClick: () => void }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 group ${
        active 
        ? 'bg-white/10 text-white shadow-sm border border-white/10' 
        : 'text-indigo-100 hover:bg-white/5 hover:text-white'
    }`}
  >
    <Icon size={18} className={`transition-transform duration-200 ${active ? 'scale-110 text-white' : 'text-indigo-300 group-hover:text-white'}`} />
    <span>{label}</span>
    {active && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]"></div>}
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
  extracurriculars: []
};

export const App: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [isDataLoaded, setIsDataLoaded] = useState(false); // Safety flag
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
  const [showSaveSuccess, setShowSaveSuccess] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false); // Sync loading state
  
  // Teacher/View Context State
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
  const [editingSession, setEditingSession] = useState<GradingSession | null>(null);

  // Admin Specific State
  const [isAddStudentModalOpen, setIsAddStudentModalOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // --- INITIALIZATION ---
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const data = await api.fetchInitialData();
      if (data) {
        if (data.students && data.students.length > 0) setStudents(data.students);
        if (data.teachers) setTeachers(data.teachers);
        if (data.history) setAssessmentHistory(data.history);
        if (data.settings) {
            let loadedSettings = data.settings;
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
        if (data.chapterConfigs) setSubjectChapterConfigs(data.chapterConfigs);
        if (data.fieldConfigs) setSubjectFieldConfigs(data.fieldConfigs);
        if (data.dailyAttendance) setDailyAttendance(data.dailyAttendance);
        
        // Critical: Only set this to true if we successfully loaded data
        setIsDataLoaded(true);
      } else {
        console.error("Gagal memuat data dari server. Menggunakan data default (Bahaya untuk Sync).");
        // We do NOT set isDataLoaded to true here.
      }
      setLoading(false);
    };
    loadData();
  }, []);

  // --- ACCESS CONTROL LOGIC ---
  const canAccessWaliKelas = useMemo(() => {
      if (userRole === 'admin') return true;
      if (userRole === 'teacher' && userData?.waliKelas) return true;
      return false;
  }, [userRole, userData]);

  const canAccessExtra = useMemo(() => {
      if (userRole === 'admin') return true;
      if (userRole === 'teacher') {
          // Check if user is a coach in any existing extra
          return settings.extracurriculars?.some(ex => ex.coach === userData?.name);
      }
      return false;
  }, [userRole, userData, settings.extracurriculars]);

  // --- AUTH HANDLERS ---
  const handleLogin = (role: 'admin' | 'teacher' | 'student' | 'leader', data?: any) => {
    setUserRole(role);
    if (role === 'teacher') {
        const teacher = teachers.find(t => t.name === data.name);
        if (teacher) {
            setUserData(teacher);
            setSelectedSubject(teacher.subject);
            if (teacher.classes.length > 0) setSelectedClass(teacher.classes[0]);
        } else {
            setUserData({ name: data.name, classes: [], subject: 'Mapel Umum', nip: '-' }); 
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

  // --- DATA HANDLERS ---
  const handleUpdateScore = async (id: number, chapter: ChapterKey | 'kts' | 'sas' | 'up', field: FormativeKey | null, value: number | null) => {
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
        
        api.saveGrade(student.id, selectedSubject, settings.activeSemester, targetSemesterData);
        return student;
      }
      return student;
    }));
  };

  const handleManualSave = () => {
      // Trigger granular save notification only (data is saved on change)
      setShowSaveSuccess(true);
      setTimeout(() => setShowSaveSuccess(false), 2000);
  };

  const handleSaveSession = (session: GradingSession) => {
    if (assessmentHistory.some(h => h.id === session.id)) {
        setAssessmentHistory(prev => prev.map(h => h.id === session.id ? session : h));
    } else {
        setAssessmentHistory(prev => [...prev, session]);
    }
    api.saveHistory(session);
    setEditingSession(null);
    setIsInputModalOpen(false);
  };

  const handleDeleteHistory = (id: string) => {
      setAssessmentHistory(prev => prev.filter(h => h.id !== id));
      api.deleteHistory(id);
  };

  const handleResetHistory = () => {
    const idsToDelete = assessmentHistory.filter(h => 
        h.semester === settings.activeSemester && 
        h.targetClass === selectedClass && 
        (h.targetSubject === selectedSubject || (!h.targetSubject && selectedSubject === 'Pendidikan Agama Islam'))
    ).map(h => h.id);

    setAssessmentHistory(prev => prev.filter(h => !idsToDelete.includes(h.id)));
    idsToDelete.forEach(id => api.deleteHistory(id));
  };

  const handleSaveStudent = (student: Student) => {
      if (editingStudent) {
          setStudents(prev => prev.map(s => s.id === student.id ? student : s));
          api.updateStudent(student);
      } else {
          setStudents(prev => [...prev, student]);
          api.addStudent(student);
      }
      setIsAddStudentModalOpen(false);
      setEditingStudent(null);
  };

  const handleDeleteStudent = (id: number) => {
      setStudents(prev => prev.filter(s => s.id !== id));
      api.deleteStudent(id);
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
      api.importStudents(newStudents);
  };

  const handleUpdateStudentsBulk = (updatedStudents: Student[]) => {
      setStudents(updatedStudents);
      updatedStudents.forEach(s => api.updateStudent(s));
  };

  const handleSaveChapterConfig = (config: Record<ChapterKey, boolean>, fieldConfig: Record<ChapterKey, Record<FormativeKey, boolean>>) => {
      setSubjectChapterConfigs(prev => ({ ...prev, [selectedSubject]: config }));
      setSubjectFieldConfigs(prev => ({ ...prev, [selectedSubject]: fieldConfig }));
      api.saveChapterConfig(selectedSubject, { visibleChapters: config, fieldConfig });
  };

  const handleResetClass = (className: string) => {
      setStudents(prev => prev.map(s => {
          if (s.kelas === className) { return s; }
          return s;
      }));
      api.resetClassGrades(className, settings.activeSemester);
  };

  const handleSaveSettings = async (newSettings: AppSettings) => {
      setSettings(newSettings);
      await api.saveSettings(newSettings);
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
  };

  const handleSync = async () => {
      // 1. Safety Check: Is data loaded?
      if (!isDataLoaded) {
          alert("PERHATIAN: Data dari server belum termuat sempurna. \n\nJANGAN melakukan sinkronisasi sekarang karena berisiko menghapus data yang ada di server dengan data kosong. \n\nSolusi: Silakan REFRESH halaman ini sampai data muncul, baru lakukan simpan.");
          return;
      }

      // 2. Safety Check: Are there suspicious student counts?
      if (students.length === 0 || (students.length < 20 && !window.confirm("Peringatan: Jumlah siswa sangat sedikit (" + students.length + "). Apakah Anda yakin ingin menimpa database server?"))) {
          if (!window.confirm("Batalkan sinkronisasi?")) {
              // User insists on proceeding
          } else {
              return;
          }
      }

      // 3. Confirmation
      if (!window.confirm("Konfirmasi Sinkronisasi:\n\nApakah Anda yakin ingin menyimpan seluruh data lokal ke server? Data di Google Sheet akan diperbarui sesuai tampilan aplikasi saat ini.")) {
          return;
      }

      setIsSyncing(true);
      const success = await api.syncFullData(
          students,
          teachers,
          assessmentHistory,
          settings,
          dailyAttendance,
          subjectChapterConfigs,
          subjectFieldConfigs
      );
      setIsSyncing(false);

      if (success) {
          alert('Data berhasil disinkronisasi dan diamankan ke server database utama.');
      } else {
          alert('Gagal melakukan sinkronisasi. Mohon cek koneksi internet dan coba lagi.');
      }
  };

  // --- DOWNLOAD HANDLERS (Grade Table) ---
  const getFilteredStudents = () => selectedClass ? students.filter(s => s.kelas === selectedClass) : [];

  const handleDownloadGradeTableExcel = () => {
      const targets = getFilteredStudents();
      const activeFields = getActiveFieldsMap();
      const visible = getVisibleChapters();
      
      const data = targets.map((s, idx) => {
          const row: any = { No: idx + 1, NIS: s.nis, Nama: s.name };
          const grades = selectedSubject === 'Pendidikan Agama Islam' ? s.grades[settings.activeSemester] : (s.gradesBySubject?.[selectedSubject]?.[settings.activeSemester]);
          if (!grades) return row;
          (['bab1', 'bab2', 'bab3', 'bab4', 'bab5'] as ChapterKey[]).forEach(c => {
              if (visible[c]) {
                  const fields = activeFields[c];
                  fields.forEach(f => {
                      row[`${c.replace('bab','TP').toUpperCase()}_${f.toUpperCase()}`] = grades[c][f];
                  });
              }
          });
          row['KTS'] = grades.kts;
          row['SAS'] = grades.sas;
          const na = calculateFinalGrade(grades, activeFields, visible);
          row['Nilai Akhir'] = na;
          if (activeTab === 'nilai_up') row['Nilai UP'] = grades.nilaiUp;
          return row;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Nilai ${selectedClass}`);
      XLSX.writeFile(wb, `Nilai_${selectedSubject}_${selectedClass}.xlsx`);
  };

  const handleDownloadGradeTablePDF = () => {
      const targets = getFilteredStudents();
      if (targets.length === 0) return;
      const doc = new jsPDF({ orientation: 'l', format: 'legal' });
      doc.setFontSize(14); doc.setFont("helvetica", "bold"); doc.text("REKAP NILAI AKADEMIK", 175, 15, { align: "center" });
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Mata Pelajaran: ${selectedSubject}`, 14, 25);
      doc.text(`Kelas: ${selectedClass}`, 14, 30);
      doc.text(`Semester: ${settings.activeSemester === 'ganjil' ? 'Ganjil' : 'Genap'}`, 14, 35);
      doc.text(`Tahun Ajaran: ${settings.academicYear}`, 14, 40);
      
      const activeFields = getActiveFieldsMap();
      const visible = getVisibleChapters();
      const chapters = (['bab1', 'bab2', 'bab3', 'bab4', 'bab5'] as ChapterKey[]).filter(c => visible[c]);
      const headRow = ['No', 'Nama'];
      chapters.forEach(c => {
          const fields = activeFields[c];
          if (fields.length > 0) fields.forEach(f => headRow.push(`${c.replace('bab', 'TP ')} (${f === 'sum' ? 'S' : f.toUpperCase()})`));
          else headRow.push(c.replace('bab', 'TP '));
      });
      headRow.push('KTS', 'SAS', 'NA');
      if (activeTab === 'nilai_up') headRow.push('UP');
      
      const body = targets.map((s, idx) => {
          const grades = selectedSubject === 'Pendidikan Agama Islam' ? s.grades[settings.activeSemester] : (s.gradesBySubject?.[selectedSubject]?.[settings.activeSemester]);
          if (!grades) return [];
          const row = [idx + 1, s.name];
          chapters.forEach(c => {
              const fields = activeFields[c];
              if (fields.length > 0) fields.forEach(f => row.push(grades[c][f] ?? '-'));
              else row.push('-');
          });
          row.push(grades.kts ?? '-');
          row.push(grades.sas ?? '-');
          row.push(calculateFinalGrade(grades, activeFields, visible) ?? '-');
          if (activeTab === 'nilai_up') row.push(grades.nilaiUp ?? '-');
          return row;
      });
      autoTable(doc, { startY: 45, head: [headRow], body: body, theme: 'grid', styles: { fontSize: 8, cellPadding: 1 }, headStyles: { fillColor: [41, 128, 185], textColor: 255, halign: 'center', valign: 'middle' }, columnStyles: { 0: { halign: 'center', cellWidth: 10 } } });
      
      let yPos = (doc as any).lastAutoTable.finalY + 10;
      if (yPos > 170) { doc.addPage(); yPos = 20; }
      
      let teacherName = settings.teacherName; let teacherNip = settings.teacherNip;
      const subjectTeacher = teachers.find(t => t.subject === selectedSubject && t.classes.includes(selectedClass));
      if (subjectTeacher) { teacherName = subjectTeacher.name; teacherNip = subjectTeacher.nip; } 
      else if (selectedSubject === 'Pendidikan Agama Islam' && userData?.subject === 'Pendidikan Agama Islam') { teacherName = userData.name; teacherNip = userData.nip || '-'; }
      
      const date = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      const pageWidth = doc.internal.pageSize.width; const rightX = pageWidth - 60; const leftX = 40;
      doc.setFontSize(10); doc.setFont("helvetica", "normal");
      doc.text(`Mojokerto, ${date}`, rightX, yPos, { align: 'center' }); doc.text("Guru Mata Pelajaran", rightX, yPos + 5, { align: 'center' });
      doc.text("Mengetahui,", leftX, yPos, { align: 'center' }); doc.text("Kepala Sekolah", leftX, yPos + 5, { align: 'center' });
      yPos += 25;
      doc.setFont("helvetica", "bold"); doc.text(teacherName, rightX, yPos, { align: 'center' }); doc.text(settings.principalName, leftX, yPos, { align: 'center' });
      doc.setFont("helvetica", "normal"); doc.text(`NIP. ${teacherNip || '-'}`, rightX, yPos + 5, { align: 'center' }); doc.text(`NIP. ${settings.principalNip}`, leftX, yPos + 5, { align: 'center' });
      doc.save(`Nilai_${selectedSubject}_${selectedClass}.pdf`);
  };

  const getActiveFieldsMap = () => {
    const map: Record<ChapterKey, FormativeKey[]> = { bab1: [], bab2: [], bab3: [], bab4: [], bab5: [] };
    const chapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
    const fieldConfig = subjectFieldConfigs[selectedSubject] || settings.midSemesterFieldConfig;
    chapters.forEach(chap => {
        if (fieldConfig && fieldConfig[chap]) {
             map[chap] = Object.entries(fieldConfig[chap]).filter(([_, active]) => active).map(([f]) => f as FormativeKey);
        } else {
             const relevantHistory = assessmentHistory.filter(h => h.targetClass === selectedClass && h.semester === settings.activeSemester && (h.targetSubject === selectedSubject || (!h.targetSubject && selectedSubject === 'Pendidikan Agama Islam')) && h.type === 'bab' && h.chapterKey === chap);
            map[chap] = relevantHistory.map(h => h.formativeKey).filter((f): f is FormativeKey => f !== undefined);
        }
    });
    return map;
  };

  const getVisibleChapters = () => { return subjectChapterConfigs[selectedSubject] || settings.visibleChapters; };

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
      <LoginPage 
        students={students}
        teachers={teachers}
        onLogin={handleLogin}
        adminPasswordSettings={settings.adminPassword || 'admin123'}
        teacherPasswordSettings={settings.teacherDefaultPassword || '123456'}
        leaderPasswordSettings={settings.leaderPassword || '123456'} 
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
            dailyAttendance={dailyAttendance}
        />
    );
  }

  if (userRole === 'leader' && userData) {
      return (
          <div className="min-h-screen bg-[#f5f5f7] flex flex-col font-sans">
               <div className="bg-white/80 backdrop-blur-xl px-6 py-4 border-b border-gray-200/50 flex justify-between items-center sticky top-0 z-20 shadow-sm">
                    <h1 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                         <div className="bg-blue-100 p-1.5 rounded-lg"><ClipboardList className="text-[#007aff]" size={20} /></div>
                         Ketua Kelas {userData.className}
                    </h1>
                    <button onClick={handleLogout} className="flex items-center gap-2 text-sm bg-red-600 text-white font-bold hover:bg-red-700 px-4 py-2 rounded-lg transition-colors shadow-md">
                        <LogOut size={16} /> Keluar
                    </button>
               </div>
               <ClassAttendanceView 
                    students={students}
                    availableClasses={[userData.className]}
                    userRole="leader"
                    currentClass={userData.className}
                    dailyAttendance={dailyAttendance}
                    onSaveAttendance={handleSaveDailyAttendance}
               />
          </div>
      );
  }

  const handleSidebarClick = (id: string) => { setActiveTab(id); setIsSidebarOpen(false); };

  return (
    <div className="h-screen bg-[#f5f5f7] flex overflow-hidden font-sans text-gray-900">
        <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-[#1e1b4b] border-r border-indigo-900/50 transform transition-transform duration-300 ease-in-out ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'} lg:relative lg:translate-x-0 flex flex-col shadow-2xl lg:shadow-none overflow-y-auto`}>
            <div className="p-5">
                <div className="flex items-center gap-2 mb-6 group">
                    <div className="w-3 h-3 rounded-full bg-[#ff5f57] border border-[#e0443e]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#febc2e] border border-[#d89e24]"></div>
                    <div className="w-3 h-3 rounded-full bg-[#28c840] border border-[#1aab29]"></div>
                </div>
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white shadow-lg">
                            <School size={20} />
                        </div>
                        <div>
                            <h1 className="text-sm font-bold tracking-tight text-white leading-tight">iGrade</h1>
                            <p className="text-[10px] text-indigo-300 font-medium">{userRole === 'admin' ? 'Administrator' : 'Guru Mapel'}</p>
                        </div>
                    </div>
                    <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden text-indigo-300 hover:text-white"><X size={20} /></button>
                </div>
            </div>
            
            <nav className="px-3 py-2 flex-1">
                <SectionLabel label="Menu Utama" />
                <SidebarItem id="dashboard" label="Input Nilai" icon={LayoutDashboard} active={activeTab === 'dashboard'} onClick={() => handleSidebarClick('dashboard')} />
                <SidebarItem id="nilai_up" label="Nilai UP" icon={Star} active={activeTab === 'nilai_up'} onClick={() => handleSidebarClick('nilai_up')} />
                
                <SectionLabel label="Tugas Tambahan" />
                {canAccessWaliKelas && (
                    <SidebarItem id="walikelas" label="Wali Kelas" icon={ClipboardList} active={activeTab === 'walikelas'} onClick={() => handleSidebarClick('walikelas')} />
                )}
                {canAccessExtra && (
                    <SidebarItem id="extra" label="Ekstra" icon={Award} active={activeTab === 'extra'} onClick={() => handleSidebarClick('extra')} />
                )}
                
                <SectionLabel label="Monitoring" />
                <SidebarItem id="tanggungan" label="Tanggungan" icon={AlertCircle} active={activeTab === 'tanggungan'} onClick={() => handleSidebarClick('tanggungan')} />
                <SidebarItem id="remidi" label="Remidi" icon={RefreshCw} active={activeTab === 'remidi'} onClick={() => handleSidebarClick('remidi')} />
                <SectionLabel label="Laporan" />
                <SidebarItem id="rapor_sisipan" label="Rapor Sisipan" icon={Printer} active={activeTab === 'rapor_sisipan'} onClick={() => handleSidebarClick('rapor_sisipan')} />
                <SectionLabel label="Sistem" />
                <SidebarItem id="settings" label="Pengaturan Lengkap" icon={Settings} active={activeTab === 'settings'} onClick={() => handleSidebarClick('settings')} />
                {userRole === 'admin' && (
                    <>
                        <SectionLabel label="Admin Master" />
                        <SidebarItem id="students" label="Data Siswa" icon={Users} active={activeTab === 'students'} onClick={() => handleSidebarClick('students')} />
                        <SidebarItem id="teachers" label="Data Guru" icon={GraduationCap} active={activeTab === 'teachers'} onClick={() => handleSidebarClick('teachers')} />
                        <SidebarItem id="monitor_teachers" label="Monitor Guru" icon={ClipboardList} active={activeTab === 'monitor_teachers'} onClick={() => handleSidebarClick('monitor_teachers')} />
                        <SidebarItem id="reset" label="Reset Data" icon={Database} active={activeTab === 'reset'} onClick={() => handleSidebarClick('reset')} />
                    </>
                )}
            </nav>
            <div className="p-4 border-t border-white/5 bg-black/20">
                <button onClick={handleLogout} className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-transparent border border-indigo-700/50 hover:bg-red-500/20 hover:border-red-500/50 text-indigo-200 hover:text-red-200 rounded-lg transition-all text-xs font-bold shadow-sm active:scale-95">
                    <LogOut size={14} /><span>Keluar Aplikasi</span>
                </button>
            </div>
        </div>

        <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
             <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" style={{ backgroundImage: `url('https://images.unsplash.com/photo-1486312338219-ce68d2c6f44d?q=80&w=2672&auto=format&fit=crop')`, backgroundSize: 'cover', backgroundPosition: 'center' }}></div>
             <div className="lg:hidden bg-white/80 backdrop-blur-xl border-b border-gray-200 p-4 flex justify-between items-center sticky top-0 z-30">
                 <button onClick={() => setIsSidebarOpen(true)} className="text-gray-600"><Menu size={24} /></button>
                 <span className="font-bold text-gray-800">iGrade System</span>
                 <div className="w-6"></div> 
             </div>

             <main className="flex-1 flex flex-col min-h-0 bg-white/50 relative overflow-hidden backdrop-blur-[2px]">
                 {(activeTab === 'dashboard' || activeTab === 'nilai_up') && (
                     <div className="flex flex-col h-full">
                         <div className="px-6 py-5 border-b border-gray-200 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 bg-white sticky top-0 z-20 shadow-sm">
                             <div>
                                 <h2 className="text-xl font-bold text-gray-900">{activeTab === 'nilai_up' ? 'Input Nilai Ujian Praktek (UP)' : 'Input Nilai Akademik'}</h2>
                                 <div className="flex items-center gap-2 mt-1">
                                     <span className="text-xs font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded border border-blue-100">{userData?.name || 'Administrator'}</span>
                                 </div>
                             </div>
                             <div className="flex flex-wrap gap-3 items-center">
                                <select value={settings.activeSemester} onChange={e => { const newSem = e.target.value as 'ganjil' | 'genap'; setSettings(prev => ({...prev, activeSemester: newSem})); }} className="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 block p-2.5 font-bold shadow-sm">
                                    <option value="ganjil">Semester Ganjil</option>
                                    <option value="genap">Semester Genap</option>
                                </select>
                                <select value={selectedClass} onChange={e => setSelectedClass(e.target.value)} className="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 block p-2.5 font-bold shadow-sm">
                                    {userData?.classes?.length > 0 ? userData.classes.map((c: string) => <option key={c} value={c}>{c}</option>) : Array.from(new Set(students.map(s => s.kelas))).sort().map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                                <select value={selectedSubject} onChange={e => setSelectedSubject(e.target.value)} className="bg-white border border-gray-200 text-gray-900 text-sm rounded-lg focus:ring-2 focus:ring-blue-500 block p-2.5 font-bold shadow-sm">
                                    {userData?.subject && <option value={userData.subject}>{userData.subject}</option>}
                                    <option value="Pendidikan Agama Islam">Pendidikan Agama Islam</option>
                                    {userRole === 'admin' && teachers.map(t => t.subject).filter((v,i,a) => a.indexOf(v)===i).map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                                {activeTab === 'dashboard' && (
                                  <>
                                    <div className="h-8 w-px bg-gray-300 mx-1 hidden xl:block"></div>
                                    {/* Manual Save is now a trigger for Safe Sync */}
                                    <button 
                                        onClick={handleSync} 
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs shadow-md transition-all ${isSyncing ? 'bg-gray-400 cursor-wait' : 'bg-indigo-600 hover:bg-indigo-700 text-white'}`}
                                        disabled={isSyncing}
                                    >
                                        {isSyncing ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />} 
                                        {isSyncing ? 'Menyimpan...' : 'Simpan Data'}
                                    </button>
                                    <button onClick={handleDownloadGradeTablePDF} className="p-2.5 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-medium transition-colors border border-red-200" title="Download Rekap PDF"><Printer size={18} /></button>
                                    <button onClick={handleDownloadGradeTableExcel} className="p-2.5 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 font-medium transition-colors border border-green-200" title="Download Rekap Excel"><FileSpreadsheet size={18} /></button>
                                    <button onClick={() => setIsConfigModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 font-medium text-xs transition-colors"><Settings size={14} /> Config</button>
                                    <button onClick={() => { setEditingSession(null); setIsInputModalOpen(true); }} className="flex items-center gap-2 px-4 py-2 bg-[#007aff] text-white rounded-lg hover:bg-blue-600 font-bold text-xs shadow-md transition-colors"><BookOpen size={14} /> Input Nilai</button>
                                  </>
                                )}
                             </div>
                         </div>
                         <div className="flex-1 overflow-auto custom-scrollbar bg-white/80">
                             <GradeTable students={selectedClass ? students.filter(s => s.kelas === selectedClass) : []} selectedSemester={settings.activeSemester} subjectName={selectedSubject} activeFieldsMap={getActiveFieldsMap()} visibleChapters={getVisibleChapters()} visibleFields={subjectFieldConfigs[selectedSubject] || settings.midSemesterFieldConfig} assessmentHistory={assessmentHistory.filter(h => (h.targetSubject === selectedSubject || (!h.targetSubject && selectedSubject === 'Pendidikan Agama Islam')) && h.targetClass === selectedClass && h.semester === settings.activeSemester)} academicYear={settings.academicYear} onUpdateScore={handleUpdateScore} isEditable={true} showUpColumn={activeTab === 'nilai_up'} upRanges={settings.upRanges} unlockedCells={new Set()} getScoreInputClass={() => ''} />
                             {activeTab === 'dashboard' && (
                                <AssessmentHistory history={assessmentHistory.filter(h => h.targetClass === selectedClass && h.semester === settings.activeSemester && (h.targetSubject === selectedSubject || (!h.targetSubject && selectedSubject === 'Pendidikan Agama Islam')))} currentSemester={settings.activeSemester} onEdit={(session) => { setEditingSession(session); setIsInputModalOpen(true); }} onDelete={handleDeleteHistory} onResetHistory={handleResetHistory} />
                             )}
                         </div>
                     </div>
                 )}
                 {activeTab === 'walikelas' && (
                     <div className="bg-white h-full flex flex-col">
                        <WaliKelasView students={students} onUpdateStudents={handleUpdateStudentsBulk} semester={settings.activeSemester} teachers={teachers} settings={settings} assessmentHistory={assessmentHistory} dailyAttendance={dailyAttendance} onSaveDailyAttendance={handleSaveDailyAttendance} userRole={userRole || 'admin'} userData={userData} />
                     </div>
                 )}
                 {activeTab === 'extra' && (
                     <div className="bg-white h-full flex flex-col">
                        <ExtraActivityView students={students} onUpdateStudents={handleUpdateStudentsBulk} semester={settings.activeSemester} settings={settings} teachers={teachers} onUpdateSettings={handleSaveSettings} dailyAttendance={dailyAttendance} onSaveDailyAttendance={handleSaveDailyAttendance} onSync={handleSync} userRole={userRole || 'admin'} userData={userData} />
                     </div>
                 )}
                 {activeTab === 'students' && (
                     <div className="bg-white h-full flex flex-col">
                        <StudentDataTable students={students} onAdd={() => { setEditingStudent(null); setIsAddStudentModalOpen(true); }} onEdit={(s) => { setEditingStudent(s); setIsAddStudentModalOpen(true); }} onDelete={handleDeleteStudent} onImport={handleImportStudents} onSync={handleSync} />
                     </div>
                 )}
                 {activeTab === 'teachers' && (
                     <div className="bg-white h-full flex flex-col">
                        <TeacherDataView teachers={teachers} setTeachers={saveTeacher => { if (teachers.some(t => t.id === saveTeacher.id)) { setTeachers(prev => prev.map(t => t.id === saveTeacher.id ? saveTeacher : t)); } else { setTeachers(prev => [...prev, saveTeacher]); } api.saveTeacher(saveTeacher); }} availableClasses={Array.from(new Set(students.map(s => s.kelas))).sort()} availableSubjects={settings.subjects} onSync={handleSync} />
                     </div>
                 )}
                 {activeTab === 'monitor_teachers' && (
                     <div className="bg-white h-full flex flex-col">
                        <TeacherMonitoringView teachers={teachers} history={assessmentHistory} currentSemester={settings.activeSemester} availableClasses={Array.from(new Set(students.map(s => s.kelas))).sort()} />
                     </div>
                 )}
                 {(activeTab === 'tanggungan' || activeTab === 'remidi') && (
                     <div className="bg-white h-full flex flex-col">
                        <MonitoringView type={activeTab as 'tanggungan' | 'remidi'} students={selectedClass ? students.filter(s => s.kelas === selectedClass) : students} history={assessmentHistory.filter(h => h.targetClass === selectedClass)} currentSemester={settings.activeSemester} subjectName={selectedSubject} teacherName={userData?.name} teacherNip={userData?.nip} principalName={settings.principalName} principalNip={settings.principalNip} academicYear={settings.academicYear} />
                     </div>
                 )}
                 {activeTab === 'rapor_sisipan' && (
                     <div className="bg-white h-full flex flex-col">
                        <MidSemesterReportView students={students} teachers={teachers} settings={settings} assessmentHistory={assessmentHistory} />
                     </div>
                 )}
                 {activeTab === 'reset' && (
                     <div className="bg-white h-full flex flex-col">
                        <ResetDataView availableClasses={Array.from(new Set(students.map(s => s.kelas))).sort()} currentSemester={settings.activeSemester} onResetClass={handleResetClass} />
                     </div>
                 )}
                 {activeTab === 'settings' && (
                     <div className="bg-white h-full flex flex-col">
                        <SettingsView settings={settings} teachers={teachers} onSaveSettings={handleSaveSettings} />
                     </div>
                 )}
             </main>
        </div>

        <InputGradeModal isOpen={isInputModalOpen} onClose={() => setIsInputModalOpen(false)} onSaveSession={handleSaveSession} currentSemester={settings.activeSemester} targetClass={selectedClass} subjectName={selectedSubject} initialData={editingSession} history={assessmentHistory} />
        <AddStudentModal isOpen={isAddStudentModalOpen} onClose={() => setIsAddStudentModalOpen(false)} onSave={handleSaveStudent} initialData={editingStudent} existingClasses={Array.from(new Set(students.map(s => s.kelas))).sort()} />
        <ChapterConfigModal isOpen={isConfigModalOpen} onClose={() => setIsConfigModalOpen(false)} subjectName={selectedSubject} semester={settings.activeSemester} initialConfig={subjectChapterConfigs[selectedSubject] || settings.visibleChapters} initialFieldConfig={subjectFieldConfigs[selectedSubject] || settings.midSemesterFieldConfig} onSave={handleSaveChapterConfig} />
        <button onClick={() => setIsGuideOpen(true)} className="fixed bottom-6 right-6 p-3 bg-[#007aff] text-white rounded-full shadow-xl hover:bg-blue-600 transition-transform hover:scale-110 z-50 animate-bounce-slow" title="Panduan Penggunaan">
            <HelpCircle size={24} />
        </button>
        <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} role={userRole} />
    </div>
  );
};

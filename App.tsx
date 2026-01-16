
import React, { useState, useMemo, useEffect } from 'react';
import { initialStudents, initialTeachers } from './data';
import { Student, ChapterKey, FormativeKey, ChapterGrades, SemesterKey, SemesterData, GradingSession, AppSettings, Teacher } from './types';
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
import { Download, Search, BookOpen, Users, GraduationCap, ChevronDown, Settings, Unlock, SlidersHorizontal, LogOut, Lock, AlertCircle, RefreshCw, PanelLeftClose, PanelLeftOpen, Trash2, UserCheck, CheckCircle, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as api from './services/api'; // Import API service

type UserRole = 'admin' | 'teacher' | 'student' | null;
type ActiveTab = 'grades' | 'students' | 'teachers' | 'settings' | 'tanggungan' | 'remidi' | 'reset' | 'monitoring_guru';

function App() {
  // Loading State
  const [isLoading, setIsLoading] = useState(true);

  // Auth State
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [currentUser, setCurrentUser] = useState<Student | null>(null);
  const [currentTeacher, setCurrentTeacher] = useState<Teacher | null>(null); // For teacher login

  // Layout State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Data State - Initialize empty, will load from API
  const [students, setStudents] = useState<Student[]>([]); 
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isInputModalOpen, setIsInputModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  // Chapter Configuration State
  const [subjectChapterConfigs, setSubjectChapterConfigs] = useState<Record<string, Record<ChapterKey, boolean>>>({});
  const [isChapterConfigModalOpen, setIsChapterConfigModalOpen] = useState(false);
  
  // App Settings
  const [settings, setSettings] = useState<AppSettings>({
    academicYear: '2024/2025',
    activeSemester: 'ganjil',
    visibleChapters: {
      bab1: true, bab2: true, bab3: true, bab4: true, bab5: true
    },
    teacherName: 'Guru Mapel', 
    teacherNip: '-',
    principalName: 'Kepala Sekolah',
    principalNip: '-',
    adminPassword: 'admin',
    teacherDefaultPassword: 'guru'
  });

  // Grading Sessions History (Array)
  const [assessmentHistory, setAssessmentHistory] = useState<GradingSession[]>([]);
  // State for the session being edited
  const [editingSession, setEditingSession] = useState<GradingSession | null>(null);

  // Sidebar state
  const [activeTab, setActiveTab] = useState<ActiveTab>('grades');
  
  // Selection States
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedSemester, setSelectedSemester] = useState<SemesterKey>('ganjil');
  
  // NEW: Multi-subject selection state
  const [selectedSubject, setSelectedSubject] = useState<string>('Pendidikan Agama Islam');

  // --- INITIAL DATA LOAD ---
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      const data = await api.fetchInitialData();
      if (data) {
        setStudents(data.students);
        setTeachers(data.teachers);
        setAssessmentHistory(data.history);
        setSettings(data.settings);
        setSubjectChapterConfigs(data.chapterConfigs);
        
        // Update semester from settings
        setSelectedSemester(data.settings.activeSemester);
      } else {
        // Fallback to local dummy data if API fails (or first run offline)
        setStudents(initialStudents);
        setTeachers(initialTeachers);
      }
      setIsLoading(false);
    };
    loadData();
  }, []);

  // --- DERIVED STATE ---

  // Available Teachers based on name (for selection in Admin view)
  const [adminSelectedTeacherName, setAdminSelectedTeacherName] = useState<string>('');
  
  // Update admin selected teacher when teachers load
  useEffect(() => {
     if (teachers.length > 0 && !adminSelectedTeacherName) {
         setAdminSelectedTeacherName(teachers[0].name);
     }
  }, [teachers]);

  // Determine Active Context (Teacher)
  const activeTeacherContext = useMemo(() => {
    if (userRole === 'teacher') return currentTeacher;
    if (userRole === 'admin') {
      return teachers.find(t => t.name === adminSelectedTeacherName && t.subject === selectedSubject) || null;
    }
    return null;
  }, [userRole, currentTeacher, adminSelectedTeacherName, selectedSubject, teachers]);

  // Determine current active teacher's NIP and Name for signatures
  const currentTeacherSignature = useMemo(() => {
    if (activeTeacherContext) {
        return { name: activeTeacherContext.name, nip: activeTeacherContext.nip };
    }
    if (selectedSubject === 'Pendidikan Agama Islam') {
        return { name: settings.teacherName, nip: settings.teacherNip };
    }
    return { name: '.........................', nip: '.........................' };
  }, [activeTeacherContext, settings, selectedSubject]);


  // Available Subjects for the current context
  const availableSubjects = useMemo(() => {
    if (userRole === 'teacher' && currentTeacher) {
      const mySubjects = teachers.filter(t => t.name === currentTeacher.name).map(t => t.subject);
      return [...new Set(mySubjects)];
    }
    if (userRole === 'admin') {
        const teacherSubjects = teachers.filter(t => t.name === adminSelectedTeacherName).map(t => t.subject);
        return [...new Set(teacherSubjects)];
    }
    return ['Pendidikan Agama Islam'];
  }, [userRole, currentTeacher, teachers, adminSelectedTeacherName]);

  // Available Classes for the current context
  const availableClasses = useMemo(() => {
    if (userRole === 'teacher' || (userRole === 'admin' && activeTab === 'grades')) {
      const teacherEntry = teachers.find(t => 
        t.name === (userRole === 'teacher' ? currentTeacher?.name : adminSelectedTeacherName) && 
        t.subject === selectedSubject
      );
      return teacherEntry ? teacherEntry.classes.sort() : [];
    }
    const classes = Array.from(new Set(students.map(s => s.kelas)));
    return classes.sort();
  }, [userRole, currentTeacher, adminSelectedTeacherName, selectedSubject, teachers, students, activeTab]);

  // Effect to set default selections when context changes
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
        setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects]);

  useEffect(() => {
    if (availableClasses.length > 0 && !availableClasses.includes(selectedClass)) {
        setSelectedClass(availableClasses[0]);
    }
  }, [availableClasses]);

  // Derive visible chapters for the current selected subject
  const currentVisibleChapters = useMemo(() => {
    return subjectChapterConfigs[selectedSubject] || settings.visibleChapters;
  }, [subjectChapterConfigs, selectedSubject, settings.visibleChapters]);

  const classStudents = useMemo(() => {
    return students.filter(s => s.kelas === selectedClass);
  }, [students, selectedClass]);

  // Filter history strictly for the selected class, semester AND SUBJECT
  const filteredHistory = useMemo(() => {
    return assessmentHistory.filter(h => 
      h.semester === selectedSemester &&
      (h.targetSubject === selectedSubject || (!h.targetSubject && selectedSubject === 'Pendidikan Agama Islam')) 
    );
  }, [assessmentHistory, selectedSemester, selectedSubject]);

  // Further filter history for GradeTable (specific to selectedClass)
  const classHistory = useMemo(() => {
      return filteredHistory.filter(h => h.targetClass === selectedClass);
  }, [filteredHistory, selectedClass]);

  const activeFieldsMap = useMemo(() => {
    const chapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
    const map: Record<ChapterKey, FormativeKey[]> = {
      bab1: [], bab2: [], bab3: [], bab4: [], bab5: []
    };
    
    const mappedStudents = classStudents.map(s => {
        let grades = s.grades; // Default PAI
        if (selectedSubject !== 'Pendidikan Agama Islam') {
            grades = s.gradesBySubject?.[selectedSubject]?.ganjil ? 
                     s.gradesBySubject[selectedSubject][selectedSemester] as any : 
                     createEmptySemesterData();
        } else {
            grades = s.grades[selectedSemester];
        }
        
        return {
            ...s,
            grades: {
                [selectedSemester]: grades
            }
        } as unknown as Student;
    });

    chapters.forEach(chap => {
      map[chap] = getActiveFields(mappedStudents, selectedSemester, chap);
    });
    return map;
  }, [classStudents, selectedSemester, selectedSubject]);

  // --- HANDLERS (UPDATED WITH API) ---
  
  const handleSaveChapterConfig = (newConfig: Record<ChapterKey, boolean>) => {
    const updated = {
      ...subjectChapterConfigs,
      [selectedSubject]: newConfig
    };
    setSubjectChapterConfigs(updated);
    api.saveChapterConfig(selectedSubject, newConfig);
  };

  const handleSaveSession = (session: GradingSession) => {
    const sessionData = { ...session, targetSubject: selectedSubject };
    setAssessmentHistory((prev) => {
      const existingIndex = prev.findIndex(s => s.id === session.id);
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = sessionData;
        return updated;
      } else {
        return [...prev, sessionData];
      }
    });
    setEditingSession(null);
    api.saveHistory(sessionData);
  };

  const handleEditSession = (session: GradingSession) => {
    setEditingSession(session);
    setIsInputModalOpen(true);
  };

  const handleDeleteSession = (id: string) => {
    if (window.confirm('Apakah Anda yakin ingin menghapus riwayat penilaian ini? Data nilai siswa tidak akan hilang, tetapi kolom penilaian akan terkunci kembali.')) {
      setAssessmentHistory((prev) => prev.filter(s => s.id !== id));
      api.deleteHistory(id);
    }
  };

  const handleUpdateScore = (
    id: number,
    chapter: ChapterKey | 'kts' | 'sas',
    field: FormativeKey | null,
    value: number | null
  ) => {
    setStudents((prev) =>
      prev.map((student) => {
        if (student.id !== id) return student;

        let newGradesBySubject = { ...(student.gradesBySubject || {}) };
        let currentSemesterData: SemesterData;

        if (selectedSubject === 'Pendidikan Agama Islam') {
            currentSemesterData = { ...student.grades[selectedSemester] };
        } else {
            if (!newGradesBySubject[selectedSubject]) {
                newGradesBySubject[selectedSubject] = {
                    ganjil: createEmptySemesterData(),
                    genap: createEmptySemesterData()
                };
            }
            currentSemesterData = { ...newGradesBySubject[selectedSubject][selectedSemester] };
        }

        if (chapter === 'kts' || chapter === 'sas') {
          currentSemesterData[chapter] = value;
        } else if (field) {
           currentSemesterData[chapter] = {
             ...(currentSemesterData[chapter] as ChapterGrades),
             [field]: value
           };
        }

        // Trigger API Save (Debounce logic ideal here, but direct call for simplicity of this snippet)
        // In production, use debounce or a "Save" button to avoid spamming the API
        api.saveGrade(student.id, selectedSubject, selectedSemester, currentSemesterData);

        if (selectedSubject === 'Pendidikan Agama Islam') {
            return {
                ...student,
                grades: {
                    ...student.grades,
                    [selectedSemester]: currentSemesterData
                }
            };
        } else {
            newGradesBySubject[selectedSubject] = {
                ...newGradesBySubject[selectedSubject],
                [selectedSemester]: currentSemesterData
            };
            return {
                ...student,
                gradesBySubject: newGradesBySubject
            };
        }
      })
    );
  };

  const handleResetClassGrades = (className: string) => {
    setStudents((prev) => 
      prev.map((student) => {
        if (student.kelas !== className) return student;
        const resetData = createEmptySemesterData();
        return {
            ...student,
            grades: {
                ...student.grades,
                [selectedSemester]: resetData
            }
        };
      })
    );
    api.resetClassGrades(className, selectedSemester);
  };

  const handleResetHistory = () => {
    setAssessmentHistory(prev => prev.filter(h => 
      h.targetClass !== selectedClass || 
      h.semester !== selectedSemester ||
      (h.targetSubject !== selectedSubject && !(selectedSubject === 'Pendidikan Agama Islam' && !h.targetSubject))
    ));
    // In a real app, you'd likely want to delete these from DB individually or have a batch delete endpoint
    // For now, we assume this is a client-side cleanup visual, or you iterate and delete.
    // Ideally create api.resetHistory(class, semester, subject)
  };

  const handleAddStudent = (name: string) => {
    const newId = Date.now();
    const newNo = students.length + 1;
    
    const newStudent: Student = {
      id: newId,
      no: newNo,
      nis: newId.toString().slice(-4),
      name,
      kelas: selectedClass,
      gender: 'L', 
      grades: {
        ganjil: createEmptySemesterData(),
        genap: createEmptySemesterData(),
      }
    };
    setStudents([...students, newStudent]);
    api.addStudent(newStudent);
  };

  const handleSaveTeacher = (teacher: Teacher) => {
      // Optimistic update for UI
      if (teachers.find(t => t.id === teacher.id)) {
          setTeachers(prev => prev.map(t => t.id === teacher.id ? teacher : t));
      } else {
          setTeachers(prev => [...prev, teacher]);
      }
      api.saveTeacher(teacher);
  }

  const handleDeleteTeacher = (id: number) => {
      setTeachers(prev => prev.filter(t => t.id !== id));
      api.deleteTeacher(id);
  }

  const handleSaveSettings = (newSettings: AppSettings) => {
      setSettings(newSettings);
      api.saveSettings(newSettings);
  }

  const filteredStudents = useMemo(() => {
    const displayStudents = classStudents.map(s => {
        let grades = s.grades; // Default PAI
        if (selectedSubject !== 'Pendidikan Agama Islam') {
             grades = s.gradesBySubject?.[selectedSubject] || { 
                ganjil: createEmptySemesterData(), 
                genap: createEmptySemesterData() 
             };
        }
        return {
            ...s,
            grades: grades
        };
    });

    return displayStudents
      .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()));
  }, [classStudents, searchTerm, selectedSubject]);

  const allStudentsMapped = useMemo(() => {
     return students.map(s => {
        let grades = s.grades; 
        if (selectedSubject !== 'Pendidikan Agama Islam') {
             grades = s.gradesBySubject?.[selectedSubject] || { 
                ganjil: createEmptySemesterData(), 
                genap: createEmptySemesterData() 
             };
        }
        return {
            ...s,
            grades: grades
        };
     });
  }, [students, selectedSubject]);

  // --- AUTH HANDLERS ---

  const handleLogin = (role: UserRole, data?: any) => {
    setUserRole(role);
    if (role === 'student') {
      setCurrentUser(data);
    } else if (role === 'teacher') {
      const teacherObj = teachers.find(t => t.name === data.name);
      setCurrentTeacher(teacherObj || null);
      setSelectedSemester(settings.activeSemester);
    } else if (role === 'admin') {
      // Admin sees all
    }
  };

  const handleLogout = () => {
    setUserRole(null);
    setCurrentUser(null);
    setCurrentTeacher(null);
    setActiveTab('grades');
  };

  // --- DOWNLOAD HANDLERS (Keep existing logic) ---
  const handleDownloadPDF = () => { /* ... existing code ... */ 
      const doc = new jsPDF({ orientation: "landscape" });
      const chapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
      const visibleKeys = chapters.filter(k => currentVisibleChapters[k]);
      
      // Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN NILAI SISWA", 148, 15, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Mata Pelajaran: ${selectedSubject}`, 14, 25);
      doc.text(`Kelas: ${selectedClass}`, 14, 30);
      doc.text(`Semester: ${selectedSemester === 'ganjil' ? 'Ganjil' : 'Genap'}`, 14, 35);
      doc.text(`Tahun Ajaran: ${settings.academicYear}`, 14, 40);

      // Prepare Table Columns
      const tableHead = [
        "No", "NIS", "Nama Siswa",
        ...visibleKeys.map(k => {
            const num = k.replace('bab', '');
            const label = selectedSemester === 'genap' ? parseInt(num) + 5 : num;
            return `Bab ${label} (Avg)`;
        }),
        "KTS", "SAS", "Nilai Akhir"
      ];

      const tableBody = filteredStudents.map((s, idx) => {
          const semesterData = s.grades[selectedSemester];
          const finalGrade = calculateFinalGrade(semesterData, activeFieldsMap, currentVisibleChapters);

          const row = [
              idx + 1,
              s.nis,
              s.name,
              ...visibleKeys.map(k => {
                  const avg = calculateChapterAverage(semesterData[k], activeFieldsMap[k]);
                  return avg !== null ? avg : '-';
              }),
              semesterData.kts !== null ? semesterData.kts : '-',
              semesterData.sas !== null ? semesterData.sas : '-',
              finalGrade !== null ? finalGrade : '-'
          ];
          return row;
      });

      autoTable(doc, {
          startY: 45,
          head: [tableHead],
          body: tableBody,
          theme: 'grid',
          headStyles: { fillColor: [66, 133, 244], textColor: 255, fontSize: 8 },
          bodyStyles: { fontSize: 8 },
          styles: { halign: 'center' },
          columnStyles: { 2: { halign: 'left' } }, // Name left aligned
          margin: { top: 45, left: 14, right: 14 }
      });

      // Signatures
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      
      // Check if new page needed
      if (finalY > 170) {
          doc.addPage();
      }

      const signatureY = finalY > 170 ? 20 : finalY; 
      
      // Date
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.setFontSize(10);
      doc.text(`Mojokerto, ${today}`, 280, signatureY, { align: "right" });

      // Titles
      doc.text("Mengetahui,", 14, signatureY + 5);
      doc.text("Kepala Sekolah", 14, signatureY + 10);
      
      doc.text("Guru Mata Pelajaran", 280, signatureY + 10, { align: "right" });

      // Space for signature
      const nameY = signatureY + 35;

      // Names
      doc.setFont("helvetica", "bold");
      doc.text(settings.principalName, 14, nameY);
      doc.text(currentTeacherSignature.name, 280, nameY, { align: "right" });

      // NIPs
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${settings.principalNip}`, 14, nameY + 5);
      doc.text(`NIP. ${currentTeacherSignature.nip}`, 280, nameY + 5, { align: "right" });

      doc.save(`Nilai_${selectedSubject}_${selectedClass}_${selectedSemester}.pdf`);
  };

  const handleDownloadExcel = () => { /* ... existing code ... */
    const chapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
    // Filter visible chapters
    const visibleKeys = chapters.filter(k => currentVisibleChapters[k]);

    // CSV Header
    const header = [
        "No", "NIS", "Nama",
        // Flatten chapters: F1-F5, Sum, Avg
        ...visibleKeys.flatMap(c => {
             const label = selectedSemester === 'genap' ? `Bab ${parseInt(c.slice(3)) + 5}` : `Bab ${c.slice(3)}`;
             return [`${label} F1`, `${label} F2`, `${label} F3`, `${label} F4`, `${label} F5`, `${label} Sum`, `${label} Rerata`]
        }),
        "KTS", "SAS", "Nilai Akhir"
    ].join(",");

    // CSV Rows
    const rows = filteredStudents.map((s, idx) => {
        const semesterData = s.grades[selectedSemester];
        // Ensure final grade uses configuration
        const finalGrade = calculateFinalGrade(semesterData, activeFieldsMap, currentVisibleChapters);
        
        const basicInfo = [idx + 1, s.nis, `"${s.name}"`]; // Quote name for safety
        
        const chapterData = visibleKeys.flatMap(c => {
            const grade = semesterData[c];
            const avg = calculateChapterAverage(grade, activeFieldsMap[c]);
            return [
                grade.f1 ?? '', grade.f2 ?? '', grade.f3 ?? '', grade.f4 ?? '', grade.f5 ?? '',
                grade.sum ?? '', avg ?? ''
            ];
        });

        const evals = [semesterData.kts ?? '', semesterData.sas ?? '', finalGrade ?? ''];

        return [...basicInfo, ...chapterData, ...evals].join(",");
    });

    const csvContent = "data:text/csv;charset=utf-8," + [header, ...rows].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Nilai_${selectedSubject}_${selectedClass}_${selectedSemester}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // --- LOADING SCREEN ---
  if (isLoading) {
      return (
          <div className="h-screen w-full flex flex-col items-center justify-center bg-gray-50">
              <Loader2 className="h-10 w-10 text-blue-600 animate-spin mb-4" />
              <h2 className="text-gray-700 font-bold text-lg">Memuat Data iGrade...</h2>
              <p className="text-gray-500 text-sm">Menghubungkan ke Database...</p>
          </div>
      )
  }

  // --- RENDER LOGIN PAGE ---
  if (!userRole) {
    return <LoginPage 
      students={students} 
      teachers={teachers}
      onLogin={handleLogin} 
      adminPasswordSettings={settings.adminPassword || 'admin123'}
      teacherPasswordSettings={settings.teacherDefaultPassword || 'guru123'}
    />;
  }

  // --- RENDER STUDENT DASHBOARD ---
  if (userRole === 'student' && currentUser) {
    return (
      <StudentDashboard 
        student={currentUser} 
        teachers={teachers} 
        allStudents={students} 
        assessmentHistory={assessmentHistory}
        settings={settings}
        subjectChapterConfigs={subjectChapterConfigs} 
        onLogout={handleLogout} 
      />
    );
  }

  // --- RENDER MAIN APP ---
  // (Rendering logic identical to before, just using state variables that are now API-backed)
  return (
    <div className="h-screen w-full flex items-center justify-center p-4 sm:p-6 lg:p-8 bg-gray-100 font-sans">
      <div className="w-full h-full max-w-[95vw] bg-white rounded-xl shadow-2xl flex border border-gray-200/60 ring-1 ring-black/5 overflow-hidden">
        
        {/* Sidebar */}
        <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#f0f0f5] border-r border-gray-300 flex flex-col shrink-0 transition-all duration-300 ease-in-out`}>
           <div className="h-16 flex items-center px-5 border-b border-gray-300/50 bg-[#e8e8ed]/50 justify-between">
            <div className={`flex space-x-2 ${isSidebarCollapsed ? 'hidden' : 'flex'}`}>
              <div className="w-3 h-3 rounded-full bg-red-400 border border-red-500/30"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400 border border-amber-500/30"></div>
              <div className="w-3 h-3 rounded-full bg-green-400 border border-green-500/30"></div>
            </div>
            
            {!isSidebarCollapsed && (
              <span className="font-semibold text-gray-600 text-sm tracking-tight ml-2">
                {userRole === 'admin' ? 'Admin Panel' : 'Guru Panel'}
              </span>
            )}

            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 rounded hover:bg-gray-200 text-gray-500"
            >
              {isSidebarCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
          </div>

          <div className="p-3 space-y-1 overflow-y-auto custom-scrollbar">
             {/* MENU GROUPS */}
             <div className="mb-4">
                <p className={`px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ${isSidebarCollapsed ? 'text-center' : ''}`}>
                  {isSidebarCollapsed ? 'M' : 'Manajemen'}
                </p>
                <button
                onClick={() => setActiveTab('grades')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'grades' 
                    ? 'bg-blue-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200/60'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                    <BookOpen size={18} />
                    {!isSidebarCollapsed && <span>Input Nilai</span>}
                </button>
                
                {userRole === 'admin' && (
                    <>
                        <button
                        onClick={() => setActiveTab('students')}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'students' 
                            ? 'bg-blue-500 text-white shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-200/60'
                        } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                        >
                            <Users size={18} />
                            {!isSidebarCollapsed && <span>Data Siswa</span>}
                        </button>
                        <button
                        onClick={() => setActiveTab('teachers')}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'teachers' 
                            ? 'bg-blue-500 text-white shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-200/60'
                        } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                        >
                            <UserCheck size={18} />
                            {!isSidebarCollapsed && <span>Data Guru</span>}
                        </button>
                    </>
                )}
            </div>

            <div className="mb-4">
                <p className={`px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ${isSidebarCollapsed ? 'text-center' : ''}`}>
                  {isSidebarCollapsed ? 'Mon' : 'Monitoring'}
                </p>
                
                {userRole === 'admin' && (
                    <button
                    onClick={() => setActiveTab('monitoring_guru')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'monitoring_guru' 
                        ? 'bg-green-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200/60'
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <CheckCircle size={18} />
                        {!isSidebarCollapsed && <span>Progress Guru</span>}
                    </button>
                )}

                <button
                onClick={() => setActiveTab('tanggungan')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'tanggungan' 
                    ? 'bg-red-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200/60'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                    <AlertCircle size={18} className={activeTab === 'tanggungan' ? 'text-white' : 'text-red-500'} />
                    {!isSidebarCollapsed && <span>Tanggungan</span>}
                </button>
                <button
                onClick={() => setActiveTab('remidi')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'remidi' 
                    ? 'bg-orange-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200/60'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                    <RefreshCw size={18} className={activeTab === 'remidi' ? 'text-white' : 'text-orange-500'} />
                    {!isSidebarCollapsed && <span>Remidi</span>}
                </button>
            </div>

            {userRole === 'admin' && (
                <div>
                    <p className={`px-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1 ${isSidebarCollapsed ? 'text-center' : ''}`}>
                    {isSidebarCollapsed ? 'Sys' : 'Sistem'}
                    </p>
                    <button
                    onClick={() => setActiveTab('reset')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'reset' 
                        ? 'bg-red-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200/60'
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                    <Trash2 size={18} />
                    {!isSidebarCollapsed && <span>Reset Data</span>}
                    </button>
                    <button
                    onClick={() => setActiveTab('settings')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'settings' 
                        ? 'bg-blue-500 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200/60'
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                    <Settings size={18} />
                    {!isSidebarCollapsed && <span>Pengaturan</span>}
                    </button>
                </div>
            )}
          </div>

          <div className="mt-auto p-4 border-t border-gray-300/50">
             <div className="flex items-center space-x-2 text-gray-500 mb-3 justify-center">
                 <div className="text-xs font-bold text-gray-600 truncate">
                    {userRole === 'teacher' ? currentTeacher?.name : 'Administrator'}
                 </div>
             </div>
             <button 
                onClick={handleLogout}
                className={`w-full flex items-center space-x-2 px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors text-xs font-medium ${isSidebarCollapsed ? 'justify-center' : 'justify-center'}`}
             >
                <LogOut size={14} />
                {!isSidebarCollapsed && <span>Keluar</span>}
             </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 bg-white">
          
          {/* Top Toolbar - Mobile Responsive Fix */}
          <div className="h-16 flex items-center justify-between px-6 bg-[#f5f5f7] border-b border-gray-300 shrink-0 overflow-x-auto hide-scrollbar">
             <div className="flex items-center space-x-4 min-w-max">
                
                {/* Admin Teacher Selection */}
                {userRole === 'admin' && activeTab === 'grades' && (
                    <div className="relative">
                        <select
                        value={adminSelectedTeacherName}
                        onChange={(e) => setAdminSelectedTeacherName(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 text-gray-700 py-1.5 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold min-w-[200px]"
                        >
                        {Array.from(new Set(teachers.map(t => t.name))).map(name => (
                            <option key={name} value={name}>{name}</option>
                        ))}
                        </select>
                         <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                           <ChevronDown size={14} />
                        </div>
                    </div>
                )}

                {/* Subject Selector */}
                {(activeTab === 'grades' || activeTab === 'tanggungan' || activeTab === 'remidi') && (
                     <div className="relative">
                        <select
                        value={selectedSubject}
                        onChange={(e) => setSelectedSubject(e.target.value)}
                        className="appearance-none bg-blue-50 border border-blue-200 text-blue-900 py-1.5 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                        >
                        {availableSubjects.map(sub => (
                            <option key={sub} value={sub}>{sub}</option>
                        ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-blue-500">
                           <ChevronDown size={14} />
                        </div>
                    </div>
                )}

                {/* Class Selector */}
                {(activeTab === 'grades' || activeTab === 'tanggungan' || activeTab === 'remidi') && (
                     <div className="relative">
                        <select
                        value={selectedClass}
                        onChange={(e) => setSelectedClass(e.target.value)}
                        className="appearance-none bg-white border border-gray-300 text-gray-700 py-1.5 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                        >
                        {availableClasses.length > 0 ? (
                            availableClasses.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))
                        ) : (
                            <option value="">Tidak ada kelas</option>
                        )}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                           <ChevronDown size={14} />
                        </div>
                    </div>
                )}

                 {/* Semester Selector */}
                 {(activeTab === 'grades' || activeTab === 'monitoring_guru') && (
                     <div className="relative">
                        <select
                        value={selectedSemester}
                        onChange={(e) => setSelectedSemester(e.target.value as SemesterKey)}
                        className="appearance-none bg-white border border-gray-300 text-gray-700 py-1.5 pl-4 pr-10 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                        >
                        <option value="ganjil">Sem. Ganjil</option>
                        <option value="genap">Sem. Genap</option>
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-500">
                           <ChevronDown size={14} />
                        </div>
                    </div>
                 )}
             </div>

             <div className="flex items-center space-x-3 min-w-max ml-4">
                {/* Teacher Config Button */}
                {activeTab === 'grades' && userRole === 'teacher' && (
                    <button 
                        onClick={() => setIsChapterConfigModalOpen(true)}
                        className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 border border-transparent rounded-md text-gray-700 active:scale-95 transition-all"
                        title="Konfigurasi Bab"
                    >
                        <Settings size={16} />
                        <span className="text-xs font-medium hidden lg:inline">Konfigurasi Bab</span>
                    </button>
                )}

                {activeTab === 'grades' && userRole === 'teacher' && (
                  <button 
                    onClick={() => {
                      setEditingSession(null);
                      setIsInputModalOpen(true);
                    }}
                    className="flex items-center space-x-2 px-3 py-1.5 bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 text-white active:scale-95 transition-all"
                  >
                    <Unlock size={16} />
                    <span className="text-xs font-medium">Buka Input</span>
                  </button>
                )}
                
                {activeTab === 'grades' && (
                    <>
                        <button 
                        className="flex items-center space-x-2 px-3 py-1.5 bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 text-white active:scale-95 transition-all"
                        onClick={handleDownloadPDF}
                        >
                        <FileText size={16} />
                        <span className="text-xs font-medium">PDF</span>
                        </button>

                        <button 
                        className="flex items-center space-x-2 px-3 py-1.5 bg-green-600 border border-transparent rounded-md shadow-sm hover:bg-green-700 text-white active:scale-95 transition-all"
                        onClick={handleDownloadExcel}
                        >
                        <FileSpreadsheet size={16} />
                        <span className="text-xs font-medium">Excel</span>
                        </button>
                    </>
                )}
             </div>
          </div>

          {/* Content View */}
          <div className="flex-1 flex flex-col min-h-0 bg-white overflow-auto">
            {activeTab === 'grades' && (
              <>
                <GradeTable 
                  students={filteredStudents} 
                  selectedSemester={selectedSemester}
                  activeFieldsMap={activeFieldsMap}
                  visibleChapters={currentVisibleChapters} // Pass active configuration
                  assessmentHistory={classHistory}
                  academicYear={settings.academicYear}
                  onUpdateScore={handleUpdateScore} 
                  isEditable={userRole === 'teacher'} 
                />
                
                {/* Only Show history controls if NOT admin */}
                {userRole === 'teacher' ? (
                     <AssessmentHistory 
                        history={classHistory} 
                        currentSemester={selectedSemester}
                        onEdit={handleEditSession}
                        onDelete={handleDeleteSession}
                        onResetHistory={handleResetHistory}
                    />
                ) : (
                    <div className="p-4 text-center text-gray-400 text-sm bg-gray-50 border-t">
                        Mode Admin: Hanya dapat melihat nilai. Login sebagai Guru untuk mengedit.
                    </div>
                )}
               
              </>
            )}
            
            {activeTab === 'students' && userRole === 'admin' && (
                <StudentDataTable students={filteredStudents} />
            )}

            {activeTab === 'teachers' && userRole === 'admin' && (
                <TeacherDataView teachers={teachers} setTeachers={handleSaveTeacher} />
            )}

            {activeTab === 'monitoring_guru' && userRole === 'admin' && (
                <TeacherMonitoringView 
                    teachers={teachers} 
                    history={assessmentHistory} 
                    currentSemester={selectedSemester} 
                />
            )}

            {activeTab === 'tanggungan' && (
                <MonitoringView 
                  type="tanggungan" 
                  students={filteredStudents} 
                  history={filteredHistory} 
                  currentSemester={selectedSemester} 
                  subjectName={selectedSubject}
                  teacherName={currentTeacherSignature.name}
                  teacherNip={currentTeacherSignature.nip}
                  principalName={settings.principalName}
                  principalNip={settings.principalNip}
                />
            )}

            {activeTab === 'remidi' && (
                <MonitoringView 
                  type="remidi" 
                  students={filteredStudents} 
                  history={filteredHistory}
                  currentSemester={selectedSemester} 
                  subjectName={selectedSubject}
                  teacherName={currentTeacherSignature.name}
                  teacherNip={currentTeacherSignature.nip}
                  principalName={settings.principalName}
                  principalNip={settings.principalNip}
                />
            )}

            {activeTab === 'reset' && userRole === 'admin' && (
                <ResetDataView 
                  availableClasses={Array.from(new Set(students.map(s => s.kelas))).sort()} 
                  currentSemester={selectedSemester}
                  onResetClass={handleResetClassGrades}
                />
            )}

            {activeTab === 'settings' && userRole === 'admin' && (
               <div className="p-8 max-w-4xl mx-auto">
               <h2 className="text-2xl font-bold text-gray-800 mb-6">Pengaturan Aplikasi</h2>
               <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                   <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6">
                       <div>
                           <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Keamanan</h3>
                           <div className="space-y-4">
                               <div>
                                   <label className="block text-sm font-medium text-gray-700">Password Admin</label>
                                   <input 
                                   type="text" 
                                   value={settings.adminPassword}
                                   onChange={(e) => handleSaveSettings({...settings, adminPassword: e.target.value})}
                                   className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono mt-1"
                                   />
                               </div>
                               <div>
                                   <label className="block text-sm font-medium text-gray-700">Password Default Guru</label>
                                   <input 
                                   type="text" 
                                   value={settings.teacherDefaultPassword}
                                   onChange={(e) => handleSaveSettings({...settings, teacherDefaultPassword: e.target.value})}
                                   className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm font-mono mt-1"
                                   />
                               </div>
                           </div>
                       </div>
                   </div>
                    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                       <h3 className="text-lg font-semibold text-gray-700 mb-4 border-b pb-2">Tahun Pelajaran</h3>
                       <div className="space-y-4">
                           <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Pelajaran</label>
                           <input 
                               type="text" 
                               value={settings.academicYear}
                               onChange={(e) => handleSaveSettings({...settings, academicYear: e.target.value})}
                               className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                           />
                           </div>
                           <div>
                           <label className="block text-sm font-medium text-gray-700 mb-1">Kepala Sekolah</label>
                           <input 
                               type="text" 
                               value={settings.principalName}
                               onChange={(e) => handleSaveSettings({...settings, principalName: e.target.value})}
                               className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm mt-1 mb-2"
                               placeholder="Nama"
                           />
                            <input 
                               type="text" 
                               value={settings.principalNip}
                               onChange={(e) => handleSaveSettings({...settings, principalNip: e.target.value})}
                               className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                               placeholder="NIP"
                           />
                           </div>
                       </div>
                   </div>
               </div>
               </div>
            )}
          </div>
        </div>
      </div>

      <AddStudentModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onAdd={handleAddStudent}
        nextNumber={students.filter(s => s.kelas === selectedClass).length + 1}
      />

      <InputGradeModal
        isOpen={isInputModalOpen}
        onClose={() => {
          setIsInputModalOpen(false);
          setEditingSession(null);
        }}
        onSaveSession={handleSaveSession}
        currentSemester={selectedSemester}
        targetClass={selectedClass} 
        initialData={editingSession}
        history={classHistory}
      />

      <ChapterConfigModal 
        isOpen={isChapterConfigModalOpen}
        onClose={() => setIsChapterConfigModalOpen(false)}
        subjectName={selectedSubject}
        semester={selectedSemester}
        initialConfig={currentVisibleChapters}
        onSave={handleSaveChapterConfig}
      />
    </div>
  );
}

export default App;

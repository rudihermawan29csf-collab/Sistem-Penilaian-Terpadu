
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
import { Download, Search, BookOpen, Users, GraduationCap, ChevronDown, Settings, Unlock, SlidersHorizontal, LogOut, Lock, AlertCircle, RefreshCw, PanelLeftClose, PanelLeftOpen, Trash2, UserCheck, CheckCircle, FileSpreadsheet, FileText, Loader2, Plus, BarChart2, AlertTriangle, User, Calendar, Save } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as api from './services/api'; // Import API service

type UserRole = 'admin' | 'teacher' | 'student' | null;
type ActiveTab = 'grades' | 'students' | 'teachers' | 'settings' | 'tanggungan' | 'remidi' | 'reset' | 'monitoring_guru' | 'monitoring_tanggungan' | 'monitoring_remidi';

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

  // Edit Student State
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

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
    adminPassword: 'admin123',
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
        
        // Ensure settings are correctly typed (numbers to strings for passwords)
        const loadedSettings = data.settings;
        
        // Logic to fallback to default passwords if API returns empty/null
        const safeAdminPassword = loadedSettings.adminPassword ? String(loadedSettings.adminPassword) : 'admin123';
        const safeTeacherPassword = loadedSettings.teacherDefaultPassword ? String(loadedSettings.teacherDefaultPassword) : 'guru';

        setSettings({
            ...loadedSettings,
            adminPassword: safeAdminPassword,
            teacherDefaultPassword: safeTeacherPassword
        });

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

  const handleUpdateSettings = (e: React.FormEvent) => {
      e.preventDefault();
      api.saveSettings(settings);
      alert("Pengaturan berhasil disimpan!");
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
  };

  // --- STUDENT MANAGEMENT HANDLERS ---
  const handleSaveStudent = (student: Student) => {
      if (editingStudent) {
          // Update Mode
          setStudents(prev => prev.map(s => s.id === student.id ? student : s));
          api.updateStudent(student);
      } else {
          // Add Mode
          setStudents(prev => [...prev, student]);
          api.addStudent(student);
      }
      setEditingStudent(null);
  };

  const handleDeleteStudent = (id: number) => {
      setStudents(prev => prev.filter(s => s.id !== id));
      api.deleteStudent(id);
  };

  const handleImportStudents = async (newStudents: Student[]) => {
      setIsLoading(true); // Show loading spinner
      try {
          // Optimistic UI Update
          setStudents(prev => [...prev, ...newStudents]);
          
          // Send to Server with chunking (Awaited)
          await api.importStudents(newStudents);
          
          alert(`BERHASIL: ${newStudents.length} data siswa telah ditambahkan dan disinkronkan ke Spreadsheet.`);
      } catch (error) {
          console.error("Import failed", error);
          alert("Gagal melakukan sinkronisasi ke server. Silakan cek koneksi internet.");
      } finally {
          setIsLoading(false);
      }
  };

  const handleEditStudentClick = (student: Student) => {
      setEditingStudent(student);
      setIsModalOpen(true);
  };

  const handleAddStudentClick = () => {
      setEditingStudent(null);
      setIsModalOpen(true);
  };

  // --- TEACHER & SETTINGS HANDLERS ---
  const handleSaveTeacher = (teacher: Teacher) => {
      if (teachers.find(t => t.id === teacher.id)) {
          setTeachers(prev => prev.map(t => t.id === teacher.id ? teacher : t));
      } else {
          setTeachers(prev => [...prev, teacher]);
      }
      api.saveTeacher(teacher);
  }

  const handleDeleteTeacher = (id: number) => {
      if(window.confirm('Yakin ingin menghapus data guru ini?')) {
          setTeachers(prev => prev.filter(t => t.id !== id));
          api.deleteTeacher(id);
      }
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

  // --- DOWNLOAD HANDLERS (UPDATED) ---
  
  // Helper to determine color based on class name
  const getClassHeaderColor = (className: string) => {
      const cls = className.toUpperCase();
      if (cls.includes('VIII')) {
         return [249, 168, 37]; // Yellow/Orange (readable) for Grade 8. Check VIII first!
      } else if (cls.includes('VII')) {
         return [46, 125, 50]; // Green for Grade 7
      } else if (cls.includes('IX')) {
         return [211, 47, 47]; // Red for Grade 9
      }
      return [66, 133, 244]; // Default Blue
  };

  const handleDownloadPDF = () => {
      // Landscape orientation with A4 size
      const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
      const chapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
      const visibleKeys = chapters.filter(k => currentVisibleChapters[k]);
      
      // Determine header color based on selected class
      const headerColor = getClassHeaderColor(selectedClass);

      // Title Header
      doc.setFontSize(16);
      doc.setFont("helvetica", "bold");
      doc.text("LAPORAN NILAI SISWA", 148, 15, { align: "center" });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(`Mata Pelajaran: ${selectedSubject}`, 14, 25);
      doc.text(`Kelas: ${selectedClass}`, 14, 30);
      doc.text(`Semester: ${selectedSemester === 'ganjil' ? 'Ganjil' : 'Genap'}`, 14, 35);
      doc.text(`Tahun Ajaran: ${settings.academicYear}`, 14, 40);

      // --- Table Headers ---
      // Row 1: Groupings
      const headRow1: any[] = [
        { content: 'No', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'NIS', rowSpan: 2, styles: { valign: 'middle', halign: 'center' } },
        { content: 'Nama Siswa', rowSpan: 2, styles: { valign: 'middle', halign: 'left' } },
      ];

      // Add Chapter headers (spanning 7 columns each)
      visibleKeys.forEach(k => {
          const num = k.replace('bab', '');
          const label = selectedSemester === 'genap' ? parseInt(num) + 5 : num;
          headRow1.push({ content: `Bab ${label}`, colSpan: 7, styles: { halign: 'center', valign: 'middle' } });
      });
      // Add Evaluation header (spanning 3 columns)
      headRow1.push({ content: 'Evaluasi Akhir', colSpan: 3, styles: { halign: 'center', valign: 'middle' } });

      // Row 2: Detailed Columns
      const headRow2: any[] = [];
      
      visibleKeys.forEach(() => {
          ['F1', 'F2', 'F3', 'F4', 'F5', 'S', 'R'].forEach(h => {
             headRow2.push({ content: h, styles: { halign: 'center', cellWidth: 'auto' } }); 
          });
      });
      ['KTS', 'SAS', 'NA'].forEach(h => {
          headRow2.push({ content: h, styles: { halign: 'center' } });
      });

      // --- Table Body ---
      const body = filteredStudents.map((s, idx) => {
          const semesterData = s.grades[selectedSemester];
          const finalGrade = calculateFinalGrade(semesterData, activeFieldsMap, currentVisibleChapters);

          const row: any[] = [
              idx + 1,
              s.nis,
              s.name,
          ];

          visibleKeys.forEach(k => {
              const grade = semesterData[k];
              const avg = calculateChapterAverage(grade, activeFieldsMap[k]);
              row.push(
                  formatNumber(grade.f1) || '-',
                  formatNumber(grade.f2) || '-',
                  formatNumber(grade.f3) || '-',
                  formatNumber(grade.f4) || '-',
                  formatNumber(grade.f5) || '-',
                  formatNumber(grade.sum) || '-', // S (Sumatif)
                  avg !== null ? avg : '-' // R (Rerata)
              );
          });

          row.push(
              formatNumber(semesterData.kts) || '-',
              formatNumber(semesterData.sas) || '-',
              finalGrade !== null ? finalGrade : '-'
          );
          
          return row;
      });

      autoTable(doc, {
          startY: 45,
          head: [headRow1, headRow2],
          body: body,
          theme: 'grid',
          styles: { fontSize: 7, cellPadding: 1, overflow: 'linebreak' }, 
          headStyles: { 
              fillColor: headerColor, // Dynamic Color
              textColor: 255, 
              fontSize: 7, 
              fontStyle: 'bold', 
              lineWidth: 0.1 
          },
          columnStyles: {
             0: { cellWidth: 8 }, // No
             1: { cellWidth: 15 }, // NIS
             2: { cellWidth: 35 }, // Nama
          },
          margin: { top: 45, left: 10, right: 10 }
      });

      // --- Signatures ---
      const finalY = (doc as any).lastAutoTable.finalY + 15;
      
      if (finalY > 170) {
          doc.addPage();
      }

      const signatureY = finalY > 170 ? 20 : finalY; 
      
      // Coordinates for center alignment of blocks (Landscape A4: ~297mm width)
      const leftCenter = 50;  // Center of left block
      const rightCenter = 240; // Center of right block

      // Date (Right Side)
      const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      
      doc.text(`Mojokerto, ${today}`, rightCenter, signatureY, { align: "center" });
      
      doc.text("Mengetahui,", leftCenter, signatureY, { align: "center" });
      doc.text("Kepala Sekolah", leftCenter, signatureY + 5, { align: "center" });
      doc.text("Guru Mata Pelajaran", rightCenter, signatureY + 5, { align: "center" });

      // Space for signature
      const nameY = signatureY + 35;

      // Names (Centered)
      doc.setFont("helvetica", "bold");
      doc.text(settings.principalName, leftCenter, nameY, { align: "center" });
      doc.text(currentTeacherSignature.name, rightCenter, nameY, { align: "center" });

      // NIPs (Centered)
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${settings.principalNip}`, leftCenter, nameY + 5, { align: "center" });
      doc.text(`NIP. ${currentTeacherSignature.nip}`, rightCenter, nameY + 5, { align: "center" });

      doc.save(`Nilai_${selectedSubject}_${selectedClass}_${selectedSemester}.pdf`);
  };

  const handleDownloadExcel = () => {
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

          <div className="p-3 space-y-1 overflow-y-auto custom-scrollbar flex-1 flex flex-col">
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
                
                {/* Available for BOTH Admin and Teacher */}
                <button
                onClick={() => setActiveTab('monitoring_tanggungan')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'monitoring_tanggungan' 
                    ? 'bg-red-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200/60'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                    <AlertCircle size={18} />
                    {!isSidebarCollapsed && <span>Tanggungan</span>}
                </button>

                <button
                onClick={() => setActiveTab('monitoring_remidi')}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    activeTab === 'monitoring_remidi' 
                    ? 'bg-orange-500 text-white shadow-sm' 
                    : 'text-gray-600 hover:bg-gray-200/60'
                } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                >
                    <RefreshCw size={18} />
                    {!isSidebarCollapsed && <span>Remidi</span>}
                </button>
                
                {userRole === 'admin' && (
                    <button
                    onClick={() => setActiveTab('monitoring_guru')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'monitoring_guru' 
                        ? 'bg-green-600 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200/60'
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <BarChart2 size={18} />
                        {!isSidebarCollapsed && <span>Monitoring Guru</span>}
                    </button>
                )}

                 {userRole === 'admin' && (
                    <button
                    onClick={() => setActiveTab('reset')}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        activeTab === 'reset' 
                        ? 'bg-red-500 text-white shadow-sm' 
                        : 'text-gray-600 hover:bg-gray-200/60'
                    } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <AlertTriangle size={18} />
                        {!isSidebarCollapsed && <span>Reset Data</span>}
                    </button>
                )}
             </div>

             {/* Footer Group with User Info */}
             <div className="mt-auto border-t border-gray-200 pt-3">
                 {/* User Profile Display */}
                 {!isSidebarCollapsed && (
                    <div className="px-3 py-2 mb-2 bg-gray-200/50 rounded-lg mx-1 flex items-center gap-2">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600">
                             <User size={16} />
                        </div>
                        <div className="flex-1 overflow-hidden">
                             <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pengguna</p>
                             <p className="text-xs font-bold text-gray-700 truncate" title={userRole === 'admin' ? 'Administrator' : currentTeacher?.name || settings.teacherName}>
                                {userRole === 'admin' ? 'Administrator' : currentTeacher?.name || settings.teacherName}
                             </p>
                        </div>
                    </div>
                 )}

                 {/* ADDED: Settings Button for Admin */}
                 {userRole === 'admin' && (
                    <button
                        onClick={() => setActiveTab('settings')}
                        className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                            activeTab === 'settings' 
                            ? 'bg-gray-800 text-white shadow-sm' 
                            : 'text-gray-600 hover:bg-gray-200/60'
                        } ${isSidebarCollapsed ? 'justify-center' : ''}`}
                    >
                        <SlidersHorizontal size={18} />
                        {!isSidebarCollapsed && <span>Pengaturan</span>}
                    </button>
                 )}

                 <button
                    onClick={() => setIsChapterConfigModalOpen(true)}
                     className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200/60 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
                 >
                     <Settings size={18} />
                     {!isSidebarCollapsed && <span>Konfigurasi Bab</span>}
                 </button>
                 <button
                    onClick={handleLogout}
                     className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ${isSidebarCollapsed ? 'justify-center' : ''}`}
                 >
                     <LogOut size={18} />
                     {!isSidebarCollapsed && <span>Keluar</span>}
                 </button>
             </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col h-full overflow-hidden relative">
            {/* Header */}
            <div className="min-h-16 flex flex-col justify-center px-6 border-b border-gray-200 bg-white shrink-0 py-3 gap-3">
               <div>
                  <h2 className="text-xl font-bold text-gray-800 leading-tight">
                      {activeTab === 'grades' && 'Input Nilai Siswa'}
                      {activeTab === 'students' && 'Data Siswa'}
                      {activeTab === 'teachers' && 'Data Guru'}
                      {activeTab === 'monitoring_guru' && 'Monitoring Guru'}
                      {activeTab === 'reset' && 'Reset Data'}
                      {activeTab === 'monitoring_tanggungan' && 'Monitoring Tanggungan'}
                      {activeTab === 'monitoring_remidi' && 'Monitoring Remidi'}
                      {activeTab === 'settings' && 'Pengaturan Aplikasi'}
                  </h2>
                  <p className="text-xs text-gray-500 mt-1">
                      {activeTab === 'grades' && `Kelas ${selectedClass} • ${selectedSubject}`}
                      {activeTab === 'students' && 'Manajemen Data Siswa'}
                      {activeTab === 'teachers' && 'Manajemen Data Guru'}
                      {activeTab === 'monitoring_tanggungan' && 'Daftar Siswa Tanggungan (Nilai 0)'}
                      {activeTab === 'monitoring_remidi' && 'Daftar Siswa Remidi (Nilai < 70)'}
                      {activeTab === 'settings' && 'Konfigurasi Sistem & Data Sekolah'}
                  </p>
               </div>
               
               {activeTab === 'grades' && (
                 <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar sm:flex-wrap">
                    <div className="relative min-w-[180px]">
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 pr-8"
                        >
                            {availableSubjects.map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                    <div className="relative min-w-[100px]">
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 pr-8"
                        >
                            {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="relative min-w-[140px]">
                         <select
                            value={selectedSemester}
                            onChange={(e) => setSelectedSemester(e.target.value as SemesterKey)}
                            className="w-full bg-gray-50 border border-gray-300 text-gray-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 pr-8"
                        >
                            <option value="ganjil">Sem. Ganjil</option>
                            <option value="genap">Sem. Genap</option>
                        </select>
                    </div>

                    <button 
                        onClick={() => setIsInputModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-sm text-sm font-bold shrink-0"
                    >
                        <Plus size={18} />
                        <span className="hidden sm:inline">Input Nilai</span>
                        <span className="sm:hidden">Input</span>
                    </button>

                    <div className="w-px h-8 bg-gray-300 mx-1 hidden sm:block"></div>
                    
                    <button onClick={handleDownloadPDF} className="p-2 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg border border-red-200 flex items-center gap-1.5 transition-colors shadow-sm shrink-0" title="Download PDF">
                        <FileText size={18} />
                        <span className="text-xs font-bold hidden sm:inline">PDF</span>
                    </button>
                    <button onClick={handleDownloadExcel} className="p-2 bg-green-50 text-green-600 hover:bg-green-100 rounded-lg border border-green-200 flex items-center gap-1.5 transition-colors shadow-sm shrink-0" title="Download Excel">
                        <FileSpreadsheet size={18} />
                        <span className="text-xs font-bold hidden sm:inline">Excel</span>
                    </button>
                 </div>
               )}
            </div>

            {/* Content Body */}
            <div className="flex-1 overflow-hidden relative">
                {activeTab === 'grades' && (
                    <div className="h-full flex flex-col">
                        <GradeTable 
                            students={filteredStudents}
                            selectedSemester={selectedSemester}
                            activeFieldsMap={activeFieldsMap}
                            visibleChapters={currentVisibleChapters}
                            assessmentHistory={classHistory}
                            academicYear={settings.academicYear}
                            onUpdateScore={handleUpdateScore}
                            isEditable={true} 
                        />
                        <AssessmentHistory 
                           history={classHistory}
                           currentSemester={selectedSemester}
                           onEdit={handleEditSession}
                           onDelete={handleDeleteSession}
                           onResetHistory={handleResetHistory}
                        />
                    </div>
                )}

                {activeTab === 'students' && (
                    <StudentDataTable 
                        students={allStudentsMapped}
                        onAdd={handleAddStudentClick}
                        onEdit={handleEditStudentClick}
                        onDelete={handleDeleteStudent}
                        onImport={handleImportStudents}
                    />
                )}

                {activeTab === 'teachers' && (
                    <TeacherDataView 
                        teachers={teachers}
                        setTeachers={handleSaveTeacher}
                    />
                )}

                {activeTab === 'monitoring_guru' && (
                    <TeacherMonitoringView 
                        teachers={teachers}
                        history={assessmentHistory}
                        currentSemester={selectedSemester}
                    />
                )}

                {activeTab === 'monitoring_tanggungan' && (
                    <MonitoringView 
                        type="tanggungan"
                        students={allStudentsMapped}
                        history={filteredHistory}
                        currentSemester={selectedSemester}
                        subjectName={selectedSubject}
                        teacherName={currentTeacherSignature.name}
                        teacherNip={currentTeacherSignature.nip}
                        principalName={settings.principalName}
                        principalNip={settings.principalNip}
                        academicYear={settings.academicYear}
                    />
                )}

                {activeTab === 'monitoring_remidi' && (
                    <MonitoringView 
                        type="remidi"
                        students={allStudentsMapped}
                        history={filteredHistory}
                        currentSemester={selectedSemester}
                        subjectName={selectedSubject}
                        teacherName={currentTeacherSignature.name}
                        teacherNip={currentTeacherSignature.nip}
                        principalName={settings.principalName}
                        principalNip={settings.principalNip}
                        academicYear={settings.academicYear}
                    />
                )}

                {activeTab === 'reset' && (
                    <ResetDataView 
                        availableClasses={availableClasses}
                        currentSemester={selectedSemester}
                        onResetClass={handleResetClassGrades}
                    />
                )}

                {activeTab === 'settings' && userRole === 'admin' && (
                    <div className="p-8 max-w-4xl mx-auto h-full overflow-y-auto custom-scrollbar">
                        <div className="bg-white p-8 rounded-xl border border-gray-200 shadow-sm">
                            <h2 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                                <SlidersHorizontal className="text-blue-600" />
                                Pengaturan Aplikasi
                            </h2>
                            
                            <form onSubmit={handleUpdateSettings} className="space-y-8">
                                {/* Academic & Semester */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Umum</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label>
                                            <input 
                                                type="text" 
                                                value={settings.academicYear}
                                                onChange={e => setSettings({...settings, academicYear: e.target.value})}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Semester Aktif</label>
                                            <select 
                                                value={settings.activeSemester}
                                                onChange={e => setSettings({...settings, activeSemester: e.target.value as SemesterKey})}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white"
                                            >
                                                <option value="ganjil">Ganjil</option>
                                                <option value="genap">Genap</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                {/* Personnel */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Data Pejabat Sekolah</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kepala Sekolah</label>
                                            <input 
                                                type="text" 
                                                value={settings.principalName}
                                                onChange={e => setSettings({...settings, principalName: e.target.value})}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">NIP Kepala Sekolah</label>
                                            <input 
                                                type="text" 
                                                value={settings.principalNip}
                                                onChange={e => setSettings({...settings, principalNip: e.target.value})}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Nama Guru PAI (Default)</label>
                                            <input 
                                                type="text" 
                                                value={settings.teacherName}
                                                onChange={e => setSettings({...settings, teacherName: e.target.value})}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">NIP Guru PAI</label>
                                            <input 
                                                type="text" 
                                                value={settings.teacherNip}
                                                onChange={e => setSettings({...settings, teacherNip: e.target.value})}
                                                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Security */}
                                <div>
                                    <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider mb-4 border-b pb-2">Keamanan</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Password Admin</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={settings.adminPassword}
                                                    onChange={e => setSettings({...settings, adminPassword: e.target.value})}
                                                    className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                                />
                                                <Lock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 mb-1">Password Default Guru</label>
                                            <div className="relative">
                                                <input 
                                                    type="text" 
                                                    value={settings.teacherDefaultPassword}
                                                    onChange={e => setSettings({...settings, teacherDefaultPassword: e.target.value})}
                                                    className="w-full px-4 py-2.5 pl-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm font-mono"
                                                />
                                                <Lock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-6 flex justify-end border-t border-gray-100">
                                    <button type="submit" className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-lg active:scale-95">
                                        <Save size={18} /> Simpan Pengaturan
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>

      {/* Modals */}
      <AddStudentModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveStudent}
        initialData={editingStudent}
        existingClasses={availableClasses}
      />

      <InputGradeModal 
         isOpen={isInputModalOpen}
         onClose={() => { setIsInputModalOpen(false); setEditingSession(null); }}
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

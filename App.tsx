
import React, { useState, useMemo, useEffect, useRef } from 'react';
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
import * as XLSX from 'xlsx';
import * as api from './services/api'; // Import API service

type UserRole = 'admin' | 'teacher' | 'student' | null;
type ActiveTab = 'grades' | 'students' | 'teachers' | 'settings' | 'tanggungan' | 'remidi' | 'reset' | 'monitoring_guru' | 'monitoring_tanggungan' | 'monitoring_remidi';

function App() {
  // Loading State
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false); // Manual Save Loading State

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

  // Manual Save Refs/State
  const pendingSaveData = useRef<Record<string, SemesterData>>({});
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

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
        // If PAI but no specific teacher selected (legacy or fallback), use Settings or a default
        // But since we removed settings inputs, better to default to generic or empty if not found
        // However, to keep backward compatibility with existing data, we might need a fallback.
        // Let's assume PAI is also in the teachers list now.
        return { name: settings.teacherName || 'Guru PAI', nip: settings.teacherNip || '-' };
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
    // 1. Update Local State immediately
    setStudents((prev) => {
        const studentIndex = prev.findIndex(s => s.id === id);
        if (studentIndex === -1) return prev;
        
        const student = prev[studentIndex];
        
        // Create Deep Copy of needed structures to avoid mutation
        let newGradesBySubject = { ...(student.gradesBySubject || {}) };
        let currentSemesterData: SemesterData;

        // Logic to get current data and ensure structure exists
        if (selectedSubject === 'Pendidikan Agama Islam') {
            currentSemesterData = JSON.parse(JSON.stringify(student.grades[selectedSemester]));
        } else {
            if (!newGradesBySubject[selectedSubject]) {
                newGradesBySubject[selectedSubject] = {
                    ganjil: createEmptySemesterData(),
                    genap: createEmptySemesterData()
                };
            }
             if (!newGradesBySubject[selectedSubject][selectedSemester]) {
                 newGradesBySubject[selectedSubject][selectedSemester] = createEmptySemesterData();
            }
            currentSemesterData = JSON.parse(JSON.stringify(newGradesBySubject[selectedSubject][selectedSemester]));
        }

        // Apply Change
        if (chapter === 'kts' || chapter === 'sas') {
          currentSemesterData[chapter] = value;
        } else if (field) {
           currentSemesterData[chapter][field] = value;
        }

        // IMPORTANT: Update Payload Ref synchronously inside the update
        const payloadKey = `${id}-${selectedSubject}-${selectedSemester}`;
        pendingSaveData.current[payloadKey] = currentSemesterData;

        // Construct New Student Object
        const newStudent = { ...student };
        if (selectedSubject === 'Pendidikan Agama Islam') {
            newStudent.grades = {
                ...student.grades,
                [selectedSemester]: currentSemesterData
            };
        } else {
             newGradesBySubject[selectedSubject] = {
                ...newGradesBySubject[selectedSubject],
                [selectedSemester]: currentSemesterData
            };
            newStudent.gradesBySubject = newGradesBySubject;
        }

        const newArr = [...prev];
        newArr[studentIndex] = newStudent;
        return newArr;
    });

    // 2. Mark as Unsaved - NO AUTO SAVE
    setHasUnsavedChanges(true);
  };

  // NEW: Manual Save Function with ID fix
  const handleManualSave = async () => {
      setIsSaving(true);
      const changes = Object.keys(pendingSaveData.current);
      
      if (changes.length === 0) {
          setIsSaving(false);
          setHasUnsavedChanges(false);
          alert("Tidak ada perubahan untuk disimpan.");
          return;
      }

      try {
          const promises = changes.map(async (key) => {
              const [idStr, subject, semester] = key.split('-');
              // Reconstruct subject if it contained dashes, e.g. "Bahasa-Indo"
              // Logic: take substring after first dash and before last dash
              const subjectVal = key.substring(idStr.length + 1, key.lastIndexOf('-'));
              const semesterVal = semester as SemesterKey;
              
              const data = pendingSaveData.current[key];
              
              // Pass ID directly as STRING to match spreadsheet format and prevent "stacking/duplication"
              await api.saveGrade(idStr, subjectVal, semesterVal, data);
          });

          await Promise.all(promises);

          // Clear pending data after successful save
          pendingSaveData.current = {};
          setHasUnsavedChanges(false);
          alert("Data berhasil disimpan ke server!");

      } catch (error) {
          console.error("Manual save failed", error);
          alert("Gagal menyimpan data. Silakan coba lagi.");
      } finally {
          setIsSaving(false);
      }
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

  const handleDownloadExcel = () => {
    const chapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
    const visibleKeys = chapters.filter(k => currentVisibleChapters[k]);

    // Prepare Headers
    const headers = ['No', 'NIS', 'Nama Siswa', 'Kelas'];
    
    // Add Chapter Headers
    visibleKeys.forEach(k => {
        const num = k.replace('bab', '');
        const label = selectedSemester === 'genap' ? `Bab ${parseInt(num) + 5}` : `Bab ${num}`;
        ['F1', 'F2', 'F3', 'F4', 'F5', 'Sumatif', 'Rerata'].forEach(sub => {
            headers.push(`${label} - ${sub}`);
        });
    });
    
    headers.push('KTS', 'SAS', 'Nilai Akhir');

    // Prepare Data
    const data = filteredStudents.map((s, idx) => {
        const semesterData = s.grades[selectedSemester];
        const finalGrade = calculateFinalGrade(semesterData, activeFieldsMap, currentVisibleChapters);
        
        const row: any = {
            'No': idx + 1,
            'NIS': s.nis,
            'Nama Siswa': s.name,
            'Kelas': s.kelas
        };

        visibleKeys.forEach(k => {
            const grade = semesterData[k];
            const avg = calculateChapterAverage(grade, activeFieldsMap[k]);
            const num = k.replace('bab', '');
            const label = selectedSemester === 'genap' ? `Bab ${parseInt(num) + 5}` : `Bab ${num}`;

            row[`${label} - F1`] = grade.f1;
            row[`${label} - F2`] = grade.f2;
            row[`${label} - F3`] = grade.f3;
            row[`${label} - F4`] = grade.f4;
            row[`${label} - F5`] = grade.f5;
            row[`${label} - Sumatif`] = grade.sum;
            row[`${label} - Rerata`] = avg;
        });

        row['KTS'] = semesterData.kts;
        row['SAS'] = semesterData.sas;
        row['Nilai Akhir'] = finalGrade;

        return row;
    });

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Nilai Siswa");
    XLSX.writeFile(wb, `Nilai_${selectedSubject}_${selectedClass}_${selectedSemester}.xlsx`);
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
      // Use settings.principalName for Principal
      doc.text(settings.principalName, leftCenter, nameY, { align: "center" });
      // Use currentTeacherSignature for Teacher
      doc.text(currentTeacherSignature.name, rightCenter, nameY, { align: "center" });

      // NIPs (Centered)
      doc.setFont("helvetica", "normal");
      doc.text(`NIP. ${settings.principalNip}`, leftCenter, nameY + 5, { align: "center" });
      doc.text(`NIP. ${currentTeacherSignature.nip}`, rightCenter, nameY + 5, { align: "center" });

      doc.save(`Nilai_${selectedSubject}_${selectedClass}_${selectedSemester}.pdf`);
  };

  if (!userRole) {
    return (
      <LoginPage 
        students={students} 
        teachers={teachers} 
        onLogin={handleLogin}
        adminPasswordSettings={settings.adminPassword || 'admin123'}
        teacherPasswordSettings={settings.teacherDefaultPassword || 'guru'}
      />
    );
  }

  // --- RENDER MAIN LAYOUT ---

  // Determine which component to render in the main area
  const renderContent = () => {
    if (activeTab === 'students') {
      return (
        <StudentDataTable 
          students={students} 
          onAdd={handleAddStudentClick} 
          onEdit={handleEditStudentClick} 
          onDelete={handleDeleteStudent}
          onImport={handleImportStudents}
        />
      );
    }
    
    if (activeTab === 'monitoring_tanggungan') {
        return (
            <MonitoringView 
                type="tanggungan" 
                students={allStudentsMapped}
                history={assessmentHistory}
                currentSemester={selectedSemester}
                subjectName={selectedSubject}
                teacherName={activeTeacherContext?.name}
                teacherNip={activeTeacherContext?.nip}
                principalName={settings.principalName}
                principalNip={settings.principalNip}
                academicYear={settings.academicYear}
            />
        );
    }

    if (activeTab === 'monitoring_remidi') {
        return (
            <MonitoringView 
                type="remidi" 
                students={allStudentsMapped}
                history={assessmentHistory}
                currentSemester={selectedSemester}
                subjectName={selectedSubject}
                teacherName={activeTeacherContext?.name}
                teacherNip={activeTeacherContext?.nip}
                principalName={settings.principalName}
                principalNip={settings.principalNip}
                academicYear={settings.academicYear}
            />
        );
    }

    if (activeTab === 'reset') {
        return (
            <ResetDataView 
                availableClasses={availableClasses}
                currentSemester={selectedSemester}
                onResetClass={handleResetClassGrades}
            />
        );
    }

    if (activeTab === 'teachers') {
      return <TeacherDataView teachers={teachers} setTeachers={handleSaveTeacher} />;
    }

    if (activeTab === 'monitoring_guru') {
        return <TeacherMonitoringView teachers={teachers} history={assessmentHistory} currentSemester={selectedSemester} />;
    }

    if (activeTab === 'settings') {
      return (
        <div className="p-8">
           <h2 className="text-2xl font-bold mb-6 text-gray-800 flex items-center gap-2">
              <Settings className="text-gray-600" /> Pengaturan Aplikasi
           </h2>
           <form onSubmit={handleUpdateSettings} className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm max-w-4xl space-y-6">
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Academic Info */}
                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-700 border-b pb-2">Data Akademik</h3>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tahun Ajaran</label>
                          <input 
                            type="text" 
                            value={settings.academicYear}
                            onChange={(e) => setSettings({...settings, academicYear: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Semester Aktif</label>
                          <select
                             value={settings.activeSemester}
                             onChange={(e) => setSettings({...settings, activeSemester: e.target.value as SemesterKey})}
                             className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          >
                             <option value="ganjil">Ganjil</option>
                             <option value="genap">Genap</option>
                          </select>
                      </div>
                  </div>

                  {/* Principal Info */}
                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-700 border-b pb-2">Data Kepala Sekolah</h3>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Nama Kepala Sekolah</label>
                          <input 
                            type="text" 
                            value={settings.principalName}
                            onChange={(e) => setSettings({...settings, principalName: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">NIP Kepala Sekolah</label>
                          <input 
                            type="text" 
                            value={settings.principalNip}
                            onChange={(e) => setSettings({...settings, principalNip: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500"
                          />
                      </div>
                  </div>

                  {/* Security */}
                  <div className="space-y-4">
                      <h3 className="font-bold text-gray-700 border-b pb-2 flex items-center gap-2"><Lock size={16} /> Keamanan</h3>
                       <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password Admin</label>
                          <input 
                            type="text" 
                            value={settings.adminPassword || ''}
                            onChange={(e) => setSettings({...settings, adminPassword: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono"
                            placeholder="Default: admin123"
                          />
                      </div>
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Password Default Guru</label>
                          <input 
                            type="text" 
                            value={settings.teacherDefaultPassword || ''}
                            onChange={(e) => setSettings({...settings, teacherDefaultPassword: e.target.value})}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 font-mono"
                            placeholder="Default: guru"
                          />
                      </div>
                  </div>
              </div>

              <div className="pt-4 flex justify-end">
                  <button 
                    type="submit"
                    className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 transition-colors shadow-md"
                  >
                    <Save size={18} />
                    Simpan Pengaturan
                  </button>
              </div>
           </form>
        </div>
      );
    }

    // Default: Grades View
    return (
      <div className="flex-1 flex flex-col h-full bg-white relative">
        {/* Top Bar inside Content Area */}
        <div className="px-6 py-4 border-b border-gray-200 bg-white sticky top-0 z-40 shadow-sm overflow-x-auto">
            <div className="flex justify-between items-center min-w-max gap-4">
                <div className="flex items-center gap-4">
                    {/* Admin Teacher Selector - NEW */}
                    {userRole === 'admin' && (
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-500">
                                <Users size={18} />
                            </div>
                            <select
                                value={adminSelectedTeacherName}
                                onChange={(e) => setAdminSelectedTeacherName(e.target.value)}
                                className="pl-10 pr-8 py-2 bg-gray-50 border border-gray-200 text-gray-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer hover:bg-gray-100 min-w-[200px]"
                            >
                                {Array.from(new Set(teachers.map(t => t.name))).sort().map(name => (
                                    <option key={name} value={name}>{name}</option>
                                ))}
                            </select>
                            <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400">
                                <ChevronDown size={14} />
                            </div>
                        </div>
                    )}

                    {/* Subject Selector */}
                    <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-blue-600">
                            <BookOpen size={18} />
                        </div>
                        <select
                            value={selectedSubject}
                            onChange={(e) => setSelectedSubject(e.target.value)}
                            className="pl-10 pr-8 py-2 bg-blue-50 border border-blue-200 text-blue-800 text-sm font-bold rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none cursor-pointer transition-colors hover:bg-blue-100 min-w-[200px]"
                        >
                            {availableSubjects.map(sub => (
                                <option key={sub} value={sub}>{sub}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-blue-400">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    {/* Class Selector */}
                    <div className="relative">
                        <select
                            value={selectedClass}
                            onChange={(e) => setSelectedClass(e.target.value)}
                            className="pl-4 pr-8 py-2 bg-gray-100 border border-gray-200 text-gray-700 text-sm font-bold rounded-lg focus:ring-2 focus:ring-gray-400 focus:border-transparent outline-none appearance-none cursor-pointer hover:bg-gray-200"
                        >
                            {availableClasses.map(cls => (
                                <option key={cls} value={cls}>{cls}</option>
                            ))}
                        </select>
                        <div className="absolute inset-y-0 right-0 pr-2 flex items-center pointer-events-none text-gray-400">
                            <ChevronDown size={14} />
                        </div>
                    </div>

                    {/* Semester Toggle */}
                    <div className="flex bg-gray-100 p-1 rounded-lg">
                        <button
                            onClick={() => setSelectedSemester('ganjil')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectedSemester === 'ganjil' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Ganjil
                        </button>
                        <button
                            onClick={() => setSelectedSemester('genap')}
                            className={`px-3 py-1.5 text-xs font-bold rounded-md transition-all ${selectedSemester === 'genap' ? 'bg-white text-gray-800 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                        >
                            Genap
                        </button>
                    </div>

                    {/* NEW: Input Grade Button in Toolbar - HIDDEN FOR ADMIN */}
                    {userRole !== 'admin' && (
                        <button
                            onClick={() => setIsInputModalOpen(true)}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md active:scale-95 font-bold text-sm ml-2"
                        >
                            <Unlock size={16} />
                            <span>Buka Input Nilai</span>
                        </button>
                    )}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setIsChapterConfigModalOpen(true)}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Konfigurasi Bab (Tampilkan/Sembunyikan)"
                    >
                        <SlidersHorizontal size={20} />
                    </button>
                    <div className="h-6 w-px bg-gray-300 mx-1"></div>
                    
                    {/* Excel Download */}
                    <button 
                        onClick={handleDownloadExcel}
                        className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg transition-colors border border-green-100"
                        title="Download Excel"
                    >
                        <FileSpreadsheet size={20} />
                    </button>

                    <button 
                        onClick={handleDownloadPDF}
                        className="p-2 text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                        title="Download PDF Laporan"
                    >
                        <FileText size={20} />
                    </button>

                    <div className="h-6 w-px bg-gray-300 mx-1"></div>

                    {/* Manual Save Button - HIDDEN FOR ADMIN */}
                    {userRole !== 'admin' && (
                        <button 
                            onClick={handleManualSave}
                            disabled={!hasUnsavedChanges || isSaving}
                            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-sm transition-all shadow-sm ${
                                hasUnsavedChanges 
                                ? 'bg-indigo-600 text-white hover:bg-indigo-700 animate-pulse-soft shadow-indigo-200' 
                                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            }`}
                        >
                            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                            <span>{isSaving ? 'Menyimpan...' : 'Simpan Data'}</span>
                        </button>
                    )}
                </div>
            </div>
        </div>

        {/* Scrollable Content Area: GradeTable + History */}
        <div className="flex-1 overflow-y-auto custom-scrollbar relative">
            <GradeTable 
                students={filteredStudents}
                selectedSemester={selectedSemester}
                activeFieldsMap={activeFieldsMap}
                visibleChapters={currentVisibleChapters}
                assessmentHistory={classHistory}
                academicYear={settings.academicYear}
                onUpdateScore={handleUpdateScore}
                isEditable={userRole !== 'admin'} // Disable edit for admin
            />

            {/* History Panel inside scroll view */}
            {classHistory.length > 0 && (
                 <div className="bg-gray-50 border-t border-gray-200">
                     <AssessmentHistory 
                        history={classHistory} 
                        currentSemester={selectedSemester}
                        onEdit={handleEditSession}
                        onDelete={handleDeleteSession}
                        onResetHistory={handleResetHistory}
                    />
                 </div>
            )}
        </div>

        {/* Bottom Bar: Stats Only */}
        <div className="px-6 py-3 bg-white border-t border-gray-200 flex justify-between items-center shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-20">
             <div className="text-sm text-gray-500">
                <span className="font-bold text-gray-800">{filteredStudents.length}</span> Siswa di Kelas {selectedClass}
             </div>
             {hasUnsavedChanges && userRole !== 'admin' && (
                 <div className="text-sm text-orange-600 font-bold flex items-center gap-2">
                    <AlertTriangle size={16} />
                    Ada perubahan belum disimpan!
                 </div>
             )}
        </div>
      </div>
    );
  };

  // Student Dashboard View
  if (userRole === 'student' && currentUser) {
      return (
        <StudentDashboard 
            student={currentUser}
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
      
      {/* Sidebar Navigation */}
      <div className={`${isSidebarCollapsed ? 'w-20' : 'w-64'} bg-[#1c1c1e] text-gray-300 flex flex-col transition-all duration-300 ease-in-out shrink-0 relative z-50 shadow-2xl`}>
        {/* Brand */}
        <div className="h-16 flex items-center px-6 border-b border-gray-800 bg-[#1c1c1e]">
           <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0 text-white font-bold text-xl shadow-lg shadow-blue-900/50">
             G
           </div>
           {!isSidebarCollapsed && (
             <div className="ml-3 animate-fade-in">
                <h1 className="font-bold text-white text-lg tracking-tight">iGrade</h1>
                <p className="text-[10px] text-gray-500 uppercase tracking-widest font-semibold">SMPN 3 Pacet</p>
             </div>
           )}
        </div>

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto py-6 space-y-1 custom-scrollbar-dark">
           {/* Section: Main */}
           {!isSidebarCollapsed && <div className="px-6 mb-2 text-[10px] font-bold uppercase text-gray-600 tracking-wider">Menu Utama</div>}
           
           <button 
             onClick={() => setActiveTab('grades')}
             className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'grades' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}
           >
              {activeTab === 'grades' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}
              <BookOpen size={20} className={activeTab === 'grades' ? 'text-blue-400' : ''} />
              {!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Input Nilai</span>}
           </button>

           {userRole === 'admin' && (
             <button 
                onClick={() => setActiveTab('students')}
                className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'students' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}
             >
                {activeTab === 'students' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}
                <Users size={20} className={activeTab === 'students' ? 'text-blue-400' : ''} />
                {!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Data Siswa</span>}
             </button>
           )}

           {userRole === 'admin' && (
             <button 
                onClick={() => setActiveTab('teachers')}
                className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'teachers' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}
             >
                {activeTab === 'teachers' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}
                <UserCheck size={20} className={activeTab === 'teachers' ? 'text-blue-400' : ''} />
                {!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Data Guru</span>}
             </button>
           )}

           {/* Section: Monitoring */}
           {!isSidebarCollapsed && <div className="px-6 mt-6 mb-2 text-[10px] font-bold uppercase text-gray-600 tracking-wider">Monitoring</div>}

           {userRole === 'admin' && (
             <button 
                onClick={() => setActiveTab('monitoring_guru')}
                className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'monitoring_guru' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}
             >
                {activeTab === 'monitoring_guru' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}
                <CheckCircle size={20} className={activeTab === 'monitoring_guru' ? 'text-green-400' : ''} />
                {!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Input Guru</span>}
             </button>
           )}
           
           <button 
             onClick={() => setActiveTab('monitoring_tanggungan')}
             className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'monitoring_tanggungan' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}
           >
              {activeTab === 'monitoring_tanggungan' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}
              <AlertCircle size={20} className={activeTab === 'monitoring_tanggungan' ? 'text-red-400' : ''} />
              {!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Tanggungan</span>}
           </button>

           <button 
             onClick={() => setActiveTab('monitoring_remidi')}
             className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'monitoring_remidi' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}
           >
              {activeTab === 'monitoring_remidi' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}
              <RefreshCw size={20} className={activeTab === 'monitoring_remidi' ? 'text-orange-400' : ''} />
              {!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Remidi</span>}
           </button>

           {/* Section: System */}
           {userRole === 'admin' && !isSidebarCollapsed && <div className="px-6 mt-6 mb-2 text-[10px] font-bold uppercase text-gray-600 tracking-wider">Sistem</div>}

            {userRole === 'admin' && (
             <button 
                onClick={() => setActiveTab('reset')}
                className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'reset' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}
             >
                {activeTab === 'reset' && <div className="absolute left-0 w-1 h-full bg-red-600 rounded-r-full"></div>}
                <Trash2 size={20} className={activeTab === 'reset' ? 'text-red-500' : ''} />
                {!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Reset Data</span>}
             </button>
           )}

           {userRole === 'admin' && (
             <button 
                onClick={() => setActiveTab('settings')}
                className={`w-full flex items-center px-6 py-3 transition-colors relative ${activeTab === 'settings' ? 'text-white bg-white/10' : 'hover:text-white hover:bg-white/5'}`}
             >
                {activeTab === 'settings' && <div className="absolute left-0 w-1 h-full bg-blue-500 rounded-r-full"></div>}
                <Settings size={20} className={activeTab === 'settings' ? 'text-gray-400' : ''} />
                {!isSidebarCollapsed && <span className="ml-3 font-medium text-sm">Pengaturan</span>}
             </button>
           )}

        </div>

        {/* Footer Toggle */}
        <div className="p-4 border-t border-gray-800">
           <button 
             onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
             className="w-full flex items-center justify-center p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-gray-400"
           >
              {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
           </button>
        </div>

        {/* User Info */}
        <div className="p-4 bg-[#141416] border-t border-gray-800">
             <div className="flex items-center gap-3">
                 <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white text-xs font-bold">
                    {userRole === 'admin' ? 'A' : 'G'}
                 </div>
                 {!isSidebarCollapsed && (
                     <div className="overflow-hidden">
                        <p className="text-sm font-bold text-white truncate">{userRole === 'admin' ? 'Administrator' : currentTeacher?.name}</p>
                        <p className="text-[10px] text-gray-500 truncate">{userRole === 'admin' ? 'Full Access' : 'Guru Mapel'}</p>
                     </div>
                 )}
                 {!isSidebarCollapsed && (
                    <button onClick={handleLogout} className="ml-auto text-gray-500 hover:text-white transition-colors">
                        <LogOut size={16} />
                    </button>
                 )}
             </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 bg-[#f5f5f7] relative">
         {/* Render Active View */}
         {renderContent()}
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
      
      {/* Chapter Config Modal */}
      <ChapterConfigModal 
        isOpen={isChapterConfigModalOpen}
        onClose={() => setIsChapterConfigModalOpen(false)}
        subjectName={selectedSubject}
        semester={selectedSemester}
        initialConfig={currentVisibleChapters}
        onSave={handleSaveChapterConfig}
      />
      
      {/* Global Loading Overlay */}
      {isLoading && (
          <div className="fixed inset-0 z-[60] bg-white/80 backdrop-blur-sm flex items-center justify-center">
               <div className="flex flex-col items-center">
                    <Loader2 size={40} className="text-blue-600 animate-spin mb-4" />
                    <p className="text-gray-600 font-medium">Memuat data...</p>
               </div>
          </div>
      )}

    </div>
  );
}

export default App;

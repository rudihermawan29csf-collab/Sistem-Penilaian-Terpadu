
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, SemesterKey, AppSettings, Teacher, DailyAttendanceLog, AttendanceRecord, StudentExtracurricular } from '../types';
import { Award, Plus, Trash2, Save, UserPlus, X, Edit2, Check, FileText, Calendar, CheckCircle, FileSpreadsheet, PieChart, List, CalendarRange, Lock, Info, Image as ImageIcon, CloudUpload, Search, History, Camera } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ExtraActivityViewProps {
  students: Student[];
  onUpdateStudents: (updatedStudents: Student[]) => void;
  semester: SemesterKey;
  settings: AppSettings;
  teachers: Teacher[];
  onUpdateSettings: (settings: AppSettings) => void;
  dailyAttendance: DailyAttendanceLog[];
  onSaveDailyAttendance: (log: DailyAttendanceLog) => void;
  userRole?: string;
  userData?: any;
}

const ExtraActivityView: React.FC<ExtraActivityViewProps> = ({ 
    students, 
    onUpdateStudents, 
    semester, 
    settings,
    teachers,
    onUpdateSettings,
    dailyAttendance,
    onSaveDailyAttendance,
    userRole,
    userData
}) => {
  const [selectedExtra, setSelectedExtra] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mainTab, setMainTab] = useState<'grading' | 'attendance'>('grading'); 
  
  // Local Grading State (For Batch Save)
  const [localEnrolledStudents, setLocalEnrolledStudents] = useState<Student[]>([]);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // Coach Editing State
  const [isEditingCoach, setIsEditingCoach] = useState(false);
  const [tempCoach, setTempCoach] = useState('');
  
  // Modal selection state
  const [modalClass, setModalClass] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Attendance State
  const [attendanceSubTab, setAttendanceSubTab] = useState<'input' | 'monitor' | 'rekap_bulanan' | 'rekap_semester' | 'history'>('input');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendanceForm, setAttendanceForm] = useState<Record<number, 'H'|'S'|'I'|'A'>>({});
  const [documentation, setDocumentation] = useState<string[]>([]); // Store base64 images
  
  // Filter Dates
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  const [filterStartDate, setFilterStartDate] = useState<string>(firstDay);
  const [filterEndDate, setFilterEndDate] = useState<string>(lastDay);
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter Available Extras based on Role
  const availableExtras = useMemo(() => {
      const allExtras = settings.extracurriculars || [];
      if (!userRole || userRole === 'admin') return allExtras;
      if (userRole === 'teacher' && userData?.name) {
          return allExtras.filter(e => e.coach === userData.name);
      }
      return [];
  }, [settings.extracurriculars, userRole, userData]);

  // Initial Sync for Grading Table
  useEffect(() => {
      if (selectedExtra) {
          const enrolled = students.filter(s => 
              s.extracurricularRecord?.[semester]?.some(e => e.activityName === selectedExtra)
          ).sort((a,b) => a.name.localeCompare(b.name));
          setLocalEnrolledStudents(JSON.parse(JSON.stringify(enrolled))); // Deep copy
          setHasUnsavedChanges(false);
      } else {
          setLocalEnrolledStudents([]);
      }
  }, [selectedExtra, students, semester]); // Re-sync when main data changes

  // Helper to check if student has this extra (from local state or props)
  const getStudentExtra = (student: Student, extraName: string) => {
      return student.extracurricularRecord?.[semester]?.find(e => e.activityName === extraName);
  };

  // Load existing attendance or sync with Class Attendance (Wali Kelas) when date/extra changes
  useEffect(() => {
      if (mainTab === 'attendance' && selectedExtra) {
          // 1. Check for specific Extra Attendance Log first
          const extraLog = dailyAttendance.find(log => log.date === selectedDate && log.className === selectedExtra);
          
          const newForm: Record<number, 'H'|'S'|'I'|'A'> = {};
          
          localEnrolledStudents.forEach(s => {
              if (extraLog) {
                  const record = extraLog.records.find(r => r.studentId === s.id);
                  newForm[s.id] = record ? record.status : 'H';
              } else {
                  // Check Class Log (Wali Kelas / Ketua Kelas input)
                  const classLog = dailyAttendance.find(log => log.date === selectedDate && log.className === s.kelas);
                  const classRecord = classLog?.records.find(r => r.studentId === s.id);
                  
                  if (classRecord && (classRecord.status === 'S' || classRecord.status === 'I')) {
                      newForm[s.id] = classRecord.status;
                  } else {
                      newForm[s.id] = 'H';
                  }
              }
          });
          
          setAttendanceForm(newForm);
          setDocumentation(extraLog?.documentation || []);
      }
  }, [selectedDate, selectedExtra, mainTab, localEnrolledStudents, dailyAttendance]);

  const handleStatusChange = (studentId: number, status: 'H'|'S'|'I'|'A') => {
      setAttendanceForm(prev => ({
          ...prev,
          [studentId]: status
      }));
  };

  const handleSaveAttendance = () => {
      const records: AttendanceRecord[] = Object.entries(attendanceForm).map(([id, status]) => ({
          studentId: parseInt(id),
          status: status as 'H' | 'S' | 'I' | 'A'
      }));

      const log: DailyAttendanceLog = {
          id: `${selectedExtra}-${selectedDate}`, // Unique ID for extra
          date: selectedDate,
          className: selectedExtra, // Store Extra Name as ClassName
          records,
          documentation: documentation // Save photos
      };

      onSaveDailyAttendance(log);
      alert('Absensi ekstrakurikuler & dokumentasi berhasil disimpan!');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) {
          if (documentation.length >= 3) {
              alert("Maksimal 3 foto dokumentasi.");
              return;
          }
          const reader = new FileReader();
          reader.onloadend = () => {
              if (typeof reader.result === 'string') {
                  setDocumentation(prev => [...prev, reader.result as string]);
              }
          };
          reader.readAsDataURL(file);
      }
      // Reset input
      if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveImage = (index: number) => {
      setDocumentation(prev => prev.filter((_, i) => i !== index));
  };

  // --- ATTENDANCE CALCULATIONS ---
  const dateRange = useMemo(() => {
      const dates = [];
      const curr = new Date(filterStartDate);
      const end = new Date(filterEndDate);
      while (curr <= end) {
          dates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
      }
      return dates;
  }, [filterStartDate, filterEndDate]);

  const attendanceMap = useMemo(() => {
      const map: Record<string, Record<number, string>> = {};
      dateRange.forEach(date => {
          const log = dailyAttendance.find(d => d.date === date && d.className === selectedExtra);
          if (log) {
              map[date] = {};
              log.records.forEach(r => {
                  map[date][r.studentId] = r.status;
              });
          }
      });
      return map;
  }, [dailyAttendance, selectedExtra, dateRange]);

  const monthlySummary = useMemo(() => {
      const summary: Record<number, { h: number, s: number, i: number, a: number }> = {};
      localEnrolledStudents.forEach(s => summary[s.id] = { h: 0, s: 0, i: 0, a: 0 });

      const monthlyLogs = dailyAttendance.filter(d => 
          d.className === selectedExtra && d.date.startsWith(selectedMonth)
      );

      monthlyLogs.forEach(log => {
          log.records.forEach(r => {
              if (summary[r.studentId]) {
                  if (r.status === 'H') summary[r.studentId].h++;
                  else if (r.status === 'S') summary[r.studentId].s++;
                  else if (r.status === 'I') summary[r.studentId].i++;
                  else if (r.status === 'A') summary[r.studentId].a++;
              }
          });
      });
      return summary;
  }, [dailyAttendance, selectedExtra, selectedMonth, localEnrolledStudents]);

  const semesterSummary = useMemo(() => {
      const summary: Record<number, { h: number, s: number, i: number, a: number }> = {};
      localEnrolledStudents.forEach(s => summary[s.id] = { h: 0, s: 0, i: 0, a: 0 });

      const allLogs = dailyAttendance.filter(d => d.className === selectedExtra);
      
      allLogs.forEach(log => {
          log.records.forEach(r => {
              if (summary[r.studentId]) {
                  if (r.status === 'H') summary[r.studentId].h++;
                  else if (r.status === 'S') summary[r.studentId].s++;
                  else if (r.status === 'I') summary[r.studentId].i++;
                  else if (r.status === 'A') summary[r.studentId].a++;
              }
          });
      });
      return summary;
  }, [dailyAttendance, selectedExtra, localEnrolledStudents]);

  // Excel Downloads
  const handleDownloadExcelMatrix = () => {
      const data = localEnrolledStudents.map((s, idx) => {
          const row: any = { 'No': idx + 1, 'Nama Siswa': s.name };
          dateRange.forEach(date => {
              row[date] = attendanceMap[date]?.[s.id] || '-';
          });
          return row;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Riwayat ${selectedExtra}`);
      XLSX.writeFile(wb, `Riwayat_${selectedExtra}.xlsx`);
  };

  const handleDownloadExcelRekap = (type: 'bulanan' | 'semester') => {
      const summaryData = type === 'bulanan' ? monthlySummary : semesterSummary;
      const title = type === 'bulanan' ? `Rekap Bulanan ${selectedMonth}` : `Rekap Semester`;
      const data = localEnrolledStudents.map((s, idx) => {
          const stats = summaryData[s.id];
          return {
              'No': idx + 1, 'Nama Siswa': s.name,
              'Hadir': stats.h, 'Sakit': stats.s, 'Izin': stats.i, 'Alpha': stats.a,
              'Persentase': `${Math.round((stats.h / (stats.h+stats.s+stats.i+stats.a || 1)) * 100)}%`
          };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, title);
      XLSX.writeFile(wb, `${title}_${selectedExtra}.xlsx`);
  };

  // Helper to generate automatic description based on grade
  const generateDescription = (activityName: string, predikat: string) => {
      if (predikat === 'A') return `Sangat baik dalam mengikuti kegiatan ${activityName}.`;
      if (predikat === 'B') return `Baik dalam mengikuti kegiatan ${activityName}.`;
      if (predikat === 'C') return `Cukup dalam mengikuti kegiatan ${activityName}.`;
      return `Mengikuti kegiatan ${activityName}.`;
  };

  // --- MODIFICATION HANDLERS (Local State) ---

  const handleAddStudent = () => {
      if (selectedStudentIds.length === 0 || !selectedExtra) return;
      
      const newEnrolled = [...localEnrolledStudents];
      
      // We need to add students from the main `students` pool to our local state
      // but configured with the extra record
      students.forEach(s => {
          if (selectedStudentIds.includes(s.id)) {
              // Check if already in local
              if (newEnrolled.some(existing => existing.id === s.id)) return;

              const defaultPredikat = 'A';
              const defaultDesc = generateDescription(selectedExtra, defaultPredikat);
              const newRecord = { activityName: selectedExtra, predikat: defaultPredikat, description: defaultDesc };

              const sCopy = JSON.parse(JSON.stringify(s));
              if (!sCopy.extracurricularRecord) sCopy.extracurricularRecord = { ganjil: [], genap: [] };
              if (!sCopy.extracurricularRecord[semester]) sCopy.extracurricularRecord[semester] = [];
              sCopy.extracurricularRecord[semester].push(newRecord);
              
              newEnrolled.push(sCopy);
          }
      });

      setLocalEnrolledStudents(newEnrolled.sort((a,b) => a.name.localeCompare(b.name)));
      setHasUnsavedChanges(true);
      setIsModalOpen(false);
      setSelectedStudentIds([]);
      setStudentSearchTerm('');
  };

  const handleRemoveStudent = (studentId: number) => {
      if(!confirm("Hapus siswa ini dari daftar ekstrakurikuler?")) return;
      setLocalEnrolledStudents(prev => prev.filter(s => s.id !== studentId));
      setHasUnsavedChanges(true);
  };

  const handleUpdateGrade = (studentId: number, field: 'predikat' | 'description', value: string) => {
      setLocalEnrolledStudents(prev => prev.map(s => {
          if (s.id === studentId) {
              const records = s.extracurricularRecord[semester].map(e => {
                  if (e.activityName === selectedExtra) {
                      if (field === 'predikat') {
                          return { ...e, predikat: value, description: generateDescription(selectedExtra, value) };
                      }
                      return { ...e, [field]: value };
                  }
                  return e;
              });
              return { ...s, extracurricularRecord: { ...s.extracurricularRecord, [semester]: records } };
          }
          return s;
      }));
      setHasUnsavedChanges(true);
  };

  const handleSaveGrades = () => {
      // 1. Merge localEnrolledStudents changes back into main `students` array
      // This is efficient because we map over the main array and only replace if ID matches
      const updatedStudents = students.map(originalStudent => {
          const modifiedStudent = localEnrolledStudents.find(s => s.id === originalStudent.id);
          
          if (modifiedStudent) {
              // This student is in the enrolled list, use their updated extra record
              return modifiedStudent;
          } else {
              // This student is NOT in the enrolled list.
              // We must ensure they don't have this Extra in their record (in case they were removed)
              const existingRecord = originalStudent.extracurricularRecord?.[semester] || [];
              if (existingRecord.some(e => e.activityName === selectedExtra)) {
                  // They were removed in local state, so remove from main state
                  return {
                      ...originalStudent,
                      extracurricularRecord: {
                          ...originalStudent.extracurricularRecord,
                          [semester]: existingRecord.filter(e => e.activityName !== selectedExtra)
                      }
                  };
              }
              return originalStudent;
          }
      });

      onUpdateStudents(updatedStudents);
      setHasUnsavedChanges(false);
      alert("Data penilaian dan deskripsi berhasil disimpan!");
  };

  const handleSaveCoach = () => {
      if (!selectedExtra) return;
      const newExtras = settings.extracurriculars.map(e => {
          if (e.name === selectedExtra) {
              return { ...e, coach: tempCoach };
          }
          return e;
      });
      onUpdateSettings({ ...settings, extracurriculars: newExtras });
      setIsEditingCoach(false);
  };

  const availableClasses = Array.from(new Set(students.map(s => s.kelas))).sort();
  
  // Filter students for modal
  const studentsInModalClass = students.filter(s => {
      if (s.kelas !== modalClass) return false;
      if (studentSearchTerm) {
          return s.name.toLowerCase().includes(studentSearchTerm.toLowerCase());
      }
      return true;
  }).sort((a,b) => a.name.localeCompare(b.name));

  const toggleStudentSelection = (id: number) => {
      setSelectedStudentIds(prev => prev.includes(id) ? prev.filter(sid => sid !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
      if (selectedStudentIds.length === studentsInModalClass.length) {
          setSelectedStudentIds([]);
      } else {
          setSelectedStudentIds(studentsInModalClass.map(s => s.id));
      }
  };

  const currentCoach = settings.extracurriculars.find(e => e.name === selectedExtra)?.coach || '-';

  return (
    <div className="flex-1 bg-white h-full flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200 bg-white sticky top-0 z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Award className="text-purple-600" />
                Manajemen Ekstrakurikuler
            </h2>
            <p className="text-sm text-gray-500 mt-1">Input nilai, deskripsi, dan absensi kegiatan pengembangan diri.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
            <select 
                value={selectedExtra} 
                onChange={(e) => { setSelectedExtra(e.target.value); setIsEditingCoach(false); setAttendanceSubTab('input'); }} 
                className="pl-4 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-700 focus:ring-2 focus:ring-purple-500 outline-none min-w-[200px]"
            >
                <option value="">-- Pilih Ekstrakurikuler --</option>
                {availableExtras.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
            </select>
            
            {selectedExtra && (
                <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button 
                        onClick={() => setMainTab('grading')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${mainTab === 'grading' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <FileText size={16} /> Penilaian & Deskripsi
                    </button>
                    <button 
                        onClick={() => setMainTab('attendance')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${mainTab === 'attendance' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        <Calendar size={16} /> Absensi Kehadiran
                    </button>
                </div>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        {!selectedExtra ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Award size={64} className="mb-4 opacity-20" />
                <p>
                    {availableExtras.length > 0 
                        ? 'Pilih jenis ekstrakurikuler di atas untuk memulai.' 
                        : 'Anda belum terdaftar sebagai pembina ekstrakurikuler apapun.'}
                </p>
            </div>
        ) : (
            <>
            {/* --- GRADING TAB --- */}
            {mainTab === 'grading' && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm animate-scale-in flex flex-col h-full">
                    <div className="bg-purple-50 px-6 py-3 border-b border-purple-100 flex justify-between items-center shrink-0">
                        <h3 className="font-bold text-purple-800">{localEnrolledStudents.length} Peserta Terdaftar</h3>
                        
                        {/* Coach Info */}
                        {userRole === 'admin' ? (
                            isEditingCoach ? (
                                <div className="flex items-center gap-2">
                                    <select 
                                        value={tempCoach} 
                                        onChange={(e) => setTempCoach(e.target.value)}
                                        className="text-xs border border-purple-200 rounded px-2 py-1"
                                    >
                                        <option value="">Pilih Guru...</option>
                                        {teachers.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
                                    </select>
                                    <button onClick={handleSaveCoach} className="p-1 bg-green-500 text-white rounded"><Check size={12}/></button>
                                    <button onClick={() => setIsEditingCoach(false)} className="p-1 bg-red-500 text-white rounded"><X size={12}/></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-sm text-purple-700">
                                    <span>Pembina: <strong>{currentCoach}</strong></span>
                                    <button onClick={() => { setTempCoach(currentCoach); setIsEditingCoach(true); }} className="text-purple-400 hover:text-purple-600"><Edit2 size={12}/></button>
                                </div>
                            )
                        ) : (
                            <div className="flex items-center gap-2 text-sm text-purple-700">
                                <span>Pembina: <strong>{currentCoach}</strong></span>
                            </div>
                        )}
                    </div>
                    
                    <div className="flex-1 overflow-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold sticky top-0 z-10 shadow-sm">
                                <tr>
                                    <th className="px-6 py-3 border-b border-gray-200 w-12 text-center bg-gray-50">No</th>
                                    <th className="px-6 py-3 border-b border-gray-200 bg-gray-50">Nama Siswa</th>
                                    <th className="px-6 py-3 border-b border-gray-200 w-24 bg-gray-50">Kelas</th>
                                    <th className="px-6 py-3 border-b border-gray-200 w-32 text-center bg-gray-50">Predikat</th>
                                    <th className="px-6 py-3 border-b border-gray-200 bg-gray-50">Deskripsi</th>
                                    <th className="px-6 py-3 border-b border-gray-200 w-16 text-center bg-gray-50">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {localEnrolledStudents.map((student, idx) => {
                                    const extraData = getStudentExtra(student, selectedExtra);
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 text-center text-gray-500">{idx + 1}</td>
                                            <td className="px-6 py-3 font-medium text-gray-800">{student.name}</td>
                                            <td className="px-6 py-3 text-gray-600">{student.kelas}</td>
                                            <td className="px-6 py-3 text-center">
                                                <select 
                                                    value={extraData?.predikat || 'A'}
                                                    onChange={(e) => handleUpdateGrade(student.id, 'predikat', e.target.value)}
                                                    className="border border-gray-300 rounded px-2 py-1 text-sm font-bold text-center focus:ring-2 focus:ring-purple-500 outline-none"
                                                >
                                                    <option value="A">A (Sangat Baik)</option>
                                                    <option value="B">B (Baik)</option>
                                                    <option value="C">C (Cukup)</option>
                                                </select>
                                            </td>
                                            <td className="px-6 py-3">
                                                <input 
                                                    type="text" 
                                                    value={extraData?.description || ''}
                                                    onChange={(e) => handleUpdateGrade(student.id, 'description', e.target.value)}
                                                    className="w-full border border-gray-300 rounded px-3 py-1.5 text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                                                />
                                            </td>
                                            <td className="px-6 py-3 text-center">
                                                <button 
                                                    onClick={() => handleRemoveStudent(student.id)}
                                                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                    title="Hapus Siswa"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        </tr>
                                    );
                                })}
                                {localEnrolledStudents.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-6 py-12 text-center text-gray-400 italic">
                                            Belum ada siswa yang terdaftar di ekstrakurikuler ini.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="p-4 border-t border-gray-100 bg-gray-50 flex justify-between items-center shrink-0">
                        <button 
                            onClick={() => {
                                setModalClass(availableClasses[0] || '');
                                setSelectedStudentIds([]);
                                setIsModalOpen(true);
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 text-gray-700 font-bold rounded-lg hover:bg-gray-100 shadow-sm text-sm"
                        >
                            <UserPlus size={16} /> Tambah Anggota
                        </button>

                        {/* BATCH SAVE BUTTON */}
                        <button 
                            onClick={handleSaveGrades}
                            disabled={!hasUnsavedChanges}
                            className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold shadow-md transition-all ${
                                hasUnsavedChanges 
                                ? 'bg-purple-600 hover:bg-purple-700 text-white animate-pulse' 
                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <Save size={18} />
                            {hasUnsavedChanges ? 'Simpan Penilaian' : 'Tersimpan'}
                        </button>
                    </div>
                </div>
            )}

            {/* --- ATTENDANCE TAB --- */}
            {mainTab === 'attendance' && (
                <div className="space-y-6 animate-scale-in">
                    {/* Sub Navigation */}
                    <div className="flex gap-2 border-b border-gray-200 pb-2 overflow-x-auto">
                        <button 
                            onClick={() => setAttendanceSubTab('input')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${attendanceSubTab === 'input' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Input Harian
                        </button>
                        <button 
                            onClick={() => setAttendanceSubTab('history')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 ${attendanceSubTab === 'history' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            <History size={14}/> Riwayat & Dokumentasi
                        </button>
                        <button 
                            onClick={() => setAttendanceSubTab('monitor')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${attendanceSubTab === 'monitor' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Matriks Riwayat
                        </button>
                        <button 
                            onClick={() => setAttendanceSubTab('rekap_bulanan')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${attendanceSubTab === 'rekap_bulanan' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Rekap Bulanan
                        </button>
                        <button 
                            onClick={() => setAttendanceSubTab('rekap_semester')}
                            className={`px-4 py-2 text-xs font-bold rounded-lg transition-colors whitespace-nowrap ${attendanceSubTab === 'rekap_semester' ? 'bg-blue-100 text-blue-700' : 'text-gray-500 hover:bg-gray-100'}`}
                        >
                            Rekap Semester
                        </button>
                    </div>

                    {/* Content Area */}
                    {attendanceSubTab === 'input' && (
                        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                                <div className="flex items-center gap-4 mb-6">
                                    <div className="flex-1">
                                        <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Tanggal Kegiatan</label>
                                        <input 
                                            type="date" 
                                            value={selectedDate}
                                            onChange={(e) => setSelectedDate(e.target.value)}
                                            className="w-full bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                        />
                                    </div>
                                    <div className="flex-1 text-right">
                                        <p className="text-xs text-gray-500">Jumlah Peserta</p>
                                        <p className="text-xl font-bold text-gray-800">{localEnrolledStudents.length}</p>
                                    </div>
                                </div>

                                {/* Documentation Upload */}
                                <div className="mb-6 bg-blue-50 border border-blue-100 rounded-xl p-4">
                                    <div className="flex justify-between items-center mb-3">
                                        <h4 className="font-bold text-blue-800 text-sm flex items-center gap-2">
                                            <ImageIcon size={16}/> Dokumentasi Kegiatan (Max 3)
                                        </h4>
                                        <input 
                                            type="file" 
                                            accept="image/*" 
                                            ref={fileInputRef}
                                            className="hidden" 
                                            onChange={handleImageUpload}
                                        />
                                        <button 
                                            onClick={() => fileInputRef.current?.click()}
                                            disabled={documentation.length >= 3}
                                            className="flex items-center gap-1 text-xs bg-white text-blue-600 px-3 py-1.5 rounded-lg border border-blue-200 font-bold hover:bg-blue-50 disabled:opacity-50"
                                        >
                                            <CloudUpload size={14}/> Upload Foto
                                        </button>
                                    </div>
                                    <div className="flex gap-4 overflow-x-auto pb-2">
                                        {documentation.map((src, i) => (
                                            <div key={i} className="relative w-24 h-24 shrink-0 rounded-lg overflow-hidden border border-blue-200 group">
                                                <img src={src} alt={`Dokumentasi ${i+1}`} className="w-full h-full object-cover" />
                                                <button 
                                                    onClick={() => handleRemoveImage(i)}
                                                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <X size={12}/>
                                                </button>
                                            </div>
                                        ))}
                                        {documentation.length === 0 && (
                                            <div className="w-full py-4 text-center text-xs text-blue-400 italic">Belum ada foto dokumentasi.</div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Attendance Table */}
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold">
                                    <tr>
                                        <th className="px-6 py-3 border-b border-gray-200 w-12 text-center">No</th>
                                        <th className="px-6 py-3 border-b border-gray-200">Nama Siswa</th>
                                        <th className="px-6 py-3 border-b border-gray-200 w-24">Kelas</th>
                                        <th className="px-6 py-3 border-b border-gray-200 text-center">Kehadiran</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {localEnrolledStudents.map((student, idx) => (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-3 text-center text-sm text-gray-500">{idx + 1}</td>
                                            <td className="px-6 py-3 font-medium text-gray-800 text-sm">{student.name}</td>
                                            <td className="px-6 py-3 text-gray-500 text-xs">{student.kelas}</td>
                                            <td className="px-6 py-3 text-center">
                                                <div className="flex justify-center gap-1">
                                                    {(['H', 'S', 'I', 'A'] as const).map(status => (
                                                        <label 
                                                            key={status} 
                                                            className={`
                                                                flex flex-col items-center justify-center w-8 h-8 rounded cursor-pointer border transition-all
                                                                ${attendanceForm[student.id] === status 
                                                                    ? status === 'H' ? 'bg-green-500 border-green-600 text-white' :
                                                                      status === 'S' ? 'bg-blue-500 border-blue-600 text-white' :
                                                                      status === 'I' ? 'bg-yellow-500 border-yellow-600 text-white' :
                                                                      'bg-red-500 border-red-600 text-white'
                                                                    : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-100'
                                                                }
                                                            `}
                                                        >
                                                            <input 
                                                                type="radio" 
                                                                name={`attn-${student.id}`} 
                                                                value={status}
                                                                checked={attendanceForm[student.id] === status}
                                                                onChange={() => handleStatusChange(student.id, status)}
                                                                className="hidden"
                                                            />
                                                            <span className="text-xs font-bold">{status}</span>
                                                        </label>
                                                    ))}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            
                            <div className="p-4 border-t border-gray-100 flex justify-end">
                                <button 
                                    onClick={handleSaveAttendance}
                                    className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg font-bold shadow-md hover:bg-blue-700 transition-colors"
                                >
                                    <Save size={18}/> Simpan Absensi
                                </button>
                            </div>
                        </div>
                    )}

                    {/* NEW: History & Documentation Tab */}
                    {attendanceSubTab === 'history' && (
                        <div className="space-y-6">
                            {dailyAttendance
                                .filter(log => log.className === selectedExtra)
                                .sort((a,b) => b.date.localeCompare(a.date))
                                .map(log => {
                                    // Calculate stats for this day
                                    const stats = {h:0, s:0, i:0, a:0};
                                    log.records.forEach(r => {
                                        if (r.status === 'H') stats.h++;
                                        else if (r.status === 'S') stats.s++;
                                        else if (r.status === 'I') stats.i++;
                                        else if (r.status === 'A') stats.a++;
                                    });

                                    return (
                                        <div key={log.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                            <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-2 bg-blue-100 rounded-lg text-blue-600">
                                                        <Calendar size={20} />
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-gray-800 text-sm">
                                                            {new Date(log.date).toLocaleDateString('id-ID', {weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'})}
                                                        </h4>
                                                        <p className="text-xs text-gray-500">Log ID: {log.id}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-2">
                                                    <span className="px-2 py-1 bg-green-50 text-green-700 rounded text-xs font-bold border border-green-100">H: {stats.h}</span>
                                                    <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">S: {stats.s}</span>
                                                    <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded text-xs font-bold border border-yellow-100">I: {stats.i}</span>
                                                    <span className="px-2 py-1 bg-red-50 text-red-700 rounded text-xs font-bold border border-red-100">A: {stats.a}</span>
                                                </div>
                                            </div>
                                            
                                            <div className="p-6">
                                                <h5 className="text-xs font-bold text-gray-500 uppercase mb-3 flex items-center gap-2">
                                                    <Camera size={14}/> Dokumentasi Kegiatan
                                                </h5>
                                                {log.documentation && log.documentation.length > 0 ? (
                                                    <div className="flex gap-4 overflow-x-auto pb-2">
                                                        {log.documentation.map((src, idx) => (
                                                            <div key={idx} className="relative w-40 h-32 shrink-0 rounded-lg overflow-hidden border border-gray-200 shadow-sm group">
                                                                <img src={src} alt="Dokumentasi" className="w-full h-full object-cover transition-transform group-hover:scale-105" />
                                                                <a 
                                                                    href={src} 
                                                                    download={`Dokumentasi_${selectedExtra}_${log.date}_${idx+1}.png`}
                                                                    className="absolute bottom-2 right-2 bg-black/50 text-white p-1.5 rounded-full hover:bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity"
                                                                    title="Download Foto"
                                                                >
                                                                    <CloudUpload size={14} className="rotate-180"/>
                                                                </a>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <div className="text-sm text-gray-400 italic bg-gray-50 p-4 rounded-lg text-center border border-dashed border-gray-200">
                                                        Tidak ada foto dokumentasi untuk tanggal ini.
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            }
                            {dailyAttendance.filter(log => log.className === selectedExtra).length === 0 && (
                                <div className="text-center py-12 text-gray-400">
                                    <History size={48} className="mx-auto mb-3 opacity-20" />
                                    <p>Belum ada riwayat kegiatan yang terekam.</p>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sub Tab: Matrix */}
                    {attendanceSubTab === 'monitor' && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="flex flex-wrap gap-4 mb-4 items-end">
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Mulai Tanggal</label>
                                    <input type="date" value={filterStartDate} onChange={e=>setFilterStartDate(e.target.value)} className="border rounded px-2 py-1 text-sm"/>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-gray-500 mb-1">Sampai Tanggal</label>
                                    <input type="date" value={filterEndDate} onChange={e=>setFilterEndDate(e.target.value)} className="border rounded px-2 py-1 text-sm"/>
                                </div>
                                <button onClick={handleDownloadExcelMatrix} className="ml-auto flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded text-xs font-bold"><FileSpreadsheet size={14}/> Excel</button>
                            </div>
                            <div className="overflow-x-auto custom-scrollbar border rounded-lg">
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500">
                                        <tr>
                                            <th className="px-4 py-2 border-b border-r w-10">No</th>
                                            <th className="px-4 py-2 border-b border-r">Nama Siswa</th>
                                            {dateRange.map(d => (
                                                <th key={d} className="px-2 py-2 border-b border-r text-center min-w-[3rem]">
                                                    <div className="flex flex-col text-[10px]">
                                                        <span>{new Date(d).getDate()}</span>
                                                        <span>{new Date(d).toLocaleString('id-ID', {month:'short'})}</span>
                                                    </div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="text-xs">
                                        {localEnrolledStudents.map((s, idx) => (
                                            <tr key={s.id} className="hover:bg-gray-50">
                                                <td className="px-4 py-2 border-b border-r text-center text-gray-500">{idx+1}</td>
                                                <td className="px-4 py-2 border-b border-r font-medium">{s.name}</td>
                                                {dateRange.map(d => {
                                                    const stat = attendanceMap[d]?.[s.id];
                                                    let color = 'text-gray-300';
                                                    if(stat==='H') color='text-green-600 font-bold';
                                                    if(stat==='S') color='text-blue-600 font-bold';
                                                    if(stat==='I') color='text-yellow-600 font-bold';
                                                    if(stat==='A') color='text-red-600 font-bold';
                                                    return (
                                                        <td key={d} className={`px-2 py-2 border-b border-r text-center ${color}`}>{stat||'-'}</td>
                                                    )
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Sub Tab: Rekap Bulanan */}
                    {attendanceSubTab === 'rekap_bulanan' && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <input type="month" value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} className="border rounded px-3 py-1.5 text-sm font-bold"/>
                                <button onClick={()=>handleDownloadExcelRekap('bulanan')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded text-xs font-bold"><FileSpreadsheet size={14}/> Excel</button>
                            </div>
                            <div className="overflow-auto border rounded-lg">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 uppercase font-bold text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3">Nama Siswa</th>
                                            <th className="px-4 py-3 text-center">Hadir</th>
                                            <th className="px-4 py-3 text-center">Sakit</th>
                                            <th className="px-4 py-3 text-center">Izin</th>
                                            <th className="px-4 py-3 text-center">Alpha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {localEnrolledStudents.map(s => {
                                            const stats = monthlySummary[s.id];
                                            return (
                                                <tr key={s.id}>
                                                    <td className="px-4 py-2 font-medium">{s.name}</td>
                                                    <td className="px-4 py-2 text-center bg-green-50">{stats.h}</td>
                                                    <td className="px-4 py-2 text-center bg-blue-50">{stats.s}</td>
                                                    <td className="px-4 py-2 text-center bg-yellow-50">{stats.i}</td>
                                                    <td className="px-4 py-2 text-center bg-red-50">{stats.a}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Sub Tab: Rekap Semester */}
                    {attendanceSubTab === 'rekap_semester' && (
                        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-bold text-gray-700 text-sm">Rekapitulasi Total Semester</h3>
                                <button onClick={()=>handleDownloadExcelRekap('semester')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded text-xs font-bold"><FileSpreadsheet size={14}/> Excel</button>
                            </div>
                            <div className="overflow-auto border rounded-lg">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-gray-50 uppercase font-bold text-gray-500">
                                        <tr>
                                            <th className="px-4 py-3">Nama Siswa</th>
                                            <th className="px-4 py-3 text-center">Hadir</th>
                                            <th className="px-4 py-3 text-center">Sakit</th>
                                            <th className="px-4 py-3 text-center">Izin</th>
                                            <th className="px-4 py-3 text-center">Alpha</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {localEnrolledStudents.map(s => {
                                            const stats = semesterSummary[s.id];
                                            return (
                                                <tr key={s.id}>
                                                    <td className="px-4 py-2 font-medium">{s.name}</td>
                                                    <td className="px-4 py-2 text-center bg-green-50">{stats.h}</td>
                                                    <td className="px-4 py-2 text-center bg-blue-50">{stats.s}</td>
                                                    <td className="px-4 py-2 text-center bg-yellow-50">{stats.i}</td>
                                                    <td className="px-4 py-2 text-center bg-red-50">{stats.a}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </div>
            )}
            </>
        )}
      </div>

      {/* ADD MEMBER MODAL */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[80vh]">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                      <h3 className="font-bold text-lg text-gray-800">Tambah Anggota {selectedExtra}</h3>
                      <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={20}/></button>
                  </div>
                  
                  <div className="p-4 border-b border-gray-100 bg-gray-50 flex gap-2">
                      <select 
                          value={modalClass}
                          onChange={(e) => setModalClass(e.target.value)}
                          className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-700 outline-none w-32"
                      >
                          <option value="">Pilih Kelas...</option>
                          {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                      <div className="relative flex-1">
                          <input 
                              type="text" 
                              placeholder="Cari nama siswa..." 
                              value={studentSearchTerm}
                              onChange={(e) => setStudentSearchTerm(e.target.value)}
                              className="w-full border border-gray-300 rounded-lg pl-9 pr-3 py-2 text-sm outline-none"
                          />
                          <Search size={16} className="absolute left-3 top-2.5 text-gray-400"/>
                      </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-2">
                      {modalClass ? (
                          studentsInModalClass.length > 0 ? (
                              <div className="space-y-1">
                                  <div className="px-4 py-2 flex items-center gap-3 border-b border-gray-100 mb-2">
                                      <input 
                                          type="checkbox" 
                                          checked={selectedStudentIds.length === studentsInModalClass.length && studentsInModalClass.length > 0}
                                          onChange={toggleSelectAll}
                                          className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                      />
                                      <span className="text-xs font-bold text-gray-500 uppercase">Pilih Semua</span>
                                  </div>
                                  {studentsInModalClass.map(s => {
                                      const isEnrolled = s.extracurricularRecord?.[semester]?.some(e => e.activityName === selectedExtra);
                                      return (
                                          <div key={s.id} className={`flex items-center gap-3 px-4 py-2 rounded-lg ${isEnrolled ? 'opacity-50' : 'hover:bg-purple-50'}`}>
                                              <input 
                                                  type="checkbox" 
                                                  checked={selectedStudentIds.includes(s.id) || isEnrolled}
                                                  onChange={() => !isEnrolled && toggleStudentSelection(s.id)}
                                                  disabled={isEnrolled}
                                                  className="w-4 h-4 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                                              />
                                              <div>
                                                  <p className="text-sm font-medium text-gray-800">{s.name} {isEnrolled && <span className="text-xs text-green-600 font-bold">(Sudah Terdaftar)</span>}</p>
                                                  <p className="text-xs text-gray-500">{s.nis}</p>
                                              </div>
                                          </div>
                                      );
                                  })}
                              </div>
                          ) : (
                              <div className="text-center py-8 text-gray-400 text-sm">Tidak ada siswa ditemukan.</div>
                          )
                      ) : (
                          <div className="text-center py-12 text-gray-400 text-sm">Silakan pilih kelas terlebih dahulu.</div>
                      )}
                  </div>

                  <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
                      <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm font-medium">Batal</button>
                      <button 
                          onClick={handleAddStudent}
                          disabled={selectedStudentIds.length === 0}
                          className="px-6 py-2 bg-purple-600 text-white rounded-lg text-sm font-bold hover:bg-purple-700 shadow-sm disabled:opacity-50"
                      >
                          Tambahkan ({selectedStudentIds.length})
                      </button>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ExtraActivityView;

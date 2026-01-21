
import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Student, SemesterKey, AppSettings, Teacher, DailyAttendanceLog, AttendanceRecord } from '../types';
import { Award, Plus, Trash2, Save, UserPlus, X, Edit2, Check, FileText, Calendar, CheckCircle, FileSpreadsheet, PieChart, List, CalendarRange, Lock, Info, Image as ImageIcon, UploadCloud, Search } from 'lucide-react';
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
}

const ExtraActivityView: React.FC<ExtraActivityViewProps> = ({ 
    students, 
    onUpdateStudents, 
    semester, 
    settings,
    teachers,
    onUpdateSettings,
    dailyAttendance,
    onSaveDailyAttendance
}) => {
  const [selectedExtra, setSelectedExtra] = useState<string>('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mainTab, setMainTab] = useState<'grading' | 'attendance'>('grading'); 
  
  // Coach Editing State
  const [isEditingCoach, setIsEditingCoach] = useState(false);
  const [tempCoach, setTempCoach] = useState('');
  
  // Modal selection state
  const [modalClass, setModalClass] = useState('');
  const [selectedStudentIds, setSelectedStudentIds] = useState<number[]>([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');

  // Attendance State
  const [attendanceSubTab, setAttendanceSubTab] = useState<'input' | 'monitor' | 'rekap_bulanan' | 'rekap_semester'>('input');
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

  // Helper to check if student has this extra
  const getStudentExtra = (student: Student, extraName: string) => {
      return student.extracurricularRecord?.[semester]?.find(e => e.activityName === extraName);
  };

  // Filter students who are enrolled in the selected extra
  const enrolledStudents = useMemo(() => {
      if (!selectedExtra) return [];
      return students.filter(s => getStudentExtra(s, selectedExtra)).sort((a,b) => a.name.localeCompare(b.name));
  }, [students, selectedExtra, semester]);

  // Load existing attendance or sync with Class Attendance (Wali Kelas) when date/extra changes
  useEffect(() => {
      if (mainTab === 'attendance' && selectedExtra) {
          // 1. Check for specific Extra Attendance Log first
          const extraLog = dailyAttendance.find(log => log.date === selectedDate && log.className === selectedExtra);
          
          const newForm: Record<number, 'H'|'S'|'I'|'A'> = {};
          
          enrolledStudents.forEach(s => {
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
  }, [selectedDate, selectedExtra, mainTab, enrolledStudents, dailyAttendance]);

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
      enrolledStudents.forEach(s => summary[s.id] = { h: 0, s: 0, i: 0, a: 0 });

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
  }, [dailyAttendance, selectedExtra, selectedMonth, enrolledStudents]);

  const semesterSummary = useMemo(() => {
      const summary: Record<number, { h: number, s: number, i: number, a: number }> = {};
      enrolledStudents.forEach(s => summary[s.id] = { h: 0, s: 0, i: 0, a: 0 });

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
  }, [dailyAttendance, selectedExtra, enrolledStudents]);

  // Excel Downloads
  const handleDownloadExcelMatrix = () => {
      const data = enrolledStudents.map((s, idx) => {
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
      const data = enrolledStudents.map((s, idx) => {
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

  const handleAddStudent = () => {
      if (selectedStudentIds.length === 0 || !selectedExtra) return;
      
      const updatedStudents = students.map(s => {
          if (selectedStudentIds.includes(s.id)) {
              const currentExtras = s.extracurricularRecord?.[semester] || [];
              if (currentExtras.some(e => e.activityName === selectedExtra)) return s;
              
              const defaultPredikat = 'A';
              const defaultDesc = generateDescription(selectedExtra, defaultPredikat);
              
              return {
                  ...s,
                  extracurricularRecord: {
                      ...s.extracurricularRecord,
                      [semester]: [
                          ...currentExtras,
                          { activityName: selectedExtra, predikat: defaultPredikat, description: defaultDesc }
                      ]
                  }
              };
          }
          return s;
      });
      onUpdateStudents(updatedStudents);
      setIsModalOpen(false);
      setSelectedStudentIds([]);
      setStudentSearchTerm('');
  };

  const handleRemoveStudent = (studentId: number) => {
      if(!confirm("Hapus siswa ini dari ekstrakurikuler?")) return;
      const updatedStudents = students.map(s => {
          if (s.id === studentId) {
              return {
                  ...s,
                  extracurricularRecord: {
                      ...s.extracurricularRecord,
                      [semester]: s.extracurricularRecord[semester].filter(e => e.activityName !== selectedExtra)
                  }
              };
          }
          return s;
      });
      onUpdateStudents(updatedStudents);
  };

  const handleUpdateGrade = (studentId: number, field: 'predikat' | 'description', value: string) => {
      const updatedStudents = students.map(s => {
          if (s.id === studentId) {
              const newExtras = s.extracurricularRecord[semester].map(e => {
                  if (e.activityName === selectedExtra) {
                      // If predikat changes, automatically update description as well
                      if (field === 'predikat') {
                          return { 
                              ...e, 
                              predikat: value,
                              description: generateDescription(selectedExtra, value) 
                          };
                      }
                      // If description is manually edited, just update description
                      return { ...e, [field]: value };
                  }
                  return e;
              });
              return {
                  ...s,
                  extracurricularRecord: {
                      ...s.extracurricularRecord,
                      [semester]: newExtras
                  }
              };
          }
          return s;
      });
      onUpdateStudents(updatedStudents);
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
                onChange={(e) => { setSelectedExtra(e.target.value); setIsEditingCoach(false); }} 
                className="pl-4 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-700 focus:ring-2 focus:ring-purple-500 outline-none min-w-[200px]"
            >
                <option value="">-- Pilih Ekstrakurikuler --</option>
                {settings.extracurriculars?.map(e => <option key={e.name} value={e.name}>{e.name}</option>)}
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
                <p>Pilih jenis ekstrakurikuler di atas untuk memulai.</p>
            </div>
        ) : (
            <>
            {/* --- GRADING TAB --- */}
            {mainTab === 'grading' && (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm animate-scale-in">
                    <div className="bg-purple-50 px-6 py-3 border-b border-purple-100 flex justify-between items-center">
                        <h3 className="font-bold text-purple-800">{enrolledStudents.length} Peserta Terdaftar</h3>
                        
                        <div className="flex items-center gap-4">
                            {/* Coach Editing */}
                            {isEditingCoach ? (
                                <div className="flex items-center gap-2 bg-white px-2 py-1 rounded shadow-sm border border-purple-200">
                                    <input 
                                        list="teacherListUniqueId" 
                                        type="text" 
                                        value={tempCoach}
                                        onChange={(e) => setTempCoach(e.target.value)}
                                        className="text-xs px-2 py-1 outline-none w-48 font-medium text-gray-700"
                                        placeholder="Nama Pembina"
                                        autoFocus
                                    />
                                    <datalist id="teacherListUniqueId">
                                        {teachers.map(t => <option key={t.id} value={t.name} />)}
                                    </datalist>
                                    <button onClick={handleSaveCoach} className="p-1 text-green-600 hover:bg-green-50 rounded"><Check size={14}/></button>
                                    <button onClick={() => setIsEditingCoach(false)} className="p-1 text-red-600 hover:bg-red-50 rounded"><X size={14}/></button>
                                </div>
                            ) : (
                                <div className="flex items-center gap-2 text-xs text-purple-700 font-medium">
                                    <span>Pembina: {currentCoach}</span>
                                    <button 
                                        onClick={() => { setTempCoach(currentCoach === '-' ? '' : currentCoach); setIsEditingCoach(true); }} 
                                        className="p-1 hover:bg-purple-100 rounded text-purple-500 hover:text-purple-800 transition-colors"
                                        title="Ganti Pembina"
                                    >
                                        <Edit2 size={12} />
                                    </button>
                                </div>
                            )}
                            
                            <button 
                                onClick={() => setIsModalOpen(true)} 
                                className="flex items-center gap-2 px-3 py-1.5 bg-purple-600 text-white rounded text-xs font-bold hover:bg-purple-700 transition-colors"
                            >
                                <UserPlus size={14} /> Tambah Peserta
                            </button>
                        </div>
                    </div>
                    <table className="w-full text-left border-collapse">
                        <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold sticky top-0 z-10">
                            <tr>
                                <th className="px-6 py-3 border-b border-gray-200 w-12 text-center">No</th>
                                <th className="px-6 py-3 border-b border-gray-200 w-32">Kelas</th>
                                <th className="px-6 py-3 border-b border-gray-200">Nama Siswa</th>
                                <th className="px-6 py-3 border-b border-gray-200 w-24 text-center">Predikat</th>
                                <th className="px-6 py-3 border-b border-gray-200 w-1/3">Deskripsi</th>
                                <th className="px-6 py-3 border-b border-gray-200 w-16 text-center">Hapus</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {enrolledStudents.map((student, idx) => {
                                const extraData = getStudentExtra(student, selectedExtra);
                                return (
                                    <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 text-center text-sm text-gray-500">{idx + 1}</td>
                                        <td className="px-6 py-3 text-sm font-bold text-gray-600">{student.kelas}</td>
                                        <td className="px-6 py-3 text-sm font-medium text-gray-800">{student.name}</td>
                                        <td className="px-6 py-3 text-center">
                                            <select 
                                                value={extraData?.predikat}
                                                onChange={(e) => handleUpdateGrade(student.id, 'predikat', e.target.value)}
                                                className="bg-gray-50 border border-gray-200 rounded px-2 py-1 text-sm font-bold text-center outline-none focus:ring-1 focus:ring-purple-500"
                                            >
                                                <option value="A">A</option>
                                                <option value="B">B</option>
                                                <option value="C">C</option>
                                            </select>
                                        </td>
                                        <td className="px-6 py-3">
                                            <input 
                                                type="text" 
                                                value={extraData?.description}
                                                onChange={(e) => handleUpdateGrade(student.id, 'description', e.target.value)}
                                                className="w-full bg-transparent border-b border-transparent hover:border-gray-300 focus:border-purple-500 focus:bg-white outline-none px-2 py-1 text-sm transition-colors"
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-center">
                                            <button onClick={() => handleRemoveStudent(student.id)} className="text-gray-400 hover:text-red-500">
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    {enrolledStudents.length === 0 && (
                        <div className="p-8 text-center text-gray-400 italic">Belum ada siswa yang ditambahkan ke ekstrakurikuler ini.</div>
                    )}
                </div>
            )}

            {/* --- ATTENDANCE TAB (Reused) --- */}
            {mainTab === 'attendance' && (
                <div className="h-full flex flex-col animate-scale-in">
                    {/* Sub Tabs */}
                    <div className="flex bg-white border-b border-gray-200 mb-4 sticky top-0 z-10 pb-2">
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button onClick={() => setAttendanceSubTab('input')} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${attendanceSubTab === 'input' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                <CheckCircle size={14}/> Input
                            </button>
                            <button onClick={() => setAttendanceSubTab('monitor')} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${attendanceSubTab === 'monitor' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                <List size={14}/> Riwayat
                            </button>
                            <button onClick={() => setAttendanceSubTab('rekap_bulanan')} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${attendanceSubTab === 'rekap_bulanan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                <CalendarRange size={14}/> Rekap Bulanan
                            </button>
                            <button onClick={() => setAttendanceSubTab('rekap_semester')} className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${attendanceSubTab === 'rekap_semester' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                                <PieChart size={14}/> Rekap Semester
                            </button>
                        </div>
                    </div>

                    {/* Input View */}
                    {attendanceSubTab === 'input' && (
                        <div className="max-w-4xl mx-auto w-full pb-10">
                            <div className="mb-6 flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                                <div className="flex-1">
                                    <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Tanggal Kegiatan</label>
                                    <input 
                                        type="date" 
                                        value={selectedDate}
                                        onChange={(e) => setSelectedDate(e.target.value)}
                                        className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex-1 text-right">
                                    <p className="text-xs text-gray-500">Total Peserta</p>
                                    <p className="text-2xl font-bold text-gray-800">{enrolledStudents.length}</p>
                                </div>
                            </div>

                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm mb-6">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold sticky top-0 z-10">
                                        <tr>
                                            <th className="px-4 py-3 border-b w-10 text-center">No</th>
                                            <th className="px-4 py-3 border-b">Nama Siswa</th>
                                            <th className="px-4 py-3 border-b w-48 text-center">Status Kehadiran</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {enrolledStudents.map((student, idx) => {
                                            // Check lock status from Wali Kelas
                                            const classLog = dailyAttendance.find(log => log.date === selectedDate && log.className === student.kelas);
                                            const classRecord = classLog?.records.find(r => r.studentId === student.id);
                                            const isLocked = classRecord && (classRecord.status === 'S' || classRecord.status === 'I');

                                            return (
                                            <tr key={student.id} className={`transition-colors ${isLocked ? 'bg-yellow-50/50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-4 py-3 text-center text-sm text-gray-500">{idx + 1}</td>
                                                <td className="px-4 py-3 font-medium text-gray-800 text-sm">
                                                    {student.name}
                                                    <div className="text-[10px] text-gray-400">{student.kelas}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isLocked ? (
                                                        <div className="flex items-center justify-center p-2 rounded-lg bg-yellow-100 border border-yellow-200 text-yellow-800 gap-2">
                                                            <Lock size={14} className="text-yellow-700 shrink-0" />
                                                            <div className="flex flex-col text-xs leading-tight text-center">
                                                                <span className="font-bold uppercase">
                                                                    {classRecord.status === 'S' ? 'SAKIT' : 'IZIN'}
                                                                </span>
                                                                <span className="italic opacity-80 text-[9px]">(Dari Wali Kelas)</span>
                                                            </div>
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-1">
                                                            {(['H', 'S', 'I', 'A'] as const).map(status => (
                                                                <label 
                                                                    key={status} 
                                                                    className={`
                                                                        flex flex-col items-center justify-center w-10 h-10 rounded-lg cursor-pointer border transition-all
                                                                        ${attendanceForm[student.id] === status 
                                                                            ? status === 'H' ? 'bg-green-100 border-green-500 text-green-700' :
                                                                              status === 'S' ? 'bg-blue-100 border-blue-500 text-blue-700' :
                                                                              status === 'I' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' :
                                                                              'bg-red-100 border-red-500 text-red-700'
                                                                            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
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
                                                                    <span className="text-sm font-bold">{status}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        )})}
                                    </tbody>
                                </table>
                            </div>

                            {/* DOCUMENTATION SECTION */}
                            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                                <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                    <ImageIcon size={18} className="text-blue-600" />
                                    Dokumentasi Kegiatan (Maksimal 3 Foto)
                                </h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    {documentation.map((img, idx) => (
                                        <div key={idx} className="relative aspect-square rounded-lg overflow-hidden border border-gray-200 group">
                                            <img src={img} alt={`Dokumentasi ${idx + 1}`} className="w-full h-full object-cover" />
                                            <button 
                                                onClick={() => handleRemoveImage(idx)}
                                                className="absolute top-1 right-1 p-1 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                                <X size={12} />
                                            </button>
                                        </div>
                                    ))}
                                    {documentation.length < 3 && (
                                        <label className="flex flex-col items-center justify-center aspect-square rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors text-gray-400 hover:text-blue-600">
                                            <UploadCloud size={24} className="mb-2" />
                                            <span className="text-xs font-bold">Upload Foto</span>
                                            <input 
                                                type="file" 
                                                ref={fileInputRef}
                                                accept="image/*" 
                                                className="hidden" 
                                                onChange={handleImageUpload} 
                                            />
                                        </label>
                                    )}
                                </div>
                            </div>

                            <div className="flex justify-end">
                                <button onClick={handleSaveAttendance} className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95">
                                    <Save size={20} /> Simpan Absensi & Foto
                                </button>
                            </div>
                        </div>
                    )}

                    {/* History / Monitor View */}
                    {attendanceSubTab === 'monitor' && (
                        <div className="h-full flex flex-col">
                            <div className="mb-4 flex flex-wrap items-end gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Dari Tanggal</label><input type="date" value={filterStartDate} onChange={(e) => setFilterStartDate(e.target.value)} className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
                                <div><label className="block text-xs font-bold text-gray-500 mb-1">Sampai Tanggal</label><input type="date" value={filterEndDate} onChange={(e) => setFilterEndDate(e.target.value)} className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm"/></div>
                                <div className="flex-1"></div>
                                <button onClick={handleDownloadExcelMatrix} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm"><FileSpreadsheet size={16} /> Download Excel</button>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 overflow-auto custom-scrollbar relative">
                                <table className="w-full text-left border-collapse min-w-max">
                                    <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 border-b border-r border-gray-200 w-12 text-center sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                                            <th className="px-4 py-3 border-b border-r border-gray-200 w-64 sticky left-12 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Siswa</th>
                                            {dateRange.map(date => (
                                                <th key={date} className="px-2 py-3 border-b border-r border-gray-200 text-center min-w-[3rem]">
                                                    <div className="flex flex-col"><span>{new Date(date).getDate()}</span><span className="text-[9px] font-normal">{new Date(date).toLocaleString('id-ID', {month: 'short'})}</span></div>
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {enrolledStudents.map((student, idx) => (
                                            <tr key={student.id} className="hover:bg-blue-50/20 transition-colors">
                                                <td className="px-4 py-2 border-r border-gray-100 text-center text-gray-500 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{idx + 1}</td>
                                                <td className="px-4 py-2 border-r border-gray-100 font-medium text-gray-800 sticky left-12 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{student.name}</td>
                                                {dateRange.map(date => {
                                                    const status = attendanceMap[date]?.[student.id];
                                                    let cellClass = "text-gray-300";
                                                    if (status === 'H') cellClass = "text-green-600 font-bold bg-green-50";
                                                    else if (status === 'S') cellClass = "text-blue-600 font-bold bg-blue-50";
                                                    else if (status === 'I') cellClass = "text-yellow-600 font-bold bg-yellow-50";
                                                    else if (status === 'A') cellClass = "text-red-600 font-bold bg-red-50";
                                                    else if (!status) cellClass = "bg-gray-50/50";
                                                    return <td key={date} className={`px-2 py-2 border-r border-gray-100 text-center ${cellClass}`}>{status || '-'}</td>
                                                })}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Rekap Bulanan */}
                    {attendanceSubTab === 'rekap_bulanan' && (
                        <div className="h-full flex flex-col animate-scale-in">
                            <div className="mb-4 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <div className="flex items-center gap-4">
                                    <div><label className="block text-xs font-bold text-gray-500 mb-1">Pilih Bulan</label><input type="month" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)} className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-700"/></div>
                                    <div><h3 className="font-bold text-gray-800">Rekapitulasi Bulanan</h3><p className="text-xs text-gray-500">{new Date(selectedMonth).toLocaleString('id-ID', {month: 'long', year: 'numeric'})}</p></div>
                                </div>
                                <button onClick={() => handleDownloadExcelRekap('bulanan')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm"><FileSpreadsheet size={16} /> Download Excel</button>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 overflow-auto custom-scrollbar relative">
                                <table className="w-full text-left border-collapse min-w-max">
                                    <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 border-b border-r border-gray-200 w-12 text-center sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                                            <th className="px-4 py-3 border-b border-r border-gray-200 w-64 sticky left-12 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Siswa</th>
                                            <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-green-50 text-green-700">Hadir</th>
                                            <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-blue-50 text-blue-700">Sakit</th>
                                            <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-yellow-50 text-yellow-700">Izin</th>
                                            <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-red-50 text-red-700">Alpha</th>
                                            <th className="px-4 py-3 border-b border-gray-200 w-24 text-center">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {enrolledStudents.map((student, idx) => {
                                            const stats = monthlySummary[student.id];
                                            return (
                                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-center text-gray-500 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{idx + 1}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-800 sticky left-12 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{student.name}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-green-600 bg-green-50/20">{stats.h}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-blue-600 bg-blue-50/20">{stats.s}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-yellow-600 bg-yellow-50/20">{stats.i}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-red-600 bg-red-50/20">{stats.a}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-gray-700 bg-gray-50">{stats.s + stats.i + stats.a}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Rekap Semester */}
                    {attendanceSubTab === 'rekap_semester' && (
                        <div className="h-full flex flex-col animate-scale-in">
                            <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                                <div><h3 className="font-bold text-gray-800">Rekapitulasi Total Semester</h3><p className="text-xs text-gray-500">Akumulasi seluruh kehadiran {selectedExtra}</p></div>
                                <button onClick={() => handleDownloadExcelRekap('semester')} className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm"><FileSpreadsheet size={16} /> Download Excel</button>
                            </div>
                            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 overflow-auto custom-scrollbar relative">
                                <table className="w-full text-left border-collapse min-w-max">
                                    <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 sticky top-0 z-20 shadow-sm">
                                        <tr>
                                            <th className="px-4 py-3 border-b border-r border-gray-200 w-12 text-center sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                                            <th className="px-4 py-3 border-b border-r border-gray-200 w-64 sticky left-12 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Siswa</th>
                                            <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-green-50 text-green-700">Hadir</th>
                                            <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-blue-50 text-blue-700">Sakit</th>
                                            <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-yellow-50 text-yellow-700">Izin</th>
                                            <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-red-50 text-red-700">Alpha</th>
                                            <th className="px-4 py-3 border-b border-gray-200 w-24 text-center">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100 text-sm">
                                        {enrolledStudents.map((student, idx) => {
                                            const stats = semesterSummary[student.id];
                                            return (
                                                <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                                    <td className="px-4 py-3 text-center text-gray-500 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{idx + 1}</td>
                                                    <td className="px-4 py-3 font-medium text-gray-800 sticky left-12 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{student.name}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-green-600 bg-green-50/20">{stats.h}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-blue-600 bg-blue-50/20">{stats.s}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-yellow-600 bg-yellow-50/20">{stats.i}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-red-600 bg-red-50/20">{stats.a}</td>
                                                    <td className="px-4 py-3 text-center font-bold text-gray-700 bg-gray-50">{stats.s + stats.i + stats.a}</td>
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

      {/* Add Student Modal */}
      {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-scale-in flex flex-col max-h-[80vh]">
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                      <h3 className="font-bold text-gray-800">Tambah Peserta {selectedExtra}</h3>
                      <button onClick={() => setIsModalOpen(false)}><X size={20} className="text-gray-400" /></button>
                  </div>
                  <div className="p-6 space-y-4 flex-1 overflow-hidden flex flex-col">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Kelas</label>
                          <select 
                              value={modalClass} 
                              onChange={(e) => { setModalClass(e.target.value); setSelectedStudentIds([]); setStudentSearchTerm(''); }}
                              className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-purple-500"
                          >
                              <option value="">-- Pilih Kelas --</option>
                              {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                          </select>
                      </div>
                      
                      {modalClass && (
                          <div className="flex-1 flex flex-col min-h-0">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Pilih Siswa (Multi Select)</label>
                              
                              {/* Search Box */}
                              <div className="relative mb-2">
                                  <input 
                                      type="text" 
                                      placeholder="Cari nama siswa..." 
                                      value={studentSearchTerm}
                                      onChange={(e) => setStudentSearchTerm(e.target.value)}
                                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                                  />
                                  <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                              </div>

                              {/* Student List */}
                              <div className="flex-1 overflow-y-auto border border-gray-200 rounded-lg custom-scrollbar">
                                  {studentsInModalClass.length > 0 ? (
                                      <>
                                          <div className="px-3 py-2 border-b border-gray-100 flex items-center gap-3 bg-gray-50 sticky top-0 z-10">
                                              <input 
                                                  type="checkbox" 
                                                  checked={selectedStudentIds.length === studentsInModalClass.length && studentsInModalClass.length > 0}
                                                  onChange={toggleSelectAll}
                                                  className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                              />
                                              <span className="text-xs font-bold text-gray-600">Pilih Semua ({studentsInModalClass.length})</span>
                                          </div>
                                          {studentsInModalClass.map(s => (
                                              <div key={s.id} className="flex items-center gap-3 px-3 py-2 hover:bg-purple-50 border-b border-gray-50 last:border-0 transition-colors">
                                                  <input 
                                                      type="checkbox" 
                                                      checked={selectedStudentIds.includes(s.id)}
                                                      onChange={() => toggleStudentSelection(s.id)}
                                                      className="w-4 h-4 rounded text-purple-600 focus:ring-purple-500 border-gray-300"
                                                  />
                                                  <div>
                                                      <p className="text-sm font-medium text-gray-800">{s.name}</p>
                                                      <p className="text-[10px] text-gray-500">{s.nis}</p>
                                                  </div>
                                              </div>
                                          ))}
                                      </>
                                  ) : (
                                      <div className="p-4 text-center text-gray-400 text-sm italic">
                                          Tidak ada siswa ditemukan.
                                      </div>
                                  )}
                              </div>
                              <p className="text-xs text-right text-purple-600 font-bold mt-1">
                                  {selectedStudentIds.length} Siswa Dipilih
                              </p>
                          </div>
                      )}

                      <div className="pt-2 flex justify-end border-t border-gray-100">
                          <button 
                              onClick={handleAddStudent}
                              disabled={selectedStudentIds.length === 0}
                              className="bg-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-purple-700 disabled:bg-gray-300 transition-colors shadow-sm"
                          >
                              Tambahkan ({selectedStudentIds.length})
                          </button>
                      </div>
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default ExtraActivityView;


import React, { useState, useMemo, useEffect } from 'react';
import { Student, SemesterKey, Teacher, AppSettings, GradingSession, ChapterKey, FormativeKey, SemesterData, DailyAttendanceLog, AttendanceRecord } from '../types';
import { Users, Save, Check, FileText, Activity, AlertCircle, RefreshCw, X, Eye, Clock, Calendar, FileSpreadsheet, PlusCircle, CalendarRange, PieChart } from 'lucide-react';
import { createEmptySemesterData } from '../utils';
import * as XLSX from 'xlsx';

interface WaliKelasViewProps {
  students: Student[];
  onUpdateStudents: (updatedStudents: Student[]) => void;
  semester: SemesterKey;
  teachers?: Teacher[];
  settings?: AppSettings;
  assessmentHistory?: GradingSession[];
  dailyAttendance: DailyAttendanceLog[];
  onSaveDailyAttendance?: (log: DailyAttendanceLog) => void;
}

const WaliKelasView: React.FC<WaliKelasViewProps> = ({ 
    students, 
    onUpdateStudents, 
    semester,
    teachers = [],
    settings,
    assessmentHistory = [],
    dailyAttendance = [],
    onSaveDailyAttendance
}) => {
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'attendance' | 'monitoring' | 'history' | 'input_izin' | 'rekap_bulanan'>('attendance');
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStudentForDetail, setSelectedStudentForDetail] = useState<Student | null>(null);
  const [detailModalTab, setDetailModalTab] = useState<'tanggungan' | 'remidi'>('tanggungan');

  // Input Izin State
  const [izinDate, setIzinDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [izinStudentId, setIzinStudentId] = useState<string>('');
  const [izinStatus, setIzinStatus] = useState<'S' | 'I'>('S');
  const [izinNote, setIzinNote] = useState<string>('');

  // Matrix Filter State for History Tab
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];
  const [filterStartDate, setFilterStartDate] = useState<string>(firstDay);
  const [filterEndDate, setFilterEndDate] = useState<string>(lastDay);

  // Monthly Rekap State
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  const availableClasses = useMemo(() => Array.from(new Set(students.map(s => s.kelas))).sort(), [students]);

  const filteredStudents = useMemo(() => {
    return students.filter(s => s.kelas === selectedClass).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  // Local state to handle inputs before saving
  const [localAttendance, setLocalAttendance] = useState<Record<number, { s: number, i: number, a: number }>>({});

  // Sync local state when class changes or dailyAttendance changes
  useEffect(() => {
    const initial: Record<number, { s: number, i: number, a: number }> = {};
    
    // Calculate aggregate from daily logs for this class
    const aggregatedFromLogs: Record<number, { s: number, i: number, a: number }> = {};
    
    dailyAttendance.filter(log => log.className === selectedClass).forEach(log => {
        log.records.forEach(record => {
            if (!aggregatedFromLogs[record.studentId]) {
                aggregatedFromLogs[record.studentId] = { s: 0, i: 0, a: 0 };
            }
            if (record.status === 'S') aggregatedFromLogs[record.studentId].s++;
            if (record.status === 'I') aggregatedFromLogs[record.studentId].i++;
            if (record.status === 'A') aggregatedFromLogs[record.studentId].a++;
        });
    });

    filteredStudents.forEach(s => {
      // Use aggregated data if available, otherwise 0.
      const agg = aggregatedFromLogs[s.id] || { s: 0, i: 0, a: 0 };
      initial[s.id] = { 
          s: agg.s, 
          i: agg.i, 
          a: agg.a 
      };
    });
    setLocalAttendance(initial);
  }, [filteredStudents, semester, dailyAttendance, selectedClass]);

  const handleInputChange = (id: number, field: 's' | 'i' | 'a', value: string) => {
    const numVal = parseInt(value) || 0;
    setLocalAttendance(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: numVal }
    }));
  };

  const handleSave = () => {
    setIsSaving(true);
    // Create a copy of all students
    const updatedStudents = students.map(s => {
        // If student is in current edited list, update their attendance
        if (localAttendance[s.id]) {
            return {
                ...s,
                attendance: {
                    ...s.attendance,
                    [semester]: localAttendance[s.id]
                }
            };
        }
        return s;
    });

    onUpdateStudents(updatedStudents);
    
    setTimeout(() => {
        setIsSaving(false);
        alert('Data kehadiran berhasil disimpan ke database rapor!');
    }, 500);
  };

  const handleSaveIzin = () => {
      if (!selectedClass || !izinStudentId || !onSaveDailyAttendance) return;

      // 1. Find existing log for this date and class
      const existingLog = dailyAttendance.find(d => d.date === izinDate && d.className === selectedClass);
      
      let newRecords: AttendanceRecord[] = [];

      if (existingLog) {
          // Update existing records
          newRecords = [...existingLog.records];
          const studentIndex = newRecords.findIndex(r => r.studentId === parseInt(izinStudentId));
          
          if (studentIndex >= 0) {
              newRecords[studentIndex] = {
                  studentId: parseInt(izinStudentId),
                  status: izinStatus,
                  note: izinNote
              };
          } else {
              newRecords.push({
                  studentId: parseInt(izinStudentId),
                  status: izinStatus,
                  note: izinNote
              });
          }
      } else {
          // Initialize records for all students in class, default H
          newRecords = filteredStudents.map(s => ({
              studentId: s.id,
              status: s.id === parseInt(izinStudentId) ? izinStatus : 'H',
              note: s.id === parseInt(izinStudentId) ? izinNote : undefined
          }));
      }

      const log: DailyAttendanceLog = {
          id: `${selectedClass}-${izinDate}`,
          date: izinDate,
          className: selectedClass,
          records: newRecords
      };

      onSaveDailyAttendance(log);
      alert('Izin berhasil disimpan dan disinkronkan dengan Ketua Kelas.');
      
      // Reset form
      setIzinStudentId('');
      setIzinNote('');
  };

  // --- REKAP BULANAN LOGIC ---
  const monthlySummary = useMemo(() => {
      const summary: Record<number, { h: number, s: number, i: number, a: number }> = {};
      filteredStudents.forEach(s => summary[s.id] = { h: 0, s: 0, i: 0, a: 0 });

      const monthlyLogs = dailyAttendance.filter(d => 
          d.className === selectedClass && d.date.startsWith(selectedMonth)
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
  }, [dailyAttendance, selectedClass, selectedMonth, filteredStudents]);

  const handleDownloadExcelRekapBulanan = () => {
      const summaryData = monthlySummary;
      const title = `Rekap Bulanan ${selectedMonth}`;

      const data = filteredStudents.map((s, idx) => {
          const stats = summaryData[s.id];
          return {
              'No': idx + 1,
              'Nama Siswa': s.name,
              'Total Hadir': stats.h,
              'Total Sakit': stats.s,
              'Total Izin': stats.i,
              'Total Alpha': stats.a,
              'Persentase Kehadiran': `${Math.round((stats.h / (stats.h+stats.s+stats.i+stats.a || 1)) * 100)}%`
          };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, title);
      XLSX.writeFile(wb, `${title.replace(/\s/g, '_')}_${selectedClass}.xlsx`);
  };

  // ... (Rest of logic remains same: getStudentAcademicStatus, getStudentDetailData)
  const getStudentAcademicStatus = (student: Student) => {
      if (!selectedClass || !settings) return { tanggunganCount: 0, remidiCount: 0, subjectCount: 0, completeCount: 0 };

      const classSubjects = new Set<string>();
      teachers.forEach(t => {
          if (t.classes.includes(selectedClass)) classSubjects.add(t.subject);
      });
      classSubjects.add('Pendidikan Agama Islam');
      const sortedSubjects = Array.from(classSubjects).filter(s => s !== 'Bimbingan Konseling').sort();

      let subjectCount = 0;
      let issueSubjectCount = 0;
      let tanggunganCount = 0;
      let remidiCount = 0;

      sortedSubjects.forEach(subject => {
          subjectCount++;
          let hasIssue = false;
          let grades: SemesterData;
          
          if (subject === 'Pendidikan Agama Islam') {
              grades = student.grades[semester];
          } else {
              grades = student.gradesBySubject?.[subject]?.[semester] || createEmptySemesterData();
          }

          const allChapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
          const fields: FormativeKey[] = ['f1', 'f2', 'f3', 'f4', 'f5', 'sum'];

          allChapters.forEach(chap => {
               const chapGrades = grades[chap];
               fields.forEach(f => {
                   const score = chapGrades[f];
                   if (score === 0) { tanggunganCount++; hasIssue = true; }
                   else if (score !== null && score < 70) { remidiCount++; hasIssue = true; }
               });
          });

          if (grades.kts === 0) { tanggunganCount++; hasIssue = true; }
          else if (grades.kts !== null && grades.kts < 70) { remidiCount++; hasIssue = true; }

          if (grades.sas === 0) { tanggunganCount++; hasIssue = true; }
          else if (grades.sas !== null && grades.sas < 70) { remidiCount++; hasIssue = true; }

          if (hasIssue) issueSubjectCount++;
      });

      return {
          tanggunganCount,
          remidiCount,
          subjectCount,
          completeCount: subjectCount - issueSubjectCount
      };
  };

  const getStudentDetailData = (student: Student, type: 'tanggungan' | 'remidi') => {
      const subjectTeacherMap: Record<string, string> = {};
      if(settings) subjectTeacherMap['Pendidikan Agama Islam'] = settings.teacherName;
      teachers.forEach(t => {
          if (t.classes.includes(student.kelas)) {
              subjectTeacherMap[t.subject] = t.name;
          }
      });

      const listItems: { subject: string, taskName: string, description: string, score: number, date: string, teacher: string }[] = [];
      
      const relevantHistory = assessmentHistory.filter(h => 
          h.targetClass === student.kelas && h.semester === semester
      );

      relevantHistory.forEach(session => {
          const subject = session.targetSubject || 'Pendidikan Agama Islam';
          let grades: SemesterData;
          if (subject === 'Pendidikan Agama Islam') {
              grades = student.grades[semester];
          } else {
              grades = student.gradesBySubject?.[subject]?.[semester] || createEmptySemesterData();
          }

          let score: number | null = null;
          if (session.type === 'bab' && session.chapterKey && session.formativeKey) {
            score = grades[session.chapterKey][session.formativeKey];
          } else if (session.type === 'kts') {
            score = grades.kts;
          } else if (session.type === 'sas') {
            score = grades.sas;
          }

          const isMatch = type === 'tanggungan' 
             ? (score === 0) 
             : (score !== null && score > 0 && score < 70);

          if (isMatch && score !== null) {
              let taskName = session.type.toUpperCase();
              if (session.type === 'bab' && session.chapterKey) {
                  const babNum = parseInt(session.chapterKey.replace('bab', ''));
                  const displayBab = babNum;
                  const field = session.formativeKey === 'sum' ? 'Sumatif' : session.formativeKey?.toUpperCase();
                  taskName = `TP ${displayBab} - ${field}`;
              }

              listItems.push({
                  subject,
                  taskName,
                  description: session.description || '',
                  score,
                  date: session.date,
                  teacher: subjectTeacherMap[subject] || '-'
              });
          }
      });

      return listItems.reduce((acc, item) => {
          if (!acc[item.subject]) acc[item.subject] = [];
          acc[item.subject].push(item);
          return acc;
      }, {} as Record<string, typeof listItems>);
  };

  const renderAttendanceTab = () => (
    <div className="animate-scale-in">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4 flex items-center gap-3">
            <div className="bg-blue-100 p-2 rounded-full text-blue-600"><RefreshCw size={18} /></div>
            <p className="text-sm text-blue-800">
                Data di bawah ini <strong>otomatis terisi</strong> dari rekap inputan harian Ketua Kelas. 
                Anda dapat mengeditnya manual jika diperlukan sebelum menyimpan.
            </p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold sticky top-0 z-10">
                    <tr>
                        <th className="px-6 py-3 border-b border-gray-200 w-12 text-center">No</th>
                        <th className="px-6 py-3 border-b border-gray-200 w-32">NIS</th>
                        <th className="px-6 py-3 border-b border-gray-200">Nama Siswa</th>
                        <th className="px-2 py-3 border-b border-gray-200 w-24 text-center bg-blue-50/50 text-blue-700">Sakit</th>
                        <th className="px-2 py-3 border-b border-gray-200 w-24 text-center bg-green-50/50 text-green-700">Izin</th>
                        <th className="px-2 py-3 border-b border-gray-200 w-24 text-center bg-red-50/50 text-red-700">Alpha</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {filteredStudents.map((student, idx) => (
                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                            <td className="px-6 py-2 text-center text-sm text-gray-500">{idx + 1}</td>
                            <td className="px-6 py-2 text-sm font-mono text-gray-600">{student.nis}</td>
                            <td className="px-6 py-2 text-sm font-medium text-gray-800">{student.name}</td>
                            <td className="px-2 py-2 text-center bg-blue-50/10">
                                <input 
                                    type="number" 
                                    min="0"
                                    className="w-16 text-center border border-gray-300 rounded py-1 focus:ring-2 focus:ring-blue-500 outline-none font-bold text-blue-700"
                                    value={localAttendance[student.id]?.s || 0}
                                    onChange={(e) => handleInputChange(student.id, 's', e.target.value)}
                                />
                            </td>
                            <td className="px-2 py-2 text-center bg-green-50/10">
                                <input 
                                    type="number" 
                                    min="0"
                                    className="w-16 text-center border border-gray-300 rounded py-1 focus:ring-2 focus:ring-green-500 outline-none font-bold text-green-700"
                                    value={localAttendance[student.id]?.i || 0}
                                    onChange={(e) => handleInputChange(student.id, 'i', e.target.value)}
                                />
                            </td>
                            <td className="px-2 py-2 text-center bg-red-50/10">
                                <input 
                                    type="number" 
                                    min="0"
                                    className="w-16 text-center border border-gray-300 rounded py-1 focus:ring-2 focus:ring-red-500 outline-none font-bold text-red-700"
                                    value={localAttendance[student.id]?.a || 0}
                                    onChange={(e) => handleInputChange(student.id, 'a', e.target.value)}
                                />
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    </div>
  );

  const renderInputIzinTab = () => (
      <div className="animate-scale-in max-w-2xl mx-auto">
          <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
              <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <PlusCircle className="text-blue-600" />
                  Input Izin / Sakit
              </h3>
              
              <div className="space-y-4">
                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Tanggal</label>
                      <input 
                          type="date" 
                          value={izinDate}
                          onChange={(e) => setIzinDate(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      />
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Nama Siswa</label>
                      <select 
                          value={izinStudentId}
                          onChange={(e) => setIzinStudentId(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                      >
                          <option value="">-- Pilih Siswa --</option>
                          {filteredStudents.map(s => (
                              <option key={s.id} value={s.id}>{s.name}</option>
                          ))}
                      </select>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                      <div className="flex gap-4">
                          <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${izinStatus === 'S' ? 'bg-blue-50 border-blue-500 text-blue-700' : 'bg-white border-gray-200'}`}>
                              <input type="radio" name="izinStatus" value="S" checked={izinStatus === 'S'} onChange={() => setIzinStatus('S')} className="hidden" />
                              <span className="font-bold">Sakit (S)</span>
                          </label>
                          <label className={`flex-1 flex items-center justify-center gap-2 p-3 rounded-lg border cursor-pointer transition-all ${izinStatus === 'I' ? 'bg-green-50 border-green-500 text-green-700' : 'bg-white border-gray-200'}`}>
                              <input type="radio" name="izinStatus" value="I" checked={izinStatus === 'I'} onChange={() => setIzinStatus('I')} className="hidden" />
                              <span className="font-bold">Izin (I)</span>
                          </label>
                      </div>
                  </div>

                  <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Keterangan</label>
                      <textarea 
                          value={izinNote}
                          onChange={(e) => setIzinNote(e.target.value)}
                          className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 min-h-[100px]"
                          placeholder="Contoh: Demam tinggi sejak kemarin / Acara keluarga di luar kota"
                      />
                  </div>

                  <div className="pt-4">
                      <button 
                          onClick={handleSaveIzin}
                          disabled={!izinStudentId}
                          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition-colors shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed"
                      >
                          Simpan Data
                      </button>
                      <p className="text-center text-xs text-gray-500 mt-2">
                          Data akan otomatis tersinkronisasi ke akun Ketua Kelas.
                      </p>
                  </div>
              </div>
          </div>
      </div>
  );

  const renderMonitoringTab = () => (
      <div className="animate-scale-in space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex gap-4 items-start">
              <AlertCircle className="text-blue-600 shrink-0 mt-0.5" size={20} />
              <div>
                  <h4 className="font-bold text-blue-800 text-sm">Monitoring Akademik Kelas {selectedClass}</h4>
                  <p className="text-xs text-blue-600 mt-1">
                      Data di bawah ini merangkum ketuntasan siswa di semua mata pelajaran. 
                  </p>
              </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold sticky top-0 z-10">
                      <tr>
                          <th className="px-6 py-4 border-b border-gray-200 w-12 text-center">No</th>
                          <th className="px-6 py-4 border-b border-gray-200">Nama Siswa</th>
                          <th className="px-6 py-4 border-b border-gray-200 text-center">Ketuntasan Mapel</th>
                          <th className="px-6 py-4 border-b border-gray-200 text-center text-red-600">Jml Tanggungan</th>
                          <th className="px-6 py-4 border-b border-gray-200 text-center text-orange-600">Jml Remidi</th>
                          <th className="px-6 py-4 border-b border-gray-200 text-center">Aksi</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                      {filteredStudents.map((student, idx) => {
                          const status = getStudentAcademicStatus(student);
                          const isComplete = status.completeCount === status.subjectCount && status.subjectCount > 0;
                          return (
                              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-6 py-3 text-center text-sm text-gray-500">{idx + 1}</td>
                                  <td className="px-6 py-3 text-sm font-bold text-gray-800">
                                      {student.name}
                                      <div className="text-[10px] font-normal text-gray-400 font-mono">{student.nis}</div>
                                  </td>
                                  <td className="px-6 py-3 text-center">
                                      <div className="flex flex-col items-center">
                                          <span className={`text-sm font-bold ${isComplete ? 'text-green-600' : 'text-gray-600'}`}>
                                              {status.completeCount} / {status.subjectCount}
                                          </span>
                                          <div className="w-24 h-1.5 bg-gray-200 rounded-full mt-1 overflow-hidden">
                                              <div 
                                                  className={`h-full rounded-full ${isComplete ? 'bg-green-500' : 'bg-blue-500'}`}
                                                  style={{ width: `${(status.completeCount / status.subjectCount) * 100}%` }}
                                              ></div>
                                          </div>
                                      </div>
                                  </td>
                                  <td className="px-6 py-3 text-center">
                                      {status.tanggunganCount > 0 ? (
                                          <span className="bg-red-100 text-red-700 px-2 py-1 rounded text-xs font-bold">{status.tanggunganCount} Item</span>
                                      ) : <span className="text-gray-300">-</span>}
                                  </td>
                                  <td className="px-6 py-3 text-center">
                                      {status.remidiCount > 0 ? (
                                          <span className="bg-orange-100 text-orange-700 px-2 py-1 rounded text-xs font-bold">{status.remidiCount} Item</span>
                                      ) : <span className="text-gray-300">-</span>}
                                  </td>
                                  <td className="px-6 py-3 text-center">
                                      <button 
                                          onClick={() => { setSelectedStudentForDetail(student); setDetailModalTab('tanggungan'); }}
                                          className="p-2 bg-gray-100 hover:bg-blue-50 text-gray-600 hover:text-blue-600 rounded-lg transition-colors"
                                          title="Lihat Detail Masalah"
                                      >
                                          <Eye size={16} />
                                      </button>
                                  </td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
  );

  const renderHistoryTab = () => {
    // Generate dates
    const dateRange = [];
    const curr = new Date(filterStartDate);
    const end = new Date(filterEndDate);
    while (curr <= end) {
        dateRange.push(curr.toISOString().split('T')[0]);
        curr.setDate(curr.getDate() + 1);
    }

    // Lookup Map
    const attendanceMap: Record<string, Record<number, string>> = {};
    dateRange.forEach(d => {
        const log = dailyAttendance.find(log => log.date === d && log.className === selectedClass);
        if (log) {
            attendanceMap[d] = {};
            log.records.forEach(r => {
                attendanceMap[d][r.studentId] = r.status;
            });
        }
    });

    const handleDownloadExcel = () => {
        const data = filteredStudents.map((s, idx) => {
            const row: any = {
                'No': idx + 1,
                'Nama Siswa': s.name,
            };
            
            let h = 0, i = 0, sakit = 0, a = 0;
            dateRange.forEach(date => {
                const status = attendanceMap[date]?.[s.id] || '-';
                row[date] = status;
                if (status === 'H') h++;
                if (status === 'S') sakit++;
                if (status === 'I') i++;
                if (status === 'A') a++;
            });

            row['H'] = h;
            row['S'] = sakit;
            row['I'] = i;
            row['A'] = a;

            return row;
        });

        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, `Absensi ${selectedClass}`);
        XLSX.writeFile(wb, `Rekap_Absensi_${selectedClass}.xlsx`);
    };

    return (
        <div className="h-full flex flex-col animate-scale-in">
             <div className="mb-4 flex flex-wrap items-end gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Dari Tanggal</label>
                    <input 
                        type="date" 
                        value={filterStartDate}
                        onChange={(e) => setFilterStartDate(e.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-gray-500 mb-1">Sampai Tanggal</label>
                    <input 
                        type="date" 
                        value={filterEndDate}
                        onChange={(e) => setFilterEndDate(e.target.value)}
                        className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    />
                </div>
                <div className="flex-1"></div>
                <button 
                    onClick={handleDownloadExcel}
                    className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm"
                >
                    <FileSpreadsheet size={16} />
                    Download Excel
                </button>
            </div>

            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 overflow-auto custom-scrollbar relative">
                <table className="w-full text-left border-collapse min-w-max">
                    <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 sticky top-0 z-20 shadow-sm">
                        <tr>
                            <th className="px-4 py-3 border-b border-r border-gray-200 w-12 text-center sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                            <th className="px-4 py-3 border-b border-r border-gray-200 w-64 sticky left-12 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Siswa</th>
                            {dateRange.map(date => (
                                <th key={date} className="px-2 py-3 border-b border-r border-gray-200 text-center min-w-[3rem]">
                                    <div className="flex flex-col">
                                        <span>{new Date(date).getDate()}</span>
                                        <span className="text-[9px] font-normal">{new Date(date).toLocaleString('id-ID', {month: 'short'})}</span>
                                    </div>
                                </th>
                            ))}
                            <th className="px-2 py-3 border-b border-r border-gray-200 bg-green-50 text-green-700 text-center w-10 sticky right-[9rem] z-20">H</th>
                            <th className="px-2 py-3 border-b border-r border-gray-200 bg-blue-50 text-blue-700 text-center w-10 sticky right-[6rem] z-20">S</th>
                            <th className="px-2 py-3 border-b border-r border-gray-200 bg-yellow-50 text-yellow-700 text-center w-10 sticky right-[3rem] z-20">I</th>
                            <th className="px-2 py-3 border-b border-gray-200 bg-red-50 text-red-700 text-center w-10 sticky right-0 z-20">A</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {filteredStudents.map((student, idx) => {
                            let h = 0, s = 0, i = 0, a = 0;
                            return (
                                <tr key={student.id} className="hover:bg-blue-50/20 transition-colors">
                                    <td className="px-4 py-2 border-r border-gray-100 text-center text-gray-500 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{idx + 1}</td>
                                    <td className="px-4 py-2 border-r border-gray-100 font-medium text-gray-800 sticky left-12 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{student.name}</td>
                                    {dateRange.map(date => {
                                        const status = attendanceMap[date]?.[student.id];
                                        let cellClass = "text-gray-300";
                                        if (status === 'H') { h++; cellClass = "text-green-600 font-bold bg-green-50"; }
                                        else if (status === 'S') { s++; cellClass = "text-blue-600 font-bold bg-blue-50"; }
                                        else if (status === 'I') { i++; cellClass = "text-yellow-600 font-bold bg-yellow-50"; }
                                        else if (status === 'A') { a++; cellClass = "text-red-600 font-bold bg-red-50"; }
                                        else if (!status) { cellClass = "bg-gray-50/50"; }

                                        return (
                                            <td key={date} className={`px-2 py-2 border-r border-gray-100 text-center ${cellClass}`}>
                                                {status || '-'}
                                            </td>
                                        );
                                    })}
                                    <td className="px-2 py-2 border-r border-gray-100 text-center font-bold bg-green-50/30 sticky right-[9rem] bg-white">{h}</td>
                                    <td className="px-2 py-2 border-r border-gray-100 text-center font-bold bg-blue-50/30 sticky right-[6rem] bg-white">{s}</td>
                                    <td className="px-2 py-2 border-r border-gray-100 text-center font-bold bg-yellow-50/30 sticky right-[3rem] bg-white">{i}</td>
                                    <td className="px-2 py-2 text-center font-bold bg-red-50/30 sticky right-0 bg-white">{a}</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
            <div className="mt-2 text-xs text-gray-400">
                Menampilkan data dari {filterStartDate} s/d {filterEndDate}
            </div>
        </div>
    );
  };

  const renderRekapBulananTab = () => (
      <div className="h-full flex flex-col animate-scale-in">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              <div className="flex items-center gap-4">
                  <div>
                      <label className="block text-xs font-bold text-gray-500 mb-1">Pilih Bulan</label>
                      <input 
                          type="month"
                          value={selectedMonth}
                          onChange={(e) => setSelectedMonth(e.target.value)}
                          className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-700"
                      />
                  </div>
                  <div>
                      <h3 className="font-bold text-gray-800">Rekapitulasi Bulanan</h3>
                      <p className="text-xs text-gray-500">Total kehadiran siswa untuk bulan {new Date(selectedMonth).toLocaleString('id-ID', {month: 'long', year: 'numeric'})}</p>
                  </div>
              </div>
              <button 
                  onClick={handleDownloadExcelRekapBulanan}
                  className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm"
              >
                  <FileSpreadsheet size={16} />
                  Download Excel
              </button>
          </div>

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 overflow-auto custom-scrollbar relative">
              <table className="w-full text-left border-collapse">
                  <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 sticky top-0 z-20 shadow-sm">
                      <tr>
                          <th className="px-4 py-3 border-b border-r border-gray-200 w-12 text-center sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                          <th className="px-4 py-3 border-b border-r border-gray-200 w-64 sticky left-12 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Siswa</th>
                          <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-green-50 text-green-700">Hadir</th>
                          <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-blue-50 text-blue-700">Sakit</th>
                          <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-yellow-50 text-yellow-700">Izin</th>
                          <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-red-50 text-red-700">Alpha</th>
                          <th className="px-4 py-3 border-b border-gray-200 w-24 text-center">Total Absen</th>
                      </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 text-sm">
                      {filteredStudents.map((student, idx) => {
                          const stats = monthlySummary[student.id];
                          const totalAbsent = stats.s + stats.i + stats.a;
                          return (
                              <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                  <td className="px-4 py-3 text-center text-gray-500 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{idx + 1}</td>
                                  <td className="px-4 py-3 font-medium text-gray-800 sticky left-12 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{student.name}</td>
                                  <td className="px-4 py-3 text-center font-bold text-green-600 bg-green-50/20">{stats.h}</td>
                                  <td className="px-4 py-3 text-center font-bold text-blue-600 bg-blue-50/20">{stats.s}</td>
                                  <td className="px-4 py-3 text-center font-bold text-yellow-600 bg-yellow-50/20">{stats.i}</td>
                                  <td className="px-4 py-3 text-center font-bold text-red-600 bg-red-50/20">{stats.a}</td>
                                  <td className="px-4 py-3 text-center font-bold text-gray-700 bg-gray-50">{totalAbsent}</td>
                              </tr>
                          );
                      })}
                  </tbody>
              </table>
          </div>
      </div>
  );

  return (
    <div className="flex-1 bg-white h-full flex flex-col">
      <div className="px-6 py-5 border-b border-gray-200 bg-white sticky top-0 z-10 flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
        <div>
            <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Users className="text-teal-600" />
                Portal Wali Kelas
            </h2>
            <p className="text-sm text-gray-500 mt-1">Kelola presensi dan pantau perkembangan akademik siswa perwalian.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
            <select 
                value={selectedClass} 
                onChange={(e) => setSelectedClass(e.target.value)} 
                className="pl-4 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg font-bold text-gray-700 focus:ring-2 focus:ring-teal-500 outline-none"
            >
                <option value="">-- Pilih Kelas --</option>
                {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setActiveTab('attendance')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'attendance' ? 'bg-white text-teal-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <FileText size={16} /> Input Absensi
                </button>
                <button 
                    onClick={() => setActiveTab('input_izin')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'input_izin' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <PlusCircle size={16} /> Input Izin/Sakit
                </button>
                <button 
                    onClick={() => setActiveTab('monitoring')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'monitoring' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Activity size={16} /> Monitoring
                </button>
                <button 
                    onClick={() => setActiveTab('history')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'history' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <Calendar size={16} /> Riwayat
                </button>
                <button 
                    onClick={() => setActiveTab('rekap_bulanan')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'rekap_bulanan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <CalendarRange size={16} /> Rekap Bulanan
                </button>
            </div>

            {activeTab === 'attendance' && (
                <button 
                    onClick={handleSave} 
                    disabled={!selectedClass || isSaving}
                    className={`flex items-center gap-2 px-6 py-2 rounded-lg font-bold text-white shadow-sm transition-all ${
                        !selectedClass ? 'bg-gray-300 cursor-not-allowed' : 'bg-teal-600 hover:bg-teal-700 active:scale-95'
                    }`}
                >
                    {isSaving ? <Check size={18} /> : <Save size={18} />}
                    <span>Simpan</span>
                </button>
            )}
        </div>
      </div>

      <div className="flex-1 overflow-auto custom-scrollbar p-6">
        {!selectedClass ? (
            <div className="flex flex-col items-center justify-center h-full text-gray-400">
                <Users size={64} className="mb-4 opacity-20" />
                <p>Silakan pilih kelas terlebih dahulu.</p>
            </div>
        ) : (
            <>
                {activeTab === 'attendance' && renderAttendanceTab()}
                {activeTab === 'input_izin' && renderInputIzinTab()}
                {activeTab === 'monitoring' && renderMonitoringTab()}
                {activeTab === 'history' && renderHistoryTab()}
                {activeTab === 'rekap_bulanan' && renderRekapBulananTab()}
            </>
        )}
      </div>

      {/* Modal is kept same as existing code - omitted here for brevity as it's not changed */}
      {selectedStudentForDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm" onClick={() => setSelectedStudentForDetail(null)}>
              {/* Modal Content... same as previous */}
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl overflow-hidden animate-scale-in flex flex-col max-h-[90vh]" onClick={e => e.stopPropagation()}>
                  <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center bg-white sticky top-0 z-10">
                      <div>
                          <h3 className="font-bold text-gray-900 text-lg">Detail Akademik</h3>
                          <div className="flex items-center gap-2 text-sm text-gray-500 mt-0.5">
                                <span className="font-bold text-blue-600">{selectedStudentForDetail.name}</span>
                                <span>•</span>
                                <span>{selectedStudentForDetail.nis}</span>
                          </div>
                      </div>
                      <button onClick={() => setSelectedStudentForDetail(null)} className="p-1 rounded-full hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors">
                        <X size={20} />
                      </button>
                  </div>
                  <div className="px-6 pt-4 pb-0 bg-white">
                        <div className="flex p-1 bg-gray-100 rounded-xl overflow-x-auto">
                            <button 
                                onClick={() => setDetailModalTab('tanggungan')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${detailModalTab === 'tanggungan' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <AlertCircle size={14} /> Tanggungan (Nilai 0)
                            </button>
                            <button 
                                onClick={() => setDetailModalTab('remidi')}
                                className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${detailModalTab === 'remidi' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                <RefreshCw size={14} /> Remidi (Nilai &lt; 70)
                            </button>
                        </div>
                  </div>
                  <div className="p-6 overflow-y-auto custom-scrollbar flex-1 bg-gray-50/50">
                      {(() => {
                          const groupedData = getStudentDetailData(selectedStudentForDetail, detailModalTab);
                          const isEmpty = Object.keys(groupedData).length === 0;

                          if (isEmpty) {
                              return (
                                <div className="flex flex-col items-center justify-center h-64 text-center">
                                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${detailModalTab === 'tanggungan' ? 'bg-green-100 text-green-500' : 'bg-blue-100 text-blue-500'}`}>
                                        <Check size={32} />
                                    </div>
                                    <h3 className="text-gray-900 font-bold mb-1">
                                        Tidak Ada {detailModalTab === 'tanggungan' ? 'Tanggungan' : 'Remidi'}
                                    </h3>
                                    <p className="text-sm text-gray-500 max-w-xs">
                                        Siswa ini tidak memiliki nilai {detailModalTab === 'tanggungan' ? 'kosong (0)' : 'di bawah KKM'} untuk semester ini.
                                    </p>
                                </div>
                              );
                          }

                          return (
                              <div className="space-y-6">
                                  {Object.entries(groupedData).map(([subject, items]) => (
                                      <div key={subject} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                                          <div className="bg-gray-50/80 px-5 py-3 border-b border-gray-100 flex justify-between items-center backdrop-blur-sm sticky top-0">
                                              <h3 className="font-bold text-gray-800 text-sm">{subject}</h3>
                                              <span className="text-[10px] bg-white border border-gray-200 px-2 py-1 rounded text-gray-500">
                                                  {items[0].teacher}
                                              </span>
                                          </div>
                                          <div className="divide-y divide-gray-100">
                                              {items.map((item, idx) => (
                                                  <div key={idx} className="px-5 py-3 flex justify-between items-start hover:bg-gray-50/50 transition-colors">
                                                      <div className="flex-1 pr-4">
                                                          <div className="flex items-center gap-2 mb-1">
                                                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase border ${
                                                                  detailModalTab === 'tanggungan' 
                                                                  ? 'bg-red-50 text-red-600 border-red-100' 
                                                                  : 'bg-orange-50 text-orange-600 border-orange-100'
                                                              }`}>
                                                                  {detailModalTab === 'tanggungan' ? 'Kosong' : 'Remidi'}
                                                              </span>
                                                              <div className="font-bold text-gray-700 text-sm">{item.taskName}</div>
                                                          </div>
                                                          
                                                          <div className="flex items-center gap-3 text-xs text-gray-500 mt-1">
                                                              <span className="flex items-center gap-1"><Calendar size={10} /> {item.date}</span>
                                                              {item.description && (
                                                                  <span className="bg-gray-100 px-1.5 py-0.5 rounded text-[10px] text-gray-600 italic border border-gray-200">
                                                                      {item.description}
                                                                  </span>
                                                              )}
                                                          </div>
                                                      </div>
                                                      <div className={`px-3 py-1.5 rounded-lg text-sm font-bold shadow-sm ${
                                                          detailModalTab === 'tanggungan' 
                                                          ? 'bg-red-500 text-white' 
                                                          : 'bg-orange-500 text-white'
                                                      }`}>
                                                          {item.score}
                                                      </div>
                                                  </div>
                                              ))}
                                          </div>
                                      </div>
                                  ))}
                              </div>
                          );
                      })()}
                  </div>
              </div>
          </div>
      )}
    </div>
  );
};

export default WaliKelasView;

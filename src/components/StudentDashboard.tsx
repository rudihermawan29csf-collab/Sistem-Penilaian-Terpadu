
import React, { useState, useMemo, useEffect } from 'react';
import { Student, SemesterKey, ChapterKey, GradingSession, FormativeKey, AppSettings, Teacher, SemesterData, DailyAttendanceLog } from '../types';
import { calculateChapterAverage, calculateFinalGrade, createEmptySemesterData } from '../utils';
import { LogOut, ChevronDown, Award, BookOpen, Calendar, PieChart, Info, AlertCircle, RefreshCw, Clock, Book, User, LayoutDashboard, ListChecks, AlertTriangle, FileText, CheckCircle, ClipboardList, TrendingUp, Eye, CalendarRange, HelpCircle } from 'lucide-react';
import MidSemesterReportView from './MidSemesterReportView';
import GuideModal from './GuideModal';

interface StudentDashboardProps {
  student: Student;
  allStudents: Student[];
  assessmentHistory: GradingSession[];
  settings: AppSettings;
  teachers: Teacher[];
  onLogout: () => void;
  subjectChapterConfigs?: Record<string, Record<ChapterKey, boolean>>;
  dailyAttendance: DailyAttendanceLog[]; // New Prop
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
    student, 
    allStudents, 
    assessmentHistory, 
    settings, 
    teachers, 
    onLogout,
    subjectChapterConfigs = {},
    dailyAttendance = [] // Default empty
}) => {
  // Set default tab to 'summary' (Rekap Nilai)
  const [activeTab, setActiveTab] = useState<'detail' | 'summary' | 'tanggungan' | 'remidi' | 'rapor_sisipan' | 'attendance'>('summary');
  const [selectedSemester, setSelectedSemester] = useState<SemesterKey>(settings.activeSemester);
  const [isGuideOpen, setIsGuideOpen] = useState(false); // Guide State
  
  // Attendance Filter State
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Format Date and Time
  const dateOptions: Intl.DateTimeFormatOptions = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
  const timeOptions: Intl.DateTimeFormatOptions = { hour: '2-digit', minute: '2-digit', second: '2-digit' };
  
  const formattedDate = currentTime.toLocaleDateString('id-ID', dateOptions);
  const formattedTime = currentTime.toLocaleTimeString('id-ID', timeOptions);

  // --- DATA PREPARATION ---

  // 1. Map Subject -> Teacher Name
  const subjectTeacherMap = useMemo(() => {
    const map: Record<string, string> = {};
    map['Pendidikan Agama Islam'] = settings.teacherName;
    teachers.forEach(t => {
        if (t.classes.includes(student.kelas)) {
            map[t.subject] = t.name;
        }
    });
    return map;
  }, [teachers, student.kelas, settings.teacherName]);

  // 2. All Available Subjects
  const availableSubjects = useMemo(() => {
    const subjects = new Set<string>();
    Object.keys(subjectTeacherMap).forEach(s => subjects.add(s));
    if (student.gradesBySubject) {
        Object.keys(student.gradesBySubject).forEach(sub => subjects.add(sub));
    }
    subjects.add('Pendidikan Agama Islam');
    return Array.from(subjects).sort();
  }, [subjectTeacherMap, student.gradesBySubject]);

  const [selectedSubject, setSelectedSubject] = useState<string>(availableSubjects[0]);
  
  // Ensure selectedSubject is valid
  useEffect(() => {
    if (availableSubjects.length > 0 && !availableSubjects.includes(selectedSubject)) {
        setSelectedSubject(availableSubjects[0]);
    }
  }, [availableSubjects, selectedSubject]);

  // 3. Helper to get grades for a specific subject
  const getGradesForSubject = (subject: string): SemesterData => {
      let data;
      if (subject === 'Pendidikan Agama Islam') {
          data = student.grades[selectedSemester];
      } else {
          data = student.gradesBySubject?.[subject]?.[selectedSemester];
      }
      return data || createEmptySemesterData();
  };

  // 4. Helper to Calculate Active Fields for ANY Subject
  const getActiveFieldsForSubject = (subject: string) => {
    const chapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
    const map: Record<ChapterKey, FormativeKey[]> = {
      bab1: [], bab2: [], bab3: [], bab4: [], bab5: []
    };
    chapters.forEach(chap => {
      const relevantHistory = assessmentHistory.filter(h => 
        h.targetClass === student.kelas &&
        h.semester === selectedSemester &&
        (h.targetSubject === subject || (!h.targetSubject && subject === 'Pendidikan Agama Islam')) &&
        h.type === 'bab' &&
        h.chapterKey === chap
      );
      const fields: FormativeKey[] = relevantHistory
        .map(h => h.formativeKey)
        .filter((k): k is FormativeKey => k !== null && k !== undefined);
      map[chap] = [...new Set(fields)];
    });
    return map;
  };

  // --- ATTENDANCE CALCULATIONS ---
  
  // Semester Summary (Total Accumulation)
  const attendanceSemesterStats = useMemo(() => {
      const stats = { h: 0, s: 0, i: 0, a: 0 };
      
      const classLogs = dailyAttendance.filter(l => l.className === student.kelas);
      
      classLogs.forEach(log => {
          const record = log.records.find(r => r.studentId === student.id);
          if (record) {
              if (record.status === 'H') stats.h++;
              else if (record.status === 'S') stats.s++;
              else if (record.status === 'I') stats.i++;
              else if (record.status === 'A') stats.a++;
          }
      });
      return stats;
  }, [dailyAttendance, student]);

  // Monthly Detail Data
  const attendanceMonthlyData = useMemo(() => {
      const logs = dailyAttendance.filter(l => 
          l.className === student.kelas && 
          l.date.startsWith(selectedAttendanceMonth)
      ).sort((a,b) => a.date.localeCompare(b.date));

      const details = logs.map(log => {
          const record = log.records.find(r => r.studentId === student.id);
          return {
              date: log.date,
              status: record ? record.status : '-',
              note: record?.note || '-'
          };
      });

      const stats = { h: 0, s: 0, i: 0, a: 0 };
      details.forEach(d => {
          if (d.status === 'H') stats.h++;
          else if (d.status === 'S') stats.s++;
          else if (d.status === 'I') stats.i++;
          else if (d.status === 'A') stats.a++;
      });

      return { details, stats };
  }, [dailyAttendance, student, selectedAttendanceMonth]);


  // --- RENDERERS ---

  const handleViewDetail = (subject: string) => {
    setSelectedSubject(subject);
    setActiveTab('detail');
  };

  // RENDER: ATTENDANCE VIEW
  const renderAttendanceView = () => {
      return (
          <div className="space-y-6 animate-scale-in">
              {/* Semester Summary Cards */}
              <div>
                  <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3 flex items-center gap-2">
                      <PieChart size={16}/> Rekap Semester Ini
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-green-100 flex flex-col items-center justify-center relative overflow-hidden">
                          <div className="absolute right-0 top-0 p-2 opacity-10"><CheckCircle size={48} className="text-green-500" /></div>
                          <span className="text-2xl font-bold text-green-600">{attendanceSemesterStats.h}</span>
                          <span className="text-xs font-bold text-green-500 uppercase mt-1">Hadir</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-blue-100 flex flex-col items-center justify-center relative overflow-hidden">
                          <div className="absolute right-0 top-0 p-2 opacity-10"><Info size={48} className="text-blue-500" /></div>
                          <span className="text-2xl font-bold text-blue-600">{attendanceSemesterStats.s}</span>
                          <span className="text-xs font-bold text-blue-500 uppercase mt-1">Sakit</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-yellow-100 flex flex-col items-center justify-center relative overflow-hidden">
                          <div className="absolute right-0 top-0 p-2 opacity-10"><AlertCircle size={48} className="text-yellow-500" /></div>
                          <span className="text-2xl font-bold text-yellow-600">{attendanceSemesterStats.i}</span>
                          <span className="text-xs font-bold text-yellow-500 uppercase mt-1">Izin</span>
                      </div>
                      <div className="bg-white p-4 rounded-xl shadow-sm border border-red-100 flex flex-col items-center justify-center relative overflow-hidden">
                          <div className="absolute right-0 top-0 p-2 opacity-10"><AlertTriangle size={48} className="text-red-500" /></div>
                          <span className="text-2xl font-bold text-red-600">{attendanceSemesterStats.a}</span>
                          <span className="text-xs font-bold text-red-500 uppercase mt-1">Alpha</span>
                      </div>
                  </div>
              </div>

              {/* Monthly Detail */}
              <div>
                  <div className="flex justify-between items-center mb-4">
                      <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide flex items-center gap-2">
                          <CalendarRange size={16}/> Riwayat Bulanan
                      </h3>
                      <input 
                          type="month" 
                          value={selectedAttendanceMonth}
                          onChange={(e) => setSelectedAttendanceMonth(e.target.value)}
                          className="bg-white border border-gray-300 text-gray-700 text-xs font-bold py-1.5 px-3 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
                      />
                  </div>

                  {/* Monthly Stats Bar */}
                  <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
                      <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border border-green-100">
                          Hadir: {attendanceMonthlyData.stats.h}
                      </div>
                      <div className="bg-blue-50 text-blue-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border border-blue-100">
                          Sakit: {attendanceMonthlyData.stats.s}
                      </div>
                      <div className="bg-yellow-50 text-yellow-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border border-yellow-100">
                          Izin: {attendanceMonthlyData.stats.i}
                      </div>
                      <div className="bg-red-50 text-red-700 px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap border border-red-100">
                          Alpha: {attendanceMonthlyData.stats.a}
                      </div>
                  </div>

                  {/* History Table */}
                  <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                      <table className="w-full text-left border-collapse">
                          <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold border-b border-gray-200">
                              <tr>
                                  <th className="px-6 py-3 w-32">Tanggal</th>
                                  <th className="px-6 py-3 text-center w-24">Status</th>
                                  <th className="px-6 py-3">Keterangan</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 text-sm">
                              {attendanceMonthlyData.details.length > 0 ? (
                                  attendanceMonthlyData.details.map((item, idx) => (
                                      <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                          <td className="px-6 py-3 font-mono text-gray-600">
                                              {new Date(item.date).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })}
                                          </td>
                                          <td className="px-6 py-3 text-center">
                                              <span className={`inline-flex items-center justify-center w-8 h-8 rounded-lg font-bold text-xs ${
                                                  item.status === 'H' ? 'bg-green-100 text-green-700' :
                                                  item.status === 'S' ? 'bg-blue-100 text-blue-700' :
                                                  item.status === 'I' ? 'bg-yellow-100 text-yellow-700' :
                                                  item.status === 'A' ? 'bg-red-100 text-red-700' :
                                                  'bg-gray-100 text-gray-400'
                                              }`}>
                                                  {item.status}
                                              </span>
                                          </td>
                                          <td className="px-6 py-3 text-gray-600">
                                              {item.note !== '-' ? item.note : <span className="text-gray-300 italic">Tidak ada keterangan</span>}
                                          </td>
                                      </tr>
                                  ))
                              ) : (
                                  <tr>
                                      <td colSpan={3} className="px-6 py-8 text-center text-gray-400">
                                          Tidak ada data absensi untuk bulan ini.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  };

  // RENDER: DETAIL VIEW (Existing)
  const renderDetailView = () => {
      const grades = getGradesForSubject(selectedSubject);
      const activeFieldsMap = getActiveFieldsForSubject(selectedSubject);
      const visibleChapters = subjectChapterConfigs[selectedSubject] || settings.visibleChapters;
      const finalGrade = calculateFinalGrade(grades, activeFieldsMap, visibleChapters);
      const currentTeacherName = subjectTeacherMap[selectedSubject] || '-';

      const allChapters: { key: ChapterKey; label: string }[] = [
        { key: 'bab1', label: 'TP 1' },
        { key: 'bab2', label: 'TP 2' },
        { key: 'bab3', label: 'TP 3' },
        { key: 'bab4', label: 'TP 4' },
        { key: 'bab5', label: 'TP 5' },
      ];

      const chapters = allChapters.filter(c => visibleChapters[c.key]);

      const getScoreMetadata = (
        chapter: ChapterKey | 'kts' | 'sas',
        field: FormativeKey | null
      ) => {
        return assessmentHistory.find(session => {
          if (session.semester !== selectedSemester) return false;
          if (session.targetClass !== student.kelas) return false;
          const sessionSubject = session.targetSubject || 'Pendidikan Agama Islam';
          if (sessionSubject !== selectedSubject) return false;
          if (session.type === 'bab') return session.chapterKey === chapter && session.formativeKey === field;
          if (session.type === 'kts') return chapter === 'kts';
          if (session.type === 'sas') return chapter === 'sas';
          return false;
        });
      };

      const renderScoreBox = (score: number | null, label: string, session?: GradingSession) => {
        let bgClass = 'bg-gray-100 text-gray-800';
        let statusLabel = null;
        if (score !== null && score !== undefined) {
          if (score === 0) {
            bgClass = 'bg-red-500 text-white shadow-md shadow-red-200';
            statusLabel = (<span className="flex items-center gap-1 text-[10px] text-red-600 font-bold bg-red-100 px-1.5 py-0.5 rounded mt-1"><AlertCircle size={10} /> Tanggungan</span>);
          } else if (score < 70) {
            bgClass = 'bg-orange-400 text-white shadow-md shadow-orange-200';
            statusLabel = (<span className="flex items-center gap-1 text-[10px] text-orange-600 font-bold bg-orange-100 px-1.5 py-0.5 rounded mt-1"><RefreshCw size={10} /> Remidi</span>);
          }
        } else {
            bgClass = 'text-gray-300';
        }
        return (
          <div className="flex flex-col items-center p-2 rounded-lg hover:bg-gray-50 transition-colors">
             <span className="text-[10px] text-gray-400 font-medium mb-1 uppercase">{label}</span>
             <div className={`w-full py-1.5 rounded-lg text-sm font-bold text-center ${bgClass}`}>
                {(score !== null && score !== undefined) ? score : '-'}
             </div>
             {statusLabel}
             {(score !== null && score !== undefined) && session && (
               <div className="mt-1 flex flex-col items-center">
                 <span className="text-[9px] text-gray-400 font-medium">{session.date}</span>
                 <span className="text-[9px] text-gray-500 leading-tight px-1 truncate max-w-[80px] text-center" title={session.description}>{session.description}</span>
               </div>
             )}
          </div>
        );
      };

      return (
        <div className="space-y-4 animate-scale-in">
           {/* Controls */}
           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div className="relative">
                <select 
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                    className="w-full appearance-none bg-white border border-gray-300 text-gray-700 font-medium py-3 pl-10 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm truncate"
                >
                    {availableSubjects.map(sub => (<option key={sub} value={sub}>{sub}</option>))}
                </select>
                <div className="absolute inset-y-0 left-0 flex items-center px-3 pointer-events-none text-blue-500"><Book size={18} /></div>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500"><ChevronDown size={18} /></div>
            </div>
            <div className="relative">
                <select 
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value as SemesterKey)}
                    className="w-full appearance-none bg-white border border-gray-300 text-gray-700 font-medium py-3 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                    <option value="ganjil">Semester Ganjil</option>
                    <option value="genap">Semester Genap</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500"><ChevronDown size={18} /></div>
            </div>
        </div>

        {/* Summary Card */}
        <div className="bg-gradient-to-br from-blue-600 to-indigo-700 rounded-2xl p-5 text-white shadow-lg shadow-blue-500/20 relative overflow-hidden">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-24 h-24 bg-white/10 rounded-full blur-2xl"></div>
          <div className="relative z-10">
            <div className="flex justify-between items-start mb-6">
                <div>
                    <p className="text-blue-100 text-[10px] font-bold uppercase tracking-wide opacity-80 mb-1">Mata Pelajaran</p>
                    <p className="text-white font-bold text-lg leading-tight">{selectedSubject}</p>
                    <div className="flex items-center gap-1.5 mt-2 bg-white/10 w-fit px-2 py-1 rounded-lg backdrop-blur-sm">
                        <User size={12} className="text-blue-200" />
                        <span className="text-xs font-medium text-blue-50">{currentTeacherName}</span>
                    </div>
                </div>
                <div className="bg-white/20 p-2 rounded-lg backdrop-blur-sm">
                    <Award size={24} className="text-white" />
                </div>
            </div>
            <div className="flex items-end gap-2">
                <div>
                    <p className="text-blue-100 text-xs font-medium mb-1">Nilai Akhir (NA)</p>
                    <h2 className="text-4xl font-bold tracking-tight">{finalGrade !== null ? finalGrade : '-'}</h2>
                </div>
                {finalGrade !== null && (
                    <span className={`text-xs font-bold px-2 py-1 rounded mb-2 ${finalGrade >= 75 ? 'bg-green-500/30 text-green-50' : 'bg-red-500/30 text-red-50'}`}>
                        {finalGrade >= 75 ? 'TUNTAS' : 'BELUM TUNTAS'}
                    </span>
                )}
            </div>
          </div>
        </div>

        {/* Scores */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
             <div className="flex items-center space-x-2 mb-2"><Calendar size={16} className="text-orange-500" /><span className="text-xs font-bold text-gray-500 uppercase">KTS</span></div>
             {renderScoreBox(grades.kts, '', getScoreMetadata('kts', null))}
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col">
             <div className="flex items-center space-x-2 mb-2"><PieChart size={16} className="text-purple-500" /><span className="text-xs font-bold text-gray-500 uppercase">SAS</span></div>
             {renderScoreBox(grades.sas, '', getScoreMetadata('sas', null))}
          </div>
        </div>

        {/* Chapters */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide ml-1">Rincian Nilai TP</h3>
          {chapters.map((chap) => {
             // Safe access with optional chaining
             const chapterData = grades[chap.key] || {};
             const activeFields = activeFieldsMap[chap.key];
             const hasData = activeFields.length > 0;
             const avg = calculateChapterAverage(chapterData, activeFields);
             if (!hasData) return null;
             return (
              <div key={chap.key} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-5 py-3 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                   <div className="flex items-center space-x-2"><BookOpen size={16} className="text-blue-500" /><span className="font-semibold text-gray-800">{chap.label}</span></div>
                   <div className="flex items-center space-x-2"><span className="text-xs text-gray-500 uppercase font-medium">Rerata:</span><span className={`text-sm font-bold ${avg && avg < 75 ? 'text-red-600' : 'text-blue-600'}`}>{avg !== null ? avg : '-'}</span></div>
                </div>
                <div className="p-4">
                   <div className="grid grid-cols-6 gap-2">
                      {(['f1', 'f2', 'f3', 'f4', 'f5'] as const).map((f, i) => {
                         const score = chapterData?.[f];
                         if (!activeFields.includes(f)) return null;
                         const session = getScoreMetadata(chap.key, f);
                         return (<React.Fragment key={f}>{renderScoreBox(score, `F${i+1}`, session)}</React.Fragment>);
                      })}
                      {(activeFields.includes('sum')) && (<React.Fragment key="sum">{renderScoreBox(chapterData?.sum, 'SUM', getScoreMetadata(chap.key, 'sum'))}</React.Fragment>)}
                   </div>
                </div>
              </div>
             );
          })}
        </div>
      </div>
      );
  };

  // RENDER: SUMMARY VIEW (Simplified List)
  const renderSummaryView = () => {
     return (
        <div className="animate-scale-in">
             <div className="relative mb-6">
                <select 
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value as SemesterKey)}
                    className="w-full appearance-none bg-white border border-gray-300 text-gray-700 font-medium py-3 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                    <option value="ganjil">Semester Ganjil</option>
                    <option value="genap">Semester Genap</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500"><ChevronDown size={18} /></div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-[#f9f9fb] text-xs uppercase text-gray-500 font-bold">
                        <tr>
                            <th className="px-6 py-4 border-b border-gray-200 w-16 text-center">No</th>
                            <th className="px-6 py-4 border-b border-gray-200">Mata Pelajaran</th>
                            <th className="px-6 py-4 border-b border-gray-200 text-center w-32">Nilai Akhir</th>
                            <th className="px-6 py-4 border-b border-gray-200 text-center w-32">Status</th>
                            <th className="px-6 py-4 border-b border-gray-200 text-center w-32">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {availableSubjects.map((sub, idx) => {
                            const grades = getGradesForSubject(sub);
                            const activeFieldsMap = getActiveFieldsForSubject(sub);
                            const visibleChapters = subjectChapterConfigs[sub] || settings.visibleChapters;
                            const finalGrade = calculateFinalGrade(grades, activeFieldsMap, visibleChapters);
                            const teacherName = subjectTeacherMap[sub] || '-';
                            const isTuntas = finalGrade !== null && finalGrade >= 75;

                            return (
                                <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-6 py-4 text-center text-gray-500">{idx + 1}</td>
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-800">{sub}</div>
                                        <div className="text-xs text-gray-500 mt-0.5">{teacherName}</div>
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {finalGrade !== null ? (
                                            <span className={`font-bold text-base ${isTuntas ? 'text-blue-600' : 'text-red-600'}`}>
                                                {finalGrade}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {finalGrade !== null ? (
                                            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                                                isTuntas ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                            }`}>
                                                {isTuntas ? 'Tuntas' : 'Belum Tuntas'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        <button 
                                            onClick={() => handleViewDetail(sub)}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-gray-300 hover:border-blue-500 hover:text-blue-600 text-gray-600 rounded-lg text-xs font-medium transition-all shadow-sm active:scale-95"
                                        >
                                            <Eye size={14} />
                                            Detail
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
  };

  // RENDER: MONITORING (Tanggungan & Remidi)
  const renderMonitoringList = (type: 'tanggungan' | 'remidi') => {
      const listItems: { subject: string, taskName: string, description: string, score: number, date: string, teacher: string }[] = [];

      const relevantHistory = assessmentHistory.filter(h => 
          h.targetClass === student.kelas && h.semester === selectedSemester
      );

      relevantHistory.forEach(session => {
          const subject = session.targetSubject || 'Pendidikan Agama Islam';
          const grades = getGradesForSubject(subject);
          let score: number | null = null;

          // Safe access
          if (session.type === 'bab' && session.chapterKey && session.formativeKey) {
            score = grades[session.chapterKey]?.[session.formativeKey] ?? null;
          } else if (session.type === 'kts') {
            score = grades.kts;
          } else if (session.type === 'sas') {
            score = grades.sas;
          }

          const isMatch = type === 'tanggungan' 
             ? (score === 0) 
             : (score !== null && score !== undefined && score > 0 && score < 70);

          if (isMatch && score !== null && score !== undefined) {
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

      const grouped = listItems.reduce((acc, item) => {
          if (!acc[item.subject]) acc[item.subject] = [];
          acc[item.subject].push(item);
          return acc;
      }, {} as Record<string, typeof listItems>);

      return (
        <div className="animate-scale-in">
             <div className="relative mb-6">
                <select 
                    value={selectedSemester}
                    onChange={(e) => setSelectedSemester(e.target.value as SemesterKey)}
                    className="w-full appearance-none bg-white border border-gray-300 text-gray-700 font-medium py-3 pl-4 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                    <option value="ganjil">Semester Ganjil</option>
                    <option value="genap">Semester Genap</option>
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center px-4 pointer-events-none text-gray-500"><ChevronDown size={18} /></div>
            </div>

            {/* Added Metadata Header Block */}
            <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-y-2 gap-x-6">
               <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Tahun Pelajaran</p>
                  <p className="text-sm font-semibold text-gray-800">{settings.academicYear}</p>
               </div>
               <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Semester</p>
                  <p className="text-sm font-semibold text-gray-800 capitalize">{selectedSemester}</p>
               </div>
               <div>
                  <p className="text-[10px] uppercase font-bold text-gray-500">Kelas</p>
                  <p className="text-sm font-semibold text-gray-800">{student.kelas}</p>
               </div>
            </div>

            {Object.keys(grouped).length === 0 ? (
                <div className="flex flex-col items-center justify-center p-10 bg-white border border-dashed border-gray-300 rounded-xl text-center">
                    <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mb-4">
                        <CheckCircle size={32} className="text-green-500" />
                    </div>
                    <h3 className="text-gray-900 font-bold mb-1">Tidak Ada {type === 'tanggungan' ? 'Tanggungan' : 'Remidi'}</h3>
                    <p className="text-sm text-gray-500">Selamat! Anda tidak memiliki nilai {type === 'tanggungan' ? 'kosong (0)' : 'di bawah KKM'} untuk semester ini.</p>
                </div>
            ) : (
                <div className="space-y-6">
                    {Object.entries(grouped).map(([subject, items]) => (
                        <div key={subject} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                            <div className="bg-gray-50 px-5 py-3 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="font-bold text-gray-800 text-sm">{subject}</h3>
                                <span className="text-xs text-gray-500">{subjectTeacherMap[subject]}</span>
                            </div>
                            <div className="divide-y divide-gray-100">
                                {items.map((item, idx) => (
                                    <div key={idx} className="px-5 py-3 flex justify-between items-center hover:bg-red-50/10">
                                        <div className="flex-1">
                                            <div className="font-medium text-gray-700 text-sm">
                                                {item.taskName} 
                                                {item.description && <span className="font-normal text-gray-500 italic"> ({item.description})</span>}
                                            </div>
                                            <div className="text-xs text-gray-400 mt-0.5">{item.date}</div>
                                        </div>
                                        <div className={`px-3 py-1 rounded text-sm font-bold ${
                                            type === 'tanggungan' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                                        }`}>
                                            {item.score}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
      );
  };

  return (
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col font-sans relative">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-md border-b border-gray-200 sticky top-0 z-50 px-4 py-4 shadow-sm">
        <div className="max-w-3xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center space-x-3">
             <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl flex items-center justify-center text-white font-bold text-sm shadow-md">
                <BookOpen size={20} />
             </div>
             <div>
                <h1 className="text-lg font-bold text-gray-900 leading-tight">Laporan Hasil Belajar</h1>
                <p className="text-sm text-gray-600 font-medium">SMPN 3 Pacet</p>
             </div>
          </div>
          <div className="flex flex-col items-end text-right">
             <div className="text-xs font-bold text-blue-600 bg-blue-50 px-2 py-1 rounded-md mb-1">
                TA {settings.academicYear}
             </div>
             <div className="flex items-center text-gray-500 text-xs gap-1.5">
                <Calendar size={12} /><span>{formattedDate}</span><span className="mx-1">•</span><Clock size={12} /><span className="font-mono">{formattedTime}</span>
             </div>
          </div>
        </div>
      </div>

      {/* Student Info & Logout */}
      <div className="bg-white border-b border-gray-200 px-4 py-3">
         <div className="max-w-3xl mx-auto flex justify-between items-center">
            <div>
               <h2 className="text-sm font-bold text-gray-900">{student.name}</h2>
               <p className="text-xs text-gray-500">{student.kelas} • NIS: {student.nis}</p>
            </div>
            <button onClick={onLogout} className="flex items-center space-x-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-all text-xs font-bold shadow-md shadow-red-200 active:scale-95">
               <LogOut size={14} /><span>Keluar</span>
            </button>
         </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-3xl mx-auto w-full px-4 mt-4">
          <div className="flex p-1 bg-gray-200 rounded-xl overflow-x-auto gap-1">
              <button 
                onClick={() => setActiveTab('summary')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <TrendingUp size={14} /> Rekap Nilai
              </button>
              <button 
                onClick={() => setActiveTab('attendance')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'attendance' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <Calendar size={14} /> Riwayat Absensi
              </button>
              <button 
                onClick={() => setActiveTab('tanggungan')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'tanggungan' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <AlertCircle size={14} /> Tanggungan
              </button>
              <button 
                onClick={() => setActiveTab('remidi')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'remidi' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <RefreshCw size={14} /> Remidi
              </button>
              <button 
                onClick={() => setActiveTab('rapor_sisipan')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all whitespace-nowrap ${activeTab === 'rapor_sisipan' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <ClipboardList size={14} /> Rapor Sisipan
              </button>
          </div>
      </div>

      {/* Main Content Area */}
      {/* Dynamic container width: full for Rapor Sisipan to match Admin layout, constrained for others */}
      <div className={`flex-1 p-4 w-full pb-20 ${activeTab === 'rapor_sisipan' ? 'max-w-full px-0 py-0 h-full' : 'max-w-3xl mx-auto'}`}>
          {activeTab === 'detail' && renderDetailView()}
          {activeTab === 'summary' && renderSummaryView()}
          {activeTab === 'attendance' && renderAttendanceView()}
          {activeTab === 'tanggungan' && renderMonitoringList('tanggungan')}
          {activeTab === 'remidi' && renderMonitoringList('remidi')}
          {activeTab === 'rapor_sisipan' && (
              <div className="bg-white h-full animate-fade-in shadow-sm border-t border-gray-200">
                  <MidSemesterReportView 
                      students={[student]} // Pass only the logged-in student
                      teachers={teachers} 
                      settings={settings} 
                      assessmentHistory={assessmentHistory} 
                      allowDownload={false} // Disable downloads for students
                  />
              </div>
          )}
      </div>

      {/* Student Help Button */}
      <button 
        onClick={() => setIsGuideOpen(true)}
        className="fixed bottom-6 right-6 p-3 bg-blue-600 text-white rounded-full shadow-xl hover:bg-blue-700 transition-transform hover:scale-110 z-50 animate-bounce-slow"
        title="Panduan Siswa"
      >
        <HelpCircle size={24} />
      </button>
      <GuideModal isOpen={isGuideOpen} onClose={() => setIsGuideOpen(false)} role="student" />

    </div>
  );
};

export default StudentDashboard;


import React, { useState, useMemo, useEffect } from 'react';
import { Student, SemesterKey, ChapterKey, GradingSession, FormativeKey, AppSettings, Teacher, SemesterData } from '../types';
import { getActiveFields, calculateChapterAverage, calculateFinalGrade, createEmptySemesterData } from '../utils';
import { LogOut, ChevronDown, Award, BookOpen, Calendar, PieChart, Info, AlertCircle, RefreshCw, Clock, Book, User, LayoutDashboard, ListChecks, AlertTriangle, FileText, CheckCircle } from 'lucide-react';

interface StudentDashboardProps {
  student: Student;
  allStudents: Student[];
  assessmentHistory: GradingSession[];
  settings: AppSettings;
  teachers: Teacher[];
  onLogout: () => void;
  subjectChapterConfigs?: Record<string, Record<ChapterKey, boolean>>;
}

const StudentDashboard: React.FC<StudentDashboardProps> = ({ 
    student, 
    allStudents, 
    assessmentHistory, 
    settings, 
    teachers, 
    onLogout,
    subjectChapterConfigs = {} 
}) => {
  const [activeTab, setActiveTab] = useState<'detail' | 'summary' | 'tanggungan' | 'remidi'>('detail');
  const [selectedSemester, setSelectedSemester] = useState<SemesterKey>(settings.activeSemester);
  
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
      if (subject === 'Pendidikan Agama Islam') return student.grades[selectedSemester];
      return student.gradesBySubject?.[subject]?.[selectedSemester] || createEmptySemesterData();
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

  // --- RENDERERS ---

  // RENDER: DETAIL VIEW (Existing)
  const renderDetailView = () => {
      const grades = getGradesForSubject(selectedSubject);
      const activeFieldsMap = getActiveFieldsForSubject(selectedSubject);
      const visibleChapters = subjectChapterConfigs[selectedSubject] || settings.visibleChapters;
      const finalGrade = calculateFinalGrade(grades, activeFieldsMap, visibleChapters);
      const currentTeacherName = subjectTeacherMap[selectedSubject] || '-';

      const allChapters: { key: ChapterKey; label: string }[] = [
        { key: 'bab1', label: selectedSemester === 'genap' ? 'Bab 6' : 'Bab 1' },
        { key: 'bab2', label: selectedSemester === 'genap' ? 'Bab 7' : 'Bab 2' },
        { key: 'bab3', label: selectedSemester === 'genap' ? 'Bab 8' : 'Bab 3' },
        { key: 'bab4', label: selectedSemester === 'genap' ? 'Bab 9' : 'Bab 4' },
        { key: 'bab5', label: selectedSemester === 'genap' ? 'Bab 10' : 'Bab 5' },
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
        if (score !== null) {
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
                {score !== null ? score : '-'}
             </div>
             {statusLabel}
             {score !== null && session && (
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
          <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide ml-1">Rincian Nilai Bab</h3>
          {chapters.map((chap) => {
             const chapterData = grades[chap.key];
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
                         const score = chapterData[f];
                         if (!activeFields.includes(f)) return null;
                         const session = getScoreMetadata(chap.key, f);
                         return (<React.Fragment key={f}>{renderScoreBox(score, `F${i+1}`, session)}</React.Fragment>);
                      })}
                      {(activeFields.includes('sum')) && (<React.Fragment key="sum">{renderScoreBox(chapterData.sum, 'SUM', getScoreMetadata(chap.key, 'sum'))}</React.Fragment>)}
                   </div>
                </div>
              </div>
             );
          })}
        </div>
      </div>
      );
  };

  // RENDER: SUMMARY VIEW
  const renderSummaryView = () => {
     const summaryData = availableSubjects.map(sub => {
         const grades = getGradesForSubject(sub);
         const activeFieldsMap = getActiveFieldsForSubject(sub);
         const visibleChapters = subjectChapterConfigs[sub] || settings.visibleChapters;
         const finalGrade = calculateFinalGrade(grades, activeFieldsMap, visibleChapters);
         return {
             subject: sub,
             teacher: subjectTeacherMap[sub] || '-',
             finalGrade
         };
     });

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
                <table className="w-full text-left">
                    <thead className="bg-gray-50 border-b border-gray-200 text-xs font-semibold text-gray-500 uppercase">
                        <tr>
                            <th className="px-5 py-4">Mata Pelajaran</th>
                            <th className="px-5 py-4">Nilai Akhir</th>
                            <th className="px-5 py-4 text-center">Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {summaryData.map((data, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                <td className="px-5 py-4">
                                    <div className="font-semibold text-gray-900 text-sm">{data.subject}</div>
                                    <div className="text-xs text-gray-500 mt-0.5">{data.teacher}</div>
                                </td>
                                <td className="px-5 py-4">
                                    <span className={`text-base font-bold ${data.finalGrade !== null && data.finalGrade < 75 ? 'text-red-600' : 'text-gray-900'}`}>
                                        {data.finalGrade !== null ? data.finalGrade : '-'}
                                    </span>
                                </td>
                                <td className="px-5 py-4 text-center">
                                    {data.finalGrade !== null ? (
                                        <span className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${
                                            data.finalGrade >= 75 ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {data.finalGrade >= 75 ? 'Tuntas' : 'Belum'}
                                        </span>
                                    ) : (
                                        <span className="text-xs text-gray-400">-</span>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
     );
  };

  // RENDER: MONITORING (Tanggungan & Remidi)
  const renderMonitoringList = (type: 'tanggungan' | 'remidi') => {
      // Logic: Iterate history (to get actual tasks assigned) -> check student score
      const listItems: { subject: string, taskName: string, description: string, score: number, date: string, teacher: string }[] = [];

      // Filter relevant history first (class & semester)
      const relevantHistory = assessmentHistory.filter(h => 
          h.targetClass === student.kelas && h.semester === selectedSemester
      );

      relevantHistory.forEach(session => {
          const subject = session.targetSubject || 'Pendidikan Agama Islam';
          const grades = getGradesForSubject(subject);
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
              // Format task name
              let taskName = session.type.toUpperCase();
              if (session.type === 'bab' && session.chapterKey) {
                  const babNum = parseInt(session.chapterKey.replace('bab', ''));
                  const displayBab = selectedSemester === 'genap' ? babNum + 5 : babNum;
                  const field = session.formativeKey === 'sum' ? 'Sumatif' : session.formativeKey?.toUpperCase();
                  taskName = `Bab ${displayBab} - ${field}`;
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

      // Group by Subject
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
    <div className="min-h-screen bg-[#f5f5f7] flex flex-col font-sans">
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
            <button onClick={onLogout} className="flex items-center space-x-1 px-3 py-1.5 bg-gray-100 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors text-xs font-medium text-gray-600">
               <LogOut size={14} /><span>Keluar</span>
            </button>
         </div>
      </div>

      {/* Navigation Tabs */}
      <div className="max-w-3xl mx-auto w-full px-4 mt-4">
          <div className="flex p-1 bg-gray-200 rounded-xl">
              <button 
                onClick={() => setActiveTab('detail')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'detail' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <LayoutDashboard size={14} /> Detail
              </button>
              <button 
                onClick={() => setActiveTab('summary')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'summary' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <FileText size={14} /> Rekap
              </button>
              <button 
                onClick={() => setActiveTab('tanggungan')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'tanggungan' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <AlertCircle size={14} /> Tanggungan
              </button>
              <button 
                onClick={() => setActiveTab('remidi')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-bold uppercase tracking-wide transition-all ${activeTab === 'remidi' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <RefreshCw size={14} /> Remidi
              </button>
          </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 p-4 max-w-2xl mx-auto w-full pb-20">
          {activeTab === 'detail' && renderDetailView()}
          {activeTab === 'summary' && renderSummaryView()}
          {activeTab === 'tanggungan' && renderMonitoringList('tanggungan')}
          {activeTab === 'remidi' && renderMonitoringList('remidi')}
      </div>
    </div>
  );
};

export default StudentDashboard;

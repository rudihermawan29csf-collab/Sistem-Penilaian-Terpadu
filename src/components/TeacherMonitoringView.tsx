
import React, { useState } from 'react';
import { Teacher, GradingSession } from '../types';
import { CheckCircle, Clock, AlertCircle, Users, LayoutList, XCircle, Circle } from 'lucide-react';

interface TeacherMonitoringViewProps {
  teachers: Teacher[];
  history: GradingSession[];
  currentSemester: 'ganjil' | 'genap';
  availableClasses: string[];
}

const TeacherMonitoringView: React.FC<TeacherMonitoringViewProps> = ({ teachers, history, currentSemester, availableClasses }) => {
  const [activeTab, setActiveTab] = useState<'teacher' | 'class'>('teacher');

  // --- LOGIC FOR TEACHER MONITORING ---
  const teacherStats = teachers.map(teacher => {
    const teacherSessions = history.filter(h => 
      h.semester === currentSemester &&
      (h.targetSubject === teacher.subject || (!h.targetSubject && teacher.subject === 'Pendidikan Agama Islam')) &&
      teacher.classes.includes(h.targetClass)
    );

    const classesWithInput = new Set(teacherSessions.map(h => h.targetClass));
    const totalClasses = teacher.classes.length;
    const progress = Math.round((classesWithInput.size / totalClasses) * 100) || 0;

    return {
      ...teacher,
      sessionCount: teacherSessions.length,
      classesWithInput: classesWithInput.size,
      totalClasses,
      progress,
      lastInput: teacherSessions.length > 0 ? teacherSessions[0].date : null
    };
  });

  // --- LOGIC FOR CLASS MONITORING ---
  const classStats = availableClasses.map(className => {
      // 1. Get all subjects that should be taught in this class
      // Assume all teachers assigned to this class + PAI
      const subjectsInClass = new Set<string>();
      subjectsInClass.add('Pendidikan Agama Islam');
      
      teachers.forEach(t => {
          if (t.classes.includes(className)) {
              subjectsInClass.add(t.subject);
          }
      });

      const subjectsList = Array.from(subjectsInClass).sort();

      // 2. Check status for each subject
      const subjectStatus = subjectsList.map(subject => {
          const hasInput = history.some(h => 
              h.semester === currentSemester &&
              h.targetClass === className &&
              (h.targetSubject === subject || (!h.targetSubject && subject === 'Pendidikan Agama Islam'))
          );
          
          // Find teacher name for this subject in this class
          let teacherName = '-';
          if (subject === 'Pendidikan Agama Islam') {
              // Usually handled by specific teacher or admin
              const paiTeacher = teachers.find(t => t.subject === 'Pendidikan Agama Islam' && t.classes.includes(className));
              teacherName = paiTeacher ? paiTeacher.name : 'Guru PAI';
          } else {
              const t = teachers.find(t => t.subject === subject && t.classes.includes(className));
              teacherName = t ? t.name : '-';
          }

          return { subject, hasInput, teacherName };
      });

      const filledCount = subjectStatus.filter(s => s.hasInput).length;
      const totalCount = subjectStatus.length;
      const progress = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;

      return {
          className,
          subjects: subjectStatus,
          progress
      };
  });

  return (
    <div className="flex-1 bg-white h-full overflow-auto custom-scrollbar p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8 border-b border-gray-200 pb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
              <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                <CheckCircle size={32} className="text-green-600" />
                Monitoring Input Nilai
              </h2>
              <p className="text-gray-500 mt-2">
                Pantau progres penginputan nilai untuk Semester {currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}.
              </p>
          </div>
          
          <div className="flex bg-gray-100 p-1 rounded-lg">
              <button 
                  onClick={() => setActiveTab('teacher')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'teacher' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <Users size={16} /> Monitor per Guru
              </button>
              <button 
                  onClick={() => setActiveTab('class')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${activeTab === 'class' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
              >
                  <LayoutList size={16} /> Monitor per Kelas
              </button>
          </div>
        </div>

        {/* --- TEACHER MONITORING VIEW --- */}
        {activeTab === 'teacher' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
            {teacherStats.map(stat => (
                <div key={stat.id} className="bg-white border border-gray-200 rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-4">
                    <div>
                        <h3 className="font-bold text-gray-900 text-lg">{stat.name}</h3>
                        <p className="text-sm text-blue-600 font-medium">{stat.subject}</p>
                        <p className="text-xs text-gray-500 mt-1">NIP: {stat.nip || '-'}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                        stat.progress === 100 ? 'bg-green-100 text-green-700' : 
                        stat.progress > 0 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
                    }`}>
                        {stat.progress === 100 ? 'Selesai' : stat.progress > 0 ? 'Proses' : 'Belum Mulai'}
                    </div>
                </div>

                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between text-xs mb-1 text-gray-600">
                            <span>Cakupan Kelas ({stat.classesWithInput}/{stat.totalClasses})</span>
                            <span>{stat.progress}%</span>
                        </div>
                        <div className="w-full bg-gray-100 rounded-full h-2">
                            <div 
                            className={`h-2 rounded-full transition-all duration-500 ${
                                stat.progress === 100 ? 'bg-green-500' : 'bg-blue-500'
                            }`} 
                            style={{ width: `${stat.progress}%` }}
                            ></div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-gray-500 mt-3 pt-3 border-t border-gray-100">
                        <div className="flex items-center gap-1.5">
                            <Clock size={14} />
                            <span>Input Terakhir: {stat.lastInput || '-'}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <AlertCircle size={14} />
                            <span>{stat.sessionCount} Sesi Penilaian</span>
                        </div>
                    </div>
                </div>
                </div>
            ))}
            </div>
        )}

        {/* --- CLASS MONITORING VIEW --- */}
        {activeTab === 'class' && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 animate-fade-in">
                {classStats.map(stat => (
                    <div key={stat.className} className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                            <h3 className="font-bold text-gray-800 text-lg">Kelas {stat.className}</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-500">{stat.progress}%</span>
                                <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div className={`h-full ${stat.progress === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${stat.progress}%` }}></div>
                                </div>
                            </div>
                        </div>
                        <div className="p-0">
                            {stat.subjects.length > 0 ? (
                                <div className="divide-y divide-gray-50">
                                    {stat.subjects.map(subj => (
                                        <div key={subj.subject} className="px-5 py-3 flex items-center justify-between hover:bg-gray-50/50 transition-colors">
                                            <div className="overflow-hidden">
                                                <p className="text-sm font-semibold text-gray-800 truncate">{subj.subject}</p>
                                                <p className="text-[10px] text-gray-500 truncate">{subj.teacherName}</p>
                                            </div>
                                            <div className="shrink-0 ml-3">
                                                {subj.hasInput ? (
                                                    <CheckCircle size={20} className="text-green-500" />
                                                ) : (
                                                    <XCircle size={20} className="text-gray-300" />
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-8 text-center text-gray-400 text-sm italic">
                                    Belum ada mata pelajaran terdaftar untuk kelas ini.
                                </div>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

      </div>
    </div>
  );
};

export default TeacherMonitoringView;

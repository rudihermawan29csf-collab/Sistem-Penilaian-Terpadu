
import React from 'react';
import { Teacher, GradingSession } from '../types';
import { CheckCircle, Clock, AlertCircle } from 'lucide-react';

interface TeacherMonitoringViewProps {
  teachers: Teacher[];
  history: GradingSession[];
  currentSemester: 'ganjil' | 'genap';
}

const TeacherMonitoringView: React.FC<TeacherMonitoringViewProps> = ({ teachers, history, currentSemester }) => {
  // Aggregate data per teacher
  const teacherStats = teachers.map(teacher => {
    // Filter history for this teacher's subject and any of their classes
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

  return (
    <div className="flex-1 bg-white h-full overflow-auto custom-scrollbar p-8">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8 border-b border-gray-200 pb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
            <CheckCircle size={32} className="text-green-600" />
            Monitoring Input Nilai Guru
          </h2>
          <p className="text-gray-500 mt-2">
            Pantau progres penginputan nilai oleh guru per mata pelajaran untuk Semester {currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
      </div>
    </div>
  );
};

export default TeacherMonitoringView;

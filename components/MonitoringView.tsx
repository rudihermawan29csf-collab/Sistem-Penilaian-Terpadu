
import React from 'react';
import { Student, GradingSession, SemesterKey } from '../types';
import { ChevronRight, Calendar, AlertCircle, RefreshCw, BookOpen, Download } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MonitoringViewProps {
  type: 'tanggungan' | 'remidi';
  students: Student[];
  history: GradingSession[];
  currentSemester: SemesterKey;
  subjectName?: string;
  teacherName?: string;
  teacherNip?: string;
  principalName?: string;
  principalNip?: string;
}

const MonitoringView: React.FC<MonitoringViewProps> = ({ 
    type, 
    students, 
    history, 
    currentSemester, 
    subjectName,
    teacherName,
    teacherNip,
    principalName,
    principalNip 
}) => {
  // 1. Filter history for current semester only (history passed is already filtered by Subject in App.tsx)
  const activeSessions = history.filter(h => h.semester === currentSemester);

  // Group by Class first
  // Structure: { [ClassName]: { [SessionID]: { session: Session, students: Student[], score: number } } }
  const groupedData: Record<string, Record<string, { session: GradingSession, items: { student: Student, score: number }[] }>> = {};

  activeSessions.forEach(session => {
    // Find students in the target class of this session
    // Important: 'students' prop might be filtered by class if selected in App, or all students if not.
    // If 'students' is filtered, this filter handles it naturally.
    const classStudents = students.filter(s => s.kelas === session.targetClass);
    
    // Check scores for this session
    const affectedStudents: { student: Student, score: number }[] = [];

    classStudents.forEach(student => {
      let score: number | null = null;
      const grades = student.grades[currentSemester];

      if (session.type === 'bab' && session.chapterKey && session.formativeKey) {
        score = grades[session.chapterKey][session.formativeKey];
      } else if (session.type === 'kts') {
        score = grades.kts;
      } else if (session.type === 'sas') {
        score = grades.sas;
      }

      // Logic Filter
      let isMatch = false;
      if (score !== null) {
        if (type === 'tanggungan' && score === 0) {
          isMatch = true;
        } else if (type === 'remidi' && score > 0 && score < 70) {
          isMatch = true;
        }
      }

      if (isMatch && score !== null) {
         affectedStudents.push({ student, score });
      }
    });

    if (affectedStudents.length > 0) {
      if (!groupedData[session.targetClass]) {
        groupedData[session.targetClass] = {};
      }
      groupedData[session.targetClass][session.id] = {
        session,
        items: affectedStudents
      };
    }
  });

  // Sort classes alphabetically
  const sortedClasses = Object.keys(groupedData).sort();

  const getTaskName = (session: GradingSession) => {
    if (session.type === 'bab' && session.chapterKey && session.formativeKey) {
        const babNum = parseInt(session.chapterKey.replace('bab', ''));
        const displayBab = currentSemester === 'genap' ? babNum + 5 : babNum;
        return `Bab ${displayBab} - ${session.formativeKey === 'sum' ? 'Sumatif' : session.formativeKey.toUpperCase()}`;
    }
    return session.type.toUpperCase();
  };

  const handleDownloadPDF = () => {
    const doc = new jsPDF();

    doc.setFontSize(14);
    doc.text(`Laporan Monitoring ${type === 'tanggungan' ? 'Tanggungan' : 'Remidi'}`, 105, 15, { align: "center" });
    doc.setFontSize(10);
    doc.text(`Mata Pelajaran: ${subjectName || '-'}`, 14, 22);
    doc.text(`Semester: ${currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}`, 14, 27);
    
    let yPos = 35;

    sortedClasses.forEach(className => {
        // Class Header
        doc.setFontSize(11);
        doc.setFont("helvetica", "bold");
        doc.text(`Kelas: ${className}`, 14, yPos);
        yPos += 5;

        // Iterate tasks in this class
        Object.values(groupedData[className]).forEach(({ session, items }) => {
            const taskName = getTaskName(session);
            
            // Prepare Table Data
            const tableBody = items.map((item, idx) => [
                idx + 1,
                item.student.nis,
                item.student.name,
                item.score
            ]);

            autoTable(doc, {
                startY: yPos,
                head: [[`No`, `NIS`, `Nama Siswa (${taskName})`, `Nilai`]],
                body: tableBody,
                theme: 'grid',
                headStyles: { 
                    fillColor: type === 'tanggungan' ? [220, 38, 38] : [234, 88, 12],
                    textColor: 255 
                },
                margin: { left: 14, right: 14 },
            });

            // Update yPos for next table
            yPos = (doc as any).lastAutoTable.finalY + 10;
        });
        
        yPos += 5;
    });

    // Check space for signatures
    if (yPos > 240) {
        doc.addPage();
        yPos = 20;
    }

    // Signatures
    const signatureY = yPos + 10;
    
    // Date
    const today = new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Mojokerto, ${today}`, 196, signatureY, { align: "right" });

    // Titles
    doc.text("Mengetahui,", 14, signatureY + 5);
    doc.text("Kepala Sekolah", 14, signatureY + 10);
    
    doc.text("Guru Mata Pelajaran", 196, signatureY + 10, { align: "right" });

    // Space for signature
    const nameY = signatureY + 35;

    // Names
    doc.setFont("helvetica", "bold");
    doc.text(principalName || '.........................', 14, nameY);
    doc.text(teacherName || '.........................', 196, nameY, { align: "right" });

    // NIPs
    doc.setFont("helvetica", "normal");
    doc.text(`NIP. ${principalNip || '.........................'}`, 14, nameY + 5);
    doc.text(`NIP. ${teacherNip || '.........................'}`, 196, nameY + 5, { align: "right" });


    doc.save(`Monitoring_${type}_${subjectName}_${currentSemester}.pdf`);
  };

  return (
    <div className="flex-1 bg-white h-full overflow-auto custom-scrollbar p-6">
      <div className="mb-6 border-b border-gray-200 pb-4 flex justify-between items-start">
        <div>
            <h2 className={`text-2xl font-bold flex items-center gap-3 ${type === 'tanggungan' ? 'text-red-600' : 'text-orange-500'}`}>
            {type === 'tanggungan' ? <AlertCircle size={28} /> : <RefreshCw size={28} />}
            {type === 'tanggungan' ? 'Monitoring Tanggungan (Nilai 0)' : 'Monitoring Remidi (Nilai < 70)'}
            </h2>
            <p className="text-gray-500 text-sm mt-1">
            Daftar siswa yang perlu perhatian khusus untuk mapel <span className="font-semibold text-gray-700">{subjectName}</span>.
            </p>
        </div>
        <button 
            onClick={handleDownloadPDF}
            className="flex items-center space-x-2 px-3 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-900 transition-colors shadow-sm text-sm font-medium"
        >
            <Download size={16} />
            <span>Download PDF</span>
        </button>
      </div>

      {sortedClasses.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 text-gray-400 bg-gray-50 rounded-xl border border-dashed border-gray-300">
           <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
              {type === 'tanggungan' ? <AlertCircle size={32} /> : <RefreshCw size={32} />}
           </div>
           <p className="font-medium">Tidak ada data {type} ditemukan.</p>
           <p className="text-xs mt-1">Semua siswa tuntas atau belum ada nilai yang diinput.</p>
        </div>
      ) : (
        <div className="space-y-12">
          {sortedClasses.map(className => (
            <div key={className} className="border border-gray-200 rounded-xl overflow-hidden shadow-sm bg-gray-50/50">
              <div className="bg-white px-5 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 z-10">
                 <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
                    <span className="w-1 h-6 bg-blue-500 rounded-full"></span>
                    Kelas {className}
                 </h3>
                 <span className="text-xs font-semibold px-2 py-1 bg-gray-100 rounded text-gray-600">
                    {Object.keys(groupedData[className]).length} Tugas Berpotensi
                 </span>
              </div>
              
              <div className="p-4 space-y-4">
                {Object.values(groupedData[className]).map(({ session, items }) => (
                  <div key={session.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                     {/* Session Header */}
                     <div className="bg-gray-50 px-4 py-3 border-b border-gray-100 flex items-start justify-between">
                        <div>
                           <h4 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                              <BookOpen size={16} className="text-blue-500" />
                              {getTaskName(session)}
                           </h4>
                           <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                              <span className="flex items-center gap-1">
                                 <Calendar size={12} /> {session.date}
                              </span>
                              <span className="bg-gray-200 px-1.5 rounded text-[10px]">
                                 {session.description}
                              </span>
                           </div>
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                           type === 'tanggungan' ? 'bg-red-100 text-red-600' : 'bg-orange-100 text-orange-600'
                        }`}>
                           {items.length} Siswa
                        </span>
                     </div>

                     {/* Student List */}
                     <div className="divide-y divide-gray-50">
                        {items.map((item, idx) => (
                           <div key={`${item.student.id}-${idx}`} className="px-4 py-2 flex justify-between items-center hover:bg-gray-50 transition-colors">
                              <div className="flex items-center gap-3">
                                 <span className="text-xs text-gray-400 font-mono w-6">{idx + 1}.</span>
                                 <div>
                                    <p className="text-sm font-medium text-gray-800">{item.student.name}</p>
                                    <p className="text-[10px] text-gray-400">NIS: {item.student.nis}</p>
                                 </div>
                              </div>
                              <div className={`px-3 py-1 rounded text-sm font-bold ${
                                 type === 'tanggungan' ? 'text-red-600 bg-red-50' : 'text-orange-600 bg-orange-50'
                              }`}>
                                 {item.score}
                              </div>
                           </div>
                        ))}
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

export default MonitoringView;


import React, { useState } from 'react';
import { Student, ChapterKey, FormativeKey, SemesterKey, GradingSession } from '../types';
import { calculateChapterAverage, calculateFinalGrade, formatNumber } from '../utils';
import { Info, X, Calendar, FileText, Tag, BookOpen } from 'lucide-react';

interface GradeTableProps {
  students: Student[];
  selectedSemester: SemesterKey;
  activeFieldsMap: Record<ChapterKey, FormativeKey[]>;
  visibleChapters: Record<ChapterKey, boolean>;
  assessmentHistory: GradingSession[];
  academicYear: string;
  onUpdateScore: (id: number, chapter: ChapterKey | 'kts' | 'sas', field: FormativeKey | null, value: number | null) => void;
  isEditable: boolean;
}

const GradeTable: React.FC<GradeTableProps> = ({
  students,
  selectedSemester,
  activeFieldsMap,
  visibleChapters,
  assessmentHistory,
  academicYear,
  onUpdateScore,
  isEditable
}) => {
  // State for popover details
  const [selectedSession, setSelectedSession] = useState<GradingSession | null>(null);

  const allChapters: { key: ChapterKey; label: string }[] = [
    { key: 'bab1', label: selectedSemester === 'genap' ? 'Bab 6' : 'Bab 1' },
    { key: 'bab2', label: selectedSemester === 'genap' ? 'Bab 7' : 'Bab 2' },
    { key: 'bab3', label: selectedSemester === 'genap' ? 'Bab 8' : 'Bab 3' },
    { key: 'bab4', label: selectedSemester === 'genap' ? 'Bab 9' : 'Bab 4' },
    { key: 'bab5', label: selectedSemester === 'genap' ? 'Bab 10' : 'Bab 5' },
  ];

  // Filter visible chapters
  const chapters = allChapters.filter(c => visibleChapters[c.key]);

  // Standard fields that must always appear
  const standardFields: FormativeKey[] = ['f1', 'f2', 'f3', 'f4', 'f5', 'sum'];

  // Helper to check if a specific cell is "active" (part of history) for editing context
  const isCellActive = (chapter: ChapterKey | 'kts' | 'sas', field: FormativeKey | null) => {
    // If not editable (admin view), always show value as readonly
    if (!isEditable) return false;

    // Check if this specific column/field exists in assessmentHistory for this class/semester
    return assessmentHistory.some(h => {
        if (h.type === 'bab') return h.chapterKey === chapter && h.formativeKey === field;
        if (h.type === 'kts') return chapter === 'kts';
        if (h.type === 'sas') return chapter === 'sas';
        return false;
    });
  };

  // Helper to find session data for a header
  const getSessionForHeader = (chapter: ChapterKey | 'kts' | 'sas', field: FormativeKey | null) => {
      return assessmentHistory.find(h => {
        if (h.type === 'bab') return h.chapterKey === chapter && h.formativeKey === field;
        if (h.type === 'kts') return chapter === 'kts';
        if (h.type === 'sas') return chapter === 'sas';
        return false;
      });
  };

  // Helper to determine input color class based on value
  const getScoreInputClass = (val: number | null) => {
    const baseClass = "w-full text-center py-1.5 text-sm font-medium focus:outline-none rounded transition-all placeholder-gray-300";
    
    if (val === null) {
        return `${baseClass} bg-white text-gray-800 focus:bg-blue-50`;
    }
    if (val >= 85) {
        return `${baseClass} bg-green-100 text-green-800 focus:bg-green-200 font-semibold`;
    }
    if (val >= 70) {
        return `${baseClass} bg-yellow-100 text-yellow-800 focus:bg-yellow-200 font-semibold`;
    }
    // 0 - 69
    return `${baseClass} bg-red-100 text-red-800 focus:bg-red-200 font-semibold`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    studentId: number, 
    chapter: ChapterKey | 'kts' | 'sas', 
    field: FormativeKey | null
  ) => {
    const val = e.target.value;
    const numVal = val === '' ? null : parseFloat(val);
    if (numVal !== null && (numVal < 0 || numVal > 100)) return; // Basic validation
    onUpdateScore(studentId, chapter, field, numVal);
  };

  return (
    <div className="bg-white flex flex-col relative">
      {/* Detail Popover Modal */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedSession(null)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-scale-in border border-gray-100" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Info size={20} className="text-blue-600" />
                        Detail Penilaian
                    </h3>
                    <button onClick={() => setSelectedSession(null)} className="text-gray-400 hover:text-gray-600">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="space-y-3">
                    <div className="flex items-start gap-3">
                        <BookOpen size={16} className="text-gray-400 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Target</p>
                            <p className="text-sm font-medium text-gray-800">
                                {selectedSession.type === 'bab' 
                                    ? `${selectedSession.chapterKey?.toUpperCase()} - ${selectedSession.formativeKey === 'sum' ? 'SUMATIF' : selectedSession.formativeKey?.toUpperCase()}`
                                    : selectedSession.type.toUpperCase()
                                }
                            </p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Calendar size={16} className="text-gray-400 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Tanggal Input</p>
                            <p className="text-sm font-medium text-gray-800">{selectedSession.date}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <FileText size={16} className="text-gray-400 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Keterangan</p>
                            <p className="text-sm font-medium text-gray-800">{selectedSession.description}</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <Tag size={16} className="text-gray-400 mt-0.5" />
                        <div>
                            <p className="text-xs font-bold text-gray-500 uppercase">Kelas Target</p>
                            <p className="text-sm font-medium text-gray-800">{selectedSession.targetClass}</p>
                        </div>
                    </div>
                </div>
                
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <button 
                        onClick={() => setSelectedSession(null)}
                        className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors"
                    >
                        Tutup
                    </button>
                </div>
            </div>
        </div>
      )}

      {/* Table Container */}
      <div className="overflow-x-auto custom-scrollbar relative">
        <table className="border-collapse w-full min-w-max">
          <thead className="sticky top-0 z-20 bg-[#f9f9fb] shadow-sm">
            {/* Header Row 1: Groupings */}
            <tr>
              <th rowSpan={2} className="p-3 w-12 border-b border-r border-gray-300 bg-[#f9f9fb] text-xs font-bold text-gray-500 uppercase sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                No
              </th>
              <th rowSpan={2} className="p-3 w-32 border-b border-r border-gray-300 bg-[#f9f9fb] text-xs font-bold text-gray-500 uppercase">
                NIS
              </th>
              <th rowSpan={2} className="p-3 min-w-[200px] border-b border-r border-gray-300 bg-[#f9f9fb] text-xs font-bold text-gray-500 uppercase text-left">
                Nama Siswa
              </th>
              
              {chapters.map(chap => (
                <th key={chap.key} colSpan={7} className="p-2 border-b border-r border-gray-300 bg-blue-50 text-xs font-bold text-blue-700 uppercase text-center">
                    {chap.label}
                </th>
              ))}
              
              <th colSpan={3} className="p-2 border-b border-gray-300 bg-purple-50 text-xs font-bold text-purple-700 uppercase text-center">
                 Evaluasi Akhir
              </th>
            </tr>
            
            {/* Header Row 2: Columns (F1..F5, Sum, Avg, KTS, SAS, NA) */}
            <tr>
               {chapters.map(chap => (
                  <React.Fragment key={chap.key}>
                     {standardFields.map(f => {
                        const session = getSessionForHeader(chap.key, f);
                        const hasSession = !!session;
                        return (
                           <th 
                                key={f} 
                                onClick={() => hasSession && setSelectedSession(session)}
                                className={`p-2 w-12 border-b border-r border-gray-200 text-[10px] font-semibold text-gray-600 uppercase text-center transition-colors ${
                                    hasSession ? 'bg-blue-100/80 cursor-pointer hover:bg-blue-200 text-blue-800 border-blue-200' : 'bg-blue-50/50'
                                }`}
                                title={hasSession ? "Klik untuk lihat detail" : "Belum ada input"}
                           >
                              <div className="flex items-center justify-center gap-0.5">
                                {f === 'sum' ? 'S' : f.toUpperCase()}
                                {hasSession && <Info size={8} />}
                              </div>
                           </th>
                        );
                     })}
                     {/* Average Column */}
                     <th className="p-2 w-12 border-b border-r border-gray-300 bg-blue-100/50 text-[10px] font-bold text-blue-800 uppercase text-center">
                        R
                     </th>
                  </React.Fragment>
               ))}
               
               {/* KTS Header */}
               {(() => {
                   const session = getSessionForHeader('kts', null);
                   const hasSession = !!session;
                   return (
                       <th 
                            onClick={() => hasSession && setSelectedSession(session)}
                            className={`p-2 w-16 border-b border-r border-gray-200 text-[10px] font-semibold uppercase text-center transition-colors ${
                                hasSession ? 'bg-purple-100/80 cursor-pointer hover:bg-purple-200 text-purple-800' : 'bg-purple-50/50 text-gray-600'
                            }`}
                       >
                           <div className="flex items-center justify-center gap-0.5">
                                KTS
                                {hasSession && <Info size={8} />}
                           </div>
                       </th>
                   );
               })()}

               {/* SAS Header */}
               {(() => {
                   const session = getSessionForHeader('sas', null);
                   const hasSession = !!session;
                   return (
                       <th 
                            onClick={() => hasSession && setSelectedSession(session)}
                            className={`p-2 w-16 border-b border-r border-gray-200 text-[10px] font-semibold uppercase text-center transition-colors ${
                                hasSession ? 'bg-purple-100/80 cursor-pointer hover:bg-purple-200 text-purple-800' : 'bg-purple-50/50 text-gray-600'
                            }`}
                       >
                           <div className="flex items-center justify-center gap-0.5">
                                SAS
                                {hasSession && <Info size={8} />}
                           </div>
                       </th>
                   );
               })()}

               <th className="p-2 w-16 border-b border-gray-300 bg-purple-100/50 text-[10px] font-bold text-purple-800 uppercase text-center sticky right-0 z-30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">NA</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200 bg-white">
             {students.length === 0 ? (
                 <tr>
                     <td colSpan={100} className="text-center py-20 text-gray-400 italic">
                        <div className="flex flex-col items-center justify-center">
                            <Info size={32} className="mb-2 opacity-50" />
                            <span>Belum ada data siswa di kelas ini.</span>
                            <span className="text-xs mt-1">Silakan tambah siswa melalui menu Data Siswa (Admin).</span>
                        </div>
                     </td>
                 </tr>
             ) : (
                students.map((student, index) => {
                    const semesterData = student.grades[selectedSemester];
                    const finalGrade = calculateFinalGrade(semesterData, activeFieldsMap, visibleChapters);
                    
                    return (
                        <tr key={student.id} className="hover:bg-blue-50/20 transition-colors group">
                           {/* Static Info - Only Index is sticky now */}
                           <td className="p-3 text-center text-sm text-gray-500 font-medium sticky left-0 bg-white group-hover:bg-blue-50/20 border-r border-gray-200 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              {index + 1}
                           </td>
                           <td className="p-3 text-sm font-mono text-gray-600 border-r border-gray-200">
                              {student.nis}
                           </td>
                           <td className="p-3 text-sm font-bold text-gray-700 border-r border-gray-200 whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px]" title={student.name}>
                              {student.name}
                           </td>

                           {/* Dynamic Chapters */}
                           {chapters.map(chap => {
                               // Calculate Average based on ACTIVE fields (from props), not just standard fields
                               // This ensures average is correct even if we display empty columns
                               const activeFieldsForAvg = activeFieldsMap[chap.key] || [];
                               const chapterData = semesterData[chap.key];
                               const avg = calculateChapterAverage(chapterData, activeFieldsForAvg); 

                               return (
                                   <React.Fragment key={chap.key}>
                                       {standardFields.map(f => {
                                           const isActive = isCellActive(chap.key, f);
                                           const val = chapterData[f];
                                           return (
                                               <td key={f} className={`p-1 border-r border-gray-100 text-center ${!isActive ? 'bg-gray-50/30' : ''}`}>
                                                   {isActive ? (
                                                       <input 
                                                          type="number" 
                                                          value={val ?? ''}
                                                          onChange={(e) => handleInputChange(e, student.id, chap.key, f)}
                                                          className={getScoreInputClass(val)}
                                                          placeholder="-"
                                                       />
                                                   ) : (
                                                       <span className="text-sm text-gray-300 block py-1.5 select-none">{val ?? '-'}</span>
                                                   )}
                                               </td>
                                           );
                                       })}
                                       {/* Average Cell */}
                                       <td className="p-2 border-r border-gray-200 text-center bg-blue-50/10 font-bold text-blue-700 text-xs">
                                          {avg !== null ? avg : '-'}
                                       </td>
                                   </React.Fragment>
                               );
                           })}
                           
                           {/* Evaluation Columns */}
                           <td className={`p-1 border-r border-gray-100 text-center ${!isCellActive('kts', null) ? 'bg-gray-50/30' : ''}`}>
                                {isCellActive('kts', null) ? (
                                    <input 
                                        type="number" 
                                        value={semesterData.kts ?? ''}
                                        onChange={(e) => handleInputChange(e, student.id, 'kts', null)}
                                        className={getScoreInputClass(semesterData.kts)}
                                        placeholder="-"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-300 block py-1.5 select-none">{semesterData.kts ?? '-'}</span>
                                )}
                           </td>
                           <td className={`p-1 border-r border-gray-100 text-center ${!isCellActive('sas', null) ? 'bg-gray-50/30' : ''}`}>
                                {isCellActive('sas', null) ? (
                                    <input 
                                        type="number" 
                                        value={semesterData.sas ?? ''}
                                        onChange={(e) => handleInputChange(e, student.id, 'sas', null)}
                                        className={getScoreInputClass(semesterData.sas)}
                                        placeholder="-"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-300 block py-1.5 select-none">{semesterData.sas ?? '-'}</span>
                                )}
                           </td>
                           <td className="p-2 border-l border-gray-200 text-center font-bold text-purple-700 text-sm bg-purple-50/20 sticky right-0 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] bg-white group-hover:bg-purple-50/20">
                                {finalGrade !== null ? finalGrade : '-'}
                           </td>
                        </tr>
                    );
                })
             )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GradeTable;

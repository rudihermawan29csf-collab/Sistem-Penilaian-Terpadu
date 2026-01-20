
import React, { useState } from 'react';
import { Student, ChapterKey, FormativeKey, SemesterKey, GradingSession, UpRange } from '../types';
import { calculateChapterAverage, calculateFinalGrade, formatNumber } from '../utils';
import { Info, X, Calendar, FileText, Tag, BookOpen, Star } from 'lucide-react';

interface GradeTableProps {
  students: Student[];
  selectedSemester: SemesterKey;
  activeFieldsMap: Record<ChapterKey, FormativeKey[]>;
  visibleChapters: Record<ChapterKey, boolean>;
  visibleFields?: Record<ChapterKey, Record<FormativeKey, boolean>>; // New Prop
  assessmentHistory: GradingSession[];
  academicYear: string;
  onUpdateScore: (id: number, chapter: ChapterKey | 'kts' | 'sas' | 'up', field: FormativeKey | null, value: number | null) => void;
  isEditable: boolean;
  showUpColumn?: boolean; // If true, enables UP column AND triggers compact mode
  upRanges?: UpRange[]; // Added to support auto calculation based on settings
}

const GradeTable: React.FC<GradeTableProps> = ({
  students,
  selectedSemester,
  activeFieldsMap,
  visibleChapters,
  visibleFields,
  assessmentHistory,
  academicYear,
  onUpdateScore,
  isEditable,
  showUpColumn = false,
  upRanges = []
}) => {
  const [selectedSession, setSelectedSession] = useState<GradingSession | null>(null);

  const allChapters: { key: ChapterKey; label: string }[] = [
    { key: 'bab1', label: 'TP 1' },
    { key: 'bab2', label: 'TP 2' },
    { key: 'bab3', label: 'TP 3' },
    { key: 'bab4', label: 'TP 4' },
    { key: 'bab5', label: 'TP 5' },
  ];

  const chapters = allChapters.filter(c => visibleChapters[c.key]);
  const standardFields: FormativeKey[] = ['f1', 'f2', 'f3', 'f4', 'f5', 'sum'];

  const isCellActive = (chapter: ChapterKey | 'kts' | 'sas' | 'up', field: FormativeKey | null) => {
    if (!isEditable) return false;
    // Nilai UP is always active if the column is shown
    if (chapter === 'up') return true; 

    return assessmentHistory.some(h => {
        if (h.type === 'bab') return h.chapterKey === chapter && h.formativeKey === field;
        if (h.type === 'kts') return chapter === 'kts';
        if (h.type === 'sas') return chapter === 'sas';
        return false;
    });
  };

  const getSessionForHeader = (chapter: ChapterKey | 'kts' | 'sas', field: FormativeKey | null) => {
      return assessmentHistory.find(h => {
        if (h.type === 'bab') return h.chapterKey === chapter && h.formativeKey === field;
        if (h.type === 'kts') return chapter === 'kts';
        if (h.type === 'sas') return chapter === 'sas';
        return false;
      });
  };

  const getScoreInputClass = (val: number | null) => {
    const baseClass = "w-full text-center py-1.5 text-sm font-medium focus:outline-none rounded transition-all placeholder-gray-300";
    if (val === null) return `${baseClass} bg-white text-gray-800 focus:bg-blue-50`;
    if (val >= 85) return `${baseClass} bg-green-100 text-green-800 focus:bg-green-200 font-semibold`;
    if (val >= 70) return `${baseClass} bg-yellow-100 text-yellow-800 focus:bg-yellow-200 font-semibold`;
    return `${baseClass} bg-red-100 text-red-800 focus:bg-red-200 font-semibold`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement>, 
    studentId: number, 
    chapter: ChapterKey | 'kts' | 'sas' | 'up', 
    field: FormativeKey | null
  ) => {
    const val = e.target.value;
    const numVal = val === '' ? null : parseFloat(val);
    if (numVal !== null && (numVal < 0 || numVal > 100)) return;
    onUpdateScore(studentId, chapter, field, numVal);
  };

  // Determine active fields for a chapter (merged logic from history + config)
  const getFieldsForChapter = (chapKey: ChapterKey) => {
      if (showUpColumn) return standardFields; // In UP mode, maybe standard, but layout is compact anyway

      // If configuration exists, respect it strictly
      if (visibleFields && visibleFields[chapKey]) {
          return standardFields.filter(f => visibleFields[chapKey][f]);
      }
      
      // Fallback: If no config, maybe use all standard fields?
      // Or fallback to activeFieldsMap if you want to only show what has data?
      // For now, let's show all standard fields if no config is present to allow input.
      return standardFields;
  };

  return (
    <div className="bg-white flex flex-col relative">
      {/* Detail Popover */}
      {selectedSession && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-sm" onClick={() => setSelectedSession(null)}>
            <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full animate-scale-in border border-gray-100" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Info size={20} className="text-blue-600" /> Detail Penilaian
                    </h3>
                    <button onClick={() => setSelectedSession(null)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
                </div>
                <div className="space-y-3 text-sm">
                    <p><strong>Target:</strong> {selectedSession.type === 'bab' ? `${selectedSession.chapterKey?.replace('bab', 'TP ')} - ${selectedSession.formativeKey?.toUpperCase()}` : selectedSession.type.toUpperCase()}</p>
                    <p><strong>Tanggal:</strong> {selectedSession.date}</p>
                    <p><strong>Ket:</strong> {selectedSession.description}</p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <button onClick={() => setSelectedSession(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg">Tutup</button>
                </div>
            </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto custom-scrollbar relative">
        <table className="border-collapse w-full min-w-max">
          <thead className="sticky top-0 z-20 bg-[#f9f9fb] shadow-sm">
            <tr>
              <th rowSpan={2} className="p-3 w-12 border-b border-r border-gray-300 bg-[#f9f9fb] text-xs font-bold text-gray-500 uppercase sticky left-0 z-30">No</th>
              <th rowSpan={2} className="p-3 w-32 border-b border-r border-gray-300 bg-[#f9f9fb] text-xs font-bold text-gray-500 uppercase">NIS</th>
              <th rowSpan={2} className="p-3 min-w-[200px] border-b border-r border-gray-300 bg-[#f9f9fb] text-xs font-bold text-gray-500 uppercase text-left">Nama Siswa</th>
              
              {chapters.map(chap => {
                  const fieldsToShow = getFieldsForChapter(chap.key);
                  // Colspan is fields length + 1 (for Rerata)
                  const colSpan = showUpColumn ? 1 : (fieldsToShow.length + 1);
                  return (
                    <th key={chap.key} colSpan={colSpan} className="p-2 border-b border-r border-gray-300 bg-blue-50 text-xs font-bold text-blue-700 uppercase text-center">{chap.label}</th>
                  );
              })}
              
              <th colSpan={3} className="p-2 border-b border-gray-300 bg-purple-50 text-xs font-bold text-purple-700 uppercase text-center">Evaluasi Akhir</th>
              
              {/* UP Column Header Group */}
              {showUpColumn && (
                  <th rowSpan={2} className="p-2 border-b border-gray-300 bg-orange-50 text-xs font-bold text-orange-700 uppercase text-center w-24 sticky right-0 z-30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                      <div className="flex flex-col items-center gap-1">
                          <Star size={14} />
                          Nilai UP
                      </div>
                  </th>
              )}
            </tr>
            
            <tr>
               {chapters.map(chap => {
                  const fieldsToShow = getFieldsForChapter(chap.key);
                  return (
                  <React.Fragment key={chap.key}>
                     {!showUpColumn && fieldsToShow.map(f => {
                        const session = getSessionForHeader(chap.key, f);
                        return (
                           <th key={f} onClick={() => session && setSelectedSession(session)} className={`p-2 w-12 border-b border-r border-gray-200 text-[10px] font-semibold text-gray-600 uppercase text-center ${session ? 'bg-blue-100/80 cursor-pointer text-blue-800' : 'bg-blue-50/50'}`}>
                              {f === 'sum' ? 'S' : f.toUpperCase()}
                           </th>
                        );
                     })}
                     <th className="p-2 w-12 border-b border-r border-gray-300 bg-blue-100/50 text-[10px] font-bold text-blue-800 uppercase text-center">R</th>
                  </React.Fragment>
               )})}
               
               {/* KTS & SAS Headers */}
               <th className={`p-2 w-16 border-b border-r border-gray-200 text-[10px] font-semibold uppercase text-center ${getSessionForHeader('kts', null) ? 'bg-purple-100/80 text-purple-800' : 'bg-purple-50/50 text-gray-600'}`}>KTS</th>
               <th className={`p-2 w-16 border-b border-r border-gray-200 text-[10px] font-semibold uppercase text-center ${getSessionForHeader('sas', null) ? 'bg-purple-100/80 text-purple-800' : 'bg-purple-50/50 text-gray-600'}`}>SAS</th>
               <th className={`p-2 w-16 border-b border-gray-300 bg-purple-100/50 text-[10px] font-bold text-purple-800 uppercase text-center ${!showUpColumn ? 'sticky right-0 z-30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]' : ''}`}>NA</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200 bg-white">
             {students.map((student, index) => {
                const semesterData = student.grades[selectedSemester];
                const finalGrade = calculateFinalGrade(semesterData, activeFieldsMap, visibleChapters);
                
                // Automatic UP Calculation for Display
                let displayUp: number | null = semesterData.nilaiUp;
                
                if (showUpColumn && displayUp === null && finalGrade !== null && upRanges.length > 0) {
                    const range = upRanges.find(r => finalGrade >= r.min && finalGrade <= r.max);
                    if (range) {
                        displayUp = range.value;
                    }
                }

                return (
                    <tr key={student.id} className="hover:bg-blue-50/20 transition-colors group">
                       <td className="p-3 text-center text-sm text-gray-500 font-medium sticky left-0 bg-white group-hover:bg-blue-50/20 border-r border-gray-200 z-10">{index + 1}</td>
                       <td className="p-3 text-sm font-mono text-gray-600 border-r border-gray-200">{student.nis}</td>
                       <td className="p-3 text-sm font-bold text-gray-700 border-r border-gray-200 whitespace-nowrap">{student.name}</td>

                       {chapters.map(chap => {
                           const fieldsToShow = getFieldsForChapter(chap.key);
                           return (
                           <React.Fragment key={chap.key}>
                               {!showUpColumn && fieldsToShow.map(f => (
                                   <td key={f} className={`p-1 border-r border-gray-100 text-center ${!isCellActive(chap.key, f) ? 'bg-gray-50/30' : ''}`}>
                                       {isCellActive(chap.key, f) ? (
                                           <input type="number" value={semesterData[chap.key][f] ?? ''} onChange={(e) => handleInputChange(e, student.id, chap.key, f)} className={getScoreInputClass(semesterData[chap.key][f])} placeholder="-" />
                                       ) : <span className="text-sm text-gray-300 py-1.5 block">{semesterData[chap.key][f] ?? '-'}</span>}
                                   </td>
                               ))}
                               <td className="p-2 border-r border-gray-200 text-center bg-blue-50/10 font-bold text-blue-700 text-xs">
                                  {calculateChapterAverage(semesterData[chap.key], activeFieldsMap[chap.key] || []) ?? '-'}
                               </td>
                           </React.Fragment>
                       )})}
                       
                       {/* KTS & SAS */}
                       <td className={`p-1 border-r border-gray-100 text-center ${!isCellActive('kts', null) && !showUpColumn ? 'bg-gray-50/30' : ''}`}>
                            {isCellActive('kts', null) && !showUpColumn ? <input type="number" value={semesterData.kts ?? ''} onChange={(e) => handleInputChange(e, student.id, 'kts', null)} className={getScoreInputClass(semesterData.kts)} placeholder="-" /> : <span className="text-sm text-gray-600 font-semibold">{semesterData.kts ?? '-'}</span>}
                       </td>
                       <td className={`p-1 border-r border-gray-100 text-center ${!isCellActive('sas', null) && !showUpColumn ? 'bg-gray-50/30' : ''}`}>
                            {isCellActive('sas', null) && !showUpColumn ? <input type="number" value={semesterData.sas ?? ''} onChange={(e) => handleInputChange(e, student.id, 'sas', null)} className={getScoreInputClass(semesterData.sas)} placeholder="-" /> : <span className="text-sm text-gray-600 font-semibold">{semesterData.sas ?? '-'}</span>}
                       </td>
                       
                       {/* NA */}
                       <td className={`p-2 border-l border-gray-200 text-center font-bold text-purple-700 text-sm bg-purple-50/20 ${!showUpColumn ? 'sticky right-0 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] bg-white' : ''}`}>
                            {finalGrade ?? '-'}
                       </td>

                       {/* UP Column (Editable Always if shown) */}
                       {showUpColumn && (
                           <td className="p-1 border-l border-gray-300 text-center bg-orange-50/30 sticky right-0 z-10 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)] bg-white group-hover:bg-orange-50/30">
                                <input 
                                    type="number" 
                                    value={displayUp ?? ''} 
                                    onChange={(e) => handleInputChange(e, student.id, 'up', null)}
                                    className={`w-full text-center py-1.5 text-sm font-bold focus:outline-none rounded transition-all placeholder-gray-300 ${
                                        displayUp !== null ? 'bg-orange-100 text-orange-800' : 'bg-transparent text-gray-800'
                                    }`}
                                    placeholder="-" 
                                    disabled={!isEditable}
                                />
                           </td>
                       )}
                    </tr>
                );
             })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GradeTable;

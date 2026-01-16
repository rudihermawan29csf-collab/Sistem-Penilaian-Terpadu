
import React, { useMemo } from 'react';
import { Student, ChapterKey, FormativeKey, SemesterKey, GradingSession } from '../types';
import { calculateChapterAverage, calculateFinalGrade, formatNumber } from '../utils';
import { Info, AlertCircle } from 'lucide-react';

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
  
  const allChapters: { key: ChapterKey; label: string }[] = [
    { key: 'bab1', label: selectedSemester === 'genap' ? 'Bab 6' : 'Bab 1' },
    { key: 'bab2', label: selectedSemester === 'genap' ? 'Bab 7' : 'Bab 2' },
    { key: 'bab3', label: selectedSemester === 'genap' ? 'Bab 8' : 'Bab 3' },
    { key: 'bab4', label: selectedSemester === 'genap' ? 'Bab 9' : 'Bab 4' },
    { key: 'bab5', label: selectedSemester === 'genap' ? 'Bab 10' : 'Bab 5' },
  ];

  // Filter visible chapters
  const chapters = allChapters.filter(c => visibleChapters[c.key]);

  // Determine display fields: 
  // Modified Logic: If activeFieldsMap returns empty for a chapter (no grades yet), 
  // force display of ALL fields (F1-F5, Sum) so headers appear correctly.
  const displayFieldsMap = useMemo(() => {
    // Default full structure
    const fullStructure: FormativeKey[] = ['f1', 'f2', 'f3', 'f4', 'f5', 'sum'];
    const defaults: Record<ChapterKey, FormativeKey[]> = {
      bab1: fullStructure,
      bab2: fullStructure,
      bab3: fullStructure,
      bab4: fullStructure,
      bab5: fullStructure,
    };

    if (students.length === 0) {
      return defaults;
    }

    // Clone activeFieldsMap to avoid mutation
    const processedMap: Record<ChapterKey, FormativeKey[]> = { ...activeFieldsMap };

    // Check each chapter. If empty, fallback to full structure.
    (Object.keys(processedMap) as ChapterKey[]).forEach(key => {
        if (!processedMap[key] || processedMap[key].length === 0) {
            processedMap[key] = fullStructure;
        }
    });

    return processedMap;
  }, [students.length, activeFieldsMap]);

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
    <div className="flex-1 bg-white h-full flex flex-col overflow-hidden">
      {/* Table Container - Added overflow-x-auto and min-w-max logic to table */}
      <div className="flex-1 overflow-x-auto custom-scrollbar relative">
        <table className="border-collapse w-full min-w-max">
          <thead className="sticky top-0 z-20 bg-[#f9f9fb] shadow-sm">
            {/* Header Row 1: Groupings */}
            <tr>
              <th rowSpan={2} className="p-3 w-12 border-b border-r border-gray-300 bg-[#f9f9fb] text-xs font-bold text-gray-500 uppercase sticky left-0 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                No
              </th>
              <th rowSpan={2} className="p-3 w-32 border-b border-r border-gray-300 bg-[#f9f9fb] text-xs font-bold text-gray-500 uppercase sticky left-12 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                NIS
              </th>
              <th rowSpan={2} className="p-3 min-w-[200px] border-b border-r border-gray-300 bg-[#f9f9fb] text-xs font-bold text-gray-500 uppercase sticky left-44 z-30 text-left shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">
                Nama Siswa
              </th>
              
              {chapters.map(chap => {
                 const fields = displayFieldsMap[chap.key] || [];
                 const colSpan = Math.max(1, fields.length + 1); // +1 for Average
                 
                 return (
                    <th key={chap.key} colSpan={colSpan} className="p-2 border-b border-r border-gray-300 bg-blue-50 text-xs font-bold text-blue-700 uppercase text-center">
                       {chap.label}
                    </th>
                 );
              })}
              
              <th colSpan={3} className="p-2 border-b border-gray-300 bg-purple-50 text-xs font-bold text-purple-700 uppercase text-center">
                 Evaluasi Akhir
              </th>
            </tr>
            
            {/* Header Row 2: Columns (F1..F5, Sum, Avg, KTS, SAS, NA) */}
            <tr>
               {chapters.map(chap => {
                  const fields = displayFieldsMap[chap.key] || [];
                  return (
                     <React.Fragment key={chap.key}>
                        {fields.map(f => (
                           <th key={f} className="p-2 w-12 border-b border-r border-gray-200 bg-blue-50/50 text-[10px] font-semibold text-gray-600 uppercase text-center">
                              {f === 'sum' ? 'S' : f.toUpperCase()}
                           </th>
                        ))}
                        {/* Average Column */}
                        <th className="p-2 w-12 border-b border-r border-gray-300 bg-blue-100/50 text-[10px] font-bold text-blue-800 uppercase text-center">
                           R
                        </th>
                     </React.Fragment>
                  )
               })}
               <th className="p-2 w-16 border-b border-r border-gray-200 bg-purple-50/50 text-[10px] font-semibold text-gray-600 uppercase text-center">KTS</th>
               <th className="p-2 w-16 border-b border-r border-gray-200 bg-purple-50/50 text-[10px] font-semibold text-gray-600 uppercase text-center">SAS</th>
               <th className="p-2 w-16 border-b border-gray-300 bg-purple-100/50 text-[10px] font-bold text-purple-800 uppercase text-center sticky right-0 z-30 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">NA</th>
            </tr>
          </thead>
          
          <tbody className="divide-y divide-gray-200 bg-white">
             {students.length === 0 ? (
                 <tr>
                     {/* ColSpan needs to be large enough to span all generated columns */}
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
                           {/* Static Info */}
                           <td className="p-3 text-center text-sm text-gray-500 font-medium sticky left-0 bg-white group-hover:bg-blue-50/20 border-r border-gray-200 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              {index + 1}
                           </td>
                           <td className="p-3 text-sm font-mono text-gray-600 sticky left-12 bg-white group-hover:bg-blue-50/20 border-r border-gray-200 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                              {student.nis}
                           </td>
                           <td className="p-3 text-sm font-bold text-gray-700 sticky left-44 bg-white group-hover:bg-blue-50/20 border-r border-gray-200 z-10 whitespace-nowrap overflow-hidden text-ellipsis max-w-[250px] shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]" title={student.name}>
                              {student.name}
                           </td>

                           {/* Dynamic Chapters */}
                           {chapters.map(chap => {
                               const fields = displayFieldsMap[chap.key] || [];
                               const chapterData = semesterData[chap.key];
                               const avg = calculateChapterAverage(chapterData, fields); // Calc avg based on what's active

                               return (
                                   <React.Fragment key={chap.key}>
                                       {fields.map(f => {
                                           const isActive = isCellActive(chap.key, f);
                                           const val = chapterData[f];
                                           return (
                                               <td key={f} className={`p-1 border-r border-gray-100 text-center ${!isActive ? 'bg-gray-50/30' : ''}`}>
                                                   {isActive ? (
                                                       <input 
                                                          type="number" 
                                                          value={val ?? ''}
                                                          onChange={(e) => handleInputChange(e, student.id, chap.key, f)}
                                                          className="w-full text-center py-1.5 text-sm font-medium focus:bg-blue-50 focus:outline-none rounded transition-all placeholder-gray-200 text-gray-800"
                                                          placeholder="-"
                                                       />
                                                   ) : (
                                                       <span className="text-sm text-gray-400 block py-1.5">{val ?? '-'}</span>
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
                                        className="w-full text-center py-1.5 text-sm font-medium focus:bg-purple-50 focus:outline-none rounded transition-all placeholder-gray-200 text-gray-800"
                                        placeholder="-"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-400 block py-1.5">{semesterData.kts ?? '-'}</span>
                                )}
                           </td>
                           <td className={`p-1 border-r border-gray-100 text-center ${!isCellActive('sas', null) ? 'bg-gray-50/30' : ''}`}>
                                {isCellActive('sas', null) ? (
                                    <input 
                                        type="number" 
                                        value={semesterData.sas ?? ''}
                                        onChange={(e) => handleInputChange(e, student.id, 'sas', null)}
                                        className="w-full text-center py-1.5 text-sm font-medium focus:bg-purple-50 focus:outline-none rounded transition-all placeholder-gray-200 text-gray-800"
                                        placeholder="-"
                                    />
                                ) : (
                                    <span className="text-sm text-gray-400 block py-1.5">{semesterData.sas ?? '-'}</span>
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

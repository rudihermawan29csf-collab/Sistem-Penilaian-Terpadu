
import React, { useState, useCallback } from 'react';
import { Student, ChapterKey, FormativeKey, SemesterKey, GradingSession, UpRange, SemesterData } from '../types';
import { calculateChapterAverage, calculateFinalGrade } from '../utils';
import { Info, X } from 'lucide-react';

interface GradeTableProps {
  students: Student[];
  selectedSemester: SemesterKey;
  subjectName: string;
  activeFieldsMap: Record<ChapterKey, FormativeKey[]>;
  visibleChapters: Record<ChapterKey, boolean>;
  visibleFields?: Record<ChapterKey, Record<FormativeKey, boolean>>;
  assessmentHistory: GradingSession[];
  academicYear: string;
  onUpdateScore: (id: number, chapter: ChapterKey | 'kts' | 'sas' | 'up', field: FormativeKey | null, value: number | null) => void;
  isEditable: boolean;
  showUpColumn?: boolean;
  upRanges?: UpRange[];
}

// Helper: Get correct grades based on subject
const getStudentGrades = (student: Student, subjectName: string, selectedSemester: SemesterKey): SemesterData => {
    if (subjectName === 'Pendidikan Agama Islam') {
        return student.grades[selectedSemester];
    } else {
        return student.gradesBySubject?.[subjectName]?.[selectedSemester] || {
            bab1: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null },
            bab2: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null },
            bab3: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null },
            bab4: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null },
            bab5: { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null },
            kts: null, sas: null, nilaiUp: null
        };
    }
};

const getFieldsForChapter = (chapKey: ChapterKey, visibleFields?: Record<ChapterKey, Record<FormativeKey, boolean>>, showUpColumn?: boolean) => {
    const standardFields: FormativeKey[] = ['f1', 'f2', 'f3', 'f4', 'f5', 'sum'];
    if (showUpColumn) return standardFields;
    if (visibleFields && visibleFields[chapKey]) {
        return standardFields.filter(f => visibleFields[chapKey][f]);
    }
    return standardFields;
};

// --- MEMOIZED ROW COMPONENT ---
const GradeTableRow = React.memo(({ 
    student, 
    index, 
    chapters, 
    showUpColumn, 
    subjectName, 
    selectedSemester, 
    activeFieldsMap, 
    visibleChapters, 
    visibleFields, 
    upRanges, 
    isEditable, 
    onUpdateScore,
    isCellActive,
    getScoreInputClass 
}: any) => {
    
    const semesterData = getStudentGrades(student, subjectName, selectedSemester);
    const finalGrade = calculateFinalGrade(semesterData, activeFieldsMap, visibleChapters);
    
    let displayUp: number | null = semesterData.nilaiUp;
    if (showUpColumn && displayUp === null && finalGrade !== null && upRanges.length > 0) {
        const range = upRanges.find((r: UpRange) => finalGrade >= r.min && finalGrade <= r.max);
        if (range) {
            displayUp = range.value;
        }
    }

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, chapter: any, field: any) => {
        const val = e.target.value;
        const numVal = val === '' ? null : parseFloat(val);
        if (numVal !== null && (numVal < 0 || numVal > 100)) return;
        onUpdateScore(student.id, chapter, field, numVal);
    };

    return (
        <tr className="group hover:bg-blue-50/30 transition-colors border-b border-gray-50">
            <td className="p-2 text-center text-xs text-gray-400 font-medium sticky left-0 bg-white group-hover:bg-blue-50/30 border-r border-gray-100 z-10">{index + 1}</td>
            <td className="p-2 text-xs font-mono text-gray-500 border-r border-gray-100 pl-4 sticky left-10 bg-white group-hover:bg-blue-50/30 z-10">{student.nis}</td>
            <td className="p-2 text-sm font-semibold text-gray-700 border-r border-gray-100 whitespace-nowrap pl-4 sticky left-[112px] bg-white group-hover:bg-blue-50/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{student.name}</td>

            {chapters.map((chap: any) => {
                const fieldsToShow = getFieldsForChapter(chap.key, visibleFields, showUpColumn);
                return (
                <React.Fragment key={chap.key}>
                    {!showUpColumn && fieldsToShow.map((f: any) => {
                        const unlocked = isCellActive(chap.key, f);
                        return (
                        <td key={f} className={`p-1 border-r border-gray-50 text-center ${unlocked ? 'bg-blue-50/30' : ''}`}>
                            {unlocked ? (
                                <input type="number" value={semesterData[chap.key][f] ?? ''} onChange={(e) => handleInputChange(e, chap.key, f)} className={getScoreInputClass(semesterData[chap.key][f], true)} placeholder="-" />
                            ) : <span className="text-xs text-gray-300 block py-1.5">{semesterData[chap.key][f] ?? '-'}</span>}
                        </td>
                    )})}
                    <td className="p-1 border-r border-gray-100 text-center bg-gray-50/30">
                        <span className={`text-xs font-bold ${
                            (() => {
                                const avg = calculateChapterAverage(semesterData[chap.key], activeFieldsMap[chap.key] || []);
                                if (avg === null) return 'text-gray-300';
                                if (avg < 75) return 'text-red-500';
                                return 'text-gray-600';
                            })()
                        }`}>
                            {calculateChapterAverage(semesterData[chap.key], activeFieldsMap[chap.key] || []) ?? '-'}
                        </span>
                    </td>
                </React.Fragment>
            )})}
            
            <td className={`p-1 border-r border-gray-50 text-center ${isCellActive('kts', null) && !showUpColumn ? 'bg-blue-50/30' : ''}`}>
                {isCellActive('kts', null) && !showUpColumn ? <input type="number" value={semesterData.kts ?? ''} onChange={(e) => handleInputChange(e, 'kts', null)} className={getScoreInputClass(semesterData.kts, true)} placeholder="-" /> : <span className="text-xs text-gray-500 font-medium">{semesterData.kts ?? '-'}</span>}
            </td>
            <td className={`p-1 border-r border-gray-100 text-center ${isCellActive('sas', null) && !showUpColumn ? 'bg-blue-50/30' : ''}`}>
                {isCellActive('sas', null) && !showUpColumn ? <input type="number" value={semesterData.sas ?? ''} onChange={(e) => handleInputChange(e, 'sas', null)} className={getScoreInputClass(semesterData.sas, true)} placeholder="-" /> : <span className="text-xs text-gray-500 font-medium">{semesterData.sas ?? '-'}</span>}
            </td>
            
            <td className={`p-2 border-l border-gray-200 text-center font-bold text-sm ${!showUpColumn ? 'sticky right-0 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)] bg-slate-50 group-hover:bg-blue-100/50' : 'bg-blue-50/50'} ${finalGrade && finalGrade < 75 ? 'text-red-600' : 'text-slate-900'}`}>
                {finalGrade ?? '-'}
            </td>

            {showUpColumn && (
                <td className="p-1 border-l border-gray-200 text-center sticky right-0 z-10 bg-white group-hover:bg-blue-50/30 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <input 
                        type="number" 
                        value={displayUp ?? ''} 
                        onChange={(e) => handleInputChange(e, 'up', null)}
                        className={`w-full text-center py-1.5 text-sm font-bold focus:outline-none rounded-md transition-all ${
                            displayUp !== null ? 'text-orange-700 bg-orange-50/50' : 'bg-transparent text-gray-800'
                        }`}
                        placeholder="-" 
                        disabled={!isEditable}
                    />
                </td>
            )}
        </tr>
    );
});

const GradeTable: React.FC<GradeTableProps> = ({
  students,
  selectedSemester,
  subjectName,
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

  const isCellActive = useCallback((chapter: ChapterKey | 'kts' | 'sas' | 'up', field: FormativeKey | null) => {
    if (!isEditable) return false;
    if (chapter === 'up') return true; 

    return assessmentHistory.some(h => {
        const historySubject = h.targetSubject || 'Pendidikan Agama Islam';
        if (historySubject !== subjectName) return false;

        if (h.type === 'bab') return h.chapterKey === chapter && h.formativeKey === field;
        if (h.type === 'kts') return chapter === 'kts';
        if (h.type === 'sas') return chapter === 'sas';
        return false;
    });
  }, [isEditable, assessmentHistory, subjectName]);

  const getSessionForHeader = (chapter: ChapterKey | 'kts' | 'sas', field: FormativeKey | null) => {
      return assessmentHistory.find(h => {
        const historySubject = h.targetSubject || 'Pendidikan Agama Islam';
        if (historySubject !== subjectName) return undefined;

        if (h.type === 'bab') return h.chapterKey === chapter && h.formativeKey === field;
        if (h.type === 'kts') return chapter === 'kts';
        if (h.type === 'sas') return chapter === 'sas';
        return false;
      });
  };

  const getScoreInputClass = useCallback((val: number | null, isActive: boolean) => {
    const bgBase = isActive ? "bg-blue-50/50 hover:bg-blue-50" : "bg-transparent";
    const baseClass = `w-full text-center py-1.5 text-sm font-medium focus:outline-none rounded-md transition-all placeholder-gray-200 ${bgBase}`;
    
    if (val === null) return `${baseClass} focus:bg-white focus:ring-2 focus:ring-blue-500/50`;
    if (val >= 85) return `${baseClass} text-green-700 font-bold bg-green-50/50 focus:ring-2 focus:ring-green-500/50`;
    if (val >= 70) return `${baseClass} text-gray-900 font-bold focus:ring-2 focus:ring-blue-500/50`;
    return `${baseClass} text-red-600 font-bold bg-red-50/50 focus:ring-2 focus:ring-red-500/50`;
  }, []);

  const getHeaderStyle = (type: 'TP' | 'EVAL' | 'UP' | 'NA', index: number = 0) => {
      if (showUpColumn && type !== 'UP') return "bg-orange-600 border-orange-500"; 
      if (type === 'UP') return "bg-orange-700 border-orange-600";
      if (type === 'EVAL') return "bg-slate-700 border-slate-600"; 
      if (type === 'NA') return "bg-slate-800 border-slate-700";
      
      return index % 2 === 0 
        ? "bg-blue-600 border-blue-500" 
        : "bg-teal-600 border-teal-500";
  };

  const getSubHeaderStyle = (type: 'TP' | 'EVAL', isActive: boolean, index: number = 0) => {
      if (type === 'EVAL') {
          return isActive 
            ? "bg-slate-800 text-white hover:bg-slate-900 border-slate-600" 
            : "bg-slate-700 text-slate-100 border-slate-600";
      }
      
      const isEven = index % 2 === 0;
      if (isEven) { 
          return isActive 
            ? "bg-blue-800 text-white hover:bg-blue-900 border-blue-500" 
            : "bg-blue-600 text-blue-100 border-blue-500";
      } else { 
          return isActive 
            ? "bg-teal-800 text-white hover:bg-teal-900 border-teal-500" 
            : "bg-teal-600 text-teal-100 border-teal-500";
      }
  };

  return (
    <div className="flex flex-col relative h-full">
      {selectedSession && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/10 backdrop-blur-sm" onClick={() => setSelectedSession(null)}>
            <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-2xl p-6 max-w-sm w-full animate-scale-in border border-white/20 ring-1 ring-black/5" onClick={e => e.stopPropagation()}>
                <div className="flex justify-between items-start mb-4">
                    <h3 className="font-bold text-lg text-gray-800 flex items-center gap-2">
                        <Info size={20} className="text-blue-500" /> Detail Penilaian
                    </h3>
                    <button onClick={() => setSelectedSession(null)} className="text-gray-400 hover:text-gray-600 transition-colors"><X size={20} /></button>
                </div>
                <div className="space-y-3 text-sm text-gray-600">
                    <p><strong>Mapel:</strong> {subjectName}</p>
                    <p><strong>Target:</strong> {selectedSession.type === 'bab' ? `${selectedSession.chapterKey?.replace('bab', 'TP ')} - ${selectedSession.formativeKey?.toUpperCase()}` : selectedSession.type.toUpperCase()}</p>
                    <p><strong>Tanggal:</strong> {selectedSession.date}</p>
                    <p className="bg-gray-50 p-2 rounded-lg border border-gray-100 italic">"{selectedSession.description}"</p>
                </div>
                <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                    <button onClick={() => setSelectedSession(null)} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-medium rounded-lg transition-colors">Tutup</button>
                </div>
            </div>
        </div>
      )}

      <div className="overflow-auto custom-scrollbar relative h-full">
        <table className="border-collapse w-full min-w-max">
          <thead className="sticky top-0 z-20 shadow-sm">
            <tr>
              <th rowSpan={2} className={`p-3 w-12 border-b border-r text-[10px] font-bold text-white uppercase sticky left-0 z-30 ${showUpColumn ? 'bg-orange-600' : 'bg-blue-600'}`}>No</th>
              <th rowSpan={2} className={`p-3 w-28 border-b border-r text-[10px] font-bold text-white uppercase text-left pl-4 ${showUpColumn ? 'bg-orange-600' : 'bg-blue-600'}`}>NIS</th>
              <th rowSpan={2} className={`p-3 min-w-[250px] border-b border-r text-[10px] font-bold text-white uppercase text-left pl-4 sticky left-[112px] z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] ${showUpColumn ? 'bg-orange-600' : 'bg-blue-600'}`}>Nama Siswa</th>
              
              {chapters.map((chap, index) => {
                  const fieldsToShow = getFieldsForChapter(chap.key, visibleFields, showUpColumn);
                  const colSpan = showUpColumn ? 1 : (fieldsToShow.length + 1);
                  return (
                    <th key={chap.key} colSpan={colSpan} className={`p-2 border-b border-r text-[10px] font-bold text-white uppercase text-center tracking-wider ${getHeaderStyle('TP', index)}`}>{chap.label}</th>
                  );
              })}
              
              <th colSpan={3} className={`p-2 border-b text-[10px] font-bold text-white uppercase text-center tracking-wider ${getHeaderStyle('EVAL')}`}>Evaluasi Akhir</th>
              
              {showUpColumn && (
                  <th rowSpan={2} className={`p-2 border-b text-[10px] font-bold text-white uppercase text-center w-24 sticky right-0 z-30 ${getHeaderStyle('UP')}`}>
                      Nilai UP
                  </th>
              )}
            </tr>
            
            <tr>
               {chapters.map((chap, index) => {
                  const fieldsToShow = getFieldsForChapter(chap.key, visibleFields, showUpColumn);
                  const tpHeaderStyle = getHeaderStyle('TP', index);
                  
                  return (
                  <React.Fragment key={chap.key}>
                     {!showUpColumn && fieldsToShow.map(f => {
                        const session = getSessionForHeader(chap.key, f);
                        return (
                           <th key={f} onClick={() => session && setSelectedSession(session)} className={`p-2 w-12 border-b border-r text-[9px] font-bold uppercase text-center transition-colors ${getSubHeaderStyle('TP', !!session, index)} ${session ? 'cursor-pointer' : ''}`}>
                              {f === 'sum' ? 'S' : f.toUpperCase()}
                           </th>
                        );
                     })}
                     <th className={`p-2 w-12 border-b border-r text-[9px] font-bold text-white uppercase text-center ${tpHeaderStyle} brightness-90`}>R</th>
                  </React.Fragment>
               )})}
               
               <th className={`p-2 w-16 border-b border-r text-[9px] font-bold uppercase text-center ${getSubHeaderStyle('EVAL', !!getSessionForHeader('kts', null))} ${getSessionForHeader('kts', null) ? 'cursor-pointer' : ''}`} onClick={() => { const s = getSessionForHeader('kts', null); if(s) setSelectedSession(s); }}>KTS</th>
               <th className={`p-2 w-16 border-b border-r text-[9px] font-bold uppercase text-center ${getSubHeaderStyle('EVAL', !!getSessionForHeader('sas', null))} ${getSessionForHeader('sas', null) ? 'cursor-pointer' : ''}`} onClick={() => { const s = getSessionForHeader('sas', null); if(s) setSelectedSession(s); }}>SAS</th>
               <th className={`p-2 w-16 border-b text-[9px] font-bold text-white uppercase text-center ${getHeaderStyle('NA')} ${!showUpColumn ? 'sticky right-0 z-30 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]' : ''}`}>NA</th>
            </tr>
          </thead>
          
          <tbody className="bg-white">
             {students.map((student, index) => (
                 <GradeTableRow 
                    key={student.id}
                    student={student}
                    index={index}
                    chapters={chapters}
                    showUpColumn={showUpColumn}
                    subjectName={subjectName}
                    selectedSemester={selectedSemester}
                    activeFieldsMap={activeFieldsMap}
                    visibleChapters={visibleChapters}
                    visibleFields={visibleFields}
                    upRanges={upRanges}
                    isEditable={isEditable}
                    onUpdateScore={onUpdateScore}
                    isCellActive={isCellActive}
                    getScoreInputClass={getScoreInputClass}
                 />
             ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default GradeTable;

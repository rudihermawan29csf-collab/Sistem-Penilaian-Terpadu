
import React, { useState, useEffect } from 'react';
import { Student, ChapterKey, FormativeKey, SemesterKey, GradingSession } from '../types';
import { calculateChapterAverage, calculateFinalGrade, formatNumber } from '../utils';
import { Info, X, Calendar, BookOpen, AlertCircle, Clock } from 'lucide-react';

interface GradeTableProps {
  students: Student[];
  selectedSemester: SemesterKey;
  activeFieldsMap: Record<ChapterKey, FormativeKey[]>;
  visibleChapters: Record<ChapterKey, boolean>;
  assessmentHistory: GradingSession[];
  academicYear: string;
  onUpdateScore: (id: number, chapter: ChapterKey | 'kts' | 'sas', field: FormativeKey | null, value: number | null) => void;
  isEditable?: boolean; // Changed from isReadOnly to isEditable for clarity
}

const GradeTable: React.FC<GradeTableProps> = ({ 
  students, 
  selectedSemester, 
  activeFieldsMap, 
  visibleChapters,
  assessmentHistory,
  academicYear,
  onUpdateScore,
  isEditable = false
}) => {
  const [modalContent, setModalContent] = useState<GradingSession | null>(null);
  
  // Clock State
  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formattedDate = currentTime.toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const formattedTime = currentTime.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  // Helper to determine if a specific cell is editable based on HISTORY
  const getSessionForCell = (
    chapter: ChapterKey | 'kts' | 'sas',
    field: FormativeKey | null
  ): GradingSession | undefined => {
    return assessmentHistory.find(session => {
      if (session.semester !== selectedSemester) return false;
      if (session.type === 'bab') {
        return session.chapterKey === chapter && session.formativeKey === field;
      }
      if (session.type === 'kts') return chapter === 'kts';
      if (session.type === 'sas') return chapter === 'sas';
      return false;
    });
  };

  const handleHeaderClick = (chapter: ChapterKey | 'kts' | 'sas', field: FormativeKey | null) => {
    const session = getSessionForCell(chapter, field);
    if (session) {
      setModalContent(session);
    }
  };

  const getChapterLabel = (key: ChapterKey) => {
    const num = parseInt(key.replace('bab', ''));
    if (selectedSemester === 'genap') {
      return `Bab ${num + 5}`;
    }
    return `Bab ${num}`;
  };

  const allChapters: { key: ChapterKey; label: string }[] = [
    { key: 'bab1', label: getChapterLabel('bab1') },
    { key: 'bab2', label: getChapterLabel('bab2') },
    { key: 'bab3', label: getChapterLabel('bab3') },
    { key: 'bab4', label: getChapterLabel('bab4') },
    { key: 'bab5', label: getChapterLabel('bab5') },
  ];

  const chapters = allChapters.filter(c => visibleChapters[c.key]);

  // Calculate total columns for the Info Row colSpan
  const totalColumns = 2 + (chapters.length * 7) + 3; // No + Nama + (Chapters * 7) + 3 (Eval Akhir)

  const handleInputChange = (
    value: string, 
    studentId: number, 
    chapter: ChapterKey | 'kts' | 'sas', 
    field: FormativeKey | null
  ) => {
    let numValue = value === '' ? null : parseFloat(value);
    
    // Strict Validation: 0-100 only
    if (numValue !== null) {
      if (numValue < 0) numValue = 0;
      if (numValue > 100) numValue = 100;
    }

    onUpdateScore(studentId, chapter, field, numValue);
  };

  const getScoreColorClass = (val: number | null, cellIsEditable: boolean) => {
    if (!cellIsEditable) return 'bg-transparent text-gray-400 cursor-not-allowed';
    if (val === null) return 'bg-white text-gray-900';
    if (val < 70) return 'bg-red-100 text-red-700 font-bold';
    if (val < 85) return 'bg-yellow-100 text-yellow-800 font-bold';
    return 'bg-green-100 text-green-800 font-bold';
  };

  const renderChapterColumns = (student: Student, chapter: { key: ChapterKey; label: string }) => {
    const grades = student.grades[selectedSemester][chapter.key];
    const avg = calculateChapterAverage(grades, activeFieldsMap[chapter.key]);
    
    // Inputs for F1 to F5
    const inputs = (['f1', 'f2', 'f3', 'f4', 'f5'] as FormativeKey[]).map((field) => {
      const session = getSessionForCell(chapter.key, field);
      // Logic Fix: Editable if the table is editable AND the session exists
      const cellIsEditable = isEditable && !!session;
      const val = grades[field];

      return (
        <td key={`${student.id}-${chapter.key}-${field}`} className={`p-0 border-r border-gray-200 w-12 min-w-[3rem] ${cellIsEditable ? 'ring-inset ring-2 ring-blue-500/10' : ''}`}>
          <input
            type="number"
            min="0"
            max="100"
            disabled={!cellIsEditable}
            className={`w-full h-full text-center focus:outline-none transition-colors text-sm py-2 
              ${getScoreColorClass(val, cellIsEditable)}
            `}
            value={formatNumber(val)}
            placeholder=""
            onChange={(e) => handleInputChange(e.target.value, student.id, chapter.key, field)}
          />
        </td>
      );
    });

    const sessionSum = getSessionForCell(chapter.key, 'sum');
    const sumEditable = isEditable && !!sessionSum;
    const sumVal = grades.sum;

    return (
      <React.Fragment key={chapter.key}>
        {inputs}
        {/* SUM / Sumatif Input */}
        <td className={`p-0 border-r border-gray-200 w-12 ${sumEditable ? 'ring-inset ring-2 ring-blue-500/10' : 'bg-gray-50/50'}`}>
          <input
            type="number"
            min="0"
            max="100"
            disabled={!sumEditable}
            className={`w-full h-full text-center focus:outline-none transition-colors text-sm font-medium 
              ${getScoreColorClass(sumVal, sumEditable)}
            `}
            value={formatNumber(sumVal)}
            placeholder=""
            onChange={(e) => handleInputChange(e.target.value, student.id, chapter.key, 'sum')}
          />
        </td>
        {/* Average (Rerata) Display */}
        <td className={`p-2 border-r-2 border-gray-300 text-center text-sm font-semibold w-12 ${avg !== null && avg < 75 ? 'text-red-500' : 'text-gray-800'}`}>
          {avg !== null ? avg : '-'}
        </td>
      </React.Fragment>
    );
  };

  const sessionKts = getSessionForCell('kts', null);
  const sessionSas = getSessionForCell('sas', null);
  const ktsEditable = isEditable && !!sessionKts;
  const sasEditable = isEditable && !!sessionSas;

  return (
    <>
      <div className="relative w-full bg-white rounded-t-xl shadow-sm">
        <table className="border-collapse w-full min-w-max">
          <thead className="sticky top-0 z-20 bg-[#f9f9fb] shadow-sm backdrop-blur-md">
            
            {/* NEW INFO ROW */}
            <tr className="border-b border-gray-300 bg-white">
               <th colSpan={totalColumns} className="py-2 px-4 text-left">
                  <div className="flex justify-between items-center text-xs font-medium text-gray-500">
                     <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 bg-blue-50 text-blue-700 px-2 py-1 rounded">
                           <Calendar size={12} />
                           {formattedDate}
                        </span>
                        <span className="flex items-center gap-1.5 bg-gray-100 text-gray-700 px-2 py-1 rounded font-mono">
                           <Clock size={12} />
                           {formattedTime}
                        </span>
                     </div>
                     <div className="flex items-center gap-4">
                        <span>TA: <b className="text-gray-800">{academicYear}</b></span>
                        <span>Semester: <b className="text-gray-800 uppercase">{selectedSemester}</b></span>
                        {!isEditable && (
                            <span className="text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100 font-bold uppercase tracking-wider text-[10px]">
                                View Only
                            </span>
                        )}
                     </div>
                  </div>
               </th>
            </tr>

            {/* Top Header Row (Groupings) */}
            <tr className="divide-x divide-gray-300 border-b border-gray-300">
              <th className="bg-[#f9f9fb] text-left p-3 w-12 font-semibold text-gray-500 text-xs uppercase tracking-wider">
                No
              </th>
              <th className="bg-[#f9f9fb] text-left p-3 min-w-[250px] font-semibold text-gray-500 text-xs uppercase tracking-wider border-r-2 border-gray-300">
                Nama Siswa
              </th>
              {chapters.map((chap) => (
                <th key={chap.key} colSpan={7} className="text-center p-2 font-semibold text-gray-600 text-xs uppercase tracking-wider border-r-2 border-gray-300">
                  {chap.label}
                </th>
              ))}
              <th colSpan={3} className="text-center p-2 font-semibold text-gray-600 text-xs uppercase tracking-wider">
                Evaluasi Akhir
              </th>
            </tr>
            
            {/* Sub Header Row (Columns) */}
            <tr className="divide-x divide-gray-200 border-b border-gray-300 text-[10px] text-gray-500">
              <th className="bg-[#f9f9fb] h-8"></th>
              <th className="bg-[#f9f9fb] border-r-2 border-gray-300 h-8"></th>
              
              {chapters.map((chap) => (
                <React.Fragment key={`${chap.key}-sub`}>
                  {(['f1', 'f2', 'f3', 'f4', 'f5'] as FormativeKey[]).map((field, i) => {
                    const hasSession = !!getSessionForCell(chap.key, field);
                    return (
                      <th 
                        key={field} 
                        className={`w-12 font-medium bg-gray-50 ${hasSession ? 'cursor-pointer hover:bg-blue-100 text-blue-600' : ''}`}
                        onClick={() => handleHeaderClick(chap.key, field)}
                        title={hasSession ? "Klik untuk melihat detail" : ""}
                      >
                        {field.toUpperCase()}
                      </th>
                    );
                  })}
                  <th 
                    className={`w-12 font-bold bg-gray-100 text-gray-700 ${!!getSessionForCell(chap.key, 'sum') ? 'cursor-pointer hover:bg-blue-100 text-blue-700' : ''}`}
                    onClick={() => handleHeaderClick(chap.key, 'sum')}
                    title="Sumatif / Ulangan"
                  >
                    SUM
                  </th>
                  <th className="w-12 font-bold bg-gray-100 text-gray-700 border-r-2 border-gray-300">Rerata</th>
                </React.Fragment>
              ))}

              <th 
                className={`w-16 font-bold bg-yellow-50 text-yellow-800 ${!!getSessionForCell('kts', null) ? 'cursor-pointer hover:bg-yellow-100' : ''}`}
                onClick={() => handleHeaderClick('kts', null)}
              >
                KTS
              </th>
              <th 
                className={`w-16 font-bold bg-yellow-50 text-yellow-800 ${!!getSessionForCell('sas', null) ? 'cursor-pointer hover:bg-yellow-100' : ''}`}
                onClick={() => handleHeaderClick('sas', null)}
              >
                SAS
              </th>
              <th className="w-20 font-bold bg-green-50 text-green-800">Nilai Akhir</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-gray-200 bg-white">
            {students.map((student, index) => {
               const semesterData = student.grades[selectedSemester];
               // Pass visibleChapters to calculation logic
               const finalGrade = calculateFinalGrade(semesterData, activeFieldsMap, visibleChapters);
               return (
                <tr key={student.id} className="group hover:bg-gray-50 transition-colors">
                  <td className="bg-white group-hover:bg-gray-50 text-center text-xs text-gray-400 font-medium py-2 border-r border-gray-200">
                    {index + 1}
                  </td>
                  <td className="bg-white group-hover:bg-gray-50 text-left text-sm font-medium text-gray-800 px-3 py-2 border-r-2 border-gray-300 whitespace-nowrap">
                    {student.name}
                  </td>

                  {chapters.map(chap => renderChapterColumns(student, chap))}

                  {/* KTS Input */}
                  <td className={`p-0 border-r border-gray-200 ${ktsEditable ? 'ring-inset ring-2 ring-blue-500/10' : 'bg-yellow-50/20'}`}>
                    <input
                      type="number"
                      min="0" max="100"
                      disabled={!ktsEditable}
                      className={`w-full h-full text-center focus:outline-none transition-colors text-sm font-medium 
                        ${getScoreColorClass(semesterData.kts, ktsEditable)}
                      `}
                      value={formatNumber(semesterData.kts)}
                      placeholder=""
                      onChange={(e) => handleInputChange(e.target.value, student.id, 'kts', null)}
                    />
                  </td>

                  {/* SAS Input */}
                  <td className={`p-0 border-r border-gray-200 ${sasEditable ? 'ring-inset ring-2 ring-blue-500/10' : 'bg-yellow-50/20'}`}>
                    <input
                      type="number"
                      min="0" max="100"
                      disabled={!sasEditable}
                      className={`w-full h-full text-center focus:outline-none transition-colors text-sm font-medium 
                        ${getScoreColorClass(semesterData.sas, sasEditable)}
                      `}
                      value={formatNumber(semesterData.sas)}
                      placeholder=""
                      onChange={(e) => handleInputChange(e.target.value, student.id, 'sas', null)}
                    />
                  </td>

                  {/* Final Grade (Read Only) */}
                  <td className={`px-2 py-2 text-center text-sm font-bold bg-green-50/30 ${finalGrade !== null && finalGrade < 75 ? 'text-red-600' : 'text-green-700'}`}>
                    {finalGrade !== null ? finalGrade : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalContent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
           <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" onClick={() => setModalContent(null)}></div>
           <div className="bg-white rounded-xl shadow-2xl p-6 max-w-sm w-full relative z-10 animate-scale-in">
              <button 
                onClick={() => setModalContent(null)}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
              >
                <X size={20} />
              </button>
              
              <div className="flex items-start space-x-4">
                <div className="p-3 bg-blue-100 text-blue-600 rounded-lg shrink-0">
                  <Info size={24} />
                </div>
                <div className="space-y-3 w-full">
                  <h4 className="text-sm font-bold text-gray-900 uppercase tracking-wide border-b border-gray-100 pb-2">
                    Detail Penilaian
                  </h4>
                  <div className="space-y-3">
                     <div className="flex items-center space-x-2 text-sm text-gray-700">
                        <BookOpen size={16} className="text-blue-500 shrink-0" />
                        <span className="font-semibold">
                           {modalContent.type === 'bab' 
                             ? getChapterLabel(modalContent.chapterKey!) 
                             : modalContent.type.toUpperCase()}
                        </span>
                     </div>
                     <div className="flex items-center space-x-2 text-sm text-gray-700">
                        <AlertCircle size={16} className="text-orange-500 shrink-0" />
                        <span>
                           {modalContent.type === 'bab' 
                              ? (modalContent.formativeKey === 'sum' ? 'Sumatif' : `Formatif ${modalContent.formativeKey?.replace('f', '')}`)
                              : 'Evaluasi Akhir'
                           }
                        </span>
                     </div>
                     <div className="flex items-center space-x-2 text-sm text-gray-700">
                        <Calendar size={16} className="text-green-500 shrink-0" />
                        <span>{modalContent.date}</span>
                     </div>
                  </div>
                  <div className="text-sm text-gray-600 font-medium bg-gray-50 p-3 rounded-lg border border-gray-100 mt-2">
                    "{modalContent.description}"
                  </div>
                </div>
              </div>
           </div>
        </div>
      )}
    </>
  );
};

export default GradeTable;

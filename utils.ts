
import { Student, ChapterGrades, ChapterKey, FormativeKey, SemesterData, SemesterKey } from './types';

// Helper to create empty semester data
export const createEmptySemesterData = (): SemesterData => {
  const emptyChapter: ChapterGrades = { 
    f1: null, f2: null, f3: null, f4: null, f5: null, sum: null 
  };
  return {
    bab1: { ...emptyChapter },
    bab2: { ...emptyChapter },
    bab3: { ...emptyChapter },
    bab4: { ...emptyChapter },
    bab5: { ...emptyChapter },
    kts: null,
    sas: null,
    nilaiUp: null, // Initialize new field
  };
};

// Helper to determine which fields are "active" (have at least one value) for a group of students in a chapter
export const getActiveFields = (students: Student[], semester: SemesterKey, chapter: ChapterKey): FormativeKey[] => {
  const allFields: FormativeKey[] = ['f1', 'f2', 'f3', 'f4', 'f5', 'sum'];
  return allFields.filter(field => 
    students.some(s => s.grades[semester][chapter][field] !== null)
  );
};

export const calculateChapterAverage = (grades: ChapterGrades, activeFields: FormativeKey[]): number | null => {
  // If no fields are active in the class, return null
  if (activeFields.length === 0) return null;

  let total = 0;
  // The divisor is the number of active fields in the class
  const count = activeFields.length;

  activeFields.forEach((field) => {
    const value = grades[field];
    // If value is present, add it. If null, it adds 0 (effectively).
    if (value !== null) {
      total += value;
    }
  });

  return parseFloat((total / count).toFixed(1));
};

export const calculateFinalGrade = (
  semesterData: SemesterData, 
  activeFieldsMap: Record<ChapterKey, FormativeKey[]>,
  visibleChapters?: Record<ChapterKey, boolean>
): number | null => {
  const allChapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
  
  const chaptersToCalculate = visibleChapters 
    ? allChapters.filter(c => visibleChapters[c]) 
    : allChapters;
  
  let total = 0;
  let count = 0;

  // 1. Process Chapters Averages
  chaptersToCalculate.forEach(chap => {
    const activeFields = activeFieldsMap[chap];
    const avg = calculateChapterAverage(semesterData[chap], activeFields);
    
    if (avg !== null) {
      total += avg;
      count++;
    }
  });

  // 2. Process KTS
  total += (semesterData.kts || 0);
  count++;

  // 3. Process SAS
  total += (semesterData.sas || 0);
  count++;

  // 4. Process Nilai UP (Optional - usually depends on school policy if UP is part of NA or separate)
  // For this implementation, we keep UP separate as per typical 'Nilai Praktik' vs 'Nilai Pengetahuan' split,
  // unless requested to merge. The prompt implies separate column display.
  // Uncomment below if UP should be part of Final Grade (NA)
  /*
  if (semesterData.nilaiUp !== null) {
      total += semesterData.nilaiUp;
      count++;
  }
  */

  if (count === 0) return null;
  
  const final = total / count;
  return parseFloat(final.toFixed(1));
};

export const formatNumber = (num: number | null): string => {
  return num === null ? '' : num.toString();
};

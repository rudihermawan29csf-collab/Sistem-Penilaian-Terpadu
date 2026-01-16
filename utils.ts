
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
  visibleChapters?: Record<ChapterKey, boolean> // Added optional parameter
): number | null => {
  const allChapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
  
  // Filter chapters based on visibility config if provided
  const chaptersToCalculate = visibleChapters 
    ? allChapters.filter(c => visibleChapters[c]) 
    : allChapters;
  
  let total = 0;
  let count = 0;

  // 1. Process Chapters Averages
  chaptersToCalculate.forEach(chap => {
    // Use the pre-calculated active fields for this chapter
    const activeFields = activeFieldsMap[chap];
    const avg = calculateChapterAverage(semesterData[chap], activeFields);
    
    // Only include chapter in final grade if it has an average (i.e. has active fields) OR if it is explicitly visible and treated as 0 (optional logic, sticking to existing behavior of ignoring nulls)
    if (avg !== null) {
      total += avg;
      count++;
    }
  });

  // 2. Process KTS (formerly STS)
  // Always count KTS as a component. Treat null as 0 for sum.
  total += (semesterData.kts || 0);
  count++;

  // 3. Process SAS
  // Always count SAS as a component. Treat null as 0 for sum.
  total += (semesterData.sas || 0);
  count++;

  if (count === 0) return null;
  
  const final = total / count;
  return parseFloat(final.toFixed(1));
};

export const formatNumber = (num: number | null): string => {
  return num === null ? '' : num.toString();
};

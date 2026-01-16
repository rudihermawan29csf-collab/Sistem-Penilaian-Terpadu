
export interface ChapterGrades {
  f1: number | null;
  f2: number | null;
  f3: number | null;
  f4: number | null;
  f5: number | null;
  sum: number | null;
}

export interface SemesterData {
  bab1: ChapterGrades;
  bab2: ChapterGrades;
  bab3: ChapterGrades;
  bab4: ChapterGrades;
  bab5: ChapterGrades;
  kts: number | null; // Renamed from sts
  sas: number | null;
}

export interface Student {
  id: number;
  no: number; // Order number
  nis: string;
  name: string;
  kelas: string;
  gender: 'L' | 'P';
  grades: {
    ganjil: SemesterData;
    genap: SemesterData;
  };
  // New: Store grades by subject name
  gradesBySubject?: Record<string, {
    ganjil: SemesterData;
    genap: SemesterData;
  }>;
}

export interface Teacher {
  id: number;
  no: number;
  name: string;
  nip: string;
  subject: string;
  classes: string[]; // List of class names e.g. ['VII A', 'IX B']
}

export type ChapterKey = 'bab1' | 'bab2' | 'bab3' | 'bab4' | 'bab5';
export type FormativeKey = 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'sum';
export type SemesterKey = 'ganjil' | 'genap';
export type GradeType = 'bab' | 'kts' | 'sas';

export interface GradingSession {
  id: string; // Unique ID for history management
  semester: SemesterKey;
  targetClass: string; // Added: Class this session belongs to
  targetSubject?: string; // Added: Subject context
  date: string;
  type: GradeType;
  chapterKey?: ChapterKey;
  formativeKey?: FormativeKey;
  description?: string;
}

export interface AppSettings {
  academicYear: string;
  activeSemester: SemesterKey;
  visibleChapters: Record<ChapterKey, boolean>;
  teacherName: string; // Default PAI Teacher
  teacherNip: string;
  principalName: string;
  principalNip: string;
  adminPassword?: string;
  teacherDefaultPassword?: string; 
}

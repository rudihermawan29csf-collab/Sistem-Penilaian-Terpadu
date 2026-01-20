
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
  kts: number | null;
  sas: number | null;
  nilaiUp: number | null; 
}

export interface StudentExtracurricular {
  activityName: string;
  predikat: string;
  description: string;
}

export interface Student {
  id: number;
  no: number;
  nis: string;
  nisn: string; // Added NISN
  name: string;
  kelas: string;
  gender: 'L' | 'P';
  attendance: {
    ganjil: { s: number; i: number; a: number };
    genap: { s: number; i: number; a: number };
  };
  extracurricularRecord: {
    ganjil: StudentExtracurricular[];
    genap: StudentExtracurricular[];
  };
  grades: {
    ganjil: SemesterData;
    genap: SemesterData;
  };
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
  classes: string[];
  waliKelas?: string; // Added Wali Kelas assignment directly to teacher
}

export type ChapterKey = 'bab1' | 'bab2' | 'bab3' | 'bab4' | 'bab5';
export type FormativeKey = 'f1' | 'f2' | 'f3' | 'f4' | 'f5' | 'sum';
export type SemesterKey = 'ganjil' | 'genap';
export type GradeType = 'bab' | 'kts' | 'sas' | 'up'; 

export interface GradingSession {
  id: string;
  semester: SemesterKey;
  targetClass: string;
  targetSubject?: string;
  date: string;
  type: GradeType;
  chapterKey?: ChapterKey;
  formativeKey?: FormativeKey;
  description?: string;
}

export interface UpRange {
  min: number;
  max: number;
  value: number; 
}

export interface KokurikulerProject {
  theme: string;
  description: string;
}

// New Interface for Daily Attendance
export interface AttendanceRecord {
    studentId: number;
    status: 'H' | 'S' | 'I' | 'A';
    note?: string; // Added note for descriptions (Keterangan)
}

export interface DailyAttendanceLog {
    id: string;
    date: string;
    className: string;
    records: AttendanceRecord[];
    documentation?: string[]; // Array of base64 strings for photos (Max 3)
}

export interface AppSettings {
  academicYear: string;
  activeSemester: SemesterKey;
  visibleChapters: Record<ChapterKey, boolean>;
  teacherName: string;
  teacherNip: string;
  principalName: string;
  principalNip: string;
  adminPassword?: string;
  teacherDefaultPassword?: string;
  kabupatenLogoUrl?: string; 
  watermarkLogoUrl?: string; // Added Watermark URL
  
  schoolHeader: string[]; // Added School Header Lines
  subjects: string[]; // Added Subjects List
  
  midSemesterDate: string; 
  upRanges: UpRange[];
  kokurikulerProjects: KokurikulerProject[]; 
  
  midSemesterFieldConfig: Record<ChapterKey, Record<FormativeKey, boolean>>; 
  
  waliKelasMap: Record<string, { name: string; nip: string }>; 
  extracurriculars: { name: string; description: string; coach: string }[]; 
}

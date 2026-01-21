
import { Student, Teacher, GradingSession, AppSettings, ChapterKey, DailyAttendanceLog } from '../types';

// URL Web App Google Apps Script
const API_URL = "https://script.google.com/macros/s/AKfycbzIMYplLkGLp_T1OJ63Y4Cu7rGTa-3IR-O7CwmGAbunyGcu7TjRCGrdVHHJB3oXwt4D/exec"; 

export const fetchInitialData = async () => {
  if (API_URL.includes("GANTI_DENGAN")) {
      console.warn("API URL belum dikonfigurasi.");
      return null;
  }
  try {
    // Add timestamp to prevent caching
    const response = await fetch(`${API_URL}?action=getInitialData&t=${new Date().getTime()}`, {
        method: 'GET',
        redirect: 'follow',
    });
    
    if (!response.ok) {
        return null;
    }
    
    const text = await response.text();
    try {
        const json = JSON.parse(text);
        return json;
    } catch (e) {
        console.warn("Invalid JSON response", text);
        return null;
    }

  } catch (error) {
    console.warn("API Connection unavailable.", error);
    return null;
  }
};

const postData = async (body: any): Promise<boolean> => {
  if (API_URL.includes("GANTI_DENGAN")) return false;
  
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow', 
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(body)
    });
    const resText = await response.text();
    return response.ok && resText.includes("Success");
  } catch (error) {
    console.error("Save failed", error);
    return false;
  }
};

// --- NEW FUNCTION: Force Upload All Data ---
export const syncFullData = async (
    students: Student[], 
    teachers: Teacher[], 
    history: GradingSession[], 
    settings: AppSettings,
    dailyAttendance: DailyAttendanceLog[],
    chapterConfigs: any,
    fieldConfigs: any
) => {
    // We send this as a special "restore" action
    return await postData({ 
        action: 'restoreBackup', 
        data: {
            students,
            teachers,
            history,
            settings,
            dailyAttendance,
            chapterConfigs,
            fieldConfigs
        }
    });
};

export const saveGrade = async (studentId: string | number, subject: string, semester: string, gradeData: any) => {
  return await postData({ 
    action: 'saveGrade', 
    studentId: String(studentId), 
    subject, 
    semester, 
    gradeData 
  });
};

export const saveHistory = async (session: GradingSession) => {
  return await postData({ action: 'saveHistory', session });
};

export const deleteHistory = async (id: string) => {
  return await postData({ action: 'deleteHistory', id });
};

export const addStudent = async (student: Student) => {
    const { grades, gradesBySubject, ...studentData } = student;
    return await postData({ action: 'addStudent', student: studentData });
};

export const updateStudent = async (student: Student) => {
    const { grades, gradesBySubject, ...studentData } = student;
    return await postData({ action: 'updateStudent', student: studentData });
};

export const deleteStudent = async (id: number) => {
    return await postData({ action: 'deleteStudent', id });
};

export const importStudents = async (students: Student[]) => {
    // Send in smaller chunks to avoid payload limits
    const cleanStudents = students.map(s => {
        const { grades, gradesBySubject, ...rest } = s;
        return rest;
    });
    const BATCH_SIZE = 50;
    let allSuccess = true;
    for (let i = 0; i < cleanStudents.length; i += BATCH_SIZE) {
        const chunk = cleanStudents.slice(i, i + BATCH_SIZE);
        const success = await postData({ action: 'importStudents', students: chunk });
        if (!success) allSuccess = false;
    }
    return allSuccess;
};

export const saveChapterConfig = async (subject: string, config: any) => {
    return await postData({ action: 'saveChapterConfig', subject, config });
};

export const saveSettings = async (settings: AppSettings) => {
    return await postData({ action: 'saveSettings', settings });
};

export const resetClassGrades = async (className: string, semester: string) => {
    return await postData({ action: 'resetClassGrades', className, semester });
};

export const saveTeacher = async (teacher: Teacher) => {
    return await postData({ action: 'saveTeacher', teacher });
};

export const deleteTeacher = async (id: number) => {
    return await postData({ action: 'deleteTeacher', id });
};

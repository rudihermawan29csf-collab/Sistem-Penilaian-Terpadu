
import { Student, Teacher, GradingSession, AppSettings, ChapterKey, DailyAttendanceLog } from '../types';

// URL Deployment Database v3 (Relational Sheets)
const API_URL = "https://script.google.com/macros/s/AKfycbyAxu7AfjWOZMdVVRVna40XP0GBSLuLmjThLhfO3tP8FWB14F12RzANoXGjolyLW8-wdg/exec"; 

export const fetchInitialData = async () => {
  if (!API_URL || API_URL.includes("GANTI_DENGAN")) {
      console.warn("API URL belum dikonfigurasi.");
      return null;
  }
  try {
    const response = await fetch(`${API_URL}?action=getInitialData&t=${new Date().getTime()}`, {
        method: 'GET',
        redirect: 'follow',
    });
    
    if (!response.ok) return null;
    
    const text = await response.text();
    try {
        return JSON.parse(text);
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
  if (!API_URL) return false;
  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow', 
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body)
    });
    const resText = await response.text();
    if (response.ok) {
        try {
            const resJson = JSON.parse(resText);
            return resJson.success === true;
        } catch(e) { return false; }
    }
    return false;
  } catch (error) {
    return false;
  }
};

// --- MIGRATION / SYNC TOOL ---
export const syncFullData = async (
    students: Student[], 
    teachers: Teacher[], 
    history: GradingSession[], 
    settings: AppSettings,
    dailyAttendance: DailyAttendanceLog[],
    chapterConfigs: any,
    fieldConfigs: any
) => {
    // Sends the entire state to the backend to be split into relational tables
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
  return await postData({ action: 'saveGrade', studentId: String(studentId), subject, semester, gradeData });
};

export const saveHistory = async (session: GradingSession) => {
  return await postData({ action: 'saveHistory', session });
};

export const deleteHistory = async (id: string) => {
  return await postData({ action: 'deleteHistory', id });
};

export const addStudent = async (student: Student) => {
    return await postData({ action: 'restoreBackup', data: { students: [student] } }); 
};

export const updateStudent = async (student: Student) => {
    return await postData({ action: 'restoreBackup', data: { students: [student] } });
};

export const deleteStudent = async (id: number) => {
    return await postData({ action: 'deleteStudent', id });
};

export const importStudents = async (students: Student[]) => {
    return await postData({ action: 'restoreBackup', data: { students } });
};

export const saveChapterConfig = async (subject: string, config: any) => {
    return await postData({ action: 'saveChapterConfig', subject, config });
};

export const saveSettings = async (settings: AppSettings) => {
    return await postData({ action: 'saveSettings', settings });
};

export const resetClassGrades = async (className: string, semester: string) => {
    return true; 
};

export const saveTeacher = async (teacher: Teacher) => {
    return await postData({ action: 'saveTeacher', teacher });
};

export const deleteTeacher = async (id: number) => {
    return true;
};

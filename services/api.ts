
import { Student, Teacher, GradingSession, AppSettings, ChapterKey } from '../types';

// REPLACE THIS WITH YOUR DEPLOYED GOOGLE APPS SCRIPT WEB APP URL
const API_URL = "https://script.google.com/macros/s/AKfycbx4tj_ypUoBmKv856qwqz6F0OS62MTdIQZlR5CAXC6vMjO3F9LXjorcRqctiJP0S62MTdIQZlR5CAXC6vMjO3F9LXjorcRqctiJP0S6LD/exec"; 

export const fetchInitialData = async () => {
  try {
    const response = await fetch(`${API_URL}?action=getInitialData`);
    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error("Failed to fetch data", error);
    return null;
  }
};

export const saveGrade = async (studentId: number, subject: string, semester: string, gradeData: any) => {
  // Use no-cors or simple POST. Since we need to send JSON, default fetch is fine.
  // Google Apps Script usually requires handling CORS redirects, but for simple POST it works if set up right.
  // The 'no-cors' mode is tricky because we can't read response, but we can assume success for optimistic UI.
  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveGrade', studentId, subject, semester, gradeData })
  });
};

export const saveHistory = async (session: GradingSession) => {
  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'saveHistory', session })
  });
};

export const deleteHistory = async (id: string) => {
  await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'deleteHistory', id })
  });
};

export const addStudent = async (student: Student) => {
    // Simplify student object for sheet
    const { grades, gradesBySubject, ...studentData } = student;
    await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'addStudent', student: studentData })
    });
};

export const saveChapterConfig = async (subject: string, config: any) => {
    await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveChapterConfig', subject, config })
    });
};

export const saveSettings = async (settings: AppSettings) => {
    await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveSettings', settings })
    });
};

export const resetClassGrades = async (className: string, semester: string) => {
    await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'resetClassGrades', className, semester })
    });
};

export const saveTeacher = async (teacher: Teacher) => {
    await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'saveTeacher', teacher })
    });
};

export const deleteTeacher = async (id: number) => {
    await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'deleteTeacher', id })
    });
};


import { Student, Teacher, GradingSession, AppSettings, ChapterKey } from '../types';

// Corrected URL
const API_URL = "https://script.google.com/macros/s/AKfycbx4tj_ypUoBmKv856qwqz6F0OS62MTdIQZlR5CAXC6vMjO3F9LXjorcRqctiJP0S6LD/exec"; 

export const fetchInitialData = async () => {
  try {
    const response = await fetch(`${API_URL}?action=getInitialData`);
    if (!response.ok) throw new Error('Network response was not ok');
    const json = await response.json();
    return json.data;
  } catch (error) {
    console.error("Failed to fetch data", error);
    return null;
  }
};

// Helper for POST requests with no-cors to avoid Google Apps Script CORS issues
const postData = async (body: any) => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      mode: 'no-cors', // Important for GAS POST requests from browser
      headers: {
        'Content-Type': 'text/plain' // Send as text/plain to avoid preflight issues
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("Failed to save data", error);
  }
};

export const saveGrade = async (studentId: number, subject: string, semester: string, gradeData: any) => {
  await postData({ action: 'saveGrade', studentId, subject, semester, gradeData });
};

export const saveHistory = async (session: GradingSession) => {
  await postData({ action: 'saveHistory', session });
};

export const deleteHistory = async (id: string) => {
  await postData({ action: 'deleteHistory', id });
};

export const addStudent = async (student: Student) => {
    const { grades, gradesBySubject, ...studentData } = student;
    await postData({ action: 'addStudent', student: studentData });
};

export const saveChapterConfig = async (subject: string, config: any) => {
    await postData({ action: 'saveChapterConfig', subject, config });
};

export const saveSettings = async (settings: AppSettings) => {
    await postData({ action: 'saveSettings', settings });
};

export const resetClassGrades = async (className: string, semester: string) => {
    await postData({ action: 'resetClassGrades', className, semester });
};

export const saveTeacher = async (teacher: Teacher) => {
    await postData({ action: 'saveTeacher', teacher });
};

export const deleteTeacher = async (id: number) => {
    await postData({ action: 'deleteTeacher', id });
};


import { Student, Teacher, GradingSession, AppSettings, ChapterKey } from '../types';

// Corrected URL
const API_URL = "https://script.google.com/macros/s/AKfycbzTilcGfR8xawtP1dkXE_bFgYhlqKKxjzwox6FsxnsA4wb6Id4fUbVlGwPBR-dzEe_k/exec"; 

export const fetchInitialData = async () => {
  try {
    const response = await fetch(`${API_URL}?action=getInitialData&t=${new Date().getTime()}`, {
        method: 'GET',
        redirect: 'follow',
        headers: {
            'Content-Type': 'text/plain;charset=utf-8',
        }
    });
    
    if (!response.ok) {
        console.warn(`API responded with status ${response.status}`);
        return null;
    }
    
    const text = await response.text();
    
    try {
        const json = JSON.parse(text);
        return json;
    } catch (e) {
        console.warn("Failed to parse JSON response from server.");
        return null;
    }

  } catch (error) {
    console.warn("API Connection unavailable (Offline Mode activated).");
    return null;
  }
};

// Helper for POST requests
// CRITICAL FIX: Removed 'no-cors'. Using text/plain allows Simple Request (no preflight) 
// but actually sends the body data, unlike no-cors which often strips it.
const postData = async (body: any) => {
  try {
    await fetch(API_URL, {
      method: 'POST',
      redirect: 'follow', 
      headers: {
        'Content-Type': 'text/plain;charset=utf-8' // Must be text/plain for GAS doPos
      },
      body: JSON.stringify(body)
    });
  } catch (error) {
    console.error("Background save failed", error);
  }
};

// FIXED: studentId changed to string | number but explicitly sent as String
export const saveGrade = async (studentId: string | number, subject: string, semester: string, gradeData: any) => {
  await postData({ 
    action: 'saveGrade', 
    studentId: String(studentId), 
    subject, 
    semester, 
    gradeData 
  });
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

export const updateStudent = async (student: Student) => {
    const { grades, gradesBySubject, ...studentData } = student;
    await postData({ action: 'updateStudent', student: studentData });
};

export const deleteStudent = async (id: number) => {
    await postData({ action: 'deleteStudent', id });
};

export const importStudents = async (students: Student[]) => {
    const cleanStudents = students.map(s => {
        const { grades, gradesBySubject, ...rest } = s;
        return rest;
    });

    const BATCH_SIZE = 20;
    
    for (let i = 0; i < cleanStudents.length; i += BATCH_SIZE) {
        const chunk = cleanStudents.slice(i, i + BATCH_SIZE);
        await postData({ action: 'importStudents', students: chunk });
        await new Promise(resolve => setTimeout(resolve, 300));
        console.log(`Sent batch ${i / BATCH_SIZE + 1} of ${Math.ceil(cleanStudents.length / BATCH_SIZE)}`);
    }
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

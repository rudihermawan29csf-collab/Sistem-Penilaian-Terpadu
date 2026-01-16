
import { Student, Teacher, GradingSession, AppSettings, ChapterKey } from '../types';

// Corrected URL
const API_URL = "https://script.google.com/macros/s/AKfycbx4tj_ypUoBmKv856qwqz6F0OS62MTdIQZlR5CAXC6vMjO3F9LXjorcRqctiJP0S6LD/exec"; 

export const fetchInitialData = async () => {
  try {
    // Add timestamp cache buster to ensure we always get fresh data from server
    const response = await fetch(`${API_URL}?action=getInitialData&t=${new Date().getTime()}`);
    if (!response.ok) throw new Error('Network response was not ok');
    const json = await response.json();
    
    // Debug logging
    console.log("Fetched Data:", json);

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

// FIXED: studentId changed to string | number but explicitly sent as String
export const saveGrade = async (studentId: string | number, subject: string, semester: string, gradeData: any) => {
  // Convert ID to String to ensure matching in Spreadsheet (avoids stacking/duplicates)
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
    // 1. Prepare clean data (remove heavy grade objects)
    const cleanStudents = students.map(s => {
        const { grades, gradesBySubject, ...rest } = s;
        return rest;
    });

    // 2. CHUNKING: Send data in batches of 20 to prevent GAS Payload limit/Timeout
    const BATCH_SIZE = 20;
    
    for (let i = 0; i < cleanStudents.length; i += BATCH_SIZE) {
        const chunk = cleanStudents.slice(i, i + BATCH_SIZE);
        
        // Send batch
        await postData({ action: 'importStudents', students: chunk });
        
        // Add a small delay (300ms) between requests to be gentle on the server
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


import { Student, Teacher, GradingSession, AppSettings, ChapterKey } from '../types';

// Corrected URL
const API_URL = "https://script.google.com/macros/s/AKfycbzTilcGfR8xawtP1dkXE_bFgYhlqKKxjzwox6FsxnsA4wb6Id4fUbVlGwPBR-dzEe_k/exec"; 

export const fetchInitialData = async () => {
  try {
    // Single attempt with timestamp to prevent caching
    // credentials: 'omit' is crucial for public scripts to avoid Google Auth conflicts in browser
    const response = await fetch(`${API_URL}?action=getInitialData&t=${new Date().getTime()}`, {
        method: 'GET',
        redirect: 'follow',
        credentials: 'omit',
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
    // Gracefully handle network/CORS errors without retrying (fast fail)
    // This allows the app to immediately fallback to local data
    console.warn("API Connection unavailable (Offline Mode activated).");
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
    // Silent fail for background saves in offline mode
    console.warn("Background save failed (Offline)");
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


import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, Teacher, AppSettings, ChapterKey, FormativeKey, GradingSession, SemesterData } from '../types';
import { calculateChapterAverage, createEmptySemesterData } from '../utils';
import { ChevronDown, Search, User, FileText, AlertCircle, Download, FileStack, Loader2 } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MidSemesterReportViewProps {
  students: Student[];
  teachers: Teacher[];
  settings: AppSettings;
  assessmentHistory?: GradingSession[]; 
}

const MidSemesterReportView: React.FC<MidSemesterReportViewProps> = ({ students, teachers, settings, assessmentHistory = [] }) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [viewMode, setViewMode] = useState<'rapor' | 'tanggungan'>('rapor'); 

  // Standard Subject Order
  const SUBJECT_ORDER = [
    "Pendidikan Agama Islam",
    "PPKn",
    "Bahasa Indonesia",
    "Matematika",
    "Ilmu Pengetahuan Alam",
    "Ilmu Pengetahuan Sosial",
    "Bahasa Inggris",
    "Penjas Orkes",
    "Informatika",
    "Seni (Seni Rupa)",
    "Bahasa Jawa"
  ];

  const getSubjectSortIndex = (subject: string) => {
    const index = SUBJECT_ORDER.indexOf(subject);
    return index === -1 ? 999 : index; 
  };

  const uniqueClasses = useMemo(() => {
    return Array.from(new Set(students.map(s => s.kelas))).sort();
  }, [students]);

  const classStudents = useMemo(() => {
    return students.filter(s => s.kelas === selectedClass).sort((a, b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  const selectedStudent = useMemo(() => {
    return students.find(s => s.id.toString() === selectedStudentId);
  }, [students, selectedStudentId]);

  useEffect(() => {
      if (students.length === 1) {
          const s = students[0];
          setSelectedClass(s.kelas);
          setSelectedStudentId(s.id.toString());
      }
  }, [students]);

  const waliKelasInfo = useMemo(() => {
      if (settings.waliKelasMap && settings.waliKelasMap[selectedClass]) {
          return settings.waliKelasMap[selectedClass];
      }
      return { name: '..................................', nip: '..................................' };
  }, [settings.waliKelasMap, selectedClass]);

  const attendanceData = useMemo(() => {
      if (!selectedStudent || !selectedStudent.attendance) return { s: 0, i: 0, a: 0 };
      return selectedStudent.attendance[settings.activeSemester] || { s: 0, i: 0, a: 0 };
  }, [selectedStudent, settings.activeSemester]);

  const extraData = useMemo(() => {
      if (!selectedStudent || !selectedStudent.extracurricularRecord) return [];
      return selectedStudent.extracurricularRecord[settings.activeSemester] || [];
  }, [selectedStudent, settings.activeSemester]);

  // --- Helper Functions for Data Calculation (Reused for Display & PDF) ---

  const getChapterConfig = () => {
      const activeChaps: ChapterKey[] = [];
      const colMap: Record<ChapterKey, FormativeKey[]> = { bab1:[], bab2:[], bab3:[], bab4:[], bab5:[] };
      const config = settings.midSemesterFieldConfig || {};
      
      (['bab1', 'bab2', 'bab3', 'bab4', 'bab5'] as ChapterKey[]).forEach(chap => {
          if (config[chap]) {
              const activeFields = Object.entries(config[chap])
                  .filter(([_, isActive]) => isActive)
                  .map(([field]) => field as FormativeKey)
                  .sort((a, b) => {
                      if (a === 'sum') return 1;
                      if (b === 'sum') return -1;
                      return a.localeCompare(b);
                  });

              if (activeFields.length > 0) {
                  activeChaps.push(chap);
                  colMap[chap] = activeFields;
              }
          }
      });
      
      if (activeChaps.length === 0) {
          return { activeChaps: ['bab1','bab2','bab3'] as ChapterKey[], colMap: {
              bab1: ['f1','f2','sum'] as FormativeKey[], 
              bab2: ['f1','sum'] as FormativeKey[], 
              bab3: ['f1'] as FormativeKey[],
              bab4: [], bab5: []
          }};
      }
      return { activeChaps, colMap };
  };

  const chapterConfig = useMemo(() => getChapterConfig(), [settings.midSemesterFieldConfig]);

  const calculateStudentSubjectsData = (student: Student, targetClass: string) => {
    const classSubjects = new Set<string>();
    teachers.forEach(t => {
        if (t.classes.includes(targetClass)) {
            classSubjects.add(t.subject);
        }
    });
    classSubjects.add('Pendidikan Agama Islam');

    const sortedSubjects = Array.from(classSubjects)
        .filter(s => s !== 'Bimbingan Konseling') 
        .sort((a, b) => getSubjectSortIndex(a) - getSubjectSortIndex(b));

    const config = getChapterConfig();

    return sortedSubjects.map(subject => {
      let grades;
      if (subject === 'Pendidikan Agama Islam') {
        grades = student.grades[settings.activeSemester];
      } else {
        grades = student.gradesBySubject?.[subject]?.[settings.activeSemester] || createEmptySemesterData();
      }

      const chapterScores: Record<string, string> = {}; 
      let totalScore = 0;
      let count = 0;

      config.activeChaps.forEach(chap => {
        const chapGrades = grades[chap];
        const fieldsToShow = config.colMap[chap] || [];
        fieldsToShow.forEach(f => {
            chapterScores[`${chap}_${f}`] = chapGrades[f] !== null ? chapGrades[f]!.toString() : '-';
        });
        const allFields: FormativeKey[] = ['f1', 'f2', 'f3', 'f4', 'f5', 'sum'];
        const activeFieldsForCalc = allFields.filter(f => chapGrades[f] !== null);
        const avg = calculateChapterAverage(chapGrades, activeFieldsForCalc);
        if (avg !== null) {
          totalScore += avg;
          count++;
        }
      });

      if (grades.kts !== null) {
          totalScore += grades.kts;
          count++;
      }

      const finalAvg = count > 0 ? Math.round(totalScore / count) : null;

      return {
        subject,
        chapterScores,
        kts: grades.kts,
        finalAvg,
      };
    });
  };

  const calculateStudentIssues = (student: Student, targetClass: string) => {
    const tanggungan: { subject: string, task: string, score: number }[] = [];
    const remidi: { subject: string, task: string, score: number }[] = [];

    const classSubjects = new Set<string>();
    teachers.forEach(t => {
        if (t.classes.includes(targetClass)) classSubjects.add(t.subject);
    });
    classSubjects.add('Pendidikan Agama Islam'); 

    const sortedSubjects = Array.from(classSubjects)
        .filter(s => s !== 'Bimbingan Konseling') 
        .sort((a, b) => getSubjectSortIndex(a) - getSubjectSortIndex(b));

    sortedSubjects.forEach(subject => {
        let grades: SemesterData;
        if (subject === 'Pendidikan Agama Islam') {
            grades = student.grades[settings.activeSemester];
        } else {
            grades = student.gradesBySubject?.[subject]?.[settings.activeSemester] || createEmptySemesterData();
        }

        const allChapters: ChapterKey[] = ['bab1', 'bab2', 'bab3', 'bab4', 'bab5'];
        const fields: FormativeKey[] = ['f1', 'f2', 'f3', 'f4', 'f5', 'sum'];

        allChapters.forEach(chap => {
             const chapGrades = grades[chap];
             fields.forEach(f => {
                 const score = chapGrades[f];
                 if (score === 0) {
                     const displayBab = parseInt(chap.replace('bab',''));
                     const taskName = `TP ${displayBab} - ${f.toUpperCase()}`;
                     tanggungan.push({ subject, task: taskName, score: 0 });
                 } else if (score !== null && score < 70) {
                     const displayBab = parseInt(chap.replace('bab',''));
                     const taskName = `TP ${displayBab} - ${f.toUpperCase()}`;
                     remidi.push({ subject, task: taskName, score });
                 }
             });
        });

        if (grades.kts === 0) tanggungan.push({ subject, task: 'KTS', score: 0 });
        else if (grades.kts !== null && grades.kts < 70) remidi.push({ subject, task: 'KTS', score: grades.kts });

        if (grades.sas === 0) tanggungan.push({ subject, task: 'SAS', score: 0 });
        else if (grades.sas !== null && grades.sas < 70) remidi.push({ subject, task: 'SAS', score: grades.sas });
    });

    return { tanggungan, remidi };
  };

  // Memoized data for current view
  const subjectsData = useMemo(() => {
      if (!selectedStudent || !selectedClass) return [];
      return calculateStudentSubjectsData(selectedStudent, selectedClass);
  }, [selectedStudent, selectedClass, teachers, settings.activeSemester, chapterConfig]);

  const studentIssues = useMemo(() => {
      if (!selectedStudent || !selectedClass) return { tanggungan: [], remidi: [] };
      return calculateStudentIssues(selectedStudent, selectedClass);
  }, [selectedStudent, selectedClass, teachers, settings.activeSemester]);


  // --- PDF GENERATION LOGIC ---

  const handleDownloadPDF = async (mode: 'single' | 'class') => {
    if (!selectedClass) return;
    
    setIsGenerating(true);
    // Allow UI to update before heavy processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Calculate watermark dimensions respecting aspect ratio
    let wmWidth = 150;
    let wmHeight = 150;
    if (settings.watermarkLogoUrl) {
        try {
            const img = new Image();
            img.src = settings.watermarkLogoUrl;
            // Wait for image to load to get dimensions
            await new Promise((resolve) => {
                if (img.complete) resolve(true);
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
            });
            
            if (img.width > 0 && img.height > 0) {
                const ratio = img.width / img.height;
                const maxSize = 150; // Max width or height in mm
                
                if (ratio > 1) {
                    // Wider than tall
                    wmWidth = maxSize;
                    wmHeight = maxSize / ratio;
                } else {
                    // Taller than wide or square
                    wmHeight = maxSize;
                    wmWidth = maxSize * ratio;
                }
            }
        } catch (e) {
            console.error("Error loading watermark dimensions", e);
        }
    }

    const targets = mode === 'single' 
        ? (selectedStudent ? [selectedStudent] : []) 
        : classStudents;

    if (targets.length === 0) {
        setIsGenerating(false);
        return;
    }

    const dateStr = settings.midSemesterDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
    const config = getChapterConfig();

    const doc = new jsPDF({
        orientation: 'p',
        unit: 'mm',
        format: [215.9, 330.2] // F4
    });

    for (let i = 0; i < targets.length; i++) {
        const student = targets[i];
        
        // Recalculate data for specific student in loop
        const dataSubjects = calculateStudentSubjectsData(student, selectedClass);
        const dataIssues = calculateStudentIssues(student, selectedClass);
        const dataAttendance = student.attendance?.[settings.activeSemester] || { s: 0, i: 0, a: 0 };
        const dataExtra = student.extracurricularRecord?.[settings.activeSemester] || [];

        // Determine Wali Kelas for this class
        const wk = settings.waliKelasMap?.[selectedClass] || { name: '..................................', nip: '..................................' };

        // --- PAGE 1 START ---
        if (i > 0) doc.addPage(); // Add page for next student

        // Helper for KOP
        const addKop = (yStart: number) => {
            if (settings.kabupatenLogoUrl) {
                try {
                    doc.addImage(settings.kabupatenLogoUrl, 'PNG', 15, yStart, 20, 25);
                } catch (e) { /* ignore image error */ }
            }
            
            doc.setFont("times", "bold");
            doc.setFontSize(12);
            let textY = yStart + 5;
            const headerLines = settings.schoolHeader || ["PEMERINTAH KABUPATEN MOJOKERTO", "DINAS PENDIDIKAN", "SMPN 3 PACET"];
            
            headerLines.forEach((line, idx) => {
                if (idx >= 3) {
                    doc.setFont("times", "normal");
                    doc.setFontSize(9);
                } else if (idx === 2) {
                    doc.setFontSize(14);
                }
                doc.text(line, 108, textY, { align: 'center' });
                textY += 5;
            });

            doc.setLineWidth(0.5);
            doc.line(10, textY + 2, 205, textY + 2);
            doc.setLineWidth(0.2);
            doc.line(10, textY + 3, 205, textY + 3);
            return textY + 8; // Reduce buffer
        };

        const addStudentHeader = (yStart: number) => {
            doc.setFont("times", "normal");
            doc.setFontSize(9); // Smaller font
            const leftX = 15;
            const rightX = 140;
            const lineHeight = 4.5;

            doc.text(`Nama Siswa`, leftX, yStart);
            doc.text(`:  ${student.name}`, leftX + 25, yStart);
            doc.text(`Kelas`, rightX, yStart);
            doc.text(`:  ${student.kelas}`, rightX + 15, yStart);

            doc.text(`NIS / NISN`, leftX, yStart + lineHeight);
            doc.text(`:  ${student.nis} / ${student.nisn || '-'}`, leftX + 25, yStart + lineHeight);
            doc.text(`Fase`, rightX, yStart + lineHeight);
            doc.text(`:  D`, rightX + 15, yStart + lineHeight);

            return yStart + lineHeight * 2 + 4;
        };

        let y = 10;
        y = addKop(y);

        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.text("LAPORAN HASIL BELAJAR SISWA", 108, y, { align: "center" });
        doc.setFontSize(10);
        doc.text(`TENGAH SEMESTER ${settings.activeSemester === 'ganjil' ? 'GANJIL' : 'GENAP'} TAHUN PELAJARAN ${settings.academicYear}`, 108, y + 5, { align: "center" });
        y += 12;

        y = addStudentHeader(y);

        // A. Nilai Akademik
        doc.setFont("times", "bold");
        doc.setFontSize(10);
        doc.text("A. Nilai Akademik", 15, y - 2);

        const head: any[][] = [];
        const colSpans: any[] = [{ content: 'No', rowSpan: 2 }, { content: 'Mata Pelajaran', rowSpan: 2 }];
        const subHeaders: any[] = [];

        config.activeChaps.forEach(chap => {
            colSpans.push({ content: chap.replace('bab', 'TP '), colSpan: config.colMap[chap].length, styles: { halign: 'center' } });
            config.colMap[chap].forEach(f => {
                const chapNum = chap.replace('bab','');
                subHeaders.push({ content: f === 'sum' ? `Sum ${chapNum}` : f.toUpperCase(), styles: { halign: 'center', fontSize: 7 } });
            });
        });
        colSpans.push({ content: 'KTS', rowSpan: 2 });
        colSpans.push({ content: 'Rerata', rowSpan: 2 });

        head.push(colSpans);
        head.push(subHeaders);

        const body = dataSubjects.map((subj, i) => {
            const row: any[] = [i + 1, subj.subject];
            config.activeChaps.forEach(chap => {
                config.colMap[chap].forEach(f => {
                    row.push(subj.chapterScores[`${chap}_${f}`] || '-');
                });
            });
            row.push(subj.kts ?? '-');
            row.push(subj.finalAvg ?? '-');
            return row;
        });

        // Compact Table for Single Page Fit
        autoTable(doc, {
            startY: y,
            head: head,
            body: body,
            theme: 'grid',
            styles: { font: "times", fontSize: 8, cellPadding: 0.7, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold', valign: 'middle' },
            columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 1: { halign: 'left' } },
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index > 1) {
                    data.cell.styles.halign = 'center';
                }
            }
        });

        y = (doc as any).lastAutoTable.finalY + 4; // Compact spacing

        // B. Kokurikuler
        doc.setFontSize(9);
        doc.setFont("times", "bold");
        doc.text("B. Kokurikuler", 15, y);
        const kokuBody = (settings.kokurikulerProjects || []).map((p, i) => [i + 1, p.theme, p.description]);
        if (kokuBody.length === 0) kokuBody.push(['-', '-', '-']);

        autoTable(doc, {
            startY: y + 2,
            head: [['No', 'Tema', 'Deskripsi']],
            body: kokuBody,
            theme: 'grid',
            styles: { font: "times", fontSize: 8, cellPadding: 0.7, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 1: { cellWidth: 50 } }
        });

        y = (doc as any).lastAutoTable.finalY + 4;

        // C. Ekstrakurikuler
        doc.setFontSize(9);
        doc.setFont("times", "bold");
        doc.text("C. Ekstrakurikuler", 15, y);
        const extraBody = dataExtra.map((e, i) => [i + 1, e.activityName, e.predikat, e.description]);
        if (extraBody.length === 0) extraBody.push(['-', '-', '-', '-']);

        autoTable(doc, {
            startY: y + 2,
            head: [['No', 'Kegiatan', 'Predikat', 'Keterangan']],
            body: extraBody,
            theme: 'grid',
            styles: { font: "times", fontSize: 8, cellPadding: 0.7, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 2: { halign: 'center' } }
        });

        y = (doc as any).lastAutoTable.finalY + 4;

        // D & E (Side by Side)
        const startY_DE = y;
        doc.setFontSize(9);
        doc.setFont("times", "bold");
        doc.text("D. Akhlak & Kepribadian", 15, y);

        autoTable(doc, {
            startY: y + 2,
            head: [['No', 'Aspek', 'Predikat', 'Keterangan']],
            body: [['1', 'Akhlak', 'A', 'Sangat Baik'], ['2', 'Kepribadian', 'A', 'Sangat Baik']],
            theme: 'grid',
            styles: { font: "times", fontSize: 8, cellPadding: 0.7, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 2: { halign: 'center' } },
            margin: { right: 115 },
        });
        const finalY_D = (doc as any).lastAutoTable.finalY;

        doc.text("E. Ketidakhadiran", 115, startY_DE);
        autoTable(doc, {
            startY: startY_DE + 2,
            head: [['No', 'Keterangan', 'Jumlah']],
            body: [
                ['1', 'Sakit', `${dataAttendance.s} Hari`],
                ['2', 'Izin', `${dataAttendance.i} Hari`],
                ['3', 'Tanpa Ket.', `${dataAttendance.a} Hari`]
            ],
            theme: 'grid',
            styles: { font: "times", fontSize: 8, cellPadding: 0.7, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0] },
            columnStyles: { 0: { halign: 'center', cellWidth: 8 }, 2: { halign: 'center' } },
            margin: { left: 115 },
        });
        const finalY_E = (doc as any).lastAutoTable.finalY;
        
        y = Math.max(finalY_D, finalY_E) + 8;

        // --- SIGNATURES (SINGLE ROW) ---
        // Layout: Left (KS), Center (Parent), Right (Wali)
        
        // Ensure space for signatures
        if (y > 290) { doc.addPage(); y = 20; }

        doc.setFont("times", "normal");
        doc.setFontSize(9);

        const yName = y + 22;
        const yNip = y + 26;

        const xLeft = 40;   // Kepala Sekolah
        const xCenter = 108; // Orang Tua
        const xRight = 175;  // Wali Kelas

        // 1. Wali Kelas (Right) with Date
        doc.text(`Mojokerto, ${dateStr}`, xRight, y, { align: "center" });
        doc.text("Wali Kelas", xRight, y + 4, { align: "center" });
        doc.setFont("times", "bold underline");
        doc.text(wk.name, xRight, yName, { align: "center" });
        doc.setFont("times", "normal");
        doc.text(`NIP. ${wk.nip}`, xRight, yNip, { align: "center" });

        // 2. Orang Tua (Center)
        doc.text("Mengetahui,", xCenter, y, { align: "center" }); // Align "Mengetahui" with "Mojokerto" line for symmetry
        doc.text("Orang Tua / Wali Murid", xCenter, y + 4, { align: "center" });
        doc.text("..........................................", xCenter, yName, { align: "center" });

        // 3. Kepala Sekolah (Left)
        doc.text("Mengetahui,", xLeft, y, { align: "center" });
        doc.text("Kepala Sekolah", xLeft, y + 4, { align: "center" });
        doc.setFont("times", "bold underline");
        doc.text(settings.principalName, xLeft, yName, { align: "center" });
        doc.setFont("times", "normal");
        doc.text(`NIP. ${settings.principalNip}`, xLeft, yNip, { align: "center" });


        // --- PAGE 2: MONITORING ---
        doc.addPage();
        y = 10;
        y = addKop(y);

        doc.setFont("times", "bold");
        doc.setFontSize(12);
        doc.text("CATATAN AKADEMIK SISWA", 108, y, { align: "center" });
        doc.text("DAFTAR TANGGUNGAN & REMIDI", 108, y + 6, { align: "center" });
        y += 20;
        y = addStudentHeader(y);

        doc.setFont("times", "bold");
        doc.text("I. Daftar Tanggungan (Nilai Kosong / 0)", 15, y);
        const tanggunganBody = dataIssues.tanggungan.map((item, i) => [i+1, item.subject, item.task, '0']);
        if (tanggunganBody.length === 0) tanggunganBody.push(['-', 'Tidak ada tanggungan', '-', '-']);

        autoTable(doc, {
            startY: y + 2,
            head: [['No', 'Mata Pelajaran', 'Tagihan', 'Nilai']],
            body: tanggunganBody,
            theme: 'grid',
            styles: { font: "times", fontSize: 9, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [255, 230, 230], textColor: [0, 0, 0] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;

        doc.setFont("times", "bold");
        doc.text("II. Daftar Remidi (Nilai < 70)", 15, y);
        const remidiBody = dataIssues.remidi.map((item, i) => [i+1, item.subject, item.task, item.score]);
        if (remidiBody.length === 0) remidiBody.push(['-', 'Tidak ada remidi', '-', '-']);

        autoTable(doc, {
            startY: y + 2,
            head: [['No', 'Mata Pelajaran', 'Tagihan', 'Nilai']],
            body: remidiBody,
            theme: 'grid',
            styles: { font: "times", fontSize: 9, cellPadding: 1, lineColor: [0, 0, 0], lineWidth: 0.1 },
            headStyles: { fillColor: [255, 240, 220], textColor: [0, 0, 0] },
        });
        y = (doc as any).lastAutoTable.finalY + 10;
        
        doc.setFont("times", "italic");
        doc.setFontSize(8);
        doc.text("* Mohon segera menyelesaikan tanggungan dan remidi sebelum Penilaian Akhir Semester.", 15, y);

        // Signatures Page 2 (Single Row)
        y += 15;
        doc.setFont("times", "normal");
        doc.setFontSize(9);

        const yName2 = y + 22;
        const yNip2 = y + 26;

        // 1. Wali Kelas (Right)
        doc.text(`Mojokerto, ${dateStr}`, xRight, y, { align: "center" });
        doc.text("Wali Kelas", xRight, y + 4, { align: "center" });
        doc.setFont("times", "bold underline");
        doc.text(wk.name, xRight, yName2, { align: "center" });
        doc.setFont("times", "normal");
        doc.text(`NIP. ${wk.nip}`, xRight, yNip2, { align: "center" });

        // 2. Orang Tua (Center)
        doc.text("Mengetahui,", xCenter, y, { align: "center" });
        doc.text("Orang Tua / Wali Murid", xCenter, y + 4, { align: "center" });
        doc.text("..........................................", xCenter, yName2, { align: "center" });

        // 3. Kepala Sekolah (Left)
        doc.text("Mengetahui,", xLeft, y, { align: "center" });
        doc.text("Kepala Sekolah", xLeft, y + 4, { align: "center" });
        doc.setFont("times", "bold underline");
        doc.text(settings.principalName, xLeft, yName2, { align: "center" });
        doc.setFont("times", "normal");
        doc.text(`NIP. ${settings.principalNip}`, xLeft, yNip2, { align: "center" });
    }

    // DRAW WATERMARK AS OVERLAY ON ALL PAGES
    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        if (settings.watermarkLogoUrl) {
            try {
                doc.saveGraphicsState();
                doc.setGState(new doc.GState({ opacity: 0.1 }));
                
                const x = (215.9 - wmWidth) / 2;
                const y = (330.2 - wmHeight) / 2;
                
                doc.addImage(settings.watermarkLogoUrl, 'PNG', x, y, wmWidth, wmHeight);
                doc.restoreGraphicsState();
            } catch (e) { /* ignore image error */ }
        }
    }

    const filename = mode === 'single' && selectedStudent 
        ? `Rapor_Sisipan_${selectedStudent.name}.pdf` 
        : `Rapor_Sisipan_Kelas_${selectedClass}.pdf`;

    doc.save(filename);
    setIsGenerating(false);
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 font-serif">
      {/* Controls */}
      <div className="p-4 bg-white border-b border-gray-200 flex flex-wrap gap-4 items-center justify-between print:hidden sticky top-0 z-10 shadow-sm font-sans">
        <div className="flex items-center gap-4">
          <div className="relative">
            <select
              value={selectedClass}
              onChange={(e) => { setSelectedClass(e.target.value); setSelectedStudentId(''); }}
              className="pl-4 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              disabled={students.length === 1} 
            >
              <option value="">Pilih Kelas</option>
              {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <ChevronDown className="absolute right-2 top-2.5 text-gray-400" size={16} />
          </div>

          <div className="relative">
            <select
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              disabled={!selectedClass || students.length === 1} 
              className="pl-4 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold focus:ring-2 focus:ring-blue-500 outline-none min-w-[250px]"
            >
              <option value="">Pilih Siswa</option>
              {classStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <User className="absolute right-2 top-2.5 text-gray-400" size={16} />
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setViewMode('rapor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'rapor' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <FileText size={16} /> Rapor Akademik
            </button>
            <button 
                onClick={() => setViewMode('tanggungan')}
                className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-bold transition-all ${viewMode === 'tanggungan' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <AlertCircle size={16} /> Tanggungan & Remidi
            </button>
        </div>

        <div className="flex items-center gap-2">
            <button 
            onClick={() => handleDownloadPDF('single')} 
            disabled={!selectedStudent || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-bold shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm"
            >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            PDF (Siswa)
            </button>
            
            <button 
            onClick={() => handleDownloadPDF('class')} 
            disabled={!selectedClass || isGenerating}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 font-bold shadow-md disabled:bg-gray-300 disabled:cursor-not-allowed transition-all text-sm"
            >
            {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <FileStack size={18} />}
            Semua (Kelas)
            </button>
        </div>
      </div>

      {/* Report Preview - Modified Signatures */}
      <div className="flex-1 overflow-auto p-8 custom-scrollbar print:p-0 print:overflow-visible">
        {selectedStudent ? (
          // Modified container for F4 Size (215mm x 330mm)
          <div ref={reportRef} className="bg-white max-w-[215mm] mx-auto min-h-[330mm] shadow-2xl print:shadow-none print:w-full print:max-w-none text-sm relative font-serif">
            
            {/* Watermark */}
            {settings.watermarkLogoUrl && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-0 opacity-10 print:opacity-10 overflow-hidden">
                    <img src={settings.watermarkLogoUrl} alt="Watermark" className="w-[400px] h-auto object-contain" />
                </div>
            )}

            {/* --- PAGE 1: RAPOR --- */}
            <div className={`p-[10mm_15mm] flex flex-col min-h-[330mm] h-full relative z-10 ${viewMode === 'tanggungan' ? 'hidden print:hidden' : ''}`}>
                
                {/* KOP SEKOLAH */}
                <div className="flex items-center justify-center border-b-4 border-double border-black pb-2 mb-4 gap-4">
                    <div className="w-24 h-24 flex items-center justify-center shrink-0">
                        <img 
                            src={settings.kabupatenLogoUrl || "https://upload.wikimedia.org/wikipedia/commons/e/e3/Logo_Kabupaten_Mojokerto.png"} 
                            alt="Logo Mojokerto" 
                            className="w-full h-auto object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }} 
                        />
                    </div>
                    <div className="text-center flex-1 font-serif leading-tight text-black">
                        {(settings.schoolHeader || [
                            "PEMERINTAH KABUPATEN MOJOKERTO",
                            "DINAS PENDIDIKAN",
                            "SMPN 3 PACET",
                            "Jl. Tirta Wening, Kab. Mojokerto, Jawa Timur 61374",
                            "Email: smpn3pacet2007@gmail.com, HP. 0815 5386 0273",
                            "Laman: https://sekolah.mojokertokab.go.id/smpn3pacet"
                        ]).map((line, idx) => (
                            <h3 key={idx} className={`${idx === 2 ? 'text-3xl font-bold tracking-wider my-1' : idx > 2 ? 'text-sm font-normal' : 'text-lg font-medium tracking-wide'}`}>
                                {line}
                            </h3>
                        ))}
                    </div>
                </div>

                {/* Header Title */}
                <div className="text-center mb-4 font-serif">
                    <h1 className="text-xl font-bold tracking-wide uppercase underline decoration-2 underline-offset-4">LAPORAN HASIL BELAJAR</h1>
                    <h1 className="text-sm font-bold tracking-wide uppercase mt-1">TENGAH SEMESTER {settings.activeSemester === 'ganjil' ? '1 (GANJIL)' : '2 (GENAP)'} TAHUN PELAJARAN {settings.academicYear}</h1>
                </div>

                {/* Student Info - Smaller Font */}
                <div className="mb-4 font-medium flex justify-between text-[11px]">
                <table className="w-2/3">
                    <tbody>
                    <tr><td className="w-24 py-0.5">Nama Siswa</td><td className="w-4">:</td><td className="font-bold uppercase">{selectedStudent.name}</td></tr>
                    <tr><td className="py-0.5">NIS / NISN</td><td>:</td><td>{selectedStudent.nis} / {selectedStudent.nisn || '-'}</td></tr>
                    </tbody>
                </table>
                <table className="w-1/3">
                    <tbody>
                        <tr><td className="w-20 py-0.5">Kelas</td><td className="w-4">:</td><td className="font-bold">{selectedStudent.kelas}</td></tr>
                        <tr><td className="py-0.5">Fase</td><td>:</td><td>D</td></tr>
                    </tbody>
                </table>
                </div>

                {/* A. Academic Table */}
                <div className="mb-4">
                <h3 className="font-bold text-sm mb-1 uppercase border-b border-black inline-block">A. Nilai Akademik</h3>
                <table className="w-full border-collapse border border-black text-[9px] font-serif">
                    <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1 w-6 text-center" rowSpan={2}>No</th>
                        <th className="border border-black p-1 text-left w-48" rowSpan={2}>Mata Pelajaran</th>
                        {chapterConfig.activeChaps.map(chap => (
                            <th key={chap} className="border border-black p-1 text-center uppercase" colSpan={chapterConfig.colMap[chap].length}>
                                {chap.replace('bab','TP ')}
                            </th>
                        ))}
                        <th className="border border-black p-1 w-10 text-center" rowSpan={2}>KTS</th>
                        <th className="border border-black p-1 w-10 text-center" rowSpan={2}>Rata<br/>Rata</th>
                    </tr>
                    <tr className="bg-gray-50">
                        {chapterConfig.activeChaps.map(chap => (
                            <React.Fragment key={chap}>
                                {chapterConfig.colMap[chap].map(f => (
                                    <th key={`${chap}-${f}`} className="border border-black p-1 w-8 text-center uppercase font-normal">
                                        {f === 'sum' ? `S${chap.replace('bab','')}` : f.toUpperCase()}
                                    </th>
                                ))}
                            </React.Fragment>
                        ))}
                    </tr>
                    </thead>
                    <tbody>
                    {subjectsData.map((subj, idx) => (
                        <tr key={idx}>
                        <td className="border border-black p-0.5 text-center">{idx + 1}</td>
                        <td className="border border-black p-0.5 font-medium">{subj.subject}</td>
                        {chapterConfig.activeChaps.map(chap => (
                            <React.Fragment key={chap}>
                                {chapterConfig.colMap[chap].map(f => (
                                    <td key={`${chap}-${f}`} className="border border-black p-0.5 text-center">
                                        {subj.chapterScores[`${chap}_${f}`]}
                                    </td>
                                ))}
                            </React.Fragment>
                        ))}
                        <td className="border border-black p-0.5 text-center">
                            {subj.kts !== null ? subj.kts : '-'}
                        </td>
                        <td className="border border-black p-0.5 text-center font-bold bg-gray-50">
                            {subj.finalAvg !== null ? subj.finalAvg : '-'}
                        </td>
                        </tr>
                    ))}
                    </tbody>
                </table>
                </div>

                {/* B. Kokurikuler */}
                <div className="mb-4">
                <h3 className="font-bold text-sm mb-1 uppercase border-b border-black inline-block">B. Kokurikuler</h3>
                <table className="w-full border-collapse border border-black text-[9px] font-serif">
                    <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1 w-8 text-center">No</th>
                        <th className="border border-black p-1 w-1/3 text-left">Tema</th>
                        <th className="border border-black p-1 text-left">Deskripsi</th>
                    </tr>
                    </thead>
                    <tbody>
                    {settings.kokurikulerProjects && settings.kokurikulerProjects.length > 0 ? (
                        settings.kokurikulerProjects.map((proj, idx) => (
                            <tr key={idx}>
                                <td className="border border-black p-0.5 text-center">{idx + 1}</td>
                                <td className="border border-black p-0.5 font-medium">{proj.theme}</td>
                                <td className="border border-black p-0.5">{proj.description}</td>
                            </tr>
                        ))
                    ) : (
                        <tr><td className="border border-black p-0.5 text-center" colSpan={3}>-</td></tr>
                    )}
                    </tbody>
                </table>
                </div>

                {/* C. Ekstrakurikuler */}
                <div className="mb-4">
                <h3 className="font-bold text-sm mb-1 uppercase border-b border-black inline-block">C. Ekstrakurikuler</h3>
                <table className="w-full border-collapse border border-black text-[9px] font-serif">
                    <thead>
                    <tr className="bg-gray-100">
                        <th className="border border-black p-1 w-8 text-center">No</th>
                        <th className="border border-black p-1 w-1/3 text-left">Nama Ekstrakurikuler</th>
                        <th className="border border-black p-1 w-16 text-center">Predikat</th>
                        <th className="border border-black p-1 text-left">Deskripsi</th>
                    </tr>
                    </thead>
                    <tbody>
                    {extraData.length > 0 ? extraData.map((extra, i) => (
                        <tr key={i}>
                            <td className="border border-black p-0.5 text-center">{i + 1}</td>
                            <td className="border border-black p-0.5 font-medium">{extra.activityName}</td>
                            <td className="border border-black p-0.5 text-center font-bold">{extra.predikat}</td>
                            <td className="border border-black p-0.5">{extra.description}</td>
                        </tr>
                    )) : (
                        <tr>
                            <td className="border border-black p-0.5 text-center" colSpan={4}>-</td>
                        </tr>
                    )}
                    </tbody>
                </table>
                </div>

                <div className="flex gap-4">
                    {/* D. Akhlak & Kepribadian */}
                    <div className="flex-1 mb-4">
                    <h3 className="font-bold text-sm mb-1 uppercase border-b border-black inline-block">D. Akhlak & Kepribadian</h3>
                    <table className="w-full border-collapse border border-black text-[9px] font-serif">
                        <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1 w-8 text-center">No</th>
                            <th className="border border-black p-1 text-left">Aspek</th>
                            <th className="border border-black p-1 w-16 text-center">Predikat</th>
                            <th className="border border-black p-1 text-left">Keterangan</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td className="border border-black p-0.5 text-center">1</td>
                            <td className="border border-black p-0.5">Akhlak</td>
                            <td className="border border-black p-0.5 text-center font-bold">
                                <span className="print:inline">A</span>
                            </td>
                            <td className="border border-black p-0.5">Sangat Baik</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-0.5 text-center">2</td>
                            <td className="border border-black p-0.5">Kepribadian</td>
                            <td className="border border-black p-0.5 text-center font-bold">
                                <span className="print:inline">A</span>
                            </td>
                            <td className="border border-black p-0.5">Sangat Baik</td>
                        </tr>
                        </tbody>
                    </table>
                    </div>

                    {/* E. Presensi */}
                    <div className="flex-1 mb-4">
                    <h3 className="font-bold text-sm mb-1 uppercase border-b border-black inline-block">E. Ketidakhadiran</h3>
                    <table className="w-full border-collapse border border-black text-[9px] font-serif">
                        <thead>
                        <tr className="bg-gray-100">
                            <th className="border border-black p-1 w-8 text-center">No</th>
                            <th className="border border-black p-1 text-left">Keterangan</th>
                            <th className="border border-black p-1 w-24 text-center">Jumlah</th>
                        </tr>
                        </thead>
                        <tbody>
                        <tr>
                            <td className="border border-black p-0.5 text-center">1</td>
                            <td className="border border-black p-0.5">Sakit</td>
                            <td className="border border-black p-0.5 text-center">{attendanceData.s} Hari</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-0.5 text-center">2</td>
                            <td className="border border-black p-0.5">Izin</td>
                            <td className="border border-black p-0.5 text-center">{attendanceData.i} Hari</td>
                        </tr>
                        <tr>
                            <td className="border border-black p-0.5 text-center">3</td>
                            <td className="border border-black p-0.5">Tanpa Keterangan</td>
                            <td className="border border-black p-0.5 text-center">{attendanceData.a} Hari</td>
                        </tr>
                        </tbody>
                    </table>
                    </div>
                </div>

                {/* Signatures Page 1 (Single Row: KS - Parent - WK) */}
                <div className="mt-auto pt-2 flex justify-between items-end text-xs break-inside-avoid">
                    {/* Kiri: Kepala Sekolah */}
                    <div className="text-center w-40">
                        <p className="mb-16">Mengetahui,<br/>Kepala Sekolah</p>
                        <p className="font-bold underline">{settings.principalName}</p>
                        <p>NIP. {settings.principalNip}</p>
                    </div>

                    {/* Tengah: Orang Tua */}
                    <div className="text-center w-40">
                        <p className="mb-16">Mengetahui,<br/>Orang Tua / Wali Murid</p>
                        <p className="font-bold border-b border-black inline-block min-w-[120px]"></p>
                    </div>

                    {/* Kanan: Wali Kelas */}
                    <div className="text-center w-40">
                        <p className="mb-16">
                            Mojokerto, {settings.midSemesterDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
                            Wali Kelas
                        </p>
                        <p className="font-bold underline">{waliKelasInfo.name}</p>
                        <p className="mt-1">NIP. {waliKelasInfo.nip}</p>
                    </div>
                </div>
            </div>

            {/* --- PAGE 2: MONITORING TANGGUNGAN & REMIDI --- */}
            {/* Same layout for Page 2 preview */}
            <div className={`p-[10mm_15mm] h-full flex flex-col min-h-[330mm] relative z-10 ${viewMode === 'rapor' ? 'hidden print:hidden' : ''}`}>
                
                {/* KOP SEKOLAH (Repeated on Page 2) */}
                <div className="flex items-center justify-center border-b-4 border-double border-black pb-2 mb-6 gap-4">
                    <div className="w-24 h-24 flex items-center justify-center shrink-0">
                        <img 
                            src={settings.kabupatenLogoUrl || "https://upload.wikimedia.org/wikipedia/commons/e/e3/Logo_Kabupaten_Mojokerto.png"} 
                            alt="Logo Mojokerto" 
                            className="w-full h-auto object-contain"
                            onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                            }} 
                        />
                    </div>
                    <div className="text-center flex-1 font-serif leading-tight text-black">
                        {(settings.schoolHeader || [
                            "PEMERINTAH KABUPATEN MOJOKERTO",
                            "DINAS PENDIDIKAN",
                            "SMPN 3 PACET",
                            "Jl. Tirta Wening, Kab. Mojokerto, Jawa Timur 61374",
                            "Email: smpn3pacet2007@gmail.com, HP. 0815 5386 0273",
                            "Laman: https://sekolah.mojokertokab.go.id/smpn3pacet"
                        ]).map((line, idx) => (
                            <h3 key={idx} className={`${idx === 2 ? 'text-3xl font-bold tracking-wider my-1' : idx > 2 ? 'text-sm font-normal' : 'text-lg font-medium tracking-wide'}`}>
                                {line}
                            </h3>
                        ))}
                    </div>
                </div>

                <div className="text-center mb-6 font-serif">
                    <h1 className="text-lg font-bold tracking-wide uppercase">CATATAN AKADEMIK SISWA</h1>
                    <h1 className="text-base font-bold tracking-wide uppercase mt-1">DAFTAR TANGGUNGAN & REMIDI</h1>
                </div>

                {/* Student Info */}
                <div className="mb-6 font-medium flex justify-between text-xs">
                <table className="w-2/3">
                    <tbody>
                    <tr><td className="w-24 py-1">Nama Siswa</td><td className="w-4">:</td><td className="font-bold uppercase">{selectedStudent.name}</td></tr>
                    <tr><td className="py-1">NIS / NISN</td><td>:</td><td>{selectedStudent.nis} / {selectedStudent.nisn || '-'}</td></tr>
                    </tbody>
                </table>
                <table className="w-1/3">
                    <tbody>
                        <tr><td className="w-20 py-1">Kelas</td><td className="w-4">:</td><td className="font-bold">{selectedStudent.kelas}</td></tr>
                    </tbody>
                </table>
                </div>

                <div className="mb-6">
                    <h3 className="font-bold text-sm mb-2">I. Daftar Tanggungan (Nilai Kosong / 0)</h3>
                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr className="bg-red-50">
                                <th className="border border-black p-1 w-8 text-center">No</th>
                                <th className="border border-black p-1 text-left">Mata Pelajaran</th>
                                <th className="border border-black p-1 text-left">Tagihan</th>
                                <th className="border border-black p-1 w-16 text-center">Nilai</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentIssues.tanggungan.length > 0 ? (
                                studentIssues.tanggungan.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-black p-1 text-center">{idx + 1}</td>
                                        <td className="border border-black p-1">{item.subject}</td>
                                        <td className="border border-black p-1">{item.task}</td>
                                        <td className="border border-black p-1 text-center font-bold text-red-600">0</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td className="border border-black p-1 text-center" colSpan={4}>Tidak ada tanggungan</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="mb-4">
                    <h3 className="font-bold text-sm mb-2">II. Daftar Remidi (Nilai &lt; 70)</h3>
                    <table className="w-full border-collapse border border-black text-xs">
                        <thead>
                            <tr className="bg-orange-50">
                                <th className="border border-black p-1 w-8 text-center">No</th>
                                <th className="border border-black p-1 text-left">Mata Pelajaran</th>
                                <th className="border border-black p-1 text-left">Tagihan</th>
                                <th className="border border-black p-1 w-16 text-center">Nilai</th>
                            </tr>
                        </thead>
                        <tbody>
                            {studentIssues.remidi.length > 0 ? (
                                studentIssues.remidi.map((item, idx) => (
                                    <tr key={idx}>
                                        <td className="border border-black p-1 text-center">{idx + 1}</td>
                                        <td className="border border-black p-1">{item.subject}</td>
                                        <td className="border border-black p-1">{item.task}</td>
                                        <td className="border border-black p-1 text-center font-bold text-orange-600">{item.score}</td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td className="border border-black p-1 text-center" colSpan={4}>Tidak ada remidi</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                
                <p className="text-[10px] italic mt-2">* Mohon segera menyelesaikan tanggungan dan remidi sebelum Penilaian Akhir Semester.</p>

                {/* Signatures Page 2 */}
                <div className="mt-auto pt-4 flex justify-between items-end text-xs break-inside-avoid">
                    <div className="text-center w-40">
                        <p className="mb-16">Mengetahui,<br/>Kepala Sekolah</p>
                        <p className="font-bold underline">{settings.principalName}</p>
                        <p>NIP. {settings.principalNip}</p>
                    </div>
                    <div className="text-center w-40">
                        <p className="mb-16">Mengetahui,<br/>Orang Tua / Wali Murid</p>
                        <p className="font-bold border-b border-black inline-block min-w-[120px]"></p>
                    </div>
                    <div className="text-center w-40">
                        <p className="mb-16">
                            Mojokerto, {settings.midSemesterDate || new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}<br/>
                            Wali Kelas
                        </p>
                        <p className="font-bold underline">{waliKelasInfo.name}</p>
                        <p className="mt-1">NIP. {waliKelasInfo.nip}</p>
                    </div>
                </div>
            </div>

          </div>
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <User size={64} className="mb-4 opacity-20" />
            <p>Pilih kelas dan siswa untuk melihat rapor sisipan.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default MidSemesterReportView;

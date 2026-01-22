
import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Student, Teacher, AppSettings, ChapterKey, FormativeKey, GradingSession, SemesterData } from '../types';
import { calculateChapterAverage, createEmptySemesterData } from '../utils';
import { ChevronDown, Search, User, FileText, AlertCircle, Download, FileStack, Loader2, RefreshCw, Printer, List, CheckCircle, AlertTriangle } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

interface MidSemesterReportViewProps {
  students: Student[];
  teachers: Teacher[];
  settings: AppSettings;
  assessmentHistory?: GradingSession[]; 
  allowDownload?: boolean; 
}

const MidSemesterReportView: React.FC<MidSemesterReportViewProps> = ({ 
    students, 
    teachers, 
    settings, 
    assessmentHistory = [],
    allowDownload = true 
}) => {
  const reportRef = useRef<HTMLDivElement>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedClass, setSelectedClass] = useState<string>('');
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  // Combined mode 'masalah' instead of separate 'tanggungan'/'remidi'
  const [viewMode, setViewMode] = useState<'rapor' | 'masalah'>('rapor'); 

  // Select active semester P5 projects
  const activeP5Projects = settings.kokurikulerProjects[settings.activeSemester] || [];

  // Subject Order
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

  const uniqueClasses = useMemo(() => Array.from(new Set(students.map(s => s.kelas))).sort(), [students]);
  const classStudents = useMemo(() => students.filter(s => s.kelas === selectedClass).sort((a, b) => a.name.localeCompare(b.name)), [students, selectedClass]);
  const selectedStudent = useMemo(() => students.find(s => s.id.toString() === selectedStudentId), [students, selectedStudentId]);

  // Auto-select logic
  useEffect(() => {
      if (students.length === 1) {
          const s = students[0];
          setSelectedClass(s.kelas);
          setSelectedStudentId(s.id.toString());
      } else if (!selectedClass && uniqueClasses.length > 0) {
          const firstClass = uniqueClasses[0];
          setSelectedClass(firstClass);
          const studentsInFirstClass = students.filter(s => s.kelas === firstClass).sort((a, b) => a.name.localeCompare(b.name));
          if (studentsInFirstClass.length > 0) setSelectedStudentId(studentsInFirstClass[0].id.toString());
      }
  }, [students, uniqueClasses, selectedClass]); 
  
  useEffect(() => {
      if (selectedClass && classStudents.length > 0 && !classStudents.find(s => s.id.toString() === selectedStudentId)) {
          setSelectedStudentId(classStudents[0].id.toString());
      }
  }, [selectedClass, classStudents]);

  const waliKelasInfo = useMemo(() => settings.waliKelasMap?.[selectedClass] || { name: '..................................', nip: '..................................' }, [settings.waliKelasMap, selectedClass]);
  const attendanceData = useMemo(() => selectedStudent?.attendance?.[settings.activeSemester] || { s: 0, i: 0, a: 0 }, [selectedStudent, settings.activeSemester]);
  const extraData = useMemo(() => selectedStudent?.extracurricularRecord?.[settings.activeSemester] || [], [selectedStudent, settings.activeSemester]);

  // --- Data Calculations ---
  
  const getChapterConfig = () => {
      const activeChaps: ChapterKey[] = [];
      const colMap: Record<ChapterKey, FormativeKey[]> = { bab1:[], bab2:[], bab3:[], bab4:[], bab5:[] };
      
      const fieldConfig = settings.midSemesterFieldConfig || {};
      const visibleChapters = settings.visibleChapters || { bab1: true, bab2: true, bab3: true, bab4: true, bab5: true };
      
      (['bab1', 'bab2', 'bab3', 'bab4', 'bab5'] as ChapterKey[]).forEach(chap => {
          // Only include if Visible AND has fields configured
          if (visibleChapters[chap] && fieldConfig[chap]) {
              const activeFields = Object.entries(fieldConfig[chap])
                  .filter(([_, isActive]) => isActive)
                  .map(([field]) => field as FormativeKey)
                  .sort((a, b) => {
                      // Ensure sum is last
                      if (a === 'sum') return 1; if (b === 'sum') return -1; return a.localeCompare(b);
                  });
              
              if (activeFields.length > 0) {
                  activeChaps.push(chap);
                  colMap[chap] = activeFields;
              }
          }
      });
      
      return { activeChaps, colMap };
  };

  const chapterConfig = useMemo(() => getChapterConfig(), [settings.midSemesterFieldConfig, settings.visibleChapters]);

  const calculateStudentSubjectsData = (student: Student, targetClass: string) => {
    const classSubjects = new Set<string>();
    teachers.forEach(t => { if (t.classes.includes(targetClass)) classSubjects.add(t.subject); });
    classSubjects.add('Pendidikan Agama Islam');
    const sortedSubjects = Array.from(classSubjects).filter(s => s !== 'Bimbingan Konseling').sort((a, b) => getSubjectSortIndex(a) - getSubjectSortIndex(b));
    const config = getChapterConfig();

    return sortedSubjects.map(subject => {
      // UNIFIED DATA ACCESS
      let grades = student.gradesBySubject?.[subject]?.[settings.activeSemester];
      if (!grades && subject === 'Pendidikan Agama Islam') {
          grades = student.grades?.[settings.activeSemester];
      }
      if (!grades) grades = createEmptySemesterData();

      const chapterScores: Record<string, string> = {}; 
      let totalScore = 0; let count = 0;

      config.activeChaps.forEach(chap => {
        // Safe access to chapter data using fallback
        const chapGrades = grades[chap] || { f1: null, f2: null, f3: null, f4: null, f5: null, sum: null };
        config.colMap[chap].forEach(f => { 
            chapterScores[`${chap}_${f}`] = (chapGrades[f] !== null && chapGrades[f] !== undefined) ? chapGrades[f]!.toString() : '-'; 
        });
        const avg = calculateChapterAverage(chapGrades, ['f1', 'f2', 'f3', 'f4', 'f5', 'sum'].filter(f => chapGrades[f as FormativeKey] !== null) as FormativeKey[]);
        if (avg !== null) { totalScore += avg; count++; }
      });

      if (grades.kts !== null && grades.kts !== undefined) { totalScore += grades.kts; count++; }
      const finalAvg = count > 0 ? Math.round(totalScore / count) : null;
      return { subject, chapterScores, kts: grades.kts, finalAvg };
    });
  };

  const subjectsData = useMemo(() => selectedStudent && selectedClass ? calculateStudentSubjectsData(selectedStudent, selectedClass) : [], [selectedStudent, selectedClass, teachers, settings.activeSemester, chapterConfig]);

  // --- Monitoring Calculation (Detailed for Report) ---
  const getAllProblematicGrades = (student: Student) => {
      const relevantHistory = assessmentHistory.filter(h => 
          h.targetClass === student.kelas && h.semester === settings.activeSemester
      );

      const problems: any[] = [];

      relevantHistory.forEach(session => {
          const subject = session.targetSubject || 'Pendidikan Agama Islam';
          let grade = null;
          
          // UNIFIED DATA ACCESS
          let grades = student.gradesBySubject?.[subject]?.[settings.activeSemester];
          if (!grades && subject === 'Pendidikan Agama Islam') {
              grades = student.grades?.[settings.activeSemester];
          }

          if (!grades) return;

          if (session.type === 'bab' && session.chapterKey && session.formativeKey) {
              grade = grades[session.chapterKey]?.[session.formativeKey] ?? null;
          } else if (session.type === 'kts') {
              grade = grades.kts;
          } else if (session.type === 'sas') {
              grade = grades.sas;
          } else if (session.type === 'up') {
              grade = grades.nilaiUp;
          }

          // Conditions
          const isTanggungan = (grade === 0);
          const isRemidi = (grade !== null && grade > 0 && grade < 75);

          if (isTanggungan || isRemidi) {
               let taskName = session.type.toUpperCase();
               if (session.type === 'bab' && session.chapterKey) {
                   const num = session.chapterKey.replace('bab','');
                   const field = session.formativeKey === 'sum' ? 'Sumatif' : session.formativeKey?.toUpperCase();
                   taskName = `TP ${num} (${field})`;
               }
               
               problems.push({
                   subject,
                   taskName,
                   date: session.date,
                   score: grade,
                   description: session.description || '-',
                   type: isTanggungan ? 'TANGGUNGAN' : 'REMIDI'
               });
          }
      });
      
      // Sort by Subject then Date
      return problems.sort((a,b) => {
          const subDiff = getSubjectSortIndex(a.subject) - getSubjectSortIndex(b.subject);
          if (subDiff !== 0) return subDiff;
          return a.date.localeCompare(b.date);
      });
  };

  const allProblems = useMemo(() => selectedStudent ? getAllProblematicGrades(selectedStudent) : [], [selectedStudent, assessmentHistory]);

  // --- PDF GENERATION (Combined) ---
  const handleDownloadPDF = async (mode: 'single' | 'class') => {
    if (!selectedClass) return;
    setIsGenerating(true);
    await new Promise(r => setTimeout(r, 100));

    const targets = mode === 'single' ? (selectedStudent ? [selectedStudent] : []) : classStudents;
    
    // F4 Size (Folio) - 215.9 x 330.2 mm
    const PAGE_WIDTH = 215.9;
    const PAGE_HEIGHT = 330.2;
    const MARGIN = 15;
    const PRINT_WIDTH = PAGE_WIDTH - (MARGIN * 2);
    
    const doc = new jsPDF({ orientation: 'p', unit: 'mm', format: [PAGE_WIDTH, PAGE_HEIGHT] });

    // Pre-calculate watermark ratio
    let wmWidth = 100;
    let wmHeight = 100;

    if (settings.watermarkLogoUrl) {
        try {
            const img = new Image();
            img.src = settings.watermarkLogoUrl;
            await new Promise((resolve) => {
                if (img.complete) resolve(true);
                img.onload = () => resolve(true);
                img.onerror = () => resolve(false);
            });
            
            if (img.naturalWidth && img.naturalHeight) {
                const ratio = img.naturalWidth / img.naturalHeight;
                // Maximum dimension box 120mm
                const maxSize = 120;
                
                if (ratio > 1) { // Landscape
                    wmWidth = maxSize;
                    wmHeight = maxSize / ratio;
                } else { // Portrait or Square
                    wmHeight = maxSize;
                    wmWidth = maxSize * ratio;
                }
            }
        } catch (e) {
            console.warn("Could not calculate watermark ratio", e);
        }
    }

    // HELPER: Draw Watermark with correct ratio
    const drawWatermark = () => {
        if (settings.watermarkLogoUrl) {
            try {
                doc.saveGraphicsState();
                doc.setGState(new (doc as any).GState({ opacity: 0.1 }));
                // Center watermark
                doc.addImage(settings.watermarkLogoUrl, 'PNG', (PAGE_WIDTH - wmWidth) / 2, (PAGE_HEIGHT - wmHeight) / 2, wmWidth, wmHeight);
                doc.restoreGraphicsState();
            } catch(e) { console.warn("Watermark error:", e); }
        }
    };

    for (let i = 0; i < targets.length; i++) {
        const student = targets[i];
        
        if (i > 0) doc.addPage();

        // === PAGE 1: RAPOR SISIPAN ===
        drawWatermark(); // PAGE 1 WATERMARK

        // --- HEADER (KOP) ---
        let y = 15; 
        const headerX = PAGE_WIDTH / 2;
        
        if (settings.kabupatenLogoUrl) { 
            try { 
                doc.addImage(settings.kabupatenLogoUrl, 'PNG', MARGIN, y, 22, 28); 
            } catch(e){} 
        }
        
        const headerLines = settings.schoolHeader && settings.schoolHeader.length > 0 
            ? settings.schoolHeader 
            : ["PEMERINTAH KABUPATEN MOJOKERTO", "DINAS PENDIDIKAN", "SMPN 3 PACET", "Jl. Tirta Wening, Kab. Mojokerto, Jawa Timur 61374", "Email: smpn3pacet2007@gmail.com, HP. 0815 5386 0273", "Laman: https://sekolah.mojokertokab.go.id/smpn3pacet"];

        doc.setFont("times", "bold"); doc.setFontSize(14);
        doc.text(headerLines[0] || "", headerX, y + 6, { align: 'center' });
        doc.text(headerLines[1] || "", headerX, y + 12, { align: 'center' });
        doc.setFontSize(18);
        doc.text(headerLines[2] || "", headerX, y + 20, { align: 'center' });
        doc.setFont("times", "normal"); doc.setFontSize(9);
        doc.text(headerLines[3] || "", headerX, y + 26, { align: 'center' });
        doc.text((headerLines[4] || "") + " " + (headerLines[5] || ""), headerX, y + 30, { align: 'center' });
        
        y += 35;
        doc.setLineWidth(0.5); doc.line(MARGIN, y, PAGE_WIDTH - MARGIN, y); 
        doc.setLineWidth(0.2); doc.line(MARGIN, y+1, PAGE_WIDTH - MARGIN, y+1);
        y += 8;

        // --- TITLE ---
        doc.setFont("times", "bold"); doc.setFontSize(12);
        doc.text("LAPORAN HASIL BELAJAR SISWA (SISIPAN)", headerX, y, { align: "center" });
        doc.text(`TENGAH SEMESTER ${settings.activeSemester.toUpperCase()} TAHUN PELAJARAN ${settings.academicYear}`, headerX, y + 5, { align: "center" });
        y += 12;

        // --- STUDENT INFO ---
        doc.setFont("times", "normal"); doc.setFontSize(10);
        const col1X = MARGIN; 
        const col1ValX = MARGIN + 28;
        const col2X = headerX + 20;
        const col2ValX = headerX + 40;

        doc.text(`Nama Siswa`, col1X, y); doc.text(`: ${student.name}`, col1ValX, y);
        doc.text(`Kelas`, col2X, y); doc.text(`: ${student.kelas}`, col2ValX, y);
        
        y+=5;
        doc.text(`NIS / NISN`, col1X, y); doc.text(`: ${student.nis} / ${student.nisn||'-'}`, col1ValX, y);
        doc.text(`Fase`, col2X, y); doc.text(`: D`, col2ValX, y);
        y += 10;

        // --- DATA CONTENT ---
        const dataSubjects = calculateStudentSubjectsData(student, selectedClass);
        const dataExtra = student.extracurricularRecord?.[settings.activeSemester] || [];
        const attendance = student.attendance?.[settings.activeSemester] || {s:0,i:0,a:0};

        // TABLE A: AKADEMIK
        doc.setFont("times", "bold"); doc.text("A. Nilai Akademik", MARGIN, y);
        y += 2;
        
        const head: any[][] = [[
            { content: 'No', rowSpan: 2 }, 
            { content: 'Mata Pelajaran', rowSpan: 2 },
            ...chapterConfig.activeChaps.map(c => ({ content: c.replace('bab','TP '), colSpan: chapterConfig.colMap[c].length, styles: {halign: 'center'} })),
            { content: 'KTS', rowSpan: 2 }, { content: 'Rerata', rowSpan: 2 }
        ]];
        const subHeaders: any[] = [];
        chapterConfig.activeChaps.forEach(c => chapterConfig.colMap[c].forEach(f => subHeaders.push({ content: f==='sum'?'Sum':f.toUpperCase(), styles: {halign: 'center', fontSize: 8} })));
        head.push(subHeaders);

        const body = dataSubjects.map((s, idx) => [
            idx+1, s.subject, 
            ...chapterConfig.activeChaps.flatMap(c => chapterConfig.colMap[c].map(f => s.chapterScores[`${c}_${f}`]||'-')),
            s.kts||'-', s.finalAvg||'-'
        ]);

        autoTable(doc, {
            startY: y, head, body, theme: 'grid',
            styles: { 
                font: "times", 
                fontSize: 9, 
                cellPadding: 1, 
                lineColor: 0, 
                lineWidth: 0.1, 
                overflow: 'linebreak',
                fillColor: false as any // Make cells transparent so watermark shows
            },
            headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold', valign: 'middle' },
            columnStyles: { 0: {halign:'center', cellWidth: 8} },
            margin: { left: MARGIN, right: MARGIN },
            tableWidth: PRINT_WIDTH
        });
        y = (doc as any).lastAutoTable.finalY + 5;

        // TABLE B: KOKURIKULER
        doc.setFont("times", "bold"); doc.text("B. Projek Penguatan Profil Pelajar Pancasila (Kokurikuler)", MARGIN, y);
        y += 2;
        const p5Body = activeP5Projects.map((p, idx) => [idx + 1, p.theme, p.description]);
        if (p5Body.length === 0) p5Body.push(['-', '-', '-']);
        autoTable(doc, {
            startY: y, head: [['No', 'Tema', 'Uraian Kegiatan']], body: p5Body, theme: 'grid',
            styles: { font: "times", fontSize: 9, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1, fillColor: false as any },
            headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold', valign: 'middle', halign: 'center' },
            columnStyles: { 0: {halign: 'center', cellWidth: 8}, 1: {cellWidth: 50} },
            margin: { left: MARGIN, right: MARGIN },
            tableWidth: PRINT_WIDTH
        });
        y = (doc as any).lastAutoTable.finalY + 5;

        // TABLE C: EKSTRA
        doc.setFont("times", "bold"); doc.text("C. Ekstrakurikuler", MARGIN, y);
        y += 2;
        const extraBody = (dataExtra || []).map((e, idx) => [idx + 1, e.activityName, e.predikat, e.description]);
        if (extraBody.length === 0) extraBody.push(['-', '-', '-', '-']);
        autoTable(doc, {
            startY: y, head: [['No', 'Nama Kegiatan', 'Predikat', 'Keterangan']], body: extraBody, theme: 'grid',
            styles: { font: "times", fontSize: 9, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1, fillColor: false as any },
            headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold', valign: 'middle', halign: 'center' },
            columnStyles: { 0: {halign: 'center', cellWidth: 8}, 2: {halign: 'center', cellWidth: 20} },
            margin: { left: MARGIN, right: MARGIN },
            tableWidth: PRINT_WIDTH
        });
        y = (doc as any).lastAutoTable.finalY + 5;

        // TABLE D & E (SIDE BY SIDE PROPORTIONAL)
        const startY_DE = y;
        
        // Table D (Absensi) - Width approx 80mm
        doc.setFont("times", "bold"); doc.text("D. Ketidakhadiran", MARGIN, y);
        const attendanceBody = [['Sakit', `${attendance.s} hari`], ['Izin', `${attendance.i} hari`], ['Tanpa Keterangan', `${attendance.a} hari`]];
        
        autoTable(doc, {
            startY: y + 2, body: attendanceBody, theme: 'grid',
            styles: { font: "times", fontSize: 9, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1, fillColor: false as any },
            columnStyles: { 0: {cellWidth: 40}, 1: {cellWidth: 30, halign: 'center'} },
            margin: { left: MARGIN },
            tableWidth: 70
        });
        const finalY_D = (doc as any).lastAutoTable.finalY;

        // Table E (Kepribadian) - Align right side, Start same Y as title D
        const tableE_X = MARGIN + 80; 
        doc.text("E. Kepribadian & Akhlak", tableE_X, startY_DE);
        const kepribadianBody = [['1', 'Kelakuan / Akhlak', 'Baik'], ['2', 'Kerajinan', 'Baik'], ['3', 'Kerapian', 'Baik']];
        
        autoTable(doc, {
            startY: startY_DE + 2, head: [['No', 'Aspek', 'Keterangan']], body: kepribadianBody, theme: 'grid',
            styles: { font: "times", fontSize: 9, cellPadding: 1.5, lineColor: 0, lineWidth: 0.1, fillColor: false as any },
            headStyles: { fillColor: [230, 230, 230], textColor: 0, fontStyle: 'bold', valign: 'middle', halign: 'center' },
            columnStyles: { 0: {halign: 'center', cellWidth: 8}, 2: {halign: 'center'} },
            margin: { left: tableE_X, right: MARGIN }
        });
        
        // Update Y to the lowest point of either table + spacing
        y = Math.max(finalY_D, (doc as any).lastAutoTable.finalY) + 15;

        // --- SIGNATURES (Page 1) ---
        // Check if enough space for signatures (need approx 40mm)
        // If y + 40 > PageHeight - Margin, add new page
        if (y + 40 > PAGE_HEIGHT - MARGIN) { 
            doc.addPage(); 
            drawWatermark(); // Draw watermark on new page for signatures
            y = 20; 
        } 
        
        const wk = settings.waliKelasMap?.[selectedClass] || { name: '...', nip: '...' };
        
        // Get date based on semester
        const reportDate = settings.midSemesterDate[settings.activeSemester] || new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'});
        
        doc.setFontSize(10); doc.setFont("times", "normal");
        
        // Use relative positions for signatures based on Page Width
        const sigY = y;
        const sigLeftX = MARGIN + 20;
        const sigRightX = PAGE_WIDTH - MARGIN - 40;
        const sigCenterX = PAGE_WIDTH / 2;

        // Top Signatures
        doc.text("Mengetahui,", sigLeftX, sigY, { align: 'center' });
        doc.text("Orang Tua / Wali", sigLeftX, sigY + 4, { align: 'center' });
        
        doc.text(`Mojokerto, ${reportDate}`, sigRightX, sigY, { align: 'center' });
        doc.text("Wali Kelas", sigRightX, sigY + 4, { align: 'center' });

        // Names
        const nameY = sigY + 25;
        doc.text("(....................................)", sigLeftX, nameY, { align: 'center' });
        
        doc.setFont("times", "bold");
        doc.text(wk.name, sigRightX, nameY, { align: 'center' });
        doc.setFont("times", "normal");
        doc.text(`NIP. ${wk.nip}`, sigRightX, nameY + 4, { align: 'center' });

        // Principal Signature
        const principalY = nameY + 10;
        doc.text("Mengetahui,", sigCenterX, principalY, { align: 'center' });
        doc.text("Kepala SMPN 3 Pacet", sigCenterX, principalY + 4, { align: 'center' });
        
        const principalNameY = principalY + 25;
        doc.setFont("times", "bold");
        doc.text(settings.principalName, sigCenterX, principalNameY, { align: 'center' });
        doc.setFont("times", "normal");
        doc.text(`NIP. ${settings.principalNip}`, sigCenterX, principalNameY + 4, { align: 'center' });

        // === PAGE 2: MASALAH AKADEMIK (ALWAYS ADDED) ===
        doc.addPage();
        
        drawWatermark(); // PAGE 2 WATERMARK

        const problems = getAllProblematicGrades(student);
        y = 20;

        doc.setFont("times", "bold"); doc.setFontSize(12);
        doc.text("LAMPIRAN CATATAN AKADEMIK", headerX, y, { align: "center" });
        y += 5;
        doc.setFontSize(10);
        doc.text(`${student.name} (${student.kelas})`, headerX, y, { align: "center" });
        y += 10;

        const problemBody = problems.length > 0 
            ? problems.map((p, idx) => [
                idx + 1,
                p.subject,
                p.taskName,
                p.score,
                p.type,
                p.description
              ])
            : [['-', '-', '-', '-', '-', 'Tidak ada masalah akademik (Nilai Aman).']];

        autoTable(doc, {
            startY: y,
            head: [['No', 'Mata Pelajaran', 'Tugas', 'Nilai', 'Status', 'Keterangan']],
            body: problemBody,
            theme: 'grid',
            styles: { font: "times", fontSize: 9, cellPadding: 2, lineColor: 0, lineWidth: 0.1, fillColor: false as any },
            headStyles: { fillColor: [200, 50, 50], textColor: 255, fontStyle: 'bold', valign: 'middle', halign: 'center' },
            columnStyles: { 
                0: {halign: 'center', cellWidth: 10}, 
                3: {halign: 'center', fontStyle: 'bold'},
                4: {halign: 'center', fontStyle: 'bold', textColor: [200, 0, 0]}
            },
            margin: { left: MARGIN, right: MARGIN },
            tableWidth: PRINT_WIDTH,
            didParseCell: (data) => {
                if (data.section === 'body' && data.column.index === 4) {
                    if (data.cell.raw === 'TANGGUNGAN') data.cell.styles.textColor = [220, 0, 0]; // Red
                    if (data.cell.raw === 'REMIDI') data.cell.styles.textColor = [234, 88, 12]; // Orange
                }
            }
        });

        // Simple signature on attachment page
        y = (doc as any).lastAutoTable.finalY + 15;
        
        // Check page break for attachment signature
        if (y + 30 > PAGE_HEIGHT - MARGIN) {
            doc.addPage();
            y = 20;
        }

        doc.setFontSize(10); doc.setFont("times", "normal");
        doc.text("Mengetahui,", sigRightX, y, {align:'center'});
        doc.text("Wali Kelas", sigRightX, y+4, {align:'center'});
        y += 20;
        doc.setFont("times", "bold");
        doc.text(wk.name, sigRightX, y, {align:'center'});
        doc.setFont("times", "normal");
        doc.text(`NIP. ${wk.nip}`, sigRightX, y + 4, { align: 'center' });
    }
    const filename = mode === 'class' ? `Rapor_Sisipan_Kelas_${selectedClass}.pdf` : `Rapor_Sisipan_${selectedStudent?.name}.pdf`;
    
    doc.save(filename);
    setIsGenerating(false);
  };

  // Default header for preview
  const displayHeader = settings.schoolHeader && settings.schoolHeader.length > 0 
      ? settings.schoolHeader 
      : ["PEMERINTAH KABUPATEN MOJOKERTO", "DINAS PENDIDIKAN", "SMPN 3 PACET", "Jl. Tirta Wening, Kab. Mojokerto, Jawa Timur 61374", "Email: smpn3pacet2007@gmail.com, HP. 0815 5386 0273", "Laman: https://sekolah.mojokertokab.go.id/smpn3pacet"];

  return (
    <div className="flex flex-col h-full bg-gray-100 font-serif">
      <div className="p-4 bg-white border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center print:hidden sticky top-0 z-10 shadow-sm gap-4">
        <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
            <select value={selectedClass} onChange={e => {setSelectedClass(e.target.value); setSelectedStudentId('')}} className="border p-2 rounded text-sm w-full sm:w-auto">
                <option value="">Pilih Kelas</option>
                {uniqueClasses.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <select value={selectedStudentId} onChange={e => setSelectedStudentId(e.target.value)} className="border p-2 rounded text-sm w-full sm:w-auto">
                <option value="">Pilih Siswa</option>
                {classStudents.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
        </div>
        
        {/* VIEW MODE TABS */}
        <div className="flex bg-gray-100 p-1 rounded-lg">
            <button 
                onClick={() => setViewMode('rapor')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${viewMode === 'rapor' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <Printer size={14} /> Preview Rapor
            </button>
            <button 
                onClick={() => setViewMode('masalah')}
                className={`px-3 py-1.5 text-xs font-bold rounded-md flex items-center gap-2 transition-all ${viewMode === 'masalah' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
            >
                <AlertTriangle size={14} /> Cek Masalah Akademik
            </button>
        </div>

        {allowDownload && (
            <div className="flex gap-2 w-full sm:w-auto">
                <button onClick={() => handleDownloadPDF('single')} disabled={!selectedStudent || isGenerating} className="bg-purple-600 text-white px-4 py-2 rounded text-sm font-bold flex gap-2 w-full sm:w-auto justify-center disabled:opacity-50 hover:bg-purple-700 transition-colors">
                    {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <Download size={16}/>}
                    PDF
                </button>
                <button onClick={() => handleDownloadPDF('class')} disabled={!selectedClass || isGenerating} className="bg-gray-800 text-white px-4 py-2 rounded text-sm font-bold flex gap-2 w-full sm:w-auto justify-center disabled:opacity-50 hover:bg-gray-900 transition-colors">
                    {isGenerating ? <Loader2 size={16} className="animate-spin"/> : <FileStack size={16}/>}
                    PDF Satu Kelas
                </button>
            </div>
        )}
      </div>

      <div className="flex-1 overflow-auto p-8 custom-scrollbar bg-gray-50 flex justify-center">
        {selectedStudent ? (
            <div ref={reportRef} className="bg-white w-[215mm] min-h-[330mm] shadow-lg p-[15mm] text-sm relative animate-scale-in">
                
                {/* VIEW MODE: RAPOR */}
                {viewMode === 'rapor' && (
                    <>
                        {/* WATERMARK */}
                        {settings.watermarkLogoUrl && <img src={settings.watermarkLogoUrl} className="absolute inset-0 m-auto w-[300px] opacity-10 pointer-events-none" />}
                        
                        {/* KOP SURAT */}
                        <div className="border-b-4 double-border border-black pb-2 mb-4 flex gap-4 items-center justify-center text-center relative border-double" style={{ borderBottomWidth: '4px', borderBottomStyle: 'double' }}>
                            {settings.kabupatenLogoUrl && <img src={settings.kabupatenLogoUrl} className="absolute left-0 w-20 h-auto" />}
                            <div className="w-full font-serif text-black">
                                <p className="text-sm font-bold">{displayHeader[0] || ""}</p>
                                <p className="text-sm font-bold">{displayHeader[1] || ""}</p>
                                <p className="text-xl font-bold tracking-wide mt-1">{displayHeader[2] || ""}</p>
                                <p className="text-xs font-normal mt-1">{displayHeader[3] || ""}</p>
                                <p className="text-xs font-normal">{displayHeader[4] || ""}</p>
                                <p className="text-xs font-normal">{displayHeader[5] || ""}</p>
                            </div>
                        </div>

                        <div className="text-center mb-6">
                            <h2 className="font-bold underline text-md text-black">
                                LAPORAN HASIL BELAJAR SISWA (SISIPAN)
                            </h2>
                            <p className="text-xs font-bold uppercase">TENGAH SEMESTER {settings.activeSemester.toUpperCase()} TAHUN PELAJARAN {settings.academicYear}</p>
                        </div>

                        <div className="flex justify-between text-xs mb-4">
                            <div className="w-[60%]">
                                <table><tbody>
                                    <tr><td className="w-24">Nama Siswa</td><td>: {selectedStudent.name}</td></tr>
                                    <tr><td>NIS / NISN</td><td>: {selectedStudent.nis} / {selectedStudent.nisn}</td></tr>
                                </tbody></table>
                            </div>
                            <div className="w-[30%]">
                                <table><tbody>
                                    <tr><td className="w-16">Kelas</td><td>: {selectedStudent.kelas}</td></tr>
                                    <tr><td>Fase</td><td>: D</td></tr>
                                </tbody></table>
                            </div>
                        </div>

                        {/* A. NILAI AKADEMIK */}
                        <div className="mb-4">
                            <h3 className="font-bold text-xs mb-1">A. Nilai Akademik</h3>
                            <table className="w-full border-collapse border border-black text-[10px]">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th rowSpan={2} className="border border-black p-1 w-6 text-center">No</th>
                                        <th rowSpan={2} className="border border-black p-1">Mata Pelajaran</th>
                                        {chapterConfig.activeChaps.map(c => <th key={c} colSpan={chapterConfig.colMap[c].length} className="border border-black p-1 text-center">{c.replace('bab','TP ')}</th>)}
                                        <th rowSpan={2} className="border border-black p-1 w-8 text-center">KTS</th>
                                        <th rowSpan={2} className="border border-black p-1 w-8 text-center">Rerata</th>
                                    </tr>
                                    <tr className="bg-gray-200">
                                        {chapterConfig.activeChaps.map(c => chapterConfig.colMap[c].map(f => <th key={c+f} className="border border-black p-1 text-center w-6">{f==='sum'?'S':f.toUpperCase()}</th>))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {subjectsData.map((s, i) => (
                                        <tr key={i}>
                                            <td className="border border-black p-1 text-center">{i+1}</td>
                                            <td className="border border-black p-1">{s.subject}</td>
                                            {chapterConfig.activeChaps.map(c => chapterConfig.colMap[c].map(f => <td key={c+f} className="border border-black p-1 text-center">{s.chapterScores[`${c}_${f}`]}</td>))}
                                            <td className="border border-black p-1 text-center">{s.kts||'-'}</td>
                                            <td className="border border-black p-1 text-center font-bold">{s.finalAvg||'-'}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* B. KOKURIKULER */}
                        <div className="mb-4">
                            <h3 className="font-bold text-xs mb-1">B. Projek Penguatan Profil Pelajar Pancasila (Kokurikuler)</h3>
                            <table className="w-full border-collapse border border-black text-[10px]">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-1 w-6 text-center">No</th>
                                        <th className="border border-black p-1 w-40">Tema</th>
                                        <th className="border border-black p-1">Uraian Kegiatan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(activeP5Projects || []).length > 0 ? (
                                        (activeP5Projects || []).map((p, i) => (
                                            <tr key={i}>
                                                <td className="border border-black p-1 text-center">{i+1}</td>
                                                <td className="border border-black p-1">{p.theme}</td>
                                                <td className="border border-black p-1">{p.description}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={3} className="border border-black p-1 text-center italic">Belum ada projek</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* C. EKSTRAKURIKULER */}
                        <div className="mb-4">
                            <h3 className="font-bold text-xs mb-1">C. Ekstrakurikuler</h3>
                            <table className="w-full border-collapse border border-black text-[10px]">
                                <thead>
                                    <tr className="bg-gray-200">
                                        <th className="border border-black p-1 w-6 text-center">No</th>
                                        <th className="border border-black p-1">Nama Kegiatan</th>
                                        <th className="border border-black p-1 w-16 text-center">Predikat</th>
                                        <th className="border border-black p-1">Keterangan</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(extraData || []).length > 0 ? (
                                        extraData.map((e, i) => (
                                            <tr key={i}>
                                                <td className="border border-black p-1 text-center">{i+1}</td>
                                                <td className="border border-black p-1">{e.activityName}</td>
                                                <td className="border border-black p-1 text-center">{e.predikat}</td>
                                                <td className="border border-black p-1">{e.description}</td>
                                            </tr>
                                        ))
                                    ) : (
                                        <tr><td colSpan={4} className="border border-black p-1 text-center italic">Tidak mengikuti ekstrakurikuler</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </div>

                        {/* D & E */}
                        <div className="flex gap-4 mb-4">
                            <div className="w-1/2">
                                <h3 className="font-bold text-xs mb-1">D. Ketidakhadiran</h3>
                                <table className="w-full border-collapse border border-black text-[10px]">
                                    <tbody>
                                        <tr>
                                            <td className="border border-black p-1 w-32">Sakit</td>
                                            <td className="border border-black p-1 text-center">{attendanceData.s} hari</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black p-1">Izin</td>
                                            <td className="border border-black p-1 text-center">{attendanceData.i} hari</td>
                                        </tr>
                                        <tr>
                                            <td className="border border-black p-1">Tanpa Keterangan</td>
                                            <td className="border border-black p-1 text-center">{attendanceData.a} hari</td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="w-1/2">
                                <h3 className="font-bold text-xs mb-1">E. Kepribadian & Akhlak</h3>
                                <table className="w-full border-collapse border border-black text-[10px]">
                                    <thead>
                                        <tr className="bg-gray-200">
                                            <th className="border border-black p-1 w-6 text-center">No</th>
                                            <th className="border border-black p-1">Aspek</th>
                                            <th className="border border-black p-1 text-center">Keterangan</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr><td className="border border-black p-1 text-center">1</td><td className="border border-black p-1">Kelakuan / Akhlak</td><td className="border border-black p-1 text-center">Baik</td></tr>
                                        <tr><td className="border border-black p-1 text-center">2</td><td className="border border-black p-1">Kerajinan</td><td className="border border-black p-1 text-center">Baik</td></tr>
                                        <tr><td className="border border-black p-1 text-center">3</td><td className="border border-black p-1">Kerapian</td><td className="border border-black p-1 text-center">Baik</td></tr>
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Signatures */}
                        <div className="flex justify-between text-xs mt-8">
                            <div className="text-center w-1/3">
                                <p>Mengetahui,</p>
                                <p>Orang Tua / Wali</p>
                                <div className="h-16"></div>
                                <p>(....................................)</p>
                            </div>
                            <div className="text-center w-1/3">
                                <p>Mojokerto, {settings.midSemesterDate?.[settings.activeSemester] || new Date().toLocaleDateString('id-ID', {day:'numeric', month:'long', year:'numeric'})}</p>
                                <p>Wali Kelas</p>
                                <div className="h-16"></div>
                                <p className="font-bold underline">{waliKelasInfo.name}</p>
                                <p>NIP. {waliKelasInfo.nip}</p>
                            </div>
                        </div>
                        
                        <div className="flex justify-center text-xs mt-4">
                            <div className="text-center w-1/3">
                                <p>Mengetahui,</p>
                                <p>Kepala SMPN 3 Pacet</p>
                                <div className="h-16"></div>
                                <p className="font-bold underline">{settings.principalName}</p>
                                <p>NIP. {settings.principalNip}</p>
                            </div>
                        </div>
                    </>
                )}

                {/* VIEW MODE: MASALAH AKADEMIK */}
                {viewMode === 'masalah' && (
                    <div className="mb-4 min-h-[400px]">
                        <h2 className="font-bold text-lg text-center mb-4 text-red-600">DAFTAR MASALAH AKADEMIK SISWA</h2>
                        <div className="text-center mb-6 font-bold">{selectedStudent.name} ({selectedStudent.kelas})</div>

                        <table className="w-full border-collapse border border-black text-[10px]">
                            <thead>
                                <tr className="bg-red-600 text-white">
                                    <th className="border border-black p-2 w-8 text-center">No</th>
                                    <th className="border border-black p-2 w-32">Mata Pelajaran</th>
                                    <th className="border border-black p-2">Tugas / Penilaian</th>
                                    <th className="border border-black p-2 w-20 text-center">Tanggal</th>
                                    <th className="border border-black p-2 w-12 text-center">Nilai</th>
                                    <th className="border border-black p-2 w-24 text-center">Status</th>
                                    <th className="border border-black p-2 w-40">Keterangan Guru</th>
                                </tr>
                            </thead>
                            <tbody>
                                {allProblems.length > 0 ? (
                                    allProblems.map((p, idx) => (
                                        <tr key={idx}>
                                            <td className="border border-black p-2 text-center">{idx + 1}</td>
                                            <td className="border border-black p-2 font-bold">{p.subject}</td>
                                            <td className="border border-black p-2">{p.taskName}</td>
                                            <td className="border border-black p-2 text-center">{p.date}</td>
                                            <td className="border border-black p-2 text-center font-bold">{p.score}</td>
                                            <td className={`border border-black p-2 text-center font-bold ${p.type === 'TANGGUNGAN' ? 'text-red-600' : 'text-orange-600'}`}>{p.type}</td>
                                            <td className="border border-black p-2 italic">{p.description}</td>
                                        </tr>
                                    ))
                                ) : (
                                    <tr>
                                        <td colSpan={7} className="border border-black p-8 text-center text-gray-500 italic">
                                            Tidak ada masalah akademik (Nilai Kosong atau Remidi) yang ditemukan.
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        ) : (
            <div className="flex items-center justify-center h-full text-gray-400">
                Silakan pilih siswa terlebih dahulu.
            </div>
        )}
      </div>
    </div>
  );
};

export default MidSemesterReportView;


import React, { useState, useMemo, useEffect } from 'react';
import { Student, DailyAttendanceLog, AttendanceRecord } from '../types';
import { Calendar, Save, Search, Filter, CheckCircle, XCircle, Clock, Download, FileSpreadsheet, PieChart, List, CalendarRange, Lock, Info } from 'lucide-react';
import * as XLSX from 'xlsx';

interface ClassAttendanceViewProps {
  students: Student[];
  availableClasses: string[];
  userRole: 'admin' | 'leader' | 'teacher' | null;
  currentClass?: string; // For leader
  dailyAttendance: DailyAttendanceLog[];
  onSaveAttendance: (log: DailyAttendanceLog) => void;
}

const ClassAttendanceView: React.FC<ClassAttendanceViewProps> = ({
  students,
  availableClasses,
  userRole,
  currentClass: leaderClass,
  dailyAttendance,
  onSaveAttendance
}) => {
  // Selection State
  const [selectedClass, setSelectedClass] = useState<string>(leaderClass || availableClasses[0] || '');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'input' | 'monitor' | 'rekap_bulanan' | 'rekap_semester'>('input');

  // Input State
  const [attendanceForm, setAttendanceForm] = useState<Record<number, 'H'|'S'|'I'|'A'>>({});

  // Monitor Filter State
  const date = new Date();
  const firstDay = new Date(date.getFullYear(), date.getMonth(), 1).toISOString().split('T')[0];
  const lastDay = new Date(date.getFullYear(), date.getMonth() + 1, 0).toISOString().split('T')[0];

  const [filterStartDate, setFilterStartDate] = useState<string>(firstDay);
  const [filterEndDate, setFilterEndDate] = useState<string>(lastDay);
  
  // Monthly Rekap State
  const [selectedMonth, setSelectedMonth] = useState<string>(new Date().toISOString().slice(0, 7)); // YYYY-MM

  // Derived Data
  const classStudents = useMemo(() => {
      return students.filter(s => s.kelas === selectedClass).sort((a,b) => a.name.localeCompare(b.name));
  }, [students, selectedClass]);

  // Load existing data when class or date changes
  useEffect(() => {
      const existingLog = dailyAttendance.find(log => log.date === selectedDate && log.className === selectedClass);
      
      const newForm: Record<number, 'H'|'S'|'I'|'A'> = {};
      classStudents.forEach(s => {
          if (existingLog) {
              const record = existingLog.records.find(r => r.studentId === s.id);
              newForm[s.id] = record ? record.status : 'H';
          } else {
              newForm[s.id] = 'H'; // Default Hadir
          }
      });
      setAttendanceForm(newForm);
  }, [selectedDate, selectedClass, classStudents, dailyAttendance]);

  const handleStatusChange = (studentId: number, status: 'H'|'S'|'I'|'A') => {
      setAttendanceForm(prev => ({
          ...prev,
          [studentId]: status
      }));
  };

  const handleSave = () => {
      // Find existing log to preserve notes
      const existingLog = dailyAttendance.find(log => log.date === selectedDate && log.className === selectedClass);

      const records: AttendanceRecord[] = Object.entries(attendanceForm).map(([idStr, status]) => {
          const studentId = parseInt(idStr);
          // Preserve existing note if present (from Wali Kelas)
          const existingRecord = existingLog?.records.find(r => r.studentId === studentId);
          
          return {
              studentId,
              status: status as 'H' | 'S' | 'I' | 'A',
              note: existingRecord?.note // Keep the note!
          };
      });

      const log: DailyAttendanceLog = {
          id: `${selectedClass}-${selectedDate}`,
          date: selectedDate,
          className: selectedClass,
          records
      };

      onSaveAttendance(log);
      alert('Data absensi berhasil disimpan!');
  };

  // --- MONITORING MATRIX LOGIC (DYNAMIC DATES) ---
  const dateRange = useMemo(() => {
      const dates = [];
      const curr = new Date(filterStartDate);
      const end = new Date(filterEndDate);
      
      while (curr <= end) {
          dates.push(curr.toISOString().split('T')[0]);
          curr.setDate(curr.getDate() + 1);
      }
      return dates;
  }, [filterStartDate, filterEndDate]);

  const attendanceMap = useMemo(() => {
      const map: Record<string, Record<number, string>> = {};
      dateRange.forEach(date => {
          const log = dailyAttendance.find(d => d.date === date && d.className === selectedClass);
          if (log) {
              map[date] = {};
              log.records.forEach(r => {
                  map[date][r.studentId] = r.status;
              });
          }
      });
      return map;
  }, [dailyAttendance, selectedClass, dateRange]);

  // --- REKAP BULANAN LOGIC ---
  const monthlySummary = useMemo(() => {
      const summary: Record<number, { h: number, s: number, i: number, a: number }> = {};
      classStudents.forEach(s => summary[s.id] = { h: 0, s: 0, i: 0, a: 0 });

      const monthlyLogs = dailyAttendance.filter(d => 
          d.className === selectedClass && d.date.startsWith(selectedMonth)
      );

      monthlyLogs.forEach(log => {
          log.records.forEach(r => {
              if (summary[r.studentId]) {
                  if (r.status === 'H') summary[r.studentId].h++;
                  else if (r.status === 'S') summary[r.studentId].s++;
                  else if (r.status === 'I') summary[r.studentId].i++;
                  else if (r.status === 'A') summary[r.studentId].a++;
              }
          });
      });
      return summary;
  }, [dailyAttendance, selectedClass, selectedMonth, classStudents]);

  // --- REKAP SEMESTER LOGIC ---
  const semesterSummary = useMemo(() => {
      const summary: Record<number, { h: number, s: number, i: number, a: number }> = {};
      
      // Initialize
      classStudents.forEach(s => {
          summary[s.id] = { h: 0, s: 0, i: 0, a: 0 };
      });

      // Aggregate ALL logs for this class (ignoring date filter for full semester view)
      const allClassLogs = dailyAttendance.filter(d => d.className === selectedClass);
      
      allClassLogs.forEach(log => {
          log.records.forEach(r => {
              if (summary[r.studentId]) {
                  if (r.status === 'H') summary[r.studentId].h++;
                  else if (r.status === 'S') summary[r.studentId].s++;
                  else if (r.status === 'I') summary[r.studentId].i++;
                  else if (r.status === 'A') summary[r.studentId].a++;
              }
          });
      });

      return summary;
  }, [dailyAttendance, selectedClass, classStudents]);

  const handleDownloadExcelMatrix = () => {
      const data = classStudents.map((s, idx) => {
          const row: any = {
              'No': idx + 1,
              'Nama Siswa': s.name,
          };
          dateRange.forEach(date => {
              const status = attendanceMap[date]?.[s.id] || '-';
              row[date] = status;
          });
          return row;
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, `Riwayat Harian ${selectedClass}`);
      XLSX.writeFile(wb, `Riwayat_Harian_${selectedClass}.xlsx`);
  };

  const handleDownloadExcelRekap = (type: 'bulanan' | 'semester') => {
      const summaryData = type === 'bulanan' ? monthlySummary : semesterSummary;
      const title = type === 'bulanan' ? `Rekap Bulanan ${selectedMonth}` : `Rekap Semester`;

      const data = classStudents.map((s, idx) => {
          const stats = summaryData[s.id];
          return {
              'No': idx + 1,
              'Nama Siswa': s.name,
              'Total Hadir': stats.h,
              'Total Sakit': stats.s,
              'Total Izin': stats.i,
              'Total Alpha': stats.a,
              'Persentase Kehadiran': `${Math.round((stats.h / (stats.h+stats.s+stats.i+stats.a || 1)) * 100)}%`
          };
      });
      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, title);
      XLSX.writeFile(wb, `${title.replace(/\s/g, '_')}_${selectedClass}.xlsx`);
  };

  return (
    <div className="flex-1 bg-white h-full flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 bg-white sticky top-0 z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="text-blue-600" />
            Absensi Kelas Harian
          </h2>
          <p className="text-sm text-gray-500 mt-1">
            {userRole === 'leader' ? `Ketua Kelas: ${selectedClass}` : 'Monitoring kehadiran siswa per hari'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
            {userRole !== 'leader' && (
                <select 
                    value={selectedClass} 
                    onChange={(e) => setSelectedClass(e.target.value)} 
                    className="pl-3 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm font-bold outline-none"
                >
                    {availableClasses.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
            )}
            
            <div className="flex bg-gray-100 p-1 rounded-lg">
                <button 
                    onClick={() => setViewMode('input')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'input' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <CheckCircle size={14}/> Input
                </button>
                <button 
                    onClick={() => setViewMode('monitor')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'monitor' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <List size={14}/> Riwayat
                </button>
                <button 
                    onClick={() => setViewMode('rekap_bulanan')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'rekap_bulanan' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <CalendarRange size={14}/> Rekap Bulanan
                </button>
                <button 
                    onClick={() => setViewMode('rekap_semester')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === 'rekap_semester' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
                >
                    <PieChart size={14}/> Rekap Semester
                </button>
            </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 flex flex-col min-h-0">
        
        {viewMode === 'input' && (
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
                <div className="max-w-4xl mx-auto">
                    <div className="mb-6 flex items-center gap-4 bg-blue-50 p-4 rounded-xl border border-blue-100">
                        <div className="flex-1">
                            <label className="block text-xs font-bold text-blue-600 uppercase mb-1">Tanggal Absensi</label>
                            <input 
                                type="date" 
                                value={selectedDate}
                                onChange={(e) => setSelectedDate(e.target.value)}
                                className="w-full bg-white border border-blue-200 rounded-lg px-3 py-2 font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div className="flex-1 text-right">
                            <p className="text-xs text-gray-500">Total Siswa</p>
                            <p className="text-2xl font-bold text-gray-800">{classStudents.length}</p>
                        </div>
                    </div>

                    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold sticky top-0 z-10">
                                    <tr>
                                        <th className="px-4 py-3 border-b w-10 text-center">No</th>
                                        <th className="px-4 py-3 border-b">Nama Siswa</th>
                                        <th className="px-4 py-3 border-b w-64 text-center">Status Kehadiran</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-100">
                                    {classStudents.map((student, idx) => {
                                        // Check if locked by Wali Kelas (has note)
                                        const log = dailyAttendance.find(d => d.date === selectedDate && d.className === selectedClass);
                                        const record = log?.records.find(r => r.studentId === student.id);
                                        const isLocked = record?.note && record.note.length > 0;

                                        return (
                                            <tr key={student.id} className={`transition-colors ${isLocked ? 'bg-yellow-50/50' : 'hover:bg-gray-50'}`}>
                                                <td className="px-4 py-3 text-center text-sm text-gray-500">{idx + 1}</td>
                                                <td className="px-4 py-3 font-medium text-gray-800 text-sm">
                                                    {student.name}
                                                    <div className="text-[10px] text-gray-400">{student.nis}</div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {isLocked ? (
                                                        <div className="flex items-center justify-center p-2 rounded-lg bg-yellow-100 border border-yellow-200 text-yellow-800 gap-2">
                                                            <Lock size={14} className="text-yellow-700 shrink-0" />
                                                            <div className="flex flex-col text-xs leading-tight">
                                                                <span className="font-bold uppercase">
                                                                    {record.status === 'S' ? 'SAKIT' : record.status === 'I' ? 'IZIN' : 'ALPHA'}
                                                                </span>
                                                                <span className="italic opacity-80">{record.note}</span>
                                                            </div>
                                                            <Info size={14} className="text-yellow-700 ml-auto shrink-0 opacity-50" title="Diinput oleh Wali Kelas" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex justify-center gap-1">
                                                            {(['H', 'S', 'I', 'A'] as const).map(status => (
                                                                <label 
                                                                    key={status} 
                                                                    className={`
                                                                        flex flex-col items-center justify-center w-10 h-10 rounded-lg cursor-pointer border transition-all
                                                                        ${attendanceForm[student.id] === status 
                                                                            ? status === 'H' ? 'bg-green-100 border-green-500 text-green-700' :
                                                                            status === 'S' ? 'bg-blue-100 border-blue-500 text-blue-700' :
                                                                            status === 'I' ? 'bg-yellow-100 border-yellow-500 text-yellow-700' :
                                                                            'bg-red-100 border-red-500 text-red-700'
                                                                            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                                                                        }
                                                                    `}
                                                                >
                                                                    <input 
                                                                        type="radio" 
                                                                        name={`attn-${student.id}`} 
                                                                        value={status}
                                                                        checked={attendanceForm[student.id] === status}
                                                                        onChange={() => handleStatusChange(student.id, status)}
                                                                        className="hidden"
                                                                    />
                                                                    <span className="text-sm font-bold">{status}</span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    <div className="mt-6 flex justify-end">
                        <button 
                            onClick={handleSave}
                            className="flex items-center gap-2 px-8 py-3 bg-blue-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 transition-all active:scale-95"
                        >
                            <Save size={20} />
                            Simpan Absensi
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* MONITOR / HISTORY MODE - Horizontal Scroll Fix applied here by separating container */}
        {viewMode === 'monitor' && (
            <div className="flex-1 flex flex-col h-full min-w-0 p-6">
                {/* Filter */}
                <div className="mb-4 flex flex-wrap items-end gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Dari Tanggal</label>
                        <input 
                            type="date" 
                            value={filterStartDate}
                            onChange={(e) => setFilterStartDate(e.target.value)}
                            className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-gray-500 mb-1">Sampai Tanggal</label>
                        <input 
                            type="date" 
                            value={filterEndDate}
                            onChange={(e) => setFilterEndDate(e.target.value)}
                            className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                        />
                    </div>
                    <div className="flex-1"></div>
                    <button 
                        onClick={handleDownloadExcelMatrix}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm"
                    >
                        <FileSpreadsheet size={16} />
                        Download Excel
                    </button>
                </div>

                {/* Matrix Table with Horizontal & Vertical Scroll */}
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 relative">
                    <div className="absolute inset-0 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 border-b border-r border-gray-200 w-12 text-center sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                                    <th className="px-4 py-3 border-b border-r border-gray-200 w-64 sticky left-12 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Siswa</th>
                                    {dateRange.map(date => (
                                        <th key={date} className="px-2 py-3 border-b border-r border-gray-200 text-center min-w-[3rem]">
                                            <div className="flex flex-col">
                                                <span>{new Date(date).getDate()}</span>
                                                <span className="text-[9px] font-normal">{new Date(date).toLocaleString('id-ID', {month: 'short'})}</span>
                                            </div>
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {classStudents.map((student, idx) => {
                                    return (
                                        <tr key={student.id} className="hover:bg-blue-50/20 transition-colors">
                                            <td className="px-4 py-2 border-r border-gray-100 text-center text-gray-500 sticky left-0 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{idx + 1}</td>
                                            <td className="px-4 py-2 border-r border-gray-100 font-medium text-gray-800 sticky left-12 bg-white z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{student.name}</td>
                                            {dateRange.map(date => {
                                                const status = attendanceMap[date]?.[student.id];
                                                let cellClass = "text-gray-300";
                                                if (status === 'H') { cellClass = "text-green-600 font-bold bg-green-50"; }
                                                else if (status === 'S') { cellClass = "text-blue-600 font-bold bg-blue-50"; }
                                                else if (status === 'I') { cellClass = "text-yellow-600 font-bold bg-yellow-50"; }
                                                else if (status === 'A') { cellClass = "text-red-600 font-bold bg-red-50"; }
                                                else if (!status) { cellClass = "bg-gray-50/50"; }

                                                return (
                                                    <td key={date} className={`px-2 py-2 border-r border-gray-100 text-center ${cellClass}`}>
                                                        {status || '-'}
                                                    </td>
                                                );
                                            })}
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {/* Rekap Bulanan - Horizontal Scroll Fix */}
        {viewMode === 'rekap_bulanan' && (
            <div className="flex-1 flex flex-col h-full min-w-0 p-6">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
                    <div className="flex items-center gap-4">
                        <div>
                            <label className="block text-xs font-bold text-gray-500 mb-1">Pilih Bulan</label>
                            <input 
                                type="month"
                                value={selectedMonth}
                                onChange={(e) => setSelectedMonth(e.target.value)}
                                className="bg-gray-50 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-700"
                            />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-800">Rekapitulasi Bulanan</h3>
                            <p className="text-xs text-gray-500">Total kehadiran siswa untuk bulan {new Date(selectedMonth).toLocaleString('id-ID', {month: 'long', year: 'numeric'})}</p>
                        </div>
                    </div>
                    <button 
                        onClick={() => handleDownloadExcelRekap('bulanan')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm"
                    >
                        <FileSpreadsheet size={16} />
                        Download Excel
                    </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 relative">
                    <div className="absolute inset-0 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 border-b border-r border-gray-200 w-12 text-center sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                                    <th className="px-4 py-3 border-b border-r border-gray-200 w-64 sticky left-12 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Siswa</th>
                                    <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-green-50 text-green-700">Hadir</th>
                                    <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-blue-50 text-blue-700">Sakit</th>
                                    <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-yellow-50 text-yellow-700">Izin</th>
                                    <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-red-50 text-red-700">Alpha</th>
                                    <th className="px-4 py-3 border-b border-gray-200 w-24 text-center">Total Absen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {classStudents.map((student, idx) => {
                                    const stats = monthlySummary[student.id];
                                    const totalAbsent = stats.s + stats.i + stats.a;
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-center text-gray-500 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800 sticky left-12 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{student.name}</td>
                                            <td className="px-4 py-3 text-center font-bold text-green-600 bg-green-50/20">{stats.h}</td>
                                            <td className="px-4 py-3 text-center font-bold text-blue-600 bg-blue-50/20">{stats.s}</td>
                                            <td className="px-4 py-3 text-center font-bold text-yellow-600 bg-yellow-50/20">{stats.i}</td>
                                            <td className="px-4 py-3 text-center font-bold text-red-600 bg-red-50/20">{stats.a}</td>
                                            <td className="px-4 py-3 text-center font-bold text-gray-700 bg-gray-50">{totalAbsent}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

        {viewMode === 'rekap_semester' && (
            <div className="flex-1 flex flex-col h-full min-w-0 p-6">
                <div className="mb-4 flex justify-between items-center bg-white p-4 rounded-xl border border-gray-200 shadow-sm shrink-0">
                    <div>
                        <h3 className="font-bold text-gray-800">Rekapitulasi Total Semester</h3>
                        <p className="text-xs text-gray-500">Akumulasi seluruh input absensi di kelas {selectedClass}</p>
                    </div>
                    <button 
                        onClick={() => handleDownloadExcelRekap('semester')}
                        className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold text-sm shadow-sm"
                    >
                        <FileSpreadsheet size={16} />
                        Download Excel
                    </button>
                </div>

                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm flex-1 relative">
                    <div className="absolute inset-0 overflow-auto custom-scrollbar">
                        <table className="w-full text-left border-collapse min-w-max">
                            <thead className="bg-gray-50 text-xs font-bold uppercase text-gray-500 sticky top-0 z-20 shadow-sm">
                                <tr>
                                    <th className="px-4 py-3 border-b border-r border-gray-200 w-12 text-center sticky left-0 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                                    <th className="px-4 py-3 border-b border-r border-gray-200 w-64 sticky left-12 bg-gray-50 z-30 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Siswa</th>
                                    <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-green-50 text-green-700">Hadir</th>
                                    <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-blue-50 text-blue-700">Sakit</th>
                                    <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-yellow-50 text-yellow-700">Izin</th>
                                    <th className="px-4 py-3 border-b border-gray-200 w-24 text-center bg-red-50 text-red-700">Alpha</th>
                                    <th className="px-4 py-3 border-b border-gray-200 w-24 text-center">Total Absen</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 text-sm">
                                {classStudents.map((student, idx) => {
                                    const stats = semesterSummary[student.id];
                                    const total = stats.s + stats.i + stats.a;
                                    return (
                                        <tr key={student.id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 text-center text-gray-500 sticky left-0 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{idx + 1}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800 sticky left-12 bg-white z-10 border-r border-gray-200 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">{student.name}</td>
                                            <td className="px-4 py-3 text-center font-bold text-green-600 bg-green-50/20">{stats.h}</td>
                                            <td className="px-4 py-3 text-center font-bold text-blue-600 bg-blue-50/20">{stats.s}</td>
                                            <td className="px-4 py-3 text-center font-bold text-yellow-600 bg-yellow-50/20">{stats.i}</td>
                                            <td className="px-4 py-3 text-center font-bold text-red-600 bg-red-50/20">{stats.a}</td>
                                            <td className="px-4 py-3 text-center font-bold text-gray-700 bg-gray-50">{total}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        )}

      </div>
    </div>
  );
};

export default ClassAttendanceView;

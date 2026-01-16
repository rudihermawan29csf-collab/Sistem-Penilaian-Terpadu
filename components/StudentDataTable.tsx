
import React, { useState, useRef, useMemo } from 'react';
import { Student } from '../types';
import { Edit2, Trash2, Search, Plus, Upload, FileSpreadsheet, Filter } from 'lucide-react';
import * as XLSX from 'xlsx';
import { createEmptySemesterData } from '../utils';

interface StudentDataTableProps {
  students: Student[];
  onAdd: () => void;
  onEdit: (student: Student) => void;
  onDelete: (id: number) => void;
  onImport: (students: Student[]) => void;
}

const StudentDataTable: React.FC<StudentDataTableProps> = ({ 
  students, 
  onAdd, 
  onEdit, 
  onDelete,
  onImport 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState(''); // New State for Class Filter
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Get unique classes for filter dropdown
  const uniqueClasses = useMemo(() => {
    const classes = new Set(students.map(s => s.kelas));
    return Array.from(classes).sort();
  }, [students]);

  // Filter Logic (Search Term AND Class Filter)
  const filteredStudents = useMemo(() => {
    return students.filter(s => {
        const matchesSearch = 
            s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
            s.nis.includes(searchTerm);
        
        const matchesClass = selectedClassFilter === '' || s.kelas === selectedClassFilter;

        return matchesSearch && matchesClass;
    }).sort((a, b) => {
        // Sort by Class then Name
        if (a.kelas === b.kelas) return a.name.localeCompare(b.name);
        return a.kelas.localeCompare(b.kelas);
    });
  }, [students, searchTerm, selectedClassFilter]);

  // Handle Download Template
  const handleDownloadTemplate = () => {
    const templateData = [
        { No: 1, NIS: "12345", Nama: "Contoh Siswa Laki", Kelas: "VII A", Gender: "L" },
        { No: 2, NIS: "12346", Nama: "Contoh Siswa Perempuan", Kelas: "VII A", Gender: "P" },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template Siswa");
    XLSX.writeFile(wb, "Template_Import_Siswa.xlsx");
  };

  // Handle Import Excel
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    
    reader.onload = (evt) => {
        try {
            const arrayBuffer = evt.target?.result;
            if (!arrayBuffer) return;

            const wb = XLSX.read(arrayBuffer, { type: 'array' });
            
            if (wb.SheetNames.length === 0) {
                alert("Gagal: File Excel tidak memiliki sheet.");
                return;
            }

            const wsname = wb.SheetNames[0];
            const ws = wb.Sheets[wsname];
            
            // Convert to JSON with raw values to handle types better
            const data = XLSX.utils.sheet_to_json(ws);

            if (!data || data.length === 0) {
                 alert("Gagal: Data di dalam file kosong.");
                 return;
            }

            let successCount = 0;
            const parsedStudents: Student[] = [];

            // Process each row
            data.forEach((row: any, index) => {
                // Flexible Column Matching
                const nisRaw = row['NIS'] || row['nis'];
                const namaRaw = row['Nama'] || row['nama'] || row['Nama Siswa'];
                const kelasRaw = row['Kelas'] || row['kelas'];
                const genderRaw = row['Gender'] || row['gender'] || row['Jenis Kelamin'] || row['L/P'];

                // Validate Essential Data
                if (!namaRaw || !kelasRaw) return; // Skip if no name or class

                // Normalize Data
                const nisStr = nisRaw ? String(nisRaw).trim() : `TEMP-${Date.now()}-${index}`; // Fallback ID if NIS missing
                const nameStr = String(namaRaw).trim().replace(/['"]/g, '');
                const kelasStr = String(kelasRaw).trim().toUpperCase();
                
                // Gender Normalization
                let genderChar: 'L' | 'P' = 'L';
                if (genderRaw) {
                    const g = String(genderRaw).trim().toUpperCase();
                    if (g === 'P' || g === 'PEREMPUAN' || g === 'WANITA') genderChar = 'P';
                }

                parsedStudents.push({
                    id: Date.now() + index + Math.random(),
                    no: index + 1,
                    nis: nisStr,
                    name: nameStr,
                    kelas: kelasStr,
                    gender: genderChar,
                    grades: {
                        ganjil: createEmptySemesterData(),
                        genap: createEmptySemesterData()
                    },
                    gradesBySubject: {}
                });
                successCount++;
            });

            if (parsedStudents.length > 0) {
                const confirmMsg = `Ditemukan ${parsedStudents.length} data siswa valid.\n\nKlik OK untuk memproses import.`;
                if(window.confirm(confirmMsg)) {
                    onImport(parsedStudents);
                    alert(`BERHASIL: ${parsedStudents.length} data siswa telah ditambahkan.`);
                }
            } else {
                alert('GAGAL: Tidak ada data valid yang ditemukan. Pastikan kolom header Excel adalah: "NIS", "Nama", "Kelas", "Gender".');
            }

        } catch (error) {
            console.error("Import Error:", error);
            alert("ERROR: Terjadi kesalahan saat membaca file. Pastikan file Excel tidak rusak.");
        }
    };

    reader.onerror = () => {
        alert("ERROR: Gagal membaca file.");
    }

    reader.readAsArrayBuffer(file);
    
    // Reset input so same file can be selected again if needed
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDeleteClick = (id: number, name: string) => {
    if (window.confirm(`Yakin ingin menghapus siswa "${name}"? Data nilai terkait juga akan hilang.`)) {
        onDelete(id);
    }
  };

  return (
    <div className="flex-1 bg-white h-full flex flex-col">
       {/* Toolbar */}
       <div className="px-6 py-5 border-b border-gray-200 bg-white flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 sticky top-0 z-20">
            <div>
                 <h2 className="text-xl font-bold text-gray-800">Data Siswa</h2>
                 <p className="text-sm text-gray-500">Kelola master data siswa seluruh kelas.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row items-center gap-2 w-full xl:w-auto">
                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                    <input 
                        type="text" 
                        placeholder="Cari Nama / NIS..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>

                {/* Class Filter Dropdown */}
                <div className="relative w-full sm:w-40">
                    <select
                        value={selectedClassFilter}
                        onChange={(e) => setSelectedClassFilter(e.target.value)}
                        className="w-full pl-9 pr-8 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none appearance-none"
                    >
                        <option value="">Semua Kelas</option>
                        {uniqueClasses.map(cls => (
                            <option key={cls} value={cls}>{cls}</option>
                        ))}
                    </select>
                    <Filter className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
                
                {/* Actions */}
                <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                    <input 
                        type="file" 
                        accept=".xlsx, .xls" 
                        className="hidden" 
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                    />

                    <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="p-2 text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                        title="Import dari Excel"
                    >
                        <Upload size={18} />
                    </button>

                    <button 
                        onClick={handleDownloadTemplate}
                        className="p-2 text-gray-600 bg-white hover:bg-gray-50 border border-gray-300 rounded-lg transition-colors"
                        title="Download Template Excel"
                    >
                        <FileSpreadsheet size={18} />
                    </button>

                    <button 
                        onClick={onAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm whitespace-nowrap"
                    >
                        <Plus size={16} />
                        Tambah
                    </button>
                </div>
            </div>
       </div>

       {/* Table */}
       <div className="flex-1 overflow-auto custom-scrollbar p-6">
          <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm inline-block min-w-full align-middle">
            <table className="min-w-full border-collapse">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
                <tr>
                   <th className="p-3 border-r border-gray-200 text-center w-12 sticky left-0 bg-gray-50">No</th>
                   <th className="p-3 border-r border-gray-200 text-left w-32">NIS</th>
                   <th className="p-3 border-r border-gray-200 text-left">Nama Siswa</th>
                   <th className="p-3 border-r border-gray-200 text-center w-16">L/P</th>
                   <th className="p-3 border-r border-gray-200 text-center w-24">Kelas</th>
                   <th className="p-3 text-center w-24 sticky right-0 bg-gray-50">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                 {filteredStudents.length === 0 ? (
                    <tr>
                       <td colSpan={6} className="p-8 text-center text-gray-400">
                          {students.length === 0 
                             ? "Belum ada data siswa. Silakan Import atau Tambah Manual." 
                             : "Tidak ada siswa yang cocok dengan filter pencarian."}
                       </td>
                    </tr>
                 ) : (
                    filteredStudents.map((student, index) => (
                       <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                          <td className="p-3 text-center text-gray-500 text-sm border-r border-gray-100 sticky left-0 bg-white group-hover:bg-blue-50/30">{index + 1}</td>
                          <td className="p-3 font-mono text-gray-600 text-sm border-r border-gray-100">{student.nis}</td>
                          <td className="p-3 font-medium text-gray-800 text-sm border-r border-gray-100">{student.name}</td>
                          <td className="p-3 text-center text-gray-600 text-sm border-r border-gray-100">{student.gender}</td>
                          <td className="p-3 text-center text-gray-600 font-bold text-sm border-r border-gray-100">{student.kelas}</td>
                          <td className="p-3 text-center sticky right-0 bg-white group-hover:bg-blue-50/30">
                             <div className="flex items-center justify-center gap-2">
                                <button 
                                   onClick={() => onEdit(student)}
                                   className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                                   title="Edit Siswa"
                                >
                                   <Edit2 size={16} />
                                </button>
                                <button 
                                   onClick={() => handleDeleteClick(student.id, student.name)}
                                   className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
                                   title="Hapus Siswa"
                                >
                                   <Trash2 size={16} />
                                </button>
                             </div>
                          </td>
                       </tr>
                    ))
                 )}
              </tbody>
            </table>
          </div>
       </div>
    </div>
  );
};

export default StudentDataTable;

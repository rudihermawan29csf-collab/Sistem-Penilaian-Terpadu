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
  const [selectedClassFilter, setSelectedClassFilter] = useState(''); // Filter Class State
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
            
            // Convert to JSON
            const data = XLSX.utils.sheet_to_json(ws);

            if (!data || data.length === 0) {
                 alert("Gagal: Data di dalam file kosong.");
                 return;
            }

            const parsedStudents: Student[] = [];
            let skippedCount = 0;

            // Process each row
            data.forEach((row: any, index) => {
                // Flexible Column Matching (Handle Case Sensitivity)
                const nisRaw = row['NIS'] || row['nis'] || row['Nis'];
                const namaRaw = row['Nama'] || row['nama'] || row['Nama Siswa'] || row['nama siswa'];
                const kelasRaw = row['Kelas'] || row['kelas'];
                const genderRaw = row['Gender'] || row['gender'] || row['Jenis Kelamin'] || row['L/P'];

                // Validate Essential Data
                if (!namaRaw || !kelasRaw) {
                    skippedCount++;
                    return; 
                }

                // Normalize Data
                // Force NIS to string to prevent scientific notation issues
                const nisStr = nisRaw ? String(nisRaw).trim() : `TEMP-${Date.now()}-${index}`;
                const nameStr = String(namaRaw).trim().replace(/['"]/g, ''); // Remove quotes that might break JSON
                const kelasStr = String(kelasRaw).trim().toUpperCase();
                
                // Gender Normalization
                let genderChar: 'L' | 'P' = 'L';
                if (genderRaw) {
                    const g = String(genderRaw).trim().toUpperCase();
                    if (g.startsWith('P') || g === 'WANITA') genderChar = 'P';
                }

                parsedStudents.push({
                    id: Date.now() + index + Math.random(), // Unique ID
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
            });

            if (parsedStudents.length > 0) {
                const confirmMsg = `Ditemukan ${parsedStudents.length} data siswa valid.\n(Dilewati: ${skippedCount} baris kosong/rusak)\n\nKlik OK untuk import ke database.`;
                if(window.confirm(confirmMsg)) {
                    // Let parent component handle the async API call and loading state
                    onImport(parsedStudents);
                }
            } else {
                alert('GAGAL: Tidak ada data valid ditemukan. Pastikan header kolom Excel adalah: "NIS", "Nama", "Kelas", "Gender".');
            }

        } catch (error) {
            console.error("Import Error:", error);
            alert("ERROR: File Excel rusak atau tidak valid.");
        }
    };

    reader.onerror = () => {
        alert("ERROR: Gagal membaca file.");
    }

    reader.readAsArrayBuffer(file);
    
    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
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

                <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                    {/* Template Button */}
                    <button 
                        onClick={handleDownloadTemplate}
                        className="p-2 text-green-600 bg-green-50 hover:bg-green-100 rounded-lg border border-green-200 transition-colors"
                        title="Download Template Excel"
                    >
                        <FileSpreadsheet size={20} />
                    </button>

                    {/* Import Button */}
                    <div className="relative">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileUpload}
                            accept=".xlsx, .xls"
                            className="hidden"
                        />
                        <button 
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium"
                        >
                            <Upload size={16} />
                            <span className="hidden sm:inline">Import</span>
                        </button>
                    </div>

                    {/* Add Button */}
                    <button 
                        onClick={onAdd}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm w-full sm:w-auto justify-center"
                    >
                        <Plus size={16} />
                        <span>Tambah Siswa</span>
                    </button>
                </div>
            </div>
       </div>

       {/* Table Content */}
       <div className="flex-1 overflow-auto custom-scrollbar p-6">
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-gray-50 text-xs uppercase text-gray-500 font-bold sticky top-0 z-10">
                        <tr>
                            <th className="px-6 py-4 border-b border-gray-200 w-16 text-center">No</th>
                            <th className="px-6 py-4 border-b border-gray-200 w-32">NIS</th>
                            <th className="px-6 py-4 border-b border-gray-200">Nama Lengkap</th>
                            <th className="px-6 py-4 border-b border-gray-200 w-24 text-center">L/P</th>
                            <th className="px-6 py-4 border-b border-gray-200 w-32 text-center">Kelas</th>
                            <th className="px-6 py-4 border-b border-gray-200 w-32 text-right">Aksi</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {filteredStudents.length > 0 ? (
                            filteredStudents.map((student, index) => (
                                <tr key={student.id} className="hover:bg-blue-50/30 transition-colors group">
                                    <td className="px-6 py-3 text-center text-sm text-gray-500">
                                        {index + 1}
                                    </td>
                                    <td className="px-6 py-3 text-sm font-mono text-gray-600">
                                        {student.nis}
                                    </td>
                                    <td className="px-6 py-3 text-sm font-medium text-gray-800">
                                        {student.name}
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                                            student.gender === 'L' ? 'bg-blue-100 text-blue-600' : 'bg-pink-100 text-pink-600'
                                        }`}>
                                            {student.gender}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-center">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-bold text-gray-600">
                                            {student.kelas}
                                        </span>
                                    </td>
                                    <td className="px-6 py-3 text-right">
                                        <div className="flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button 
                                                onClick={() => onEdit(student)}
                                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                                                title="Edit"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    if(window.confirm(`Yakin ingin menghapus siswa "${student.name}"? Data nilai akan ikut terhapus.`)) {
                                                        onDelete(student.id);
                                                    }
                                                }}
                                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                                                title="Hapus"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan={6} className="px-6 py-12 text-center text-gray-400">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <Search size={32} className="opacity-20" />
                                        <p>Tidak ada data siswa ditemukan.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>
            
            <div className="mt-4 text-xs text-gray-400 text-center">
                Menampilkan {filteredStudents.length} dari {students.length} total siswa
            </div>
       </div>
    </div>
  );
};

export default StudentDataTable;
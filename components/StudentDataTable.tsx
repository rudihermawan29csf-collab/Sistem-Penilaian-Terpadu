
import React, { useState, useRef } from 'react';
import { Student } from '../types';
import { Edit2, Trash2, Search, Plus, Download, Upload, FileSpreadsheet } from 'lucide-react';
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Filter Logic
  const filteredStudents = students.filter(s => 
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
    s.nis.includes(searchTerm) || 
    s.kelas.toLowerCase().includes(searchTerm.toLowerCase())
  ).sort((a, b) => {
      // Sort by Class then Name
      if (a.kelas === b.kelas) return a.name.localeCompare(b.name);
      return a.kelas.localeCompare(b.kelas);
  });

  // Handle Download Template
  const handleDownloadTemplate = () => {
    const templateData = [
        { No: 1, NIS: "12345", Nama: "Contoh Siswa", Kelas: "VII A", Gender: "L" },
        { No: 2, NIS: "12346", Nama: "Siswa Kedua", Kelas: "VII A", Gender: "P" },
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
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);

        const parsedStudents: Student[] = data.map((row: any, index) => ({
            id: Date.now() + index,
            no: index + 1,
            nis: row['NIS'] ? String(row['NIS']) : '',
            name: row['Nama'] || '',
            kelas: row['Kelas'] || '',
            gender: row['Gender'] === 'P' ? 'P' : 'L',
            grades: {
                ganjil: createEmptySemesterData(),
                genap: createEmptySemesterData()
            },
            gradesBySubject: {}
        })).filter(s => s.name && s.kelas); // Basic validation

        if (parsedStudents.length > 0) {
            if(window.confirm(`Ditemukan ${parsedStudents.length} data siswa valid. Import sekarang?`)) {
                onImport(parsedStudents);
            }
        } else {
            alert('Tidak ada data valid ditemukan. Pastikan format sesuai template.');
        }
    };
    reader.readAsBinaryString(file);
    // Reset input
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
       <div className="px-6 py-5 border-b border-gray-200 bg-white flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-20">
            <div>
                 <h2 className="text-xl font-bold text-gray-800">Data Siswa</h2>
                 <p className="text-sm text-gray-500">Kelola master data siswa seluruh kelas.</p>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="relative">
                    <input 
                        type="text" 
                        placeholder="Cari Siswa / Kelas..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none w-64"
                    />
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                </div>
                
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
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
                >
                    <Plus size={16} />
                    <span>Siswa</span>
                </button>
            </div>
       </div>

       {/* Table */}
       <div className="relative overflow-auto flex-1 bg-white custom-scrollbar p-0">
        <table className="border-collapse w-full min-w-max">
            <thead className="sticky top-0 z-10 bg-[#f9f9fb] shadow-sm">
            <tr className="border-b border-gray-300 text-left">
                <th className="p-3 w-16 font-bold text-gray-500 text-xs uppercase tracking-wider text-center sticky left-0 bg-[#f9f9fb]">
                No
                </th>
                <th className="p-3 w-32 font-bold text-gray-500 text-xs uppercase tracking-wider border-r border-gray-200">
                NIS
                </th>
                <th className="p-3 min-w-[250px] font-bold text-gray-500 text-xs uppercase tracking-wider border-r border-gray-200">
                Nama Lengkap
                </th>
                <th className="p-3 w-24 font-bold text-gray-500 text-xs uppercase tracking-wider border-r border-gray-200 text-center">
                Kelas
                </th>
                <th className="p-3 w-24 font-bold text-gray-500 text-xs uppercase tracking-wider text-center">
                Gender
                </th>
                <th className="p-3 w-24 font-bold text-gray-500 text-xs uppercase tracking-wider text-center sticky right-0 bg-[#f9f9fb] shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                Aksi
                </th>
            </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
            {filteredStudents.length === 0 ? (
                <tr>
                <td colSpan={6} className="text-center py-12">
                    <div className="flex flex-col items-center justify-center text-gray-400">
                        <Search size={32} className="mb-2 opacity-50" />
                        <p className="text-sm">Tidak ada data siswa ditemukan.</p>
                    </div>
                </td>
                </tr>
            ) : (
                filteredStudents.map((student, index) => (
                <tr key={student.id} className="group hover:bg-blue-50/20 transition-colors">
                    <td className="p-3 text-center text-sm text-gray-500 font-medium sticky left-0 bg-white group-hover:bg-blue-50/20">
                    {index + 1}
                    </td>
                    <td className="p-3 text-sm font-mono text-gray-600 border-r border-gray-100">
                    {student.nis}
                    </td>
                    <td className="p-3 text-sm font-bold text-gray-700 border-r border-gray-100">
                    {student.name}
                    </td>
                    <td className="p-3 text-center border-r border-gray-100">
                        <span className="text-xs font-bold text-blue-700 bg-blue-100 px-2 py-1 rounded">
                            {student.kelas}
                        </span>
                    </td>
                    <td className="p-3 text-center">
                    <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold ${
                        student.gender === 'L' 
                        ? 'bg-blue-50 text-blue-600 border border-blue-100' 
                        : 'bg-pink-50 text-pink-600 border border-pink-100'
                    }`}>
                        {student.gender}
                    </span>
                    </td>
                    <td className="p-3 text-center sticky right-0 bg-white group-hover:bg-blue-50/20 shadow-[-4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                        <div className="flex items-center justify-center gap-2">
                            <button 
                                onClick={() => onEdit(student)}
                                className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                            >
                                <Edit2 size={16} />
                            </button>
                            <button 
                                onClick={() => handleDeleteClick(student.id, student.name)}
                                className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors"
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
  );
};

export default StudentDataTable;

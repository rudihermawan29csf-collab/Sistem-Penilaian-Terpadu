
import React, { useState } from 'react';
import { Teacher } from '../types';
import { Plus, Edit2, Trash2, Check, X, Save, User } from 'lucide-react';

interface TeacherDataViewProps {
  teachers: Teacher[];
  setTeachers: (teacher: Teacher) => void; 
}

const TeacherDataView: React.FC<TeacherDataViewProps> = ({ teachers, setTeachers }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeacher, setEditingTeacher] = useState<Teacher | null>(null);
  
  const initialFormState = {
    name: '',
    nip: '',
    subject: '',
    classes: [] as string[]
  };
  const [formData, setFormData] = useState(initialFormState);

  const classColumns = ['VII A', 'VII B', 'VII C', 'VIII A', 'VIII B', 'VIII C', 'IX A', 'IX B', 'IX C'];

  const handleEdit = (teacher: Teacher) => {
    setEditingTeacher(teacher); 
    setFormData({
      name: teacher.name,
      nip: teacher.nip,
      subject: teacher.subject,
      classes: teacher.classes
    });
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    alert("Hubungi administrator untuk menghapus guru.");
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    
    let teacherToSave: Teacher;

    if (editingTeacher) {
      // STRICT UPDATE: Use the ID from the specific row being edited to ensure only this row updates
      teacherToSave = {
        ...editingTeacher, // Preserves ID and No
        name: formData.name,
        nip: formData.nip,
        subject: formData.subject,
        classes: formData.classes
      };
    } else {
      // NEW ENTRY: Generate a truly unique ID
      teacherToSave = {
        id: Date.now() + Math.floor(Math.random() * 10000),
        no: teachers.length + 1,
        name: formData.name,
        nip: formData.nip,
        subject: formData.subject,
        classes: formData.classes
      };
    }
    
    // Pass the single teacher object to the handler (App.tsx should handle the array update by ID)
    setTeachers(teacherToSave); 
    
    setIsModalOpen(false);
    setEditingTeacher(null);
    setFormData(initialFormState);
  };

  const toggleClassSelection = (cls: string) => {
    setFormData(prev => ({
      ...prev,
      classes: prev.classes.includes(cls) 
        ? prev.classes.filter(c => c !== cls)
        : [...prev.classes, cls]
    }));
  };

  return (
    <div className="flex-1 bg-white h-full flex flex-col">
      {/* Header */}
      <div className="px-6 py-5 border-b border-gray-200 flex justify-between items-center bg-white sticky top-0 z-10">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <User className="text-blue-600" />
            Data Guru & Tenaga Pendidik
          </h2>
          <p className="text-sm text-gray-500 mt-1">Kelola data guru, NIP, mata pelajaran, dan distribusi kelas.</p>
        </div>
        <button 
          onClick={() => {
            setEditingTeacher(null);
            setFormData(initialFormState);
            setIsModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium shadow-sm"
        >
          <Plus size={16} />
          Tambah Guru
        </button>
      </div>

      {/* Table Container - Added overflow-x-auto for horizontal scrolling */}
      <div className="flex-1 overflow-x-auto custom-scrollbar p-6">
        <div className="border border-gray-200 rounded-xl overflow-hidden shadow-sm inline-block min-w-full align-middle">
          {/* Added min-w-max to force table width to accommodate all columns */}
          <table className="min-w-max w-full border-collapse">
            <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-bold tracking-wider">
              <tr>
                <th className="p-3 border-r border-gray-200 text-center w-12 sticky left-0 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">No</th>
                <th className="p-3 border-r border-gray-200 text-left min-w-[200px] sticky left-12 bg-gray-50 z-20 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.1)]">Nama Guru</th>
                <th className="p-3 border-r border-gray-200 text-left min-w-[150px] whitespace-nowrap">NIP</th>
                <th className="p-3 border-r border-gray-200 text-left min-w-[200px] whitespace-nowrap">Mata Pelajaran</th>
                {classColumns.map(cls => (
                  <th key={cls} className="p-2 border-r border-gray-200 text-center w-12 min-w-[3rem] text-[10px]">
                    {cls}
                  </th>
                ))}
                <th className="p-3 text-center min-w-[100px] sticky right-0 bg-gray-50 z-20 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.1)]">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {teachers.map((teacher, index) => (
                <tr key={teacher.id} className="hover:bg-blue-50/30 transition-colors group text-sm">
                  <td className="p-3 text-center text-gray-500 border-r border-gray-100 sticky left-0 bg-white group-hover:bg-blue-50/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    {index + 1}
                  </td>
                  <td className="p-3 text-gray-800 font-medium border-r border-gray-100 sticky left-12 bg-white group-hover:bg-blue-50/30 z-10 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.05)] whitespace-nowrap">
                    {teacher.name}
                  </td>
                  <td className="p-3 text-gray-600 font-mono text-xs border-r border-gray-100 whitespace-nowrap">
                    {teacher.nip || '-'}
                  </td>
                  <td className="p-3 text-gray-700 border-r border-gray-100 whitespace-nowrap">
                    {teacher.subject}
                  </td>
                  {classColumns.map(cls => (
                    <td key={cls} className="p-2 text-center border-r border-gray-100">
                      {teacher.classes.includes(cls) && (
                        <div className="flex justify-center">
                          <Check size={16} className="text-green-600" strokeWidth={3} />
                        </div>
                      )}
                    </td>
                  ))}
                  <td className="p-3 text-center sticky right-0 bg-white group-hover:bg-blue-50/30 z-10 shadow-[-2px_0_5px_-2px_rgba(0,0,0,0.05)]">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleEdit(teacher)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => handleDelete(teacher.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-colors opacity-50 cursor-not-allowed"
                        title="Hapus (Hubungi Admin)"
                        disabled
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Form */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-scale-in">
            <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
              <h3 className="text-lg font-bold text-gray-800">
                {editingTeacher ? 'Edit Data Guru' : 'Tambah Guru Baru'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nama Lengkap & Gelar</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Contoh: Dra. Sri Hayati"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">NIP (Opsional)</label>
                  <input
                    type="text"
                    value={formData.nip}
                    onChange={e => setFormData({...formData, nip: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="-"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mata Pelajaran</label>
                  <input
                    type="text"
                    required
                    value={formData.subject}
                    onChange={e => setFormData({...formData, subject: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    placeholder="Contoh: Bahasa Indonesia"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Distribusi Kelas Mengajar</label>
                <div className="grid grid-cols-3 gap-2">
                  {classColumns.map(cls => (
                    <label key={cls} className={`flex items-center justify-center px-3 py-2 border rounded-lg cursor-pointer transition-all ${
                      formData.classes.includes(cls) 
                        ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}>
                      <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={formData.classes.includes(cls)}
                        onChange={() => toggleClassSelection(cls)}
                      />
                      <span className="text-sm font-semibold">{cls}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 mt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-gray-600 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 text-sm font-medium"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-white bg-blue-600 rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
                >
                  <Save size={16} />
                  Simpan Data
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherDataView;

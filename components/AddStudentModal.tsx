
import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { Student } from '../types';
import { createEmptySemesterData } from '../utils';

interface AddStudentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (student: Student) => void;
  initialData?: Student | null;
  existingClasses: string[];
}

const AddStudentModal: React.FC<AddStudentModalProps> = ({ 
  isOpen, 
  onClose, 
  onSave, 
  initialData, 
  existingClasses 
}) => {
  const [formData, setFormData] = useState({
    nis: '',
    name: '',
    kelas: '',
    gender: 'L' as 'L' | 'P'
  });

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          nis: initialData.nis,
          name: initialData.name,
          kelas: initialData.kelas,
          gender: initialData.gender
        });
      } else {
        setFormData({
          nis: '',
          name: '',
          kelas: existingClasses.length > 0 ? existingClasses[0] : '',
          gender: 'L'
        });
      }
    }
  }, [isOpen, initialData, existingClasses]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.kelas || !formData.nis) return;

    const student: Student = {
      id: initialData ? initialData.id : Date.now(),
      no: initialData ? initialData.no : 0, // No handled by parent usually
      nis: formData.nis,
      name: formData.name,
      kelas: formData.kelas.toUpperCase(),
      gender: formData.gender,
      grades: initialData ? initialData.grades : {
        ganjil: createEmptySemesterData(),
        genap: createEmptySemesterData(),
      },
      gradesBySubject: initialData ? initialData.gradesBySubject : {}
    };

    onSave(student);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/20 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      {/* Modal Content */}
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 ring-1 ring-gray-900/5 animate-scale-in">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f9f9fb]">
          <h3 className="text-lg font-bold text-gray-900">
            {initialData ? 'Edit Data Siswa' : 'Tambah Siswa Baru'}
          </h3>
          <button 
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-200 transition-colors text-gray-500"
          >
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                NIS
              </label>
              <input 
                type="text" 
                required
                value={formData.nis} 
                onChange={(e) => setFormData({...formData, nis: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                placeholder="1234"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Jenis Kelamin
              </label>
              <select
                value={formData.gender}
                onChange={(e) => setFormData({...formData, gender: e.target.value as 'L' | 'P'})}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              >
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nama Lengkap
            </label>
            <input
              type="text"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              placeholder="Masukkan nama siswa..."
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
            />
          </div>

          <div>
             <label className="block text-sm font-medium text-gray-700 mb-1">
              Kelas
            </label>
             <div className="relative">
                <input
                    type="text"
                    required
                    list="classList"
                    value={formData.kelas}
                    onChange={(e) => setFormData({...formData, kelas: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm uppercase"
                    placeholder="Contoh: VII A"
                />
                <datalist id="classList">
                    {existingClasses.map(cls => (
                        <option key={cls} value={cls} />
                    ))}
                </datalist>
             </div>
             <p className="text-xs text-gray-500 mt-1">Ketik kelas baru atau pilih dari daftar.</p>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t border-gray-100 mt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm flex items-center gap-2"
            >
              <Save size={16} />
              Simpan Data
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AddStudentModal;

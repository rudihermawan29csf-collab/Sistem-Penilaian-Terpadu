import React, { useState, useEffect, useMemo } from 'react';
import { X, Calendar, Users } from 'lucide-react';
import { SemesterKey, ChapterKey, FormativeKey, GradeType, GradingSession } from '../types';

interface InputGradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveSession: (session: GradingSession) => void;
  currentSemester: SemesterKey;
  targetClass: string;
  initialData?: GradingSession | null;
  history?: GradingSession[]; // Added history prop
}

const InputGradeModal: React.FC<InputGradeModalProps> = ({ 
  isOpen, 
  onClose, 
  onSaveSession, 
  currentSemester,
  targetClass,
  initialData,
  history = [] 
}) => {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [type, setType] = useState<GradeType>('bab');
  const [chapter, setChapter] = useState<ChapterKey>('bab1');
  const [field, setField] = useState<FormativeKey>('f1');
  const [description, setDescription] = useState('');

  // Determine available fields based on what's already in history for this class/semester/chapter
  const availableFields = useMemo(() => {
    if (type !== 'bab') return [];

    const allFields: { value: FormativeKey, label: string }[] = [
      { value: 'f1', label: 'Formatif 1' },
      { value: 'f2', label: 'Formatif 2' },
      { value: 'f3', label: 'Formatif 3' },
      { value: 'f4', label: 'Formatif 4' },
      { value: 'f5', label: 'Formatif 5' },
      { value: 'sum', label: 'Sumatif / Ulangan' },
    ];

    // Get list of fields already used for this chapter in this class/semester
    const usedFields = history
      .filter(h => 
        h.targetClass === targetClass && 
        h.semester === currentSemester && 
        h.type === 'bab' && 
        h.chapterKey === chapter &&
        // If we are editing, allow the current field to be shown
        (!initialData || h.id !== initialData.id)
      )
      .map(h => h.formativeKey);

    return allFields.filter(f => !usedFields.includes(f.value));
  }, [history, targetClass, currentSemester, type, chapter, initialData]);

  // Effect to reset field if the selected field becomes unavailable (e.g. when changing chapter)
  useEffect(() => {
    if (type === 'bab' && availableFields.length > 0) {
      // If current field is not in available fields, set to first available
      if (!availableFields.some(f => f.value === field)) {
        setField(availableFields[0].value);
      }
    }
  }, [availableFields, type, field]);

  // Populate form when initialData changes (Edit Mode)
  useEffect(() => {
    if (isOpen && initialData) {
      setDate(initialData.date);
      setType(initialData.type);
      if (initialData.chapterKey) setChapter(initialData.chapterKey);
      if (initialData.formativeKey) setField(initialData.formativeKey);
      setDescription(initialData.description || '');
    } else if (isOpen && !initialData) {
      // Reset defaults for new entry
      setDate(new Date().toISOString().split('T')[0]);
      setType('bab');
      setChapter('bab1');
      // Field will be set by the other effect based on availability
      setDescription('');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (type === 'bab' && availableFields.length === 0 && !initialData) {
        alert("Semua kolom penilaian untuk bab ini sudah digunakan.");
        return;
    }

    onSaveSession({
      id: initialData ? initialData.id : Date.now().toString(),
      semester: currentSemester,
      targetClass: targetClass, // Save the class context
      date,
      type,
      chapterKey: type === 'bab' ? chapter : undefined,
      formativeKey: type === 'bab' ? field : undefined,
      description
    });
    onClose();
  };

  const getChapterLabel = (key: ChapterKey) => {
    const num = parseInt(key.replace('bab', ''));
    if (currentSemester === 'genap') {
      return `Bab ${num + 5}`;
    }
    return `Bab ${num}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div 
        className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      ></div>

      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 ring-1 ring-gray-900/5">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-[#f9f9fb]">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">
              {initialData ? 'Edit Riwayat Penilaian' : 'Buka Input Nilai Baru'}
            </h3>
            <p className="text-xs text-gray-500 mt-0.5">Untuk Kelas: <span className="font-bold text-blue-600">{targetClass}</span></p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 transition-colors text-gray-500">
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Semester & Date */}
          <div className="grid grid-cols-2 gap-4">
            <div>
               <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Semester</label>
               <div className="w-full px-3 py-2 bg-gray-100 border border-gray-200 rounded-lg text-gray-700 text-sm font-medium">
                  {currentSemester === 'ganjil' ? 'Semester Ganjil' : 'Semester Genap'}
               </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Tanggal</label>
              <div className="relative">
                <input 
                  type="date" 
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
                <Calendar className="absolute left-3 top-2.5 text-gray-400" size={16} />
              </div>
            </div>
          </div>

          {/* Grade Type */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Jenis Penilaian</label>
            <div className="grid grid-cols-3 gap-3">
              {(['bab', 'kts', 'sas'] as GradeType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                    type === t 
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm' 
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {t === 'bab' ? 'Lingkup Materi' : t.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Conditional Fields for BAB */}
          {type === 'bab' && (
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Pilih Bab</label>
                  <select 
                    value={chapter}
                    onChange={(e) => setChapter(e.target.value as ChapterKey)}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  >
                    {(['bab1', 'bab2', 'bab3', 'bab4', 'bab5'] as ChapterKey[]).map(c => (
                      <option key={c} value={c}>{getChapterLabel(c)}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-500 mb-1">Tujuan Penilaian</label>
                  {availableFields.length > 0 ? (
                    <select 
                        value={field}
                        onChange={(e) => setField(e.target.value as FormativeKey)}
                        className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                    >
                        {availableFields.map(f => (
                        <option key={f.value} value={f.value}>{f.label}</option>
                        ))}
                    </select>
                  ) : (
                    <div className="text-sm text-red-500 italic mt-2 border border-red-200 bg-red-50 px-3 py-2 rounded-lg">
                        Semua formatif untuk Bab ini sudah dibuat.
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Keterangan / Topik</label>
            <input
              type="text"
              required
              placeholder={type === 'bab' ? "Contoh: Mengahafal Surat An-Nas" : "Keterangan penilaian..."}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
            />
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={type === 'bab' && availableFields.length === 0}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {initialData ? 'Simpan Perubahan' : 'Buka Input Nilai'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InputGradeModal;
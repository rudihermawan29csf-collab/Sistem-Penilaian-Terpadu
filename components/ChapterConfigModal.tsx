
import React, { useState, useEffect } from 'react';
import { X, Save, BookOpen, Check } from 'lucide-react';
import { ChapterKey } from '../types';

interface ChapterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  semester: 'ganjil' | 'genap';
  initialConfig: Record<ChapterKey, boolean>;
  onSave: (config: Record<ChapterKey, boolean>) => void;
}

const ChapterConfigModal: React.FC<ChapterConfigModalProps> = ({
  isOpen,
  onClose,
  subjectName,
  semester,
  initialConfig,
  onSave
}) => {
  const [config, setConfig] = useState<Record<ChapterKey, boolean>>(initialConfig);

  useEffect(() => {
    if (isOpen) {
      setConfig(initialConfig);
    }
  }, [isOpen, initialConfig]);

  if (!isOpen) return null;

  const toggleChapter = (key: ChapterKey) => {
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSave = () => {
    onSave(config);
    onClose();
  };

  const chapters: { key: ChapterKey; label: string }[] = [
    { key: 'bab1', label: semester === 'genap' ? 'Bab 6' : 'Bab 1' },
    { key: 'bab2', label: semester === 'genap' ? 'Bab 7' : 'Bab 2' },
    { key: 'bab3', label: semester === 'genap' ? 'Bab 8' : 'Bab 3' },
    { key: 'bab4', label: semester === 'genap' ? 'Bab 9' : 'Bab 4' },
    { key: 'bab5', label: semester === 'genap' ? 'Bab 10' : 'Bab 5' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 ring-1 ring-gray-900/5 animate-scale-in">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#f9f9fb] flex justify-between items-center">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Konfigurasi Bab</h3>
            <p className="text-xs text-gray-500 mt-0.5">{subjectName} • {semester === 'ganjil' ? 'Ganjil' : 'Genap'}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6">
          <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100">
             Pilih Bab yang aktif untuk perhitungan nilai akhir. Bab yang tidak dicentang akan disembunyikan dan tidak dihitung dalam Rerata.
          </p>

          <div className="space-y-3">
             {chapters.map((chap) => (
                <div 
                   key={chap.key} 
                   onClick={() => toggleChapter(chap.key)}
                   className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-all ${
                      config[chap.key] 
                        ? 'bg-white border-blue-500 shadow-sm ring-1 ring-blue-500/20' 
                        : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                   }`}
                >
                   <div className="flex items-center gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                         config[chap.key] ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'
                      }`}>
                         {chap.key.replace('bab', '')}
                      </div>
                      <span className={`font-medium ${config[chap.key] ? 'text-gray-900' : 'text-gray-400'}`}>
                         {chap.label}
                      </span>
                   </div>
                   <div className={`w-6 h-6 rounded-full border flex items-center justify-center transition-colors ${
                      config[chap.key] ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                   }`}>
                      {config[chap.key] && <Check size={14} strokeWidth={3} />}
                   </div>
                </div>
             ))}
          </div>

          <div className="mt-6 flex justify-end gap-3">
             <button 
               onClick={onClose}
               className="px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
             >
               Batal
             </button>
             <button 
               onClick={handleSave}
               className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition-colors flex items-center gap-2"
             >
               <Save size={16} />
               Simpan Konfigurasi
             </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChapterConfigModal;

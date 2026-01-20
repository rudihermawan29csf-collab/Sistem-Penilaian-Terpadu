
import React, { useState, useEffect } from 'react';
import { X, Save, Check, Settings2 } from 'lucide-react';
import { ChapterKey, FormativeKey } from '../types';

interface ChapterConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  subjectName: string;
  semester: 'ganjil' | 'genap';
  initialConfig: Record<ChapterKey, boolean>;
  initialFieldConfig?: Record<ChapterKey, Record<FormativeKey, boolean>>;
  onSave: (config: Record<ChapterKey, boolean>, fieldConfig: Record<ChapterKey, Record<FormativeKey, boolean>>) => void;
}

const ChapterConfigModal: React.FC<ChapterConfigModalProps> = ({
  isOpen,
  onClose,
  subjectName,
  semester,
  initialConfig,
  initialFieldConfig,
  onSave
}) => {
  const [config, setConfig] = useState<Record<ChapterKey, boolean>>(initialConfig);
  const [fieldConfig, setFieldConfig] = useState<Record<ChapterKey, Record<FormativeKey, boolean>>>({
      bab1: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true },
      bab2: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true },
      bab3: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true },
      bab4: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true },
      bab5: { f1: true, f2: true, f3: true, f4: true, f5: true, sum: true },
  });

  useEffect(() => {
    if (isOpen) {
      setConfig(initialConfig);
      if (initialFieldConfig) {
          // Merge with default to ensure no undefined keys
          const merged: any = { ...fieldConfig };
          Object.keys(initialFieldConfig).forEach((k) => {
              const key = k as ChapterKey;
              merged[key] = { ...merged[key], ...initialFieldConfig[key] };
          });
          setFieldConfig(merged);
      }
    }
  }, [isOpen, initialConfig, initialFieldConfig]);

  if (!isOpen) return null;

  const toggleChapter = (key: ChapterKey) => {
    setConfig(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const toggleField = (chap: ChapterKey, field: FormativeKey) => {
      setFieldConfig(prev => ({
          ...prev,
          [chap]: {
              ...prev[chap],
              [field]: !prev[chap][field]
          }
      }));
  };

  const handleSave = () => {
    onSave(config, fieldConfig);
    onClose();
  };

  const chapters: { key: ChapterKey; label: string }[] = [
    { key: 'bab1', label: 'TP 1' },
    { key: 'bab2', label: 'TP 2' },
    { key: 'bab3', label: 'TP 3' },
    { key: 'bab4', label: 'TP 4' },
    { key: 'bab5', label: 'TP 5' },
  ];

  const fields: { key: FormativeKey; label: string }[] = [
      { key: 'f1', label: 'F1' },
      { key: 'f2', label: 'F2' },
      { key: 'f3', label: 'F3' },
      { key: 'f4', label: 'F4' },
      { key: 'f5', label: 'F5' },
      { key: 'sum', label: 'Sum' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all scale-100 ring-1 ring-gray-900/5 animate-scale-in max-h-[90vh] flex flex-col">
        <div className="px-6 py-4 border-b border-gray-100 bg-[#f9f9fb] flex justify-between items-center shrink-0">
          <div>
            <h3 className="text-lg font-bold text-gray-800">Konfigurasi TP & Kolom Nilai</h3>
            <p className="text-xs text-gray-500 mt-0.5">{subjectName} • {semester === 'ganjil' ? 'Ganjil' : 'Genap'}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto custom-scrollbar">
          <p className="text-sm text-gray-600 mb-4 bg-blue-50 p-3 rounded-lg border border-blue-100 flex gap-2">
             <Settings2 className="shrink-0 text-blue-600" size={18} />
             <span>Atur TP yang aktif dan pilih kolom (F1-Sum) yang ingin ditampilkan pada tabel input nilai.</span>
          </p>

          <div className="space-y-4">
             {chapters.map((chap) => (
                <div 
                   key={chap.key} 
                   className={`rounded-xl border transition-all overflow-hidden ${
                      config[chap.key] 
                        ? 'bg-white border-blue-200 shadow-sm ring-1 ring-blue-500/20' 
                        : 'bg-gray-50 border-gray-200 opacity-70'
                   }`}
                >
                   {/* Chapter Header */}
                   <div 
                        onClick={() => toggleChapter(chap.key)}
                        className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50/50"
                   >
                       <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                             config[chap.key] ? 'bg-blue-100 text-blue-600' : 'bg-gray-200 text-gray-400'
                          }`}>
                             {chap.key.replace('bab', '')}
                          </div>
                          <span className={`font-medium ${config[chap.key] ? 'text-gray-900' : 'text-gray-400'}`}>
                             {chap.label}
                          </span>
                       </div>
                       <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${
                          config[chap.key] ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 bg-white'
                       }`}>
                          {config[chap.key] && <Check size={12} strokeWidth={4} />}
                       </div>
                   </div>

                   {/* Field Configuration (Only if Chapter is active) */}
                   {config[chap.key] && (
                       <div className="px-3 pb-3 pt-0 ml-11 border-t border-dashed border-gray-100 mt-1">
                           <p className="text-[10px] text-gray-400 font-bold uppercase mb-2 mt-2">Kolom Aktif:</p>
                           <div className="flex flex-wrap gap-2">
                               {fields.map(field => (
                                   <button
                                      key={field.key}
                                      onClick={() => toggleField(chap.key, field.key)}
                                      className={`px-2 py-1 rounded text-xs font-bold border transition-all ${
                                          fieldConfig[chap.key]?.[field.key]
                                            ? 'bg-blue-50 border-blue-200 text-blue-700'
                                            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                                      }`}
                                   >
                                       {field.label}
                                   </button>
                               ))}
                           </div>
                       </div>
                   )}
                </div>
             ))}
          </div>
        </div>

        <div className="px-6 py-4 bg-white border-t border-gray-100 flex justify-end gap-3 shrink-0">
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
  );
};

export default ChapterConfigModal;

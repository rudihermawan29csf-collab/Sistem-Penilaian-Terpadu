
import React, { useState, useEffect } from 'react';
import { AppSettings, ChapterKey, FormativeKey, KokurikulerProject, Teacher, UpRange } from '../types';
import { Save, School, KeyRound, Calendar, Image as ImageIcon, FileText, CheckSquare, Square, Plus, Trash2, BookOpen, Building2, Award, TrendingUp, ChevronRight, Library, Layout, Shield, Loader2 } from 'lucide-react';

interface SettingsViewProps {
  settings: AppSettings;
  teachers?: Teacher[];
  onSaveSettings: (settings: AppSettings) => Promise<void>;
}

const SettingsView: React.FC<SettingsViewProps> = ({ settings, teachers = [], onSaveSettings }) => {
  const [formData, setFormData] = useState<AppSettings>(settings);
  const [p5Semester, setP5Semester] = useState<'ganjil' | 'genap'>('ganjil');
  const [newUpRange, setNewUpRange] = useState<UpRange>({ min: 0, max: 0, value: 0 });
  const [newSubject, setNewSubject] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<'general' | 'academic' | 'assessment' | 'extra' | 'security'>('general');

  // CRITICAL FIX: Sync local state when props change. 
  // This prevents "data disappearing" if the parent component updates or re-fetches data.
  useEffect(() => {
      setFormData(settings);
  }, [settings]);

  const handleChange = (field: keyof AppSettings, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleHeaderChange = (index: number, value: string) => {
      const newHeader = [...(formData.schoolHeader || [])];
      newHeader[index] = value;
      setFormData(prev => ({ ...prev, schoolHeader: newHeader }));
  };

  const addHeaderLine = () => {
      setFormData(prev => ({ ...prev, schoolHeader: [...(prev.schoolHeader || []), "Baris Baru"] }));
  };

  const removeHeaderLine = (index: number) => {
      setFormData(prev => ({ ...prev, schoolHeader: (prev.schoolHeader || []).filter((_, i) => i !== index) }));
  };

  // --- SUBJECTS ---
  const handleAddSubject = () => {
      if (!newSubject.trim()) return;
      setFormData(prev => ({
          ...prev,
          subjects: [...(prev.subjects || []), newSubject.trim()].sort()
      }));
      setNewSubject('');
  };

  const handleDeleteSubject = (index: number) => {
      setFormData(prev => ({
          ...prev,
          subjects: (prev.subjects || []).filter((_, i) => i !== index)
      }));
  };

  const handleChapterToggle = (chap: ChapterKey) => {
      setFormData(prev => ({
          ...prev,
          visibleChapters: {
              ...prev.visibleChapters,
              [chap]: !prev.visibleChapters[chap]
          }
      }));
  };

  const handleFieldToggle = (chap: ChapterKey, field: FormativeKey) => {
      setFormData(prev => ({
          ...prev,
          midSemesterFieldConfig: {
              ...prev.midSemesterFieldConfig,
              [chap]: {
                  ...prev.midSemesterFieldConfig[chap] || { f1:true, f2:true, f3:true, f4:true, f5:true, sum:true },
                  [field]: !prev.midSemesterFieldConfig[chap]?.[field]
              }
          }
      }));
  };

  // --- KOKURIKULER (P5) ---
  const handleAddProject = () => {
    setFormData(prev => ({
        ...prev,
        kokurikulerProjects: {
            ...prev.kokurikulerProjects,
            [p5Semester]: [...(prev.kokurikulerProjects[p5Semester] || []), { theme: '', description: '' }]
        }
    }));
  };

  const handleProjectChange = (index: number, field: keyof KokurikulerProject, value: string) => {
      const currentProjects = [...(formData.kokurikulerProjects[p5Semester] || [])];
      currentProjects[index] = { ...currentProjects[index], [field]: value };
      
      setFormData(prev => ({ 
          ...prev, 
          kokurikulerProjects: {
              ...prev.kokurikulerProjects,
              [p5Semester]: currentProjects
          }
      }));
  };

  const handleDeleteProject = (index: number) => {
      const currentProjects = (formData.kokurikulerProjects[p5Semester] || []).filter((_, i) => i !== index);
      setFormData(prev => ({
          ...prev,
          kokurikulerProjects: {
              ...prev.kokurikulerProjects,
              [p5Semester]: currentProjects
          }
      }));
  };

  // --- EXTRAKURIKULER ---
  const handleAddExtra = () => {
      setFormData(prev => ({
          ...prev,
          extracurriculars: [...(prev.extracurriculars || []), { name: '', coach: '' }]
      }));
  };

  const handleExtraChange = (index: number, field: 'name' | 'coach', value: string) => {
      const newExtras = [...(formData.extracurriculars || [])];
      newExtras[index] = { ...newExtras[index], [field]: value };
      setFormData(prev => ({ ...prev, extracurriculars: newExtras }));
  };

  const handleDeleteExtra = (index: number) => {
      setFormData(prev => ({
          ...prev,
          extracurriculars: (prev.extracurriculars || []).filter((_, i) => i !== index)
      }));
  };

  // --- UP RANGES ---
  const handleAddUpRange = () => {
      if (newUpRange.max < newUpRange.min) {
          alert("Nilai Max tidak boleh lebih kecil dari Min");
          return;
      }
      setFormData(prev => ({
          ...prev,
          upRanges: [...(prev.upRanges || []), newUpRange].sort((a,b) => a.min - b.min)
      }));
      setNewUpRange({ min: 0, max: 0, value: 0 }); // Reset
  };

  const handleDeleteUpRange = (index: number) => {
      setFormData(prev => ({
          ...prev,
          upRanges: (prev.upRanges || []).filter((_, i) => i !== index)
      }));
  };

  const handleUpdateUpRange = (index: number, field: keyof UpRange, value: number) => {
      const updatedRanges = [...(formData.upRanges || [])];
      updatedRanges[index] = { ...updatedRanges[index], [field]: value };
      setFormData(prev => ({ ...prev, upRanges: updatedRanges }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
        await onSaveSettings(formData);
        alert('Pengaturan berhasil disimpan ke server!');
    } catch (e) {
        alert('Gagal menyimpan pengaturan. Silakan coba lagi.');
    } finally {
        setIsSaving(false);
    }
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

  const tabs = [
      { id: 'general', label: 'Umum & Identitas', icon: Building2 },
      { id: 'academic', label: 'Akademik & Mapel', icon: BookOpen },
      { id: 'assessment', label: 'Penilaian & P5', icon: TrendingUp },
      { id: 'extra', label: 'Ekstrakurikuler', icon: Award },
      { id: 'security', label: 'Keamanan', icon: Shield },
  ];

  return (
    <div className="flex-1 bg-[#f5f5f7] h-full overflow-auto custom-scrollbar flex flex-col font-sans">
      
      {/* Fixed Header */}
      <div className="bg-white/80 backdrop-blur-xl sticky top-0 z-20 border-b border-gray-200 px-8 py-4">
          <div className="max-w-5xl mx-auto flex flex-col gap-4">
              <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                    <School size={28} className="text-gray-800" />
                    Pengaturan Sistem
                    </h2>
                    <p className="text-gray-500 text-sm font-medium mt-1">Pusat konfigurasi aplikasi iGrade.</p>
                </div>
                <button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#007aff] text-white rounded-xl font-bold hover:bg-blue-600 transition-all shadow-lg active:scale-95 text-sm disabled:opacity-70 disabled:cursor-not-allowed"
                >
                    {isSaving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                    {isSaving ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>

              {/* Tab Navigation */}
              <div className="flex gap-1 overflow-x-auto pb-1 no-scrollbar">
                  {tabs.map(tab => (
                      <button
                          key={tab.id}
                          onClick={() => setActiveTab(tab.id as any)}
                          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold whitespace-nowrap transition-all ${
                              activeTab === tab.id 
                              ? 'bg-gray-900 text-white shadow-md' 
                              : 'bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700'
                          }`}
                      >
                          <tab.icon size={16} />
                          {tab.label}
                      </button>
                  ))}
              </div>
          </div>
      </div>

      <div className="flex-1 p-8 overflow-y-auto">
        <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-fade-in">
          
          {/* TAB: GENERAL */}
          {activeTab === 'general' && (
              <>
                {/* 1. KOP SEKOLAH EDITOR */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-2 border-b border-gray-100">
                        <Building2 size={20} className="text-blue-600"/> Kop Sekolah (Header Laporan)
                    </h3>
                    <div className="space-y-4">
                        {formData.schoolHeader?.map((line, idx) => (
                            <div key={idx} className="flex gap-2 items-center">
                                <span className="text-xs font-mono text-gray-400 w-6">{idx + 1}.</span>
                                <input 
                                    type="text" 
                                    value={line} 
                                    onChange={e => handleHeaderChange(idx, e.target.value)}
                                    className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-semibold text-gray-800 focus:ring-2 focus:ring-blue-500 outline-none"
                                />
                                <button onClick={() => removeHeaderLine(idx)} className="p-2 text-red-400 hover:bg-red-50 rounded hover:text-red-600"><Trash2 size={16}/></button>
                            </div>
                        ))}
                        <button onClick={addHeaderLine} className="flex items-center gap-2 text-xs font-bold text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors">
                            <Plus size={14} /> Tambah Baris Header
                        </button>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 pt-6 border-t border-gray-100">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Nama Kepala Sekolah</label>
                        <input type="text" value={formData.principalName} onChange={e => handleChange('principalName', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">NIP Kepala Sekolah</label>
                        <input type="text" value={formData.principalNip} onChange={e => handleChange('principalNip', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 text-sm" />
                    </div>
                    </div>
                </section>

                {/* 6. LOGO & GAMBAR */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-2 border-b border-gray-100">
                        <ImageIcon size={20} className="text-teal-600"/> Logo & Watermark Rapor
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">URL Logo Kabupaten/Sekolah (Kiri Atas)</label>
                        <input type="text" value={formData.kabupatenLogoUrl || ''} onChange={e => handleChange('kabupatenLogoUrl', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="https://..." />
                        {formData.kabupatenLogoUrl && <img src={formData.kabupatenLogoUrl} alt="Preview" className="h-12 mt-2 object-contain" />}
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">URL Watermark (Tengah Halaman)</label>
                        <input type="text" value={formData.watermarkLogoUrl || ''} onChange={e => handleChange('watermarkLogoUrl', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-teal-500 text-sm" placeholder="https://..." />
                        {formData.watermarkLogoUrl && <img src={formData.watermarkLogoUrl} alt="Preview" className="h-12 mt-2 object-contain opacity-50" />}
                    </div>
                    </div>
                </section>
              </>
          )}

          {/* TAB: ACADEMIC */}
          {activeTab === 'academic' && (
              <>
                {/* 2. TAHUN PELAJARAN & SEMESTER */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-2 border-b border-gray-100">
                        <Calendar size={20} className="text-orange-600"/> Tahun Ajaran & Semester Aktif
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Tahun Pelajaran</label>
                            <input type="text" value={formData.academicYear} onChange={e => handleChange('academicYear', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 font-bold text-gray-800" placeholder="2024/2025" />
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Semester Aktif</label>
                            <select value={formData.activeSemester} onChange={e => handleChange('activeSemester', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 font-bold text-gray-800">
                                <option value="ganjil">Ganjil</option>
                                <option value="genap">Genap</option>
                            </select>
                        </div>
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                            <label className="block text-xs font-bold uppercase text-gray-500 mb-2">Tanggal Rapor Sisipan</label>
                            <div className="flex gap-2">
                                <input 
                                    type="text" 
                                    value={formData.midSemesterDate?.ganjil || ''} 
                                    onChange={e => setFormData(prev => ({...prev, midSemesterDate: {...prev.midSemesterDate, ganjil: e.target.value}}))}
                                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 text-sm" 
                                    placeholder="Tgl Ganjil" 
                                />
                                <input 
                                    type="text" 
                                    value={formData.midSemesterDate?.genap || ''} 
                                    onChange={e => setFormData(prev => ({...prev, midSemesterDate: {...prev.midSemesterDate, genap: e.target.value}}))}
                                    className="w-1/2 border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-orange-500 text-sm" 
                                    placeholder="Tgl Genap" 
                                />
                            </div>
                        </div>
                    </div>
                </section>

                {/* 1.5 DAFTAR MATA PELAJARAN */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-2 border-b border-gray-100">
                        <Library size={20} className="text-indigo-600"/> Daftar Mata Pelajaran
                    </h3>
                    <div className="flex gap-2 mb-4">
                        <input 
                            type="text" 
                            placeholder="Tambah Mata Pelajaran Baru..." 
                            value={newSubject}
                            onChange={(e) => setNewSubject(e.target.value)}
                            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                        />
                        <button onClick={handleAddSubject} className="bg-indigo-600 text-white px-4 py-2 rounded-lg font-bold text-sm hover:bg-indigo-700">
                            <Plus size={16} />
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                        {(formData.subjects || []).map((sub, idx) => (
                            <div key={idx} className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-3 py-1.5 rounded-lg border border-indigo-100 text-sm font-medium">
                                <span>{sub}</span>
                                <button onClick={() => handleDeleteSubject(idx)} className="text-indigo-400 hover:text-red-500"><Trash2 size={14}/></button>
                            </div>
                        ))}
                        {(formData.subjects || []).length === 0 && <p className="text-gray-400 text-sm italic">Belum ada mata pelajaran.</p>}
                    </div>
                </section>

                {/* 7. KONFIGURASI TEMPLATE RAPOR */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-2 border-b border-gray-100">
                        <Layout size={20} className="text-blue-600"/> Konfigurasi Template Default Rapor
                    </h3>
                    <div className="space-y-4">
                    {chapters.map(chap => (
                        <div key={chap.key} className="flex items-start gap-4 p-4 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                            <button 
                                onClick={() => handleChapterToggle(chap.key)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-bold text-sm transition-all min-w-[100px] ${
                                    formData.visibleChapters[chap.key] ? 'bg-indigo-100 text-indigo-800 shadow-sm' : 'bg-gray-100 text-gray-400'
                                }`}
                            >
                                {formData.visibleChapters[chap.key] ? <CheckSquare size={16}/> : <Square size={16}/>}
                                {chap.label}
                            </button>
                            
                            <div className={`flex flex-wrap gap-2 flex-1 ${!formData.visibleChapters[chap.key] ? 'opacity-30 pointer-events-none' : ''}`}>
                                {fields.map(f => (
                                    <button
                                        key={f.key}
                                        onClick={() => handleFieldToggle(chap.key, f.key)}
                                        className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                                            formData.midSemesterFieldConfig[chap.key]?.[f.key] 
                                            ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm' 
                                            : 'bg-white text-gray-400 border-gray-200 hover:border-gray-400'
                                        }`}
                                    >
                                        {f.label}
                                    </button>
                                ))}
                            </div>
                        </div>
                    ))}
                    </div>
                    <p className="text-xs text-gray-500 mt-4 italic bg-yellow-50 p-2 rounded border border-yellow-100 text-center">
                        * Konfigurasi ini akan menjadi default. Guru mapel masih dapat menyesuaikan secara manual di menu input nilai.
                    </p>
                </section>
              </>
          )}

          {/* ... Rest of tabs (Assessment, Extra, Security) ... */}
          {activeTab === 'assessment' && (
              <>
                {/* 3. NILAI UP (UJIAN PRAKTEK) */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-2 border-b border-gray-100">
                        <TrendingUp size={20} className="text-orange-600"/> Konfigurasi Konversi Nilai UP
                    </h3>
                    <p className="text-sm text-gray-500 mb-4 bg-orange-50 p-3 rounded-lg border border-orange-100">
                        Jika Nilai Akhir (NA) siswa berada dalam range tertentu, Nilai UP akan otomatis terisi sesuai konfigurasi di bawah ini (jika belum diisi manual).
                    </p>
                    
                    <div className="space-y-2 mb-4">
                        {/* Header Row */}
                        <div className="flex gap-4 px-4 py-2 bg-gray-100 rounded-lg text-xs font-bold text-gray-600 uppercase">
                            <div className="w-24">Min (NA)</div>
                            <div className="w-24">Max (NA)</div>
                            <div className="w-8"></div>
                            <div className="w-24">Nilai UP</div>
                            <div className="flex-1"></div>
                        </div>

                        {/* Rows */}
                        {(formData.upRanges || []).map((range, idx) => (
                            <div key={idx} className="flex gap-4 items-center">
                                <input 
                                    type="number" 
                                    value={range.min} 
                                    onChange={(e) => handleUpdateUpRange(idx, 'min', parseInt(e.target.value) || 0)}
                                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                                <span className="text-gray-400">-</span>
                                <input 
                                    type="number" 
                                    value={range.max} 
                                    onChange={(e) => handleUpdateUpRange(idx, 'max', parseInt(e.target.value) || 0)}
                                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-center focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                                <ChevronRight size={16} className="text-gray-400" />
                                <input 
                                    type="number" 
                                    value={range.value} 
                                    onChange={(e) => handleUpdateUpRange(idx, 'value', parseInt(e.target.value) || 0)}
                                    className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-center bg-orange-50 text-orange-700 focus:ring-2 focus:ring-orange-500 outline-none"
                                />
                                <button onClick={() => handleDeleteUpRange(idx)} className="p-2 text-gray-400 hover:text-red-50 transition-colors">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))}

                        {/* Add New Row */}
                        <div className="flex gap-4 items-center pt-2 border-t border-gray-100 mt-2">
                            <input 
                                type="number" 
                                placeholder="Min"
                                value={newUpRange.min}
                                onChange={(e) => setNewUpRange({...newUpRange, min: parseInt(e.target.value) || 0})}
                                className="w-24 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-blue-500"
                            />
                            <span className="text-gray-300">-</span>
                            <input 
                                type="number" 
                                placeholder="Max"
                                value={newUpRange.max}
                                onChange={(e) => setNewUpRange({...newUpRange, max: parseInt(e.target.value) || 0})}
                                className="w-24 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-blue-500"
                            />
                            <ChevronRight size={16} className="text-gray-300" />
                            <input 
                                type="number" 
                                placeholder="Hasil"
                                value={newUpRange.value}
                                onChange={(e) => setNewUpRange({...newUpRange, value: parseInt(e.target.value) || 0})}
                                className="w-24 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-blue-500"
                            />
                            <button 
                                onClick={handleAddUpRange}
                                className="flex items-center gap-1 text-xs font-bold text-white bg-green-600 px-3 py-2 rounded-lg hover:bg-green-700 shadow-sm transition-all active:scale-95"
                            >
                                <Plus size={14}/> Tambah Range
                            </button>
                        </div>
                    </div>
                </section>

                {/* 5. TEMA P5 (KOKURIKULER) - Updated with Semester Tabs */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 border-b border-gray-100 pb-2 gap-4">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <BookOpen size={20} className="text-purple-600"/> Tema P5 (Kokurikuler)
                        </h3>
                        
                        <div className="flex bg-gray-100 p-1 rounded-lg">
                            <button 
                                onClick={() => setP5Semester('ganjil')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${p5Semester === 'ganjil' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Semester Ganjil
                            </button>
                            <button 
                                onClick={() => setP5Semester('genap')}
                                className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all ${p5Semester === 'genap' ? 'bg-white shadow-sm text-purple-600' : 'text-gray-500 hover:text-gray-700'}`}
                            >
                                Semester Genap
                            </button>
                        </div>

                        <button onClick={handleAddProject} className="flex items-center gap-1 text-xs font-bold text-white bg-purple-600 px-3 py-1.5 rounded-lg hover:bg-purple-700 shadow-sm transition-all active:scale-95 ml-auto md:ml-0">
                            <Plus size={14}/> Tambah Tema
                        </button>
                    </div>
                    
                    <div className="space-y-3">
                        {(formData.kokurikulerProjects[p5Semester] || []).map((project, idx) => (
                            <div key={idx} className="flex gap-4 items-start bg-gray-50 p-4 rounded-xl border border-gray-200 transition-shadow hover:shadow-sm animate-fade-in">
                                <div className="flex flex-col items-center justify-center bg-white w-8 h-8 rounded-full border border-gray-200 font-bold text-gray-400 text-xs shadow-sm">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <input 
                                        type="text" 
                                        placeholder="Tema Projek (Judul)"
                                        value={project.theme}
                                        onChange={e => handleProjectChange(idx, 'theme', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none"
                                    />
                                    <textarea 
                                        placeholder="Deskripsi Singkat Kegiatan"
                                        value={project.description}
                                        onChange={e => handleProjectChange(idx, 'description', e.target.value)}
                                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-600 focus:ring-2 focus:ring-purple-500 outline-none"
                                        rows={2}
                                    />
                                </div>
                                <button onClick={() => handleDeleteProject(idx)} className="p-2 text-gray-400 hover:bg-red-50 rounded-lg hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {(formData.kokurikulerProjects[p5Semester] || []).length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                                <BookOpen size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Belum ada tema P5 untuk semester {p5Semester}.</p>
                            </div>
                        )}
                    </div>
                </section>
              </>
          )}

          {activeTab === 'extra' && (
              <>
                {/* 4. EKSTRAKURIKULER */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-2">
                        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
                            <Award size={20} className="text-pink-600"/> Ekstrakurikuler & Pembina
                        </h3>
                        <button onClick={handleAddExtra} className="flex items-center gap-1 text-xs font-bold text-white bg-pink-600 px-3 py-1.5 rounded-lg hover:bg-pink-700 shadow-sm transition-all active:scale-95">
                            <Plus size={14}/> Tambah Ekstra
                        </button>
                    </div>
                    <div className="space-y-3">
                        {(formData.extracurriculars || []).map((extra, idx) => (
                            <div key={idx} className="flex gap-4 items-start bg-gray-50 p-4 rounded-xl border border-gray-200 transition-shadow hover:shadow-sm">
                                <div className="flex flex-col items-center justify-center bg-white w-8 h-8 rounded-full border border-gray-200 font-bold text-gray-400 text-xs shadow-sm">
                                    {idx + 1}
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="grid grid-cols-2 gap-4">
                                        <input 
                                            type="text" 
                                            placeholder="Nama Ekstrakurikuler"
                                            value={extra.name}
                                            onChange={e => handleExtraChange(idx, 'name', e.target.value)}
                                            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-pink-500 outline-none"
                                        />
                                        <div className="relative">
                                            <select
                                                value={extra.coach}
                                                onChange={e => handleExtraChange(idx, 'coach', e.target.value)}
                                                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-800 focus:ring-2 focus:ring-pink-500 outline-none bg-white"
                                            >
                                                <option value="">Pilih Pembina (Guru)</option>
                                                {teachers.map(t => (
                                                    <option key={t.id} value={t.name}>{t.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic">Deskripsi akan otomatis diisi berdasarkan nilai siswa.</p>
                                </div>
                                <button onClick={() => handleDeleteExtra(idx)} className="p-2 text-gray-400 hover:bg-red-50 rounded-lg hover:text-red-500 transition-colors">
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                        {(formData.extracurriculars || []).length === 0 && (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-300 text-gray-400">
                                <Award size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">Belum ada ekstrakurikuler yang ditambahkan.</p>
                            </div>
                        )}
                    </div>
                </section>
              </>
          )}

          {activeTab === 'security' && (
              <>
                {/* 8. KEAMANAN */}
                <section className="bg-white rounded-2xl p-6 shadow-sm border border-gray-200">
                    <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2 pb-2 border-b border-gray-100">
                        <KeyRound size={20} className="text-red-600"/> Keamanan Akun
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Password Admin</label>
                        <input type="text" value={formData.adminPassword || ''} onChange={e => handleChange('adminPassword', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-sm font-mono" placeholder="Default: admin123" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Default Password Guru</label>
                        <input type="text" value={formData.teacherDefaultPassword || ''} onChange={e => handleChange('teacherDefaultPassword', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-sm font-mono" placeholder="Default: 123456" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold uppercase text-gray-500 mb-1">Default Password Ketua Kelas</label>
                        <input type="text" value={formData.leaderPassword || ''} onChange={e => handleChange('leaderPassword', e.target.value)} className="w-full border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-red-500 text-sm font-mono" placeholder="Default: 123456" />
                    </div>
                    </div>
                </section>
              </>
          )}

        </div>
      </div>
    </div>
  );
};

export default SettingsView;

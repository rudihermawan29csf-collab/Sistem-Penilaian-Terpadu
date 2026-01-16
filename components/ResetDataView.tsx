import React from 'react';
import { Trash2, AlertTriangle, CheckCircle } from 'lucide-react';

interface ResetDataViewProps {
  availableClasses: string[];
  currentSemester: 'ganjil' | 'genap';
  onResetClass: (className: string) => void;
}

const ResetDataView: React.FC<ResetDataViewProps> = ({ availableClasses, currentSemester, onResetClass }) => {
  const handleReset = (className: string) => {
    const isConfirmed = window.confirm(
      `PERINGATAN KERAS:\n\nApakah Anda yakin ingin MENGHAPUS SEMUA NILAI siswa kelas ${className} untuk Semester ${currentSemester === 'ganjil' ? 'Ganjil' : 'Genap'}?\n\nTindakan ini tidak dapat dibatalkan.`
    );

    if (isConfirmed) {
      // Double confirmation for safety
      const doubleCheck = window.confirm(`Konfirmasi Terakhir: Hapus nilai kelas ${className}?`);
      if (doubleCheck) {
        onResetClass(className);
      }
    }
  };

  return (
    <div className="flex-1 bg-white h-full overflow-auto custom-scrollbar p-8">
      <div className="max-w-4xl mx-auto">
        <div className="mb-8 border-b border-gray-200 pb-6">
          <h2 className="text-2xl font-bold text-red-600 flex items-center gap-3">
            <AlertTriangle size={32} />
            Reset Data Nilai
          </h2>
          <p className="text-gray-600 mt-2">
            Halaman ini digunakan untuk menghapus data nilai siswa secara massal per kelas. 
            Pastikan Anda telah melakukan backup (Download PDF) sebelum melakukan reset.
          </p>
          <div className="mt-4 bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
            <div className="bg-red-100 p-2 rounded-full text-red-600 shrink-0">
               <Trash2 size={20} />
            </div>
            <div>
               <h4 className="text-sm font-bold text-red-800">Perhatian</h4>
               <p className="text-sm text-red-700 mt-1">
                 Tindakan reset akan mengembalikan semua nilai (Formatif, Sumatif, KTS, SAS) menjadi kosong (null) untuk semester yang sedang aktif ({currentSemester}). Data siswa tidak akan terhapus.
               </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableClasses.map((cls) => (
            <div key={cls} className="bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden group">
              <div className="bg-gray-50 px-5 py-4 border-b border-gray-100 flex justify-between items-center">
                 <h3 className="font-bold text-gray-800 text-lg">{cls}</h3>
                 <span className="text-xs font-semibold px-2 py-1 bg-white border border-gray-200 rounded text-gray-500">
                    {currentSemester}
                 </span>
              </div>
              <div className="p-5">
                 <p className="text-sm text-gray-500 mb-6">
                    Hapus seluruh nilai siswa di kelas {cls}.
                 </p>
                 <button
                    onClick={() => handleReset(cls)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-white border-2 border-red-100 text-red-600 font-bold rounded-lg hover:bg-red-600 hover:text-white hover:border-red-600 transition-all active:scale-95"
                 >
                    <Trash2 size={18} />
                    Reset Nilai Kelas Ini
                 </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ResetDataView;
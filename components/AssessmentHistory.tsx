import React from 'react';
import { Trash2, Edit2, AlertCircle, RotateCcw } from 'lucide-react';
import { GradingSession, SemesterKey } from '../types';

interface AssessmentHistoryProps {
  history: GradingSession[];
  currentSemester: SemesterKey;
  onEdit: (session: GradingSession) => void;
  onDelete: (id: string) => void;
  onResetHistory: () => void; // New prop
}

const AssessmentHistory: React.FC<AssessmentHistoryProps> = ({ 
  history, 
  currentSemester, 
  onEdit, 
  onDelete,
  onResetHistory 
}) => {
  // Filter history for current semester
  const semesterHistory = history.filter(h => h.semester === currentSemester);

  const formatTarget = (session: GradingSession) => {
    if (session.type === 'bab' && session.chapterKey && session.formativeKey) {
      const babNum = parseInt(session.chapterKey.replace('bab', ''));
      const displayBab = currentSemester === 'genap' ? babNum + 5 : babNum;
      const field = session.formativeKey === 'sum' ? 'SUMATIF' : session.formativeKey.toUpperCase();
      return `Bab ${displayBab} - ${field}`;
    }
    return session.type.toUpperCase();
  };

  const handleResetClick = () => {
      const confirmed = window.confirm("PERINGATAN: Apakah Anda yakin ingin MENGHAPUS SEMUA RIWAYAT INPUT?\n\nTindakan ini akan menyebabkan kolom nilai terkunci (read-only) karena history pembukaan input hilang. Data nilai (angka) tidak akan terhapus, tetapi tidak bisa diedit sampai Anda membuka input kembali.");
      if (confirmed) {
          onResetHistory();
      }
  };

  if (semesterHistory.length === 0) {
    return (
      <div className="p-8 text-center bg-white border-t border-gray-200 mt-4 rounded-b-xl">
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-gray-100 mb-3">
            <AlertCircle className="text-gray-400" size={24} />
        </div>
        <h3 className="text-sm font-medium text-gray-900">Belum Ada Riwayat Input</h3>
        <p className="text-sm text-gray-500 mt-1">
          Klik tombol "Buka Input Nilai" untuk memulai penilaian baru.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border-t border-gray-200 mt-4 rounded-b-xl shadow-sm">
      <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
        <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wide">Riwayat Input Nilai (Status: Terbuka)</h3>
        <button
            onClick={handleResetClick}
            className="flex items-center space-x-1 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded transition-colors"
        >
            <RotateCcw size={12} />
            <span>Hapus Semua Riwayat</span>
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50/50 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-6 py-3 font-semibold">Tanggal</th>
              <th className="px-6 py-3 font-semibold">Target Penilaian</th>
              <th className="px-6 py-3 font-semibold">Keterangan</th>
              <th className="px-6 py-3 font-semibold text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {semesterHistory.map((session) => (
              <tr key={session.id} className="hover:bg-blue-50/30 transition-colors group">
                <td className="px-6 py-3 text-sm text-gray-600 font-mono">
                  {session.date}
                </td>
                <td className="px-6 py-3 text-sm font-medium text-blue-700">
                  <span className="px-2 py-1 bg-blue-100 rounded text-xs">
                    {formatTarget(session)}
                  </span>
                </td>
                <td className="px-6 py-3 text-sm text-gray-700">
                  {session.description}
                </td>
                <td className="px-6 py-3 text-right">
                  <div className="flex items-center justify-end space-x-2">
                    <button 
                      onClick={() => onEdit(session)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-100 rounded transition-all"
                      title="Edit Riwayat"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => onDelete(session.id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-100 rounded transition-all"
                      title="Hapus Riwayat (Kunci Kembali)"
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
  );
};

export default AssessmentHistory;

import React from 'react';
import { X, BookOpen, CheckCircle, AlertTriangle, Printer, Settings, Award, Users } from 'lucide-react';

interface GuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  role: 'admin' | 'teacher' | 'student' | 'leader';
}

const GuideModal: React.FC<GuideModalProps> = ({ isOpen, onClose, role }) => {
  if (!isOpen) return null;

  const renderContent = () => {
    switch (role) {
      case 'admin':
        return (
          <div className="space-y-6">
            <section>
              <h4 className="text-blue-700 font-bold flex items-center gap-2 mb-2"><Settings size={18}/> 1. Konfigurasi Awal (PENTING)</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Pergi ke menu <strong>Sistem > Pengaturan Lengkap</strong>.</li>
                <li>Atur <strong>Tahun Ajaran</strong> dan <strong>Semester Aktif</strong>.</li>
                <li>Konfigurasi <strong>Kop Sekolah</strong>, Nama Kepala Sekolah, dan Tanggal Rapor.</li>
                <li>Tentukan <strong>Tema P5 (Kokurikuler)</strong> untuk semester aktif.</li>
                <li>Tentukan <strong>Daftar Mata Pelajaran</strong> yang ada di sekolah.</li>
              </ul>
            </section>
            <section>
              <h4 className="text-blue-700 font-bold flex items-center gap-2 mb-2"><Users size={18}/> 2. Manajemen Data Master</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li><strong>Data Guru:</strong> Tambahkan guru, set NIP, Mapel ampunan, dan tetapkan sebagai Wali Kelas jika perlu.</li>
                <li><strong>Data Siswa:</strong> Anda bisa menambah siswa satu per satu atau <strong>Import Excel</strong> secara massal (Gunakan template yang disediakan).</li>
              </ul>
            </section>
            <section>
              <h4 className="text-blue-700 font-bold flex items-center gap-2 mb-2"><CheckCircle size={18}/> 3. Monitoring & Reset</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Gunakan menu <strong>Monitor Guru</strong> untuk melihat progres input nilai per guru atau per kelas.</li>
                <li>Menu <strong>Reset Data</strong> digunakan untuk menghapus nilai satu kelas secara massal jika terjadi kesalahan fatal (Hati-hati!).</li>
              </ul>
            </section>
          </div>
        );

      case 'teacher':
        return (
          <div className="space-y-6">
            <section>
              <h4 className="text-indigo-700 font-bold flex items-center gap-2 mb-2"><BookOpen size={18}/> 1. Cara Input Nilai Akademik</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Pilih <strong>Kelas</strong> dan <strong>Mata Pelajaran</strong> di bagian atas.</li>
                <li>Klik tombol biru <strong>Input Nilai</strong>.</li>
                <li>Pilih <strong>Jenis Penilaian</strong>:
                    <ul className="list-circle pl-5 mt-1 text-gray-600">
                        <li><strong>Lingkup Materi (TP):</strong> Untuk nilai harian/formatif per bab. Pilih Bab (TP) dan Kolom (F1-F5/Sumatif).</li>
                        <li><strong>KTS:</strong> Penilaian Tengah Semester.</li>
                        <li><strong>SAS:</strong> Penilaian Akhir Semester.</li>
                    </ul>
                </li>
                <li>Isi nilai pada kolom yang terbuka (warna biru muda). Nilai otomatis tersimpan ke tabel sementara.</li>
                <li><strong>PENTING:</strong> Klik tombol <strong>Simpan Data</strong> (ikon Disket) di pojok kanan atas agar nilai tersimpan permanen ke server.</li>
              </ul>
            </section>
            <section>
              <h4 className="text-indigo-700 font-bold flex items-center gap-2 mb-2"><Settings size={18}/> 2. Konfigurasi TP</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Klik tombol <strong>Config</strong> untuk mengatur TP mana saja yang aktif dan kolom apa saja (F1-Sum) yang digunakan.</li>
                <li>Hal ini agar tabel nilai terlihat rapi dan hanya menampilkan kolom yang relevan.</li>
              </ul>
            </section>
            <section>
              <h4 className="text-indigo-700 font-bold flex items-center gap-2 mb-2"><Users size={18}/> 3. Menu Wali Kelas & Ekstra</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Jika Anda Wali Kelas, buka menu <strong>Wali Kelas</strong> untuk input Absensi (S/I/A) dan memantau siswa bermasalah.</li>
                <li>Jika Anda Pembina Ekstra, buka menu <strong>Ekstra</strong> untuk menilai anggota ekstrakurikuler.</li>
              </ul>
            </section>
          </div>
        );

      case 'leader':
        return (
          <div className="space-y-6">
            <section>
              <h4 className="text-teal-700 font-bold flex items-center gap-2 mb-2"><CheckCircle size={18}/> 1. Input Absensi Harian</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Pilih menu <strong>Input</strong>. Pastikan tanggal sesuai hari ini.</li>
                <li>Secara default, semua siswa statusnya <strong>H (Hadir)</strong>.</li>
                <li>Ubah status siswa yang tidak hadir menjadi:
                    <ul className="list-circle pl-5 mt-1 text-gray-600">
                        <li><strong>S:</strong> Sakit</li>
                        <li><strong>I:</strong> Izin</li>
                        <li><strong>A:</strong> Alpha (Tanpa Keterangan)</li>
                    </ul>
                </li>
                <li>Jika ada tanda <strong>Gembok Kuning</strong>, artinya Wali Kelas sudah menginputkan izin/sakit untuk siswa tersebut (Data terkunci).</li>
              </ul>
            </section>
            <section>
              <h4 className="text-teal-700 font-bold flex items-center gap-2 mb-2"><Printer size={18}/> 2. Simpan & Laporan</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Setelah selesai mendata, klik tombol <strong>Simpan Absensi</strong> di bawah.</li>
                <li>Gunakan menu <strong>Riwayat</strong> atau <strong>Rekap Bulanan</strong> untuk melihat atau mendownload laporan absensi kelas.</li>
              </ul>
            </section>
          </div>
        );

      case 'student':
        return (
          <div className="space-y-6">
            <section>
              <h4 className="text-blue-700 font-bold flex items-center gap-2 mb-2"><BookOpen size={18}/> 1. Memeriksa Nilai</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Pada menu <strong>Rekap Nilai</strong>, kamu bisa melihat Nilai Akhir (NA) semua mata pelajaran.</li>
                <li>Status <strong>TUNTAS</strong> artinya nilai di atas KKM (75).</li>
                <li>Klik tombol <strong>Detail</strong> pada mata pelajaran untuk melihat rincian nilai per TP (Tujuan Pembelajaran).</li>
              </ul>
            </section>
            <section>
              <h4 className="text-blue-700 font-bold flex items-center gap-2 mb-2"><AlertTriangle size={18}/> 2. Cek Tanggungan & Remidi</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Buka tab <strong>Tanggungan</strong> untuk melihat tugas yang nilainya <strong>0 (Kosong)</strong>. Segera hubungi guru mapel!</li>
                <li>Buka tab <strong>Remidi</strong> untuk melihat nilai yang masih di bawah KKM.</li>
              </ul>
            </section>
            <section>
              <h4 className="text-blue-700 font-bold flex items-center gap-2 mb-2"><Printer size={18}/> 3. Rapor Sisipan</h4>
              <ul className="list-disc pl-5 text-sm text-gray-700 space-y-1">
                <li>Buka tab <strong>Rapor Sisipan</strong> untuk melihat preview hasil belajar tengah semester.</li>
                <li>Halaman ini mencakup Nilai Akademik, Absensi, dan Ekstrakurikuler.</li>
              </ul>
            </section>
          </div>
        );
        
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col overflow-hidden ring-1 ring-white/20">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${
                role === 'admin' ? 'bg-gray-800 text-white' : 
                role === 'teacher' ? 'bg-indigo-600 text-white' : 
                role === 'leader' ? 'bg-teal-600 text-white' : 
                'bg-blue-600 text-white'
            }`}>
                <BookOpen size={20} />
            </div>
            <div>
                <h3 className="text-lg font-bold text-gray-900">
                    Panduan Penggunaan {role === 'leader' ? 'Ketua Kelas' : role.charAt(0).toUpperCase() + role.slice(1)}
                </h3>
                <p className="text-xs text-gray-500">SOP Aplikasi iGrade SMPN 3 Pacet</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-200 text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-8 overflow-y-auto custom-scrollbar bg-white">
            {renderContent()}
            
            <div className="mt-8 p-4 bg-yellow-50 border border-yellow-100 rounded-xl flex gap-3 items-start">
                <div className="bg-yellow-100 p-2 rounded-full text-yellow-700 shrink-0">
                    <AlertTriangle size={18} />
                </div>
                <div>
                    <h5 className="font-bold text-yellow-800 text-sm">Bantuan Teknis</h5>
                    <p className="text-xs text-yellow-700 mt-1">
                        Jika mengalami kendala teknis atau error pada aplikasi, silakan hubungi Tim IT Sekolah atau Administrator melalui grup WhatsApp sekolah.
                    </p>
                </div>
            </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 text-right">
            <button 
                onClick={onClose}
                className="px-6 py-2 bg-gray-800 text-white text-sm font-bold rounded-lg hover:bg-gray-900 transition-colors shadow-sm"
            >
                Saya Mengerti
            </button>
        </div>

      </div>
    </div>
  );
};

export default GuideModal;


import { Student, ChapterGrades, SemesterData, Teacher } from './types';

const emptyChapter: ChapterGrades = { 
  f1: null, f2: null, f3: null, f4: null, f5: null, sum: null 
};

const emptySemester: SemesterData = {
  bab1: { ...emptyChapter },
  bab2: { ...emptyChapter },
  bab3: { ...emptyChapter },
  bab4: { ...emptyChapter },
  bab5: { ...emptyChapter },
  kts: null, 
  sas: null,
  nilaiUp: null, 
};

// Helper to create data easily - UPDATED to include NISN (auto-generated for dummy)
const s = (no: number, nis: string, name: string, kelas: string, gender: 'L' | 'P'): Student => ({
  id: parseInt(nis) || (Date.now() + Math.floor(Math.random() * 1000)), 
  no,
  nis,
  nisn: `00${Math.floor(Math.random() * 89999999) + 10000000}`, // Random NISN
  name: name.replace(/"/g, ''), 
  kelas,
  gender,
  attendance: {
    ganjil: { s: 0, i: 0, a: 0 },
    genap: { s: 0, i: 0, a: 0 }
  },
  extracurricularRecord: {
    ganjil: [],
    genap: []
  },
  // Legacy 'grades' field kept empty/default to satisfy type definition, 
  // but logic now uses gradesBySubject for EVERYTHING including PAI
  grades: {
    ganjil: JSON.parse(JSON.stringify(emptySemester)), 
    genap: JSON.parse(JSON.stringify(emptySemester)), 
  },
  gradesBySubject: {
    "Pendidikan Agama Islam": {
        ganjil: JSON.parse(JSON.stringify(emptySemester)),
        genap: JSON.parse(JSON.stringify(emptySemester))
    }
  }
});

// Helper for teachers
const t = (no: number, name: string, nip: string, subject: string, classes: string[], waliKelas?: string): Teacher => ({
  id: Date.now() + Math.random(),
  no,
  name,
  nip,
  subject,
  classes,
  waliKelas
});

export const initialTeachers: Teacher[] = [
  t(1, "Dra. Sri Hayati", "19670628 200801 2 006", "Bahasa Indonesia", ["IX A", "IX B", "IX C"]),
  t(2, "Bakhtiar Rifai, SE", "19800304 200801 1", "Ilmu Pengetahuan Sosial", ["VIII A", "VIII B", "VIII C"]),
  t(3, "Moch. Husain Rifai Hamzah, S.Pd.", "19920316 202012 1 011", "Penjas Orkes", ["VII A", "VII B", "VII C", "VIII A", "VIII B", "VIII C", "IX A", "IX B", "IX C"]),
  t(4, "Rudi Hermawan, S.Pd.I", "198910292020121003", "Pendidikan Agama Islam", ["VII A", "VII B", "VII C", "VIII A", "VIII B", "VIII C", "IX A", "IX B", "IX C"], "VII A"),
  t(5, "Okha Devi Anggraini, S.Pd.", "19941002 202012 2 008", "Bimbingan Konseling", ["VII A", "VII B", "VII C", "IX A", "IX B", "IX C"]),
  t(6, "Eka Hariyati, S. Pd.", "19731129 202421 2 003", "PPKn", ["VII A", "VII B", "VII C", "VIII A", "VIII B", "VIII C", "IX A", "IX B", "IX C"]),
  t(7, "Mikoe Wahyudi Putra, ST., S. Pd.", "198506012024211004", "Bimbingan Konseling", ["VII C", "VIII A", "VIII B"]),
  t(8, "Purnadi, S. Pd.", "19680705 202421 1 001", "Matematika", ["VII C", "VIII A", "VIII B", "VIII C", "IX A"]),
  t(9, "Israfin Maria Ulfa, S.Pd", "198501312025212004", "Ilmu Pengetahuan Sosial", ["VII A", "VII B", "VII C", "IX A", "IX B", "IX C"]),
  t(10, "Syadam Budi Satrianto, S.Pd", "-", "Bahasa Jawa", ["VII A", "VII B", "VII C", "VIII A", "VIII B", "VIII C", "IX A", "IX B", "IX C"]),
  t(11, "Rebby Dwi Prataopu, S.Si", "-", "Ilmu Pengetahuan Alam", ["VII A", "VII B", "IX A", "IX B", "IX C"]),
  t(12, "Mukhamad Yunus, S.Pd", "-", "Ilmu Pengetahuan Alam", ["VII C", "VIII A", "VIII B", "VIII C"]),
  t(12, "Mukhamad Yunus, S.Pd", "-", "Informatika", ["VII C", "VIII A"]),
  t(13, "Fahmi Wahyuni, S.Pd", "-", "Bahasa Indonesia", ["VII A", "VII B", "VII C", "VIII A", "VIII B"]),
  t(14, "Fakhita Madury, S.Sn", "-", "Seni (Seni Rupa)", ["VII A", "VII B", "VII C", "VIII A", "VIII B", "VIII C", "IX A", "IX B", "IX C"]),
  t(14, "Fakhita Madury, S.Sn", "-", "Informatika", ["VII A", "VII B", "VII C"]),
  t(15, "Retno Nawangwulan, S. Pd.", "1985070320252120006", "Bahasa Inggris", ["VII C", "VIII A", "VIII B", "VIII C", "IX A", "IX B"]),
  t(16, "Emilia Kartika Sari, S.Pd", "200105072025212026", "Matematika", ["VII A", "VII B", "VII C", "VIII A"]),
  t(16, "Emilia Kartika Sari, S.Pd", "200105072025212026", "Informatika", ["VIII B", "VIII C"]),
  t(17, "Akhmad Hariadi, S.Pd", "19751108 200901 1 001", "Bahasa Inggris", ["VII A", "VII B", "VII C"]),
  t(17, "Akhmad Hariadi, S.Pd", "19751108 200901 1 001", "Informatika", ["IX A", "IX B"]),
];

export const initialStudents: Student[] = [
  // VII A
  s(1, "1129", "ACSELIN UKE DWINANTA", "VII A", "P"),
  s(2, "1132", "AHMAD DWI NAVI SAPUTRA", "VII A", "L"),
  s(3, "1135", "AKIRA MUMTAZA GHULAM MAHRON", "VII A", "L"),
  s(4, "1150", "ANGGITAH MAHARANI", "VII A", "L"),
  s(5, "1151", "ARIMBI AUNI MAYANGSARI", "VII A", "P"),
  s(6, "1153", "ARSY TIRTASYA PRAYOGI ISBIANTO", "VII A", "P"),
  s(7, "1155", "DEFIANA NUR RAHMA", "VII A", "P"),
  s(8, "1158", "DINDA RESTYNING RAHAYU", "VII A", "L"),
  s(9, "1159", "IRKHAM ARTHUR MAULANA", "VII A", "P"),
  s(10, "1163", "KADITA NATHANIA", "VII A", "P"),
  s(11, "1164", "MOHAMAD ROFIQ ARDIANSYAH", "VII A", "P"),
  s(12, "1169", "MUHAMMAD AZZAM NUR ALIF", "VII A", "L"),
  s(13, "1171", "MUHAMMAD ARDITIYO SEBASTIAN", "VII A", "P"),
  s(14, "1175", "MUHAMMAD EZZAR ALI YUDHA", "VII A", "L"),
  s(15, "1176", "MUHAMMAD FAIZ QISBIY ROMADHONI", "VII A", "L"),
  s(16, "1178", "OLIVIA ADELLA NAZAHRA", "VII A", "L"),
  s(17, "1181", "QOTRUNNADA SALSABILA AKMAL", "VII A", "L"),
  s(18, "1183", "RAMA SULTHAN AULIYA AHMAD", "VII A", "L"),
  s(19, "1184", "REFAN AZZAM ANUGRAH", "VII A", "L"),
  s(20, "1186", "SEPTIA INDAH WULANDARI", "VII A", "L"),
  s(21, "1190", "SOEGIARTO WIJAYA", "VII A", "P"),
  s(22, "1197", "STEFANI ANANDA RAHMADHANI", "VII A", "L"),
  s(23, "1202", "VIRDY PUTRI HARUM KUSUMA", "VII A", "P"),
  s(24, "1203", "ZAINI ALI MAHMUD", "VII A", "P"),
  s(25, "1204", "ZAVERIO AMSYAR RAFFASYA", "VII A", "P"),
  
  // VII B
  s(26, "1206", "ACHMAD FATAH ADI DARMA", "VII B", "L"),
  s(27, "1208", "ARGA ARDIANSA", "VII B", "P"),
  s(28, "1211", "AVYKA VERA JUNYARTHA", "VII B", "L"),
  s(29, "1217", "DENIS ANGGORO", "VII B", "L"),
  s(30, "1330", "DIRLY MICHELE FEBRYAN SUSANTO", "VII B", "L"),
  s(31, "1130", "DWI ANDIKA PUTRA SETIAWAN", "VII B", "P"),
  s(32, "1133", "FEMILYA QONITA ARINIL HAQ", "VII B", "L"),
  s(33, "1136", "HIKMATUL MEISYAH ANJANI", "VII B", "L"),
  s(34, "1139", "IQBAL MAULANA AL AZZAM", "VII B", "L"),
  s(35, "1142", "KASIH PUTRI SURYA NINGRUM", "VII B", "P"),
  s(36, "1146", "KIKI FATMAWATI", "VII B", "L"),
  s(37, "1148", "KRIDHO HERVA NATASYA PUTRI", "VII B", "P"),
  s(38, "1157", "MOKHAMAD FARA BARIQ SAPUTRA", "VII B", "P"),
  s(39, "1161", "MUCHAMMAD ILYAS NUR ADINATA", "VII B", "P"),
  s(40, "1166", "MUHAMMAD FARHAN MAULANA", "VII B", "L"),
  s(41, "1167", "MUHAMMAD KHOIRUL ANAM", "VII B", "P"),
  s(42, "1170", "MUHAMMAD SONIUL ULUMI", "VII B", "L"),
  s(43, "1173", "NIZHAR ADITYA ROHMAN", "VII B", "L"),
  s(44, "1179", "NUR AINI AGUSTIN", "VII B", "L"),
  s(45, "1182", "REVALINA DWI RATNASARI", "VII B", "L"),
  s(46, "1185", "SAKA BUANA IKSAN WIJAYANTO", "VII B", "L"),
  s(47, "1191", "SYAHRIL FIKRI AMRULLOH", "VII B", "P"),
  s(48, "1215", "WAHYU ALIFIANSYAH PUTRA MANGKU B.", "VII B", "P"),
  s(49, "1193", "WENIDA EKA ANADIA PUTRI", "VII B", "L"),
  s(50, "1195", "DZAKIYYA TALITA ZAHRA", "VII B", "L"),
  s(51, "1196", "RANIA SYAFA'A PUTRI IMANSYAH", "VII B", "L"),
  s(52, "1199", "MOH. DAFFA FAUZAN WIFQULKHOIR", "VII B", "P"),

  // VII C
  s(53, "1205", "AISYAH AYU LESTARI", "VII C", "P"),
  s(54, "1207", "AISYAH ZANETA SALSABILLA", "VII C", "L"),
  s(55, "1209", "ALFARO FEBRIANSYAH WAHYUDI", "VII C", "P"),
  s(56, "1210", "APRILIA DWI LESTARI", "VII C", "P"),
  s(57, "1212", "CHILYATUZ ZAKIA AINA SALSABILLA", "VII C", "P"),
  s(58, "1213", "DHAFA SATRIAWAN PRATAMA", "VII C", "L"),
  s(59, "1214", "DINDA AKILA PRATIWI", "VII C", "L"),
  s(60, "1328", "ELINA ASTRIT YUNEDY", "VII C", "L"),
  s(61, "1131", "ENJELINA MIKE ANGGUN LESTARI", "VII C", "L"),
  s(62, "1134", "FANI RAHMA ADTYA", "VII C", "L"),
  s(63, "1137", "FATALARIK KHAIRUSANI IBNU YAKSHA", "VII C", "L"),
  s(64, "1140", "HAIKAL RAYSHA FACHRUDDIN", "VII C", "L"),
  s(65, "1141", "HARDIAN SYAHPUTRA", "VII C", "P"),
  s(66, "1143", "KIRANA DINAR FADHILLAH QAIS", "VII C", "P"),
  s(67, "1144", "JUSTIN GILBERT APRILIO HALIM", "VII C", "P"),
  s(68, "1145", "MAULINDA KUSUMA", "VII C", "P"),
  s(69, "1147", "MOHAMAD IZAM HAIKAL NAFIS", "VII C", "L"),
  s(70, "1149", "MOHAMMAD DAFFA MAULANA AWWALUDDIN", "VII C", "P"),
  s(71, "1152", "MUHAMAD DIMAS SAPUTRA", "VII C", "L"),
  s(72, "1154", "DWI AZZAHRA RAMADHANI", "VII C", "P"),
  s(73, "1156", "MUHAMMAD EZAR NAFIL", "VII C", "L"),
  s(74, "1160", "MUHAMMAD FARIS ALFARIZI", "VII C", "P"),
  s(75, "1162", "MUHAMMAD NICOLA VERDIANSYAH", "VII C", "L"),
  s(76, "1165", "YUWIETA TRI ANGGREINY", "VII C", "P"),
  s(77, "1168", "ZAFAR SIDIQ", "VII C", "L"),
];

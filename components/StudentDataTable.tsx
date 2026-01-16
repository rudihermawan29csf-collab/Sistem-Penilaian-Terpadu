import React from 'react';
import { Student } from '../types';

interface StudentDataTableProps {
  students: Student[];
}

const StudentDataTable: React.FC<StudentDataTableProps> = ({ students }) => {
  return (
    <div className="relative overflow-auto flex-1 h-full bg-white rounded-b-xl shadow-inner custom-scrollbar">
      <table className="border-collapse w-full min-w-max">
        <thead className="sticky top-0 z-20 bg-[#f9f9fb] shadow-sm backdrop-blur-md">
          <tr className="border-b border-gray-300">
            <th className="sticky left-0 z-30 bg-[#f9f9fb] text-left p-3 w-16 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              No
            </th>
            <th className="text-left p-3 w-32 font-semibold text-gray-500 text-xs uppercase tracking-wider border-r border-gray-200">
              NIS
            </th>
            <th className="text-left p-3 min-w-[300px] font-semibold text-gray-500 text-xs uppercase tracking-wider border-r border-gray-200">
              Nama Lengkap
            </th>
            <th className="text-center p-3 w-24 font-semibold text-gray-500 text-xs uppercase tracking-wider border-r border-gray-200">
              Kelas
            </th>
            <th className="text-center p-3 w-24 font-semibold text-gray-500 text-xs uppercase tracking-wider">
              Gender
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-200 bg-white">
          {students.length === 0 ? (
            <tr>
              <td colSpan={5} className="text-center py-8 text-gray-400 text-sm">
                Tidak ada data siswa untuk kelas ini.
              </td>
            </tr>
          ) : (
            students.map((student, index) => (
              <tr key={student.id} className="group hover:bg-gray-50 transition-colors">
                <td className="p-3 text-center text-sm text-gray-400 font-medium">
                  {index + 1}
                </td>
                <td className="p-3 text-sm font-mono text-gray-600 border-r border-gray-100">
                  {student.nis}
                </td>
                <td className="p-3 text-sm font-medium text-gray-800 border-r border-gray-100">
                  {student.name}
                </td>
                <td className="p-3 text-center text-sm font-medium text-blue-600 bg-blue-50/10 border-r border-gray-100">
                  {student.kelas}
                </td>
                <td className="p-3 text-center text-sm font-medium">
                  <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
                    student.gender === 'L' 
                      ? 'bg-blue-100 text-blue-700' 
                      : 'bg-pink-100 text-pink-700'
                  }`}>
                    {student.gender}
                  </span>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
};

export default StudentDataTable;

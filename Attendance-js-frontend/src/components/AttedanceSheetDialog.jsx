import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Loader2, FileSpreadsheet } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { format, parseISO } from 'date-fns';

export default function AttendanceSheetDialog({ open, onOpenChange, teacherId }) {
  const [courses, setCourses] = useState([]);
  const [courseKey, setCourseKey] = useState(''); // `${subjectName}|${className}`
  const [sheet, setSheet] = useState(null);
  const [loadingCourses, setLoadingCourses] = useState(false);
  const [loadingSheet, setLoadingSheet] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !teacherId) return;
    const fetchCourses = async () => {
      try {
        setLoadingCourses(true);
        setError('');
        const res = await api.get('/attendance/courses', { params: { teacherId } });
        setCourses(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load your courses');
        setCourses([]);
      } finally {
        setLoadingCourses(false);
      }
    };
    fetchCourses();
    setCourseKey('');
    setSheet(null);
  }, [open, teacherId]);

  const selectedCourse = courses.find(
    (c) => `${c.subjectName}|${c.className}` === courseKey
  );

  useEffect(() => {
    if (!selectedCourse) {
      setSheet(null);
      return;
    }
    const fetchSheet = async () => {
      try {
        setLoadingSheet(true);
        setError('');
        const res = await api.get('/attendance/sheet', {
          params: {
            teacherId,
            subjectName: selectedCourse.subjectName,
            className: selectedCourse.className,
          },
        });
        setSheet(res.data);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load attendance sheet');
        setSheet(null);
      } finally {
        setLoadingSheet(false);
      }
    };
    fetchSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseKey]);

  const pctColor = (pct) => {
    if (pct >= 75) return 'text-green-600 dark:text-green-400';
    if (pct >= 50) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Attendance Sheet
          </DialogTitle>
          <DialogDescription>
            One column per lecture actually held — if this course meets multiple times a
            week, all of them are combined into a single sheet. P = present, A = absent,
            — = not yet marked.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Course</label>
            {loadingCourses ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your courses...
              </div>
            ) : (
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                value={courseKey}
                onChange={(e) => setCourseKey(e.target.value)}
              >
                <option value="">Select a course...</option>
                {courses.map((c) => {
                  const key = `${c.subjectName}|${c.className}`;
                  return (
                    <option key={key} value={key}>
                      {c.subjectName} (Div {c.className}) — {c.slotSummaries.join(', ')}
                    </option>
                  );
                })}
              </select>
            )}
            {!loadingCourses && courses.length === 0 && (
              <p className="text-xs text-gray-500">No courses assigned to you yet.</p>
            )}
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {loadingSheet ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : sheet ? (
            sheet.lectureColumns.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-6">
                No attendance has been marked for this course yet.
              </div>
            ) : (
              <div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-md">
                <table className="min-w-full text-sm">
                  <thead>
                    <tr className="bg-gray-100 dark:bg-gray-700">
                      <th className="sticky left-0 bg-gray-100 dark:bg-gray-700 px-3 py-2 text-left font-semibold">SAP</th>
                      <th className="sticky left-16 bg-gray-100 dark:bg-gray-700 px-3 py-2 text-left font-semibold">Student Name</th>
                      {sheet.lectureColumns.map((col) => (
                        <th key={col.key} className="px-3 py-2 text-center font-medium whitespace-nowrap">
                          {format(parseISO(col.date), 'MMM d')}
                          <div className="text-[10px] font-normal text-gray-500">
                            {col.startTime}-{col.endTime} ({col.durationHours}h)
                          </div>
                        </th>
                      ))}
                      <th className="px-3 py-2 text-center font-semibold">% Attendance</th>
                    </tr>
                  </thead>
                  <tbody>
                  {sheet.rows.map((row) => (
                    <tr key={row.studentId} className="border-t border-gray-200 dark:border-gray-700">
                      <td className="px-3 py-2 whitespace-nowrap">{row.sap}</td>
                      <td className="px-3 py-2 whitespace-nowrap font-medium">{row.name}</td>
                      {sheet.lectureColumns.map((col) => {
                        const mark = row.marksByColumn[col.key];
                        return (
                          <td
                            key={col.key}
                            className={`px-3 py-2 text-center font-semibold ${
                              mark === 'P' ? 'text-green-600 dark:text-green-400'
                              : mark === 'A' ? 'text-red-600 dark:text-red-400'
                              : 'text-gray-400'
                            }`}
                          >
                            {mark}
                          </td>
                        );
                      })}
                      <td className={`px-3 py-2 text-center font-bold ${pctColor(row.percentage)}`}>
                        {row.percentage}%
                        <div className="text-[10px] font-normal text-gray-500">
                          {row.presentHours}/{row.totalHours} hrs
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
                </table>
              </div>
            )
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
import { useState, useEffect } from 'react';
import api from '../lib/api';
import { Loader2, Save, Lock, CheckCircle2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from './ui/dialog';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { format, parseISO } from 'date-fns';

export default function AttendanceMarkingDialog({ open, onOpenChange, teacherId }) {
  const [slots, setSlots] = useState([]);
  const [slotKey, setSlotKey] = useState(''); // `${subjectId}|${date}`
  const [roster, setRoster] = useState(null);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [loadingRoster, setLoadingRoster] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open || !teacherId) return;
    const fetchSlots = async () => {
      try {
        setLoadingSlots(true);
        setError('');
        const res = await api.get('/attendance/lecture-slots', { params: { teacherId } });
        setSlots(Array.isArray(res.data) ? res.data : []);
      } catch (err) {
        setError(err?.response?.data?.message || 'Failed to load lecture schedule');
        setSlots([]);
      } finally {
        setLoadingSlots(false);
      }
    };
    fetchSlots();
    setSlotKey('');
    setRoster(null);
  }, [open, teacherId]);

  const selectedSlot = slots.find((s) => `${s.subjectId}|${s.date}` === slotKey);

  const fetchRoster = async (slot) => {
    if (!slot) return;
    try {
      setLoadingRoster(true);
      setError('');
      const res = await api.get('/attendance/roster', {
        params: { subjectId: slot.subjectId, date: slot.date },
      });
      setRoster(res.data);
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to load roster');
      setRoster(null);
    } finally {
      setLoadingRoster(false);
    }
  };

  useEffect(() => {
    if (selectedSlot) fetchRoster(selectedSlot);
    else setRoster(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slotKey]);

  const togglePresent = (studentId) => {
    if (!roster?.editable) return;
    setRoster((prev) => ({
      ...prev,
      students: prev.students.map((s) =>
        s.studentId === studentId ? { ...s, present: !s.present } : s
      ),
    }));
  };

  const handleSave = async () => {
    if (!roster || !selectedSlot || !roster.editable) return;
    try {
      setSaving(true);
      setError('');
      const payload = {
        subjectId: selectedSlot.subjectId,
        date: selectedSlot.date,
        records: roster.students.map((s) => ({ studentId: s.studentId, present: s.present })),
      };
      const res = await api.post('/attendance/mark', payload);
      setRoster(res.data);
      // reflect the "marked" state back into the dropdown list without a refetch
      setSlots((prev) =>
        prev.map((s) =>
          s.subjectId === selectedSlot.subjectId && s.date === selectedSlot.date
            ? { ...s, marked: true }
            : s
        )
      );
    } catch (err) {
      setError(err?.response?.data?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] overflow-y-auto bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
        <DialogHeader>
          <DialogTitle>Mark Attendance</DialogTitle>
          <DialogDescription>
            Pick a lecture from your actual timetable. Students already granted excused
            attendance by the HOD are pre-checked. You can only edit attendance on the
            lecture's own date — it locks the next day.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-2">
          <div className="grid gap-2">
            <label className="text-sm font-medium">Lecture</label>
            {loadingSlots ? (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading your timetable...
              </div>
            ) : (
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700"
                value={slotKey}
                onChange={(e) => setSlotKey(e.target.value)}
              >
                <option value="">Select a lecture...</option>
                {slots.map((s) => {
                  const key = `${s.subjectId}|${s.date}`;
                  const label = `${s.subjectName} — ${format(parseISO(s.date), 'EEE, MMM d')} · ${s.startTime}-${s.endTime} · Div ${s.className}${s.marked ? ' ✓' : ''}${!s.editable ? ' 🔒' : ''}`;
                  return (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  );
                })}
              </select>
            )}
            {!loadingSlots && slots.length === 0 && (
              <p className="text-xs text-gray-500">
                No lectures found in your timetable for the last 3 weeks.
              </p>
            )}
          </div>

          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-3 py-2 rounded text-sm">
              {error}
            </div>
          )}

          {selectedSlot && !loadingRoster && roster && !roster.editable && (
            <div className="flex items-center gap-2 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200 px-3 py-2 rounded text-sm">
              <Lock className="h-4 w-4 shrink-0" />
              This lecture was on {format(parseISO(selectedSlot.date), 'MMM d, yyyy')} — attendance can no
              longer be edited after that date. Showing a read-only view.
            </div>
          )}

          {loadingRoster ? (
            <div className="flex justify-center py-6"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : roster ? (
            <div className="border border-gray-200 dark:border-gray-700 rounded-md divide-y divide-gray-200 dark:divide-gray-700 max-h-72 overflow-y-auto">
              {roster.students.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">
                  No students found in division {roster.className}.
                </div>
              ) : (
                roster.students.map((s) => (
                  <label
                    key={s.studentId}
                    className={`flex items-center justify-between gap-3 p-2 px-3 ${
                      roster.editable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : 'cursor-not-allowed opacity-80'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={s.present}
                        disabled={!roster.editable}
                        onChange={() => togglePresent(s.studentId)}
                        className="h-4 w-4"
                      />
                      <div>
                        <div className="font-medium text-sm">{s.name}</div>
                        <div className="text-xs text-gray-500">SAP: {s.sap}</div>
                      </div>
                    </div>
                    {s.grantedByHod && (
                      <Badge className="bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" /> Excused (HOD)
                      </Badge>
                    )}
                  </label>
                ))
              )}
            </div>
          ) : null}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Close</Button>
          <Button onClick={handleSave} disabled={!roster || !roster.editable || saving}>
            {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
            Save Attendance
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
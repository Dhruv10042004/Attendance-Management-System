import { useState, useEffect } from 'react';
import { Plus, Download, Edit, Trash, Save, Users, X } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';

const CLASSES = ['I1', 'I2', 'I3'];
const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const WEEKDAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const HOUR_PX = 64; // height of one hour in the grid
const DEFAULT_START_HOUR = 8;
const DEFAULT_END_HOUR = 18;

// Full class strings (never built dynamically) so Tailwind keeps them. One colour per subject name.
const PALETTE = [
  { light: 'bg-blue-100 border-blue-500 text-blue-900', dark: 'bg-blue-900 border-blue-400 text-blue-100' },
  { light: 'bg-emerald-100 border-emerald-500 text-emerald-900', dark: 'bg-emerald-900 border-emerald-400 text-emerald-100' },
  { light: 'bg-violet-100 border-violet-500 text-violet-900', dark: 'bg-violet-900 border-violet-400 text-violet-100' },
  { light: 'bg-amber-100 border-amber-500 text-amber-900', dark: 'bg-amber-900 border-amber-400 text-amber-100' },
  { light: 'bg-rose-100 border-rose-500 text-rose-900', dark: 'bg-rose-900 border-rose-400 text-rose-100' },
  { light: 'bg-cyan-100 border-cyan-500 text-cyan-900', dark: 'bg-cyan-900 border-cyan-400 text-cyan-100' },
  { light: 'bg-fuchsia-100 border-fuchsia-500 text-fuchsia-900', dark: 'bg-fuchsia-900 border-fuchsia-400 text-fuchsia-100' },
  { light: 'bg-orange-100 border-orange-500 text-orange-900', dark: 'bg-orange-900 border-orange-400 text-orange-100' },
];

const toMin = (hhmm) => {
  const [h, m] = (hhmm || '0:0').split(':').map(Number);
  return h * 60 + (m || 0);
};
// Every class a slot appears in: its own class plus any it is shared with (one lecture, several timetables).
const classesOf = (s) => [...new Set([s.className, ...(s.extraClassNames || [])].filter(Boolean))];
const paletteIndex = (name = '') => {
  let h = 0;
  for (const ch of name.toLowerCase()) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % PALETTE.length;
};

// Side-by-side layout for slots that overlap in time: each gets a column inside its overlap cluster.
const layoutDay = (items) => {
  const sorted = [...items].sort((a, b) => toMin(a.startTime) - toMin(b.startTime) || toMin(b.endTime) - toMin(a.endTime));
  const placed = [];
  let cluster = [];
  let clusterEnd = -1;
  const flush = () => {
    const colEnds = [];
    const assigned = cluster.map((s) => {
      let col = colEnds.findIndex((end) => end <= toMin(s.startTime));
      if (col === -1) {
        col = colEnds.length;
        colEnds.push(0);
      }
      colEnds[col] = toMin(s.endTime);
      return { subject: s, col };
    });
    assigned.forEach((a) => placed.push({ ...a, cols: colEnds.length }));
    cluster = [];
    clusterEnd = -1;
  };
  sorted.forEach((s) => {
    if (cluster.length && toMin(s.startTime) >= clusterEnd) flush();
    cluster.push(s);
    clusterEnd = Math.max(clusterEnd, toMin(s.endTime));
  });
  if (cluster.length) flush();
  return placed;
};

const emptyForm = (cls, day = 'Monday') => ({
  id: '',
  name: '',
  teacherId: '',
  day,
  startTime: '08:00',
  endTime: '09:00',
  classNames: [cls],      // first = the slot's own class, the rest = other classes it is shared with
  restricted: false,      // false = whole class(es); true = only the students in the chosen batches
  selectedGroupIds: [],   // batches picked in this popup
  enrolledStudentIds: []  // union of those batches (or the existing list when editing)
});

export default function TimetableManagement() {
  const { theme } = useTheme();
  const dark = theme === 'dark';

  const [selectedClass, setSelectedClass] = useState('I1');
  const [timetable, setTimetable] = useState([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [subjectForm, setSubjectForm] = useState(emptyForm('I1'));

  // Saved batches / elective rosters, uploaded once per term as a CSV of SAP numbers.
  const [studentGroups, setStudentGroups] = useState([]);
  const [isGroupPanelOpen, setIsGroupPanelOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupFile, setNewGroupFile] = useState(null);
  const [groupUploadError, setGroupUploadError] = useState(null);

  const [teacherData, setTeacherData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isViewingSubject, setIsViewingSubject] = useState(false);
  const [viewingSubject, setViewingSubject] = useState(null);

  // ---------- data ----------
  const loadStudentGroups = () => {
    api.get('/student-groups')
      .then((res) => setStudentGroups(Array.isArray(res.data) ? res.data : []))
      .catch(() => setStudentGroups([]));
  };

  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true);
        const response = await api.get('/users/teachers');
        if (Array.isArray(response.data) && response.data.length > 0) {
          setTeacherData(response.data);
          return;
        }
      } catch (err) {
        console.error('Error fetching teachers:', err);
      } finally {
        setIsLoading(false);
      }
      // Fallback sample data if the endpoint fails or returns nothing
      setTeacherData([
        { id: '1', name: 'Dr. Smith', email: 'smith@example.com' },
        { id: '2', name: 'Prof. Johnson', email: 'johnson@example.com' },
        { id: '3', name: 'Ms. Williams', email: 'williams@example.com' },
        { id: '4', name: 'Mr. Brown', email: 'brown@example.com' },
        { id: '5', name: 'Dr. Davis', email: 'davis@example.com' }
      ]);
    };
    fetchTeachers();
  }, []);

  useEffect(() => {
    api.get('/subjects')
      .then((response) => setTimetable(Array.isArray(response.data) ? response.data : []))
      .catch((err) => {
        console.error('Error fetching timetable:', err);
        setTimetable([
          { id: '1', startTime: '08:00', endTime: '09:30', teacherId: '1', name: 'Mathematics', className: 'I1', day: 'Monday' },
          { id: '2', startTime: '10:00', endTime: '11:30', teacherId: '2', name: 'Physics', className: 'I1', day: 'Monday' },
          { id: '3', startTime: '13:00', endTime: '14:30', teacherId: '3', name: 'Chemistry', className: 'I1', day: 'Tuesday' }
        ]);
      });
  }, []);

  useEffect(() => {
    if (isAddingSubject) loadStudentGroups();
  }, [isAddingSubject]);

  useEffect(() => {
    const check = () => setIsMobileView(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const getTeacherName = (teacherId) => teacherData.find((t) => t.id === teacherId)?.name || 'Unassigned';

  // ---------- form handlers ----------
  const closeForm = () => {
    setIsAddingSubject(false);
    setIsEditingSubject(false);
    setEditingSubjectId(null);
    setIsGroupPanelOpen(false);
    setError(null);
  };

  const openAddForm = () => {
    setSubjectForm(emptyForm(selectedClass, isMobileView ? selectedDay : 'Monday'));
    setIsEditingSubject(false);
    setEditingSubjectId(null);
    setIsAddingSubject(true);
  };

  const handleEditSubject = (subject) => {
    const enrolled = Array.isArray(subject.enrolledStudentIds) ? subject.enrolledStudentIds : [];
    setSubjectForm({
      id: subject.id,
      name: subject.name,
      teacherId: subject.teacherId,
      day: subject.day,
      startTime: subject.startTime,
      endTime: subject.endTime,
      classNames: classesOf(subject),
      restricted: enrolled.length > 0,
      selectedGroupIds: [],
      enrolledStudentIds: enrolled
    });
    setIsEditingSubject(true);
    setEditingSubjectId(subject.id);
    setIsAddingSubject(true);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSubjectForm((prev) => ({ ...prev, [name]: value }));
  };

  // A lecture can serve several classes; at least one must stay selected.
  const toggleClass = (c) => setSubjectForm((prev) => {
    const has = prev.classNames.includes(c);
    if (has && prev.classNames.length === 1) return prev;
    return { ...prev, classNames: has ? prev.classNames.filter((x) => x !== c) : [...prev.classNames, c] };
  });

  // Any number of batches can be combined; the enrolled list is always their union.
  const toggleGroup = (id) => setSubjectForm((prev) => {
    const selectedGroupIds = prev.selectedGroupIds.includes(id)
      ? prev.selectedGroupIds.filter((g) => g !== id)
      : [...prev.selectedGroupIds, id];
    const ids = new Set();
    studentGroups
      .filter((g) => selectedGroupIds.includes(g.id))
      .forEach((g) => (g.studentIds || []).forEach((s) => ids.add(s)));
    return { ...prev, selectedGroupIds, enrolledStudentIds: [...ids] };
  });

  const setWholeClass = (whole) => setSubjectForm((prev) => ({
    ...prev,
    restricted: !whole,
    selectedGroupIds: whole ? [] : prev.selectedGroupIds,
    enrolledStudentIds: whole ? [] : prev.enrolledStudentIds
  }));

  const handleAddSubject = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const subjectData = {
        name: subjectForm.name,
        startTime: subjectForm.startTime,
        endTime: subjectForm.endTime,
        teacherId: subjectForm.teacherId,
        className: subjectForm.restricted ? autoClasses[0] : subjectForm.classNames[0],
        extraClassNames: subjectForm.restricted ? autoClasses.slice(1) : subjectForm.classNames.slice(1), // [] = just the one class
        day: subjectForm.day,
        // Empty list = whole class(es); also how an edit clears a subject back to "everyone".
        enrolledStudentIds: subjectForm.restricted ? subjectForm.enrolledStudentIds : []
      };

      if (isEditingSubject) {
        const response = await api.put(`/subjects/${editingSubjectId}`, subjectData);
        setTimetable((prev) => prev.map((s) => (s.id === editingSubjectId ? response.data : s)));
      } else {
        const response = await api.post('/subjects', subjectData);
        setTimetable((prev) => [...prev, response.data]);
      }
      closeForm();
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while saving the subject.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    try {
      setIsLoading(true);
      await api.delete(`/subjects/${id}`);
      setTimetable((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while deleting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadGroup = async () => {
    if (!newGroupName.trim() || !newGroupFile) {
      setGroupUploadError('Name and CSV file are both required');
      return;
    }
    try {
      setGroupUploadError(null);
      const formData = new FormData();
      formData.append('name', newGroupName.trim());
      formData.append('file', newGroupFile);
      await api.post('/student-groups', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
      setNewGroupName('');
      setNewGroupFile(null);
      loadStudentGroups();
    } catch (err) {
      setGroupUploadError(err.response?.data?.message || 'Upload failed');
    }
  };

  const handleDeleteGroup = async (id) => {
    await api.delete(`/student-groups/${id}`).catch(() => {});
    setSubjectForm((prev) => ({ ...prev, selectedGroupIds: prev.selectedGroupIds.filter((g) => g !== id) }));
    loadStudentGroups();
  };

  const exportToCSV = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/subjects/class/${selectedClass}`);
      const classData = Array.isArray(response.data) ? response.data : [];
      const headers = 'id,startTime,endTime,teacherName,name,className,day\n';
      const csvData = classData.map((s) =>
        `${s.id},${s.startTime},${s.endTime},${getTeacherName(s.teacherId)},${s.name},${classesOf(s).join('|')},${s.day}`
      ).join('\n');
      const blob = new Blob([headers + csvData], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `timetable_${selectedClass}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while exporting');
    } finally {
      setIsLoading(false);
    }
  };

  // ---------- theme helpers ----------
  const bg = dark ? 'bg-gray-900' : 'bg-gray-50';
  const card = dark ? 'bg-gray-800' : 'bg-white';
  const border = dark ? 'border-gray-700' : 'border-gray-200';
  const headerBg = dark ? 'bg-gray-800' : 'bg-gray-100';
  const text = dark ? 'text-gray-100' : 'text-gray-800';
  const subText = dark ? 'text-gray-300' : 'text-gray-600';
  const inputCls = `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
    dark ? 'bg-gray-700 border-gray-600 text-gray-100' : 'bg-white border-gray-300 text-gray-700'}`;
  const lineColor = dark ? '#374151' : '#e5e7eb';
  const chip = (active) => `px-3 py-1 rounded-full text-sm border transition ${
    active ? 'bg-blue-600 border-blue-600 text-white' : `${border} ${text} hover:bg-gray-100 dark:hover:bg-gray-700`}`;

  // ---------- grid ----------
  const classSubjects = timetable.filter((s) => classesOf(s).includes(selectedClass));
  const visibleDays = isMobileView ? [selectedDay] : DAYS;
  const startHour = Math.min(DEFAULT_START_HOUR, ...classSubjects.map((s) => Math.floor(toMin(s.startTime) / 60)));
  const endHour = Math.max(DEFAULT_END_HOUR, ...classSubjects.map((s) => Math.ceil(toMin(s.endTime) / 60)));
  const hours = Array.from({ length: endHour - startHour }, (_, i) => startHour + i);
  const gridHeight = hours.length * HOUR_PX;
  const gridCols = `${isMobileView ? 52 : 64}px repeat(${visibleDays.length}, minmax(0, 1fr))`;
  const today = WEEKDAY_NAMES[new Date().getDay()];
  const timeInvalid = toMin(subjectForm.endTime) <= toMin(subjectForm.startTime);

  const selectedGroups = studentGroups.filter((g) => subjectForm.selectedGroupIds.includes(g.id));
  // Which classes a restricted subject will actually show in: the union of its selected batches' classes,
  // or (editing an existing restricted subject with no batch re-picked yet) whatever it already resolved to.
  const autoClasses = selectedGroups.length > 0
    ? [...new Set(selectedGroups.flatMap((g) => g.classes || []))].sort()
    : subjectForm.classNames;

  return (
    <div className={`flex flex-col w-full max-w-6xl mx-auto p-2 sm:p-4 ${bg} rounded-lg shadow transition-colors duration-300`}>
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 mb-4">
        <div>
          <h1 className={`text-xl sm:text-2xl font-bold ${text}`}>Timetable Management</h1>
          <p className={`text-sm ${subText}`}>
            {selectedClass} · {classSubjects.length} lecture{classSubjects.length === 1 ? '' : 's'} a week
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className={`flex rounded-full border ${border} ${card} p-1`}>
            {CLASSES.map((c) => (
              <button
                key={c}
                onClick={() => setSelectedClass(c)}
                className={`px-4 py-1 rounded-full text-sm font-medium transition ${
                  selectedClass === c ? 'bg-blue-600 text-white shadow' : `${subText} hover:text-blue-600`}`}
              >
                {c}
              </button>
            ))}
          </div>
          <button
            onClick={openAddForm}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            <Plus size={18} className="mr-1" /> Add Subject
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            <Download size={18} className="mr-1" /> Export
          </button>
        </div>
      </div>

      {isMobileView && (
        <div className="flex gap-2 overflow-x-auto pb-3">
          {DAYS.map((d) => (
            <button key={d} onClick={() => setSelectedDay(d)} className={`${chip(selectedDay === d)} whitespace-nowrap`}>
              {d.slice(0, 3)}
            </button>
          ))}
        </div>
      )}

      {error && !isAddingSubject && <p className="text-red-500 text-sm mb-2">{error}</p>}

      {/* Timetable grid: cards are placed by real start/end time */}
      <div className={`${card} rounded-xl shadow border ${border} overflow-x-auto`}>
        <div style={{ minWidth: isMobileView ? 0 : 760 }}>
          <div className="grid" style={{ gridTemplateColumns: gridCols }}>
            <div className={`${headerBg} border-b ${border}`} />
            {visibleDays.map((day) => {
              const count = classSubjects.filter((s) => s.day === day).length;
              const isToday = day === today;
              return (
                <div
                  key={day}
                  className={`py-2 text-center text-sm font-semibold border-b border-l ${border} ${
                    isToday ? 'bg-blue-600 text-white' : `${headerBg} ${text}`}`}
                >
                  {day}
                  <span className={`ml-1 text-xs font-normal ${isToday ? 'text-blue-100' : subText}`}>· {count}</span>
                </div>
              );
            })}
          </div>

          <div className="grid" style={{ gridTemplateColumns: gridCols }}>
            <div>
              {hours.map((h) => (
                <div key={h} style={{ height: HOUR_PX }} className={`px-2 pt-0.5 text-right text-[11px] ${subText}`}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {visibleDays.map((day) => (
              <div
                key={day}
                className={`relative border-l ${border} ${day === today ? (dark ? 'bg-blue-950/30' : 'bg-blue-50/60') : ''}`}
                style={{
                  height: gridHeight,
                  backgroundImage: `linear-gradient(to bottom, ${lineColor} 1px, transparent 1px)`,
                  backgroundSize: `100% ${HOUR_PX}px`
                }}
              >
                {layoutDay(classSubjects.filter((s) => s.day === day)).map(({ subject: s, col, cols }) => {
                  const p = PALETTE[paletteIndex(s.name)];
                  const h = Math.max(((toMin(s.endTime) - toMin(s.startTime)) / 60) * HOUR_PX, 28);
                  const top = ((toMin(s.startTime) - startHour * 60) / 60) * HOUR_PX;
                  const classes = classesOf(s);
                  const shared = classes.length > 1;
                  const enrolledCount = (s.enrolledStudentIds || []).length;
                  const restricted = enrolledCount > 0;
                  const tip = [
                    s.name,
                    getTeacherName(s.teacherId),
                    `${s.startTime} - ${s.endTime}`,
                    shared ? `Classes: ${classes.join(', ')}` : null,
                    restricted ? `${enrolledCount} enrolled students` : null
                  ].filter(Boolean).join('\n');

                  return (
                    <div
                      key={s.id}
                      role="button"
                      tabIndex={0}
                      title={tip}
                      onClick={() => { setViewingSubject(s); setIsViewingSubject(true); }}
                      onKeyDown={(e) => { if (e.key === 'Enter') { setViewingSubject(s); setIsViewingSubject(true); } }}
                      className={`absolute overflow-hidden rounded-md border-l-4 px-2 py-1 shadow-sm cursor-pointer transition hover:z-20 hover:shadow-lg ${dark ? p.dark : p.light}`}
                      style={{
                        top,
                        height: h - 2,
                        left: `calc(${(col / cols) * 100}% + 2px)`,
                        width: `calc(${100 / cols}% - 4px)`
                      }}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="truncate text-xs font-semibold">{s.name}</span>
                        {(shared || restricted) && <Users size={12} className="mt-0.5 shrink-0 opacity-70" />}
                      </div>
                      {h >= 44 && <div className="truncate text-[11px] opacity-80">{getTeacherName(s.teacherId)}</div>}
                      {h >= 60 && <div className="text-[11px] opacity-70">{s.startTime} – {s.endTime}</div>}
                      {h >= 84 && (shared || restricted) && (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {shared && <span className="rounded bg-black/10 px-1 text-[10px]">{classes.join(' · ')}</span>}
                          {restricted && <span className="rounded bg-black/10 px-1 text-[10px]">{enrolledCount} students</span>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
        {isMobileView && classSubjects.filter((s) => s.day === selectedDay).length === 0 && (
          <p className={`p-4 text-center text-sm ${subText}`}>No lectures on {selectedDay}.</p>
        )}
      </div>

      {/* Add / Edit popup */}
      {isAddingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${card} rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-lg max-h-[92vh] overflow-y-auto`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg sm:text-xl font-bold ${text}`}>{isEditingSubject ? 'Edit Subject' : 'Add New Subject'}</h2>
              <button onClick={closeForm} className={`${subText} hover:text-gray-700`} aria-label="Close"><X size={20} /></button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${text} mb-1`}>Subject Name</label>
                <input type="text" name="name" value={subjectForm.name} onChange={handleInputChange}
                  className={inputCls} placeholder="e.g. Advanced Security" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={`block text-sm font-medium ${text} mb-1`}>Day</label>
                  <select name="day" value={subjectForm.day} onChange={handleInputChange} className={inputCls}>
                    {DAYS.map((d) => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div>
                  <label className={`block text-sm font-medium ${text} mb-1`}>Start</label>
                  <input type="time" name="startTime" value={subjectForm.startTime} onChange={handleInputChange} className={inputCls} />
                </div>
                <div>
                  <label className={`block text-sm font-medium ${text} mb-1`}>End</label>
                  <input type="time" name="endTime" value={subjectForm.endTime} onChange={handleInputChange} className={inputCls} />
                </div>
              </div>
              {timeInvalid && <p className="text-xs text-red-500 -mt-2">End time must be after the start time.</p>}

              <div>
                <label className={`block text-sm font-medium ${text} mb-1`}>Teacher</label>
                {teacherData.length === 0 ? (
                  <p className="text-sm text-red-500">No teachers available. Please add a teacher in User Management first.</p>
                ) : (
                  <select name="teacherId" value={subjectForm.teacherId} onChange={handleInputChange} className={inputCls}>
                    <option value="">Select a teacher</option>
                    {teacherData.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                )}
              </div>

              {/* Classes: hand-picked for a whole-class subject; auto-derived once it is restricted to batches */}
              <div>
                <label className={`block text-sm font-medium ${text} mb-1`}>Classes</label>
                {!subjectForm.restricted ? (
                  <>
                    <div className="flex flex-wrap gap-2">
                      {CLASSES.map((c) => (
                        <button key={c} type="button" onClick={() => toggleClass(c)} className={chip(subjectForm.classNames.includes(c))}>
                          {c}
                        </button>
                      ))}
                    </div>
                    <p className={`text-xs mt-1 ${subText}`}>
                      Pick more than one to add this lecture once and show it in each of those timetables.
                    </p>
                  </>
                ) : (
                  <p className={`text-sm ${subText}`}>
                    {autoClasses.length > 0
                      ? <>Automatically shown in <span className={`font-medium ${text}`}>{autoClasses.join(', ')}</span> — worked out from the selected batches' students.</>
                      : 'Pick a batch below and the classes it belongs to will appear here automatically.'}
                  </p>
                )}
              </div>

              {/* Students: whole class(es) or one or more batches */}
              <div>
                <label className={`block text-sm font-medium ${text} mb-1`}>Students</label>
                <div className={`inline-flex rounded-full border ${border} p-1 mb-2`}>
                  <button type="button" onClick={() => setWholeClass(true)}
                    className={`px-3 py-1 rounded-full text-sm ${!subjectForm.restricted ? 'bg-blue-600 text-white' : subText}`}>
                    Whole class{subjectForm.classNames.length > 1 ? 'es' : ''}
                  </button>
                  <button type="button" onClick={() => setWholeClass(false)}
                    className={`px-3 py-1 rounded-full text-sm ${subjectForm.restricted ? 'bg-blue-600 text-white' : subText}`}>
                    Specific batches
                  </button>
                </div>

                {subjectForm.restricted && (
                  <div className="space-y-2">
                    {studentGroups.length === 0 ? (
                      <p className={`text-sm ${subText}`}>No batches yet. Upload a CSV of SAP numbers below to create one.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {studentGroups.map((g) => (
                          <button key={g.id} type="button" onClick={() => toggleGroup(g.id)}
                            className={chip(subjectForm.selectedGroupIds.includes(g.id))}>
                            {g.name} <span className="opacity-70">· {(g.studentIds || []).length}{(g.classes || []).length > 0 ? ` · ${g.classes.join('+')}` : ''}</span>
                          </button>
                        ))}
                      </div>
                    )}

                    <p className={`text-xs ${subText}`}>
                      {selectedGroups.length > 0
                        ? `${selectedGroups.map((g) => g.name).join(' + ')} → ${subjectForm.enrolledStudentIds.length} students`
                        : subjectForm.enrolledStudentIds.length > 0
                          ? `Currently ${subjectForm.enrolledStudentIds.length} students (existing list). Pick batches to replace it.`
                          : 'Pick one or more batches. Several can be combined.'}
                    </p>

                    <button type="button" onClick={() => setIsGroupPanelOpen((v) => !v)} className="text-xs text-blue-500 underline">
                      {isGroupPanelOpen ? 'Hide batch upload' : 'Manage batches'}
                    </button>

                    {isGroupPanelOpen && (
                      <div className={`rounded-md border ${border} p-2 space-y-2`}>
                        <p className={`text-xs font-medium ${text}`}>
                          Upload a CSV with one "sap" column to save a reusable batch (e.g. "I1-1", "Advanced Security").
                        </p>
                        <div className="flex flex-wrap items-center gap-2">
                          <input type="text" placeholder="Batch name" value={newGroupName}
                            onChange={(e) => setNewGroupName(e.target.value)}
                            className={`rounded-md border ${border} p-1.5 text-sm ${text} ${card}`} />
                          <input type="file" accept=".csv" onChange={(e) => setNewGroupFile(e.target.files?.[0] || null)} className="text-sm" />
                          <button type="button" onClick={handleUploadGroup} className="rounded-md bg-blue-600 px-2 py-1 text-xs text-white">
                            Upload
                          </button>
                        </div>
                        {groupUploadError && <p className="text-xs text-red-500">{groupUploadError}</p>}
                        <ul className="space-y-1">
                          {studentGroups.map((g) => (
                            <li key={g.id} className={`flex items-center justify-between text-xs ${text}`}>
                              <span>{g.name} — {(g.studentIds || []).length} students</span>
                              <button type="button" onClick={() => handleDeleteGroup(g.id)} className="text-red-500">Delete</button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {error && <p className="text-red-500 text-sm">{error}</p>}

              <div className="pt-2 flex justify-end space-x-2">
                <button onClick={closeForm} className={`px-4 py-2 border ${border} rounded-md ${text} hover:bg-gray-100 dark:hover:bg-gray-700`}>
                  Cancel
                </button>
                <button
                  onClick={handleAddSubject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!subjectForm.name || !subjectForm.teacherId || isLoading || timeInvalid
                    || (subjectForm.restricted && subjectForm.enrolledStudentIds.length === 0)}
                >
                  <Save size={18} className="mr-1" />
                  {isLoading ? 'Saving...' : (isEditingSubject ? 'Update' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Details popup */}
      {isViewingSubject && viewingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${card} rounded-xl shadow-lg p-4 sm:p-6 w-full max-w-md`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg sm:text-xl font-bold ${text}`}>Subject Details</h2>
              <button onClick={() => setIsViewingSubject(false)} className={`${subText} hover:text-gray-700`} aria-label="Close">
                <X size={20} />
              </button>
            </div>

            <div className={`p-3 rounded-lg border-l-4 ${dark ? PALETTE[paletteIndex(viewingSubject.name)].dark : PALETTE[paletteIndex(viewingSubject.name)].light}`}>
              <h3 className="text-lg font-bold">{viewingSubject.name}</h3>
              <div className="mt-2 space-y-1 text-sm">
                {[
                  ['Teacher', getTeacherName(viewingSubject.teacherId)],
                  ['Day', viewingSubject.day],
                  ['Time', `${viewingSubject.startTime} - ${viewingSubject.endTime}`],
                  ['Classes', classesOf(viewingSubject).join(', ')],
                  ['Students', (viewingSubject.enrolledStudentIds || []).length > 0
                    ? `${viewingSubject.enrolledStudentIds.length} enrolled (batch / elective)`
                    : 'Whole class']
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-4">
                    <span className="opacity-70">{label}</span>
                    <span className="font-medium text-right">{value}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-between pt-4">
              <button
                onClick={() => { handleDeleteSubject(viewingSubject.id); setIsViewingSubject(false); }}
                className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 transition flex items-center"
              >
                <Trash size={16} className="mr-1" /> Delete
              </button>
              <div className="space-x-2">
                <button onClick={() => setIsViewingSubject(false)}
                  className={`px-4 py-2 border ${border} rounded-md ${text} hover:bg-gray-100 dark:hover:bg-gray-700 transition`}>
                  Close
                </button>
                <button
                  onClick={() => { handleEditSubject(viewingSubject); setIsViewingSubject(false); }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition inline-flex items-center"
                >
                  <Edit size={16} className="mr-1" /> Edit
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
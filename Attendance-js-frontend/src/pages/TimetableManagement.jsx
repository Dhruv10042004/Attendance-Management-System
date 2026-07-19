import { useState, useEffect } from 'react';
import { Calendar, Clock, Edit, Plus, Save, Trash, Download, Moon, Sun, Upload, Check } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import api from '../lib/api';

export default function TimetableManagement() {
  const { theme, toggleTheme } = useTheme();

  const [selectedClass, setSelectedClass] = useState('I1');
  const [timetable, setTimetable] = useState([]);
  const [isAddingSubject, setIsAddingSubject] = useState(false);
  const [isEditingSubject, setIsEditingSubject] = useState(false);
  const [editingSubjectId, setEditingSubjectId] = useState(null);
  const [isMobileView, setIsMobileView] = useState(false);
  const [selectedDay, setSelectedDay] = useState('Monday');

  // Form state — all keys match SubjectCreateRequest.java (camelCase)
  const [subjectForm, setSubjectForm] = useState({
    id: '',
    startTime: '08:00',
    endTime: '09:00',
    teacherId: '',
    name: '',
    className: '',
    day: 'Monday'
  });

  const [teacherData, setTeacherData] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  const timeSlots = Array.from({ length: 10 }, (_, i) => {
    const hour = i + 8;
    return `${hour < 10 ? '0' + hour : hour}:00`;
  });

  const [isViewingSubject, setIsViewingSubject] = useState(false);
  const [viewingSubject, setViewingSubject] = useState(null);

  // Fetch teachers
  useEffect(() => {
    const fetchTeachers = async () => {
      try {
        setIsLoading(true);
        setError(null);

        try {
          const response = await api.get('/users/teachers');
          console.log('Teachers API response:', response.data);

          if (Array.isArray(response.data) && response.data.length > 0) {
            setTeacherData(response.data);
            setIsLoading(false);
            return;
          }
        } catch (mainError) {
          console.error('Error with main teachers endpoint:', mainError);
        }

        // Fallback sample data if endpoint fails or returns empty
        const sampleTeachers = [
          { id: '1', name: 'Dr. Smith', email: 'smith@example.com' },
          { id: '2', name: 'Prof. Johnson', email: 'johnson@example.com' },
          { id: '3', name: 'Ms. Williams', email: 'williams@example.com' },
          { id: '4', name: 'Mr. Brown', email: 'brown@example.com' },
          { id: '5', name: 'Dr. Davis', email: 'davis@example.com' }
        ];
        setTeacherData(sampleTeachers);
        setIsLoading(false);
      } catch (error) {
        console.error('Overall error in fetchTeachers:', error);
        setIsLoading(false);
      }
    };

    fetchTeachers();
  }, []);

  // Check for mobile view
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobileView(window.innerWidth < 768);
    };
    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  // Fetch timetable
  useEffect(() => {
    const fetchTimetable = async () => {
      try {
        const response = await api.get('/subjects');
        setTimetable(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error('Error fetching timetable:', error);
        // Fallback sample data (camelCase, matching backend shape)
        const sampleData = [
          { id: '1', startTime: '08:00', endTime: '09:30', teacherId: '1', name: 'Mathematics', className: 'I1', day: 'Monday' },
          { id: '2', startTime: '10:00', endTime: '11:30', teacherId: '2', name: 'Physics', className: 'I1', day: 'Monday' },
          { id: '3', startTime: '13:00', endTime: '14:30', teacherId: '3', name: 'Chemistry', className: 'I1', day: 'Tuesday' },
          { id: '4', startTime: '09:00', endTime: '10:30', teacherId: '4', name: 'Computer Science', className: 'I2', day: 'Wednesday' },
          { id: '5', startTime: '11:00', endTime: '12:30', teacherId: '5', name: 'Biology', className: 'I3', day: 'Thursday' },
        ];
        setTimetable(sampleData);
      }
    };

    fetchTimetable();
  }, []);

  // Look up a teacher's name by id (works regardless of fetch order)
  const getTeacherName = (teacherId) => {
    const teacher = teacherData.find(t => t.id === teacherId);
    return teacher ? teacher.name : 'Unassigned';
  };

  const safeTimetable = Array.isArray(timetable) ? timetable : [];

  const filteredTimetable = isMobileView
    ? safeTimetable.filter(subject => subject.className === selectedClass && subject.day === selectedDay)
    : safeTimetable.filter(subject => subject.className === selectedClass);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setSubjectForm(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [importFile, setImportFile] = useState(null);

  const handleAddSubject = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const subjectData = {
        name: subjectForm.name,
        startTime: subjectForm.startTime,
        endTime: subjectForm.endTime,
        teacherId: subjectForm.teacherId,
        className: selectedClass,
        day: subjectForm.day
      };

      console.log('Sending to backend:', subjectData);

      if (isEditingSubject) {
        const response = await api.put(`/subjects/${editingSubjectId}`, subjectData);
        setTimetable(prev => prev.map(subject =>
          subject.id === editingSubjectId ? response.data : subject
        ));
      } else {
        const response = await api.post('/subjects', subjectData);
        setTimetable(prev => [...prev, response.data]);
      }

      setSubjectForm({
        id: '',
        startTime: '08:00',
        endTime: '09:00',
        teacherId: '',
        name: '',
        className: selectedClass,
        day: isMobileView ? selectedDay : 'Monday'
      });
      setIsAddingSubject(false);
      setIsEditingSubject(false);
      setEditingSubjectId(null);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while saving the subject.');
      console.error('Error saving subject:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteSubject = async (id) => {
    try {
      setIsLoading(true);
      await api.delete(`/subjects/${id}`);
      setTimetable(prev => prev.filter(subject => subject.id !== id));
      if (isViewingSubject && viewingSubject && viewingSubject.id === id) {
        setIsViewingSubject(false);
      }
    } catch (err) {
      console.error('Error deleting subject:', err);
      setError(err.response?.data?.message || 'An error occurred while deleting');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditSubject = (subject) => {
    setSubjectForm({
      id: subject.id,
      startTime: subject.startTime,
      endTime: subject.endTime,
      teacherId: subject.teacherId,
      name: subject.name,
      className: subject.className,
      day: subject.day
    });
    setIsEditingSubject(true);
    setEditingSubjectId(subject.id);
    setIsAddingSubject(true);
  };

  const exportToCSV = async () => {
    try {
      setIsLoading(true);
      const response = await api.get(`/subjects/class/${selectedClass}`);
      const classData = Array.isArray(response.data) ? response.data : [];

      const headers = 'id,startTime,endTime,teacherName,name,className,day\n';
      const csvData = classData.map(subject =>
        `${subject.id},${subject.startTime},${subject.endTime},${getTeacherName(subject.teacherId)},${subject.name},${subject.className},${subject.day}`
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
      console.error('Error exporting timetable:', err);
      setError(err.response?.data?.message || 'An error occurred while exporting');
    } finally {
      setIsLoading(false);
    }
  };

  const getSubjectsStartingAt = (day, time) => {
    return filteredTimetable.filter(subject =>
      subject.day === day &&
      subject.startTime === time
    );
  };

  const calculateTimeHeight = (startTime, endTime) => {
    const startHour = parseInt(startTime.split(':')[0]);
    const startMinutes = parseInt(startTime.split(':')[1]);
    const endHour = parseInt(endTime.split(':')[0]);
    const endMinutes = parseInt(endTime.split(':')[1]);

    const startTotalMinutes = startHour * 60 + startMinutes;
    const endTotalMinutes = endHour * 60 + endMinutes;
    const durationInMinutes = endTotalMinutes - startTotalMinutes;

    return `${Math.max(durationInMinutes / 60, 0.5) * 64}px`;
  };

  const getSubjectColorClass = (idx, hasOverlap) => {
    if (!hasOverlap) return getSubjectBoxBgClass();
    const colors = [
      theme === 'dark' ? 'bg-blue-800' : 'bg-blue-100',
      theme === 'dark' ? 'bg-green-800' : 'bg-green-100',
      theme === 'dark' ? 'bg-purple-800' : 'bg-purple-100',
      theme === 'dark' ? 'bg-orange-800' : 'bg-orange-100',
      theme === 'dark' ? 'bg-pink-800' : 'bg-pink-100'
    ];
    return colors[idx % colors.length];
  };

  const getTextColorForSubject = (idx, hasOverlap) => {
    if (!hasOverlap) return getSubjectTextClass();
    const colors = [
      theme === 'dark' ? 'text-blue-100' : 'text-blue-800',
      theme === 'dark' ? 'text-green-100' : 'text-green-800',
      theme === 'dark' ? 'text-purple-100' : 'text-purple-800',
      theme === 'dark' ? 'text-orange-100' : 'text-orange-800',
      theme === 'dark' ? 'text-pink-100' : 'text-pink-800'
    ];
    return colors[idx % colors.length];
  };

  const getBgClass = () => theme === 'dark' ? 'bg-gray-900' : 'bg-gray-50';
  const getCardBgClass = () => theme === 'dark' ? 'bg-gray-800' : 'bg-white';
  const getBorderClass = () => theme === 'dark' ? 'border-gray-700' : 'border-gray-200';
  const getHeaderBgClass = () => theme === 'dark' ? 'bg-gray-800' : 'bg-gray-100';
  const getTextClass = () => theme === 'dark' ? 'text-gray-100' : 'text-gray-800';
  const getSubTextClass = () => theme === 'dark' ? 'text-gray-300' : 'text-gray-600';
  const getSubjectBoxBgClass = () => theme === 'dark' ? 'bg-blue-800' : 'bg-blue-100';
  const getSubjectTextClass = () => theme === 'dark' ? 'text-blue-100' : 'text-blue-800';
  const getInputBgClass = () => theme === 'dark' ? 'bg-gray-700 border-gray-600' : 'bg-white border-gray-300';
  const getInputTextClass = () => theme === 'dark' ? 'text-gray-100' : 'text-gray-700';

  const handleViewSubject = (subject) => {
    setViewingSubject(subject);
    setIsViewingSubject(true);
  };

  const handleImportCSV = async () => {
    if (!importFile) {
      setError('Please select a CSV file first');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      const formData = new FormData();
      formData.append('file', importFile);

      const response = await api.post('/subjects/import/csv', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      const timetableResponse = await api.get('/subjects');
      setTimetable(Array.isArray(timetableResponse.data) ? timetableResponse.data : []);

      setImportFile(null);
      setIsImportModalOpen(false);

      const created = response.data?.created?.length ?? 0;
      alert(`Successfully imported ${created} subjects.`);
    } catch (err) {
      setError(err.response?.data?.message || 'An error occurred while importing');
      console.error('Error importing subjects:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`flex flex-col w-full max-w-6xl mx-auto p-2 sm:p-4 ${getBgClass()} rounded-lg shadow transition-colors duration-300`}>
      {/* Header with class selection */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 sm:mb-6 space-y-3 sm:space-y-0">
        <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4 w-full sm:w-auto">
          <h1 className={`text-xl sm:text-2xl font-bold ${getTextClass()}`}>Timetable Management</h1>
          <div className={`flex items-center ${getCardBgClass()} rounded-md shadow-sm border ${getBorderClass()} w-full sm:w-auto`}>
            <label htmlFor="class-select" className={`px-3 py-2 ${getSubTextClass()}`}>Class:</label>
            <select
              id="class-select"
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={`px-3 py-2 ${getCardBgClass()} border-l ${getBorderClass()} rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getTextClass()}`}
            >
              <option value="I1">I1</option>
              <option value="I2">I2</option>
              <option value="I3">I3</option>
            </select>
          </div>

          {isMobileView && (
            <div className={`flex items-center ${getCardBgClass()} rounded-md shadow-sm border ${getBorderClass()} mt-2 sm:mt-0 w-full sm:w-auto`}>
              <label htmlFor="day-select" className={`px-3 py-2 ${getSubTextClass()}`}>Day:</label>
              <select
                id="day-select"
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className={`px-3 py-2 ${getCardBgClass()} border-l ${getBorderClass()} rounded-r-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getTextClass()}`}
              >
                {days.map(day => (
                  <option key={day} value={day}>{day}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <button
            onClick={() => setIsAddingSubject(true)}
            className="flex items-center px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition"
          >
            <Plus size={18} className="mr-1" />
            <span className="hidden sm:inline">Add Subject</span>
            <span className="sm:hidden">Add</span>
          </button>
          <button
            onClick={exportToCSV}
            className="flex items-center px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition"
          >
            <Download size={18} className="mr-1" />
            <span className="hidden sm:inline">Export CSV</span>
            <span className="sm:hidden">Export</span>
          </button>
        </div>
      </div>

      {/* Timetable Calendar View */}
      <div className={`${getCardBgClass()} rounded-lg shadow border ${getBorderClass()} overflow-hidden overflow-x-auto`}>
        {!isMobileView && (
          <>
            <div className="grid grid-cols-7 border-b border-gray-200 min-w-max">
              <div className={`py-3 px-4 ${getHeaderBgClass()} font-semibold border-r ${getBorderClass()} ${getTextClass()}`}>Time</div>
              {days.map(day => (
                <div key={day} className={`py-3 px-4 ${getHeaderBgClass()} font-semibold border-r ${getBorderClass()} text-center ${getTextClass()}`}>
                  {day}
                </div>
              ))}
            </div>

            {timeSlots.map((time, index) => (
              <div key={time} className={`grid grid-cols-7 border-b ${getBorderClass()} min-w-max`}>
                <div className={`py-3 px-1 border-r ${getBorderClass()} flex items-center ${getTextClass()}`}>
                  <Clock size={16} className="mr-2 text-gray-500" />
                  {time} - {index < 9 ? timeSlots[index + 1] : '18:00'}
                </div>

                {days.map(day => {
                  const subjectsStartingHere = getSubjectsStartingAt(day, time);
                  const hasOverlap = subjectsStartingHere.length > 1;

                  return (
                    <div
                      key={`${day}-${time}`}
                      className={`border-r ${getBorderClass()} relative h-16`}
                    >
                      {subjectsStartingHere.map((subject, idx) => {
                        const height = calculateTimeHeight(subject.startTime, subject.endTime);
                        const width = hasOverlap ? `${100 / subjectsStartingHere.length}%` : '100%';
                        const leftPosition = hasOverlap ? `${(idx * 100) / subjectsStartingHere.length}%` : '0';
                        const textColor = getTextColorForSubject(idx, hasOverlap);

                        return (
                          <div
                            key={subject.id}
                            className={`absolute top-0 rounded shadow-md p-2 flex flex-col overflow-hidden 
                              ${getSubjectColorClass(idx, hasOverlap)} 
                              transition-all duration-200 
                              hover:z-20 hover:shadow-lg hover:scale-[1.02]
                              cursor-pointer`}
                            style={{
                              height: height,
                              width: `calc(${width} - 4px)`,
                              left: leftPosition,
                              zIndex: 5 + idx,
                              marginLeft: '2px',
                              marginRight: '2px',
                            }}
                            onClick={() => handleViewSubject(subject)}
                            title="Click to view details"
                          >
                            <div className="flex justify-between items-start mb-1">
                              <span className={`font-medium ${textColor} truncate`}>{subject.name}</span>
                            </div>
                            <span className={`text-sm ${textColor} opacity-90 truncate`}>{getTeacherName(subject.teacherId)}</span>
                            <span className="text-xs mt-auto pt-1 opacity-80">{subject.startTime} - {subject.endTime}</span>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </>
        )}

        {isMobileView && (
          <>
            <div className="grid grid-cols-2 border-b border-gray-200">
              <div className={`py-3 px-4 ${getHeaderBgClass()} font-semibold border-r ${getBorderClass()} ${getTextClass()}`}>Time</div>
              <div className={`py-3 px-4 ${getHeaderBgClass()} font-semibold ${getTextClass()}`}>{selectedDay}</div>
            </div>

            {timeSlots.map((time, index) => {
              const subjectsStartingHere = getSubjectsStartingAt(selectedDay, time);
              const hasOverlap = subjectsStartingHere.length > 1;

              return (
                <div key={time} className={`grid grid-cols-2 border-b ${getBorderClass()}`}>
                  <div className={`py-3 px-4 border-r ${getBorderClass()} flex items-center ${getTextClass()} h-16`}>
                    <Clock size={16} className="mr-2 text-gray-500" />
                    {time} - {index < 9 ? timeSlots[index + 1] : '18:00'}
                  </div>

                  <div className="relative h-16">
                    {subjectsStartingHere.map((subject, idx) => {
                      const height = calculateTimeHeight(subject.startTime, subject.endTime);
                      const width = hasOverlap ? `${100 / subjectsStartingHere.length}%` : '100%';
                      const leftPosition = hasOverlap ? `${(idx * 100) / subjectsStartingHere.length}%` : '0';
                      const textColor = getTextColorForSubject(idx, hasOverlap);

                      return (
                        <div
                          key={subject.id}
                          className={`absolute top-0 rounded shadow-md p-2 flex flex-col overflow-hidden 
                            ${getSubjectColorClass(idx, hasOverlap)} 
                            transition-all duration-200
                            hover:z-20 hover:shadow-lg hover:scale-[1.02]`}
                          style={{
                            height: height,
                            width: `calc(${width} - 4px)`,
                            left: leftPosition,
                            zIndex: 5 + idx,
                            marginLeft: '2px',
                            marginRight: '2px',
                          }}
                          onClick={() => handleViewSubject(subject)}
                          title={`${subject.name} - ${getTeacherName(subject.teacherId)} (${subject.startTime}-${subject.endTime})`}
                        >
                          {hasOverlap && (
                            <div className="absolute top-0 right-0 h-4 w-4 flex items-center justify-center">
                              <div className="w-3 h-3 bg-yellow-400 rounded-full" title="Multiple subjects scheduled"></div>
                            </div>
                          )}
                          <div className="flex justify-between items-start mb-1">
                            <span className={`font-medium ${textColor} truncate mr-1`}>{subject.name}</span>
                          </div>
                          <span className={`text-sm ${textColor} opacity-90 truncate`}>{getTeacherName(subject.teacherId)}</span>
                          <span className="text-xs mt-auto pt-1 opacity-80">{subject.startTime} - {subject.endTime}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </>
        )}
      </div>

      {/* Add/Edit Subject Form Modal */}
      {isAddingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className={`${getCardBgClass()} rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg sm:text-xl font-bold ${getTextClass()}`}>
                {isEditingSubject ? 'Edit Subject' : 'Add New Subject'}
              </h2>
              <button
                onClick={() => {
                  setIsAddingSubject(false);
                  setIsEditingSubject(false);
                  setError(null);
                }}
                className={`${getSubTextClass()} hover:text-gray-700 text-xl`}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className={`block text-sm font-medium ${getTextClass()} mb-1`}>Subject Name</label>
                <input
                  type="text"
                  name="name"
                  value={subjectForm.name}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${getInputBgClass()} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getInputTextClass()}`}
                  placeholder="e.g. Mathematics"
                  required
                />
              </div>

              <div>
                <label className={`block text-sm font-medium ${getTextClass()} mb-1`}>Day</label>
                <select
                  name="day"
                  value={subjectForm.day}
                  onChange={handleInputChange}
                  className={`w-full px-3 py-2 border ${getInputBgClass()} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getInputTextClass()}`}
                >
                  {days.map(day => (
                    <option key={day} value={day}>{day}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={`block text-sm font-medium ${getTextClass()} mb-1`}>Start Time</label>
                  <input
                    type="time"
                    name="startTime"
                    value={subjectForm.startTime}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${getInputBgClass()} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getInputTextClass()}`}
                    required
                  />
                </div>

                <div>
                  <label className={`block text-sm font-medium ${getTextClass()} mb-1`}>End Time</label>
                  <input
                    type="time"
                    name="endTime"
                    value={subjectForm.endTime}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${getInputBgClass()} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getInputTextClass()}`}
                    required
                  />
                </div>
              </div>

              <div>
                <label className={`block text-sm font-medium ${getTextClass()} mb-1`}>Teacher</label>
                {teacherData.length === 0 ? (
                  <p className="text-sm text-red-500">
                    No teachers available. Please add a teacher in User Management first.
                  </p>
                ) : (
                  <select
                    name="teacherId"
                    value={subjectForm.teacherId}
                    onChange={handleInputChange}
                    className={`w-full px-3 py-2 border ${getInputBgClass()} rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${getInputTextClass()}`}
                    required
                  >
                    <option value="">Select a teacher</option>
                    {teacherData.map(teacher => (
                      <option key={teacher.id} value={teacher.id}>
                        {teacher.name}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}

              <div className="pt-4 flex justify-end space-x-2">
                <button
                  onClick={() => {
                    setIsAddingSubject(false);
                    setIsEditingSubject(false);
                    setError(null);
                  }}
                  className={`px-4 py-2 border ${getBorderClass()} rounded-md ${getTextClass()} hover:bg-gray-100 dark:hover:bg-gray-700`}
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddSubject}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={!subjectForm.name || !subjectForm.teacherId || isLoading}
                >
                  <Save size={18} className="mr-1" />
                  {isLoading ? 'Saving...' : (isEditingSubject ? 'Update' : 'Save')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Subject Details Modal */}
      {isViewingSubject && viewingSubject && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className={`${getCardBgClass()} rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-md`}>
            <div className="flex justify-between items-center mb-4">
              <h2 className={`text-lg sm:text-xl font-bold ${getTextClass()}`}>
                Subject Details
              </h2>
              <button
                onClick={() => setIsViewingSubject(false)}
                className={`${getSubTextClass()} hover:text-gray-700 dark:hover:text-gray-300 text-xl`}
              >
                ×
              </button>
            </div>

            <div className="space-y-4">
              <div className={`p-3 rounded-lg ${getSubjectColorClass(0, false)} mb-4`}>
                <h3 className={`text-lg font-bold ${getSubjectTextClass()}`}>{viewingSubject.name}</h3>
                <div className="mt-2 space-y-2">
                  <div className="flex justify-between">
                    <span className={`${getSubTextClass()}`}>Teacher:</span>
                    <span className={`font-medium ${getTextClass()}`}>{getTeacherName(viewingSubject.teacherId)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${getSubTextClass()}`}>Day:</span>
                    <span className={`font-medium ${getTextClass()}`}>{viewingSubject.day}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${getSubTextClass()}`}>Time:</span>
                    <span className={`font-medium ${getTextClass()}`}>{viewingSubject.startTime} - {viewingSubject.endTime}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${getSubTextClass()}`}>Class:</span>
                    <span className={`font-medium ${getTextClass()}`}>{viewingSubject.className}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className={`${getSubTextClass()}`}>Subject ID:</span>
                    <span className={`font-medium ${getTextClass()}`}>{viewingSubject.id}</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-between pt-2">
                <button
                  onClick={() => {
                    handleDeleteSubject(viewingSubject.id);
                    setIsViewingSubject(false);
                  }}
                  className="px-4 py-2 bg-red-600 dark:bg-red-700 text-white rounded-md hover:bg-red-700 dark:hover:bg-red-800 transition flex items-center"
                >
                  <Trash size={16} className="mr-1" />
                  Delete
                </button>
                <div className="space-x-2">
                  <button
                    onClick={() => setIsViewingSubject(false)}
                    className={`px-4 py-2 border ${getBorderClass()} rounded-md ${getTextClass()} hover:bg-gray-100 dark:hover:bg-gray-700 transition`}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => {
                      handleEditSubject(viewingSubject);
                      setIsViewingSubject(false);
                    }}
                    className="px-4 py-2 bg-blue-600 dark:bg-blue-700 text-white rounded-md hover:bg-blue-700 dark:hover:bg-blue-800 transition flex items-center"
                  >
                    <Edit size={16} className="mr-1" />
                    Edit
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
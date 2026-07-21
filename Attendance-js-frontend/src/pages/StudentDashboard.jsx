import { useState, useEffect, useRef } from 'react';
import { Calendar, Upload, Search as SearchIcon, X, Check } from 'lucide-react';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { useAuth } from '../context/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { useNavigate } from 'react-router-dom';
import { SunIcon, MoonIcon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import { Input } from '../components/ui/input';
import { Loader2, Plus, User, LogOut, Settings } from 'lucide-react';
import { Badge } from '../components/ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import api from '../lib/api';


export default function StudentDashboard() {
  const { user } = useAuth();
  const userId = user?.id;
  const { logout } = useAuth();
const navigate = useNavigate();
const { theme, toggleTheme } = useTheme();
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({ total: 0, pending: 0, approved: 0, rejected: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createRequestForm, setCreateRequestForm] = useState({
    name: '',
    reason: ''
  });
  const [proofFile, setProofFile] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedStudents, setSelectedStudents] = useState([]);
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [availableSubjects, setAvailableSubjects] = useState([]);
  const [calendarView, setCalendarView] = useState(false);
  const fileInputRef = useRef(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editForm, setEditForm] = useState({
    name: '',
    reason: ''
  });
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    className: '',
    password: '',
    confirmPassword: ''
  });
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');
  const [requestDate, setRequestDate] = useState(new Date());
  const [isDateRange, setIsDateRange] = useState(false);
  const [endDate, setEndDate] = useState(null);
  const[submitting,setSubmitting]=useState(false);
  const minDate = new Date();
  const maxDate = new Date();
  maxDate.setDate(minDate.getDate() + 7);

  const isDateWithinRange = (date) => {
    return date >= minDate && date <= maxDate;
  };

  const isDateRangeValid = () => {
    if (!isDateRange || !endDate) return true;
    return endDate <= maxDate && endDate >= requestDate;
  };
  const isOwner = (request) => request?.student?.id === userId;
  const getDateForDayOfWeek = (dayName, startDate, endDate = null) => {
    const dayMap = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0
    };

    const targetDay = dayMap[dayName];
    if (targetDay === undefined) {
      console.error(`Invalid day name: ${dayName}`);
      return null;
    }

    if (!endDate) {
      return new Date(startDate);
    }

    const date = new Date(startDate);
    const end = new Date(endDate);

    while (date <= end) {
      if (date.getDay() === targetDay) {
        return new Date(date);
      }
      date.setDate(date.getDate() + 1);
    }

    return null;
  };

  const getFilteredSubjects = (subjects, startDate, endDate) => {
    if (!subjects || !startDate) return [];

    const dayMap = {
      'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6, 'Sunday': 0
    };

    return subjects.filter(subject => {
      const subjectDay = dayMap[subject.day];
      if (subjectDay === undefined) return false;

      if (!endDate) {
        return startDate.getDay() === subjectDay;
      }

      const currentDate = new Date(startDate);
      const end = new Date(endDate);

      while (currentDate <= end) {
        if (currentDate.getDay() === subjectDay) {
          return true;
        }
        currentDate.setDate(currentDate.getDate() + 1);
      }

      return false;
    });
  };

  // Keep End Date valid whenever Start Date changes
  useEffect(() => {
    if (isDateRange && endDate && endDate < requestDate) {
      const nextDay = new Date(requestDate);
      nextDay.setDate(nextDay.getDate() + 1);
      setEndDate(nextDay <= maxDate ? nextDay : maxDate);
    }
  }, [requestDate]);

  // Fetch attendance requests + stats
  useEffect(() => {
    const fetchRequests = async () => {
      try {
        setLoading(true);
        const res = await api.get(`/attendance-requests/student/${userId}`);
        const responseData = Array.isArray(res.data) ? res.data : [];
        setRequests(responseData);
        setFilteredRequests(responseData);
      } catch (error) {
        console.error('Error fetching requests:', error);
        setError(error?.response?.data?.message || 'Error fetching requests');
      } finally {
        setLoading(false);
      }
    };

    const fetchStats = async () => {
      try {
        const res = await api.get(`/attendance-requests/stats/${userId}`);
        setStats(res.data);
      } catch (error) {
        console.error('Error fetching stats:', error);
        setStats({ total: 0, pending: 0, approved: 0, rejected: 0 });
      }
    };

    fetchRequests();
    fetchStats();
  }, []);

  // Filter requests when search term or status filter changes
  useEffect(() => {
    let filtered = [...requests];

    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(req =>
        req.name.toLowerCase().includes(search) ||
        req.reason.toLowerCase().includes(search) ||
        (req.subjectDates || []).some(sub => sub.subjectId?.name?.toLowerCase().includes(search))
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(req => req.status === statusFilter);
    }

    setFilteredRequests(filtered);
  }, [searchTerm, statusFilter, requests]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  const openRequestModal = (request) => {
    setSelectedRequest(request);
    setIsRequestModalOpen(true);
  };

  const fetchAvailableSubjects = async () => {
    try {
      const res = await api.get('/subjects');
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const studentClass = user.className;

      const filteredSubjects = (Array.isArray(res.data) ? res.data : [])
        .filter(subject => subject.className === studentClass);

      setAvailableSubjects(filteredSubjects);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      setAvailableSubjects([]);
    }
  };

  const searchStudents = async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      return;
    }

    try {
      const res = await api.get(`/users/search?query=${query}`);
      const results = Array.isArray(res.data) ? res.data : [];
      setSearchResults(results.filter(user => user.role === 'student'));
    } catch (error) {
      console.error('Error searching students:', error);
      setSearchResults([]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setProofFile(e.target.files[0]);
    }
  };

  const toggleSubjectSelection = (subject) => {
    const subjectId = subject.id;

    if (!subjectId) {
      console.error('Subject missing ID:', subject);
      return;
    }

    const isSelected = selectedSubjects.some(s => s.id === subjectId);

    if (isSelected) {
      setSelectedSubjects(selectedSubjects.filter(s => s.id !== subjectId));
    } else {
      setSelectedSubjects([...selectedSubjects, subject]);
    }
  };

  const toggleStudentSelection = (student) => {
    if (selectedStudents.some(s => s.id === student.id)) {
      setSelectedStudents(selectedStudents.filter(s => s.id !== student.id));
    } else {
      setSelectedStudents([...selectedStudents, student]);
    }
  };

  const buildSubjectDatesJson = (startDate, endDateForRange) => {
    return JSON.stringify(
      selectedSubjects
        .map(subject => {
          const subjectId = subject.id;
          if (!subjectId) return null;
          const subjectDate = getDateForDayOfWeek(subject.day, startDate, endDateForRange);
          return subjectDate ? { subjectId, date: subjectDate.toISOString() } : null;
        })
        .filter(Boolean)
    );
  };

  const createAttendanceRequest = async () => {
  if (!createRequestForm.name || !createRequestForm.reason || selectedSubjects.length === 0) {
    alert('Please fill all required fields');
    return;
  }

  if (!isDateWithinRange(requestDate)) {
    alert('Please select a date within the next 7 days');
    return;
  }

  if (submitting) return;
  setSubmitting(true);

  try {
    const formData = new FormData();
    formData.append('name', createRequestForm.name);
    formData.append('reason', createRequestForm.reason);
    formData.append('student_id', userId);
    formData.append('date', requestDate.toISOString());

    selectedStudents.forEach(student => {
      if (student.id) {
        formData.append('student_ids', student.id);
      }
    });

    formData.append('subjectDatesJson', buildSubjectDatesJson(requestDate, isDateRange ? endDate : null));

    if (proofFile) {
      formData.append('proof', proofFile);
    }

    await api.post('/attendance-requests', formData);

    setCreateRequestForm({ name: '', reason: '' });
    setProofFile(null);
    setSelectedStudents([]);
    setSelectedSubjects([]);
    setRequestDate(new Date());
    setIsCreateModalOpen(false);

    window.location.reload();

  } catch (error) {
    console.error('Error creating attendance request:', error);
    if (error.response?.data?.message) {
      alert(`Error: ${error.response.data.message}`);
    } else {
      alert('Error creating attendance request. Please try again.');
    }
  } finally {
    setSubmitting(false);
  }
};

  const openEditModal = (request) => {
    setEditingRequest(request);
    setEditForm({
      name: request.name,
      reason: request.reason
    });

    setSelectedSubjects((request.subjectDates || []).map(sd => sd.subjectId));
    setSelectedStudents(request.studentIds || []);
    setRequestDate(request.date ? new Date(request.date) : new Date());

    setIsRequestModalOpen(false);
    fetchAvailableSubjects();
    setIsEditModalOpen(true);
  };

  const updateAttendanceRequest = async () => {
    if (!editingRequest || !editForm.name || !editForm.reason || selectedSubjects.length === 0) {
      alert('Please fill all required fields');
      return;
    }

    if (!isDateWithinRange(requestDate)) {
      alert('Please select a date within the next 7 days');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', editForm.name);
      formData.append('reason', editForm.reason);
      formData.append('date', requestDate.toISOString());

      if (isDateRange && endDate) {
        formData.append('end_date', endDate.toISOString());
      }

      formData.append('subjectDatesJson', buildSubjectDatesJson(requestDate, isDateRange ? endDate : null));

      selectedStudents.forEach(student => {
        if (student.id) {
          formData.append('student_ids', student.id);
        }
      });

      if (proofFile) {
        formData.append('proof', proofFile);
      }

      await api.put(`/attendance-requests/${editingRequest.id}`, formData);

      setEditForm({ name: '', reason: '' });
      setProofFile(null);
      setSelectedStudents([]);
      setSelectedSubjects([]);
      setRequestDate(new Date());
      setIsEditModalOpen(false);
      setEditingRequest(null);

      window.location.reload();

    } catch (error) {
      console.error('Error updating attendance request:', error);
      if (error.response?.data?.message) {
        alert(`Error: ${error.response.data.message}`);
      } else {
        alert('Error updating attendance request. Please try again.');
      }
    }
  };

  const deleteAttendanceRequest = async (requestId) => {
    if (!window.confirm('Are you sure you want to delete this attendance request? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/attendance-requests/${requestId}`);

      setIsRequestModalOpen(false);
      setRequests(requests.filter(req => req.id !== requestId));
      setFilteredRequests(filteredRequests.filter(req => req.id !== requestId));

      if (selectedRequest) {
        const newStats = { ...stats };
        newStats.total -= 1;
        if (selectedRequest.status === 'pending') newStats.pending -= 1;
        else if (selectedRequest.status === 'approved') newStats.approved -= 1;
        else if (selectedRequest.status === 'rejected') newStats.rejected -= 1;
        setStats(newStats);
      }

      setSelectedRequest(null);

    } catch (error) {
      console.error('Error deleting attendance request:', error);
      let errorMessage = 'Failed to delete the attendance request.';
      if (error.response) {
        if (error.response.status === 403) {
          errorMessage = 'You can only delete pending requests or you do not have permission to delete this request.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      alert(errorMessage);
    }
  };

  const openDeleteConfirm = (requestId) => {
    setRequestToDelete(requestId);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDelete = async () => {
    if (!requestToDelete) return;

    try {
      await api.delete(`/attendance-requests/${requestToDelete}`);

      setIsDeleteConfirmOpen(false);
      setIsRequestModalOpen(false);

      setRequests(requests.filter(req => req.id !== requestToDelete));
      setFilteredRequests(filteredRequests.filter(req => req.id !== requestToDelete));

      const deletedRequest = requests.find(req => req.id === requestToDelete);
      if (deletedRequest) {
        const newStats = { ...stats };
        newStats.total -= 1;
        if (deletedRequest.status === 'pending') newStats.pending -= 1;
        else if (deletedRequest.status === 'approved') newStats.approved -= 1;
        else if (deletedRequest.status === 'rejected') newStats.rejected -= 1;
        setStats(newStats);
      }

      setSelectedRequest(null);
      setRequestToDelete(null);

    } catch (error) {
      console.error('Error deleting attendance request:', error);
      let errorMessage = 'Failed to delete the attendance request.';
      if (error.response) {
        if (error.response.status === 403) {
          errorMessage = 'You can only delete pending requests or you do not have permission to delete this request.';
        } else if (error.response.data?.message) {
          errorMessage = error.response.data.message;
        }
      }
      alert(errorMessage);
      setIsDeleteConfirmOpen(false);
      setRequestToDelete(null);
    }
  };

  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await api.get(`/users/${userId}`);
        setUserProfile({
          name: res.data.name || '',
          email: res.data.email || '',
          className: res.data.className || '',
          password: '',
          confirmPassword: ''
        });
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    if (isUserModalOpen) {
      fetchUserProfile();
    }
  }, [isUserModalOpen]);

  const updateUserProfile = async () => {
    try {
      setUpdateError('');
      setUpdateSuccess(false);

      if (userProfile.password && userProfile.password !== userProfile.confirmPassword) {
        setUpdateError('Passwords do not match');
        return;
      }

      const userData = {
        name: userProfile.name,
        email: userProfile.email,
        className: userProfile.className
      };

      if (userProfile.password) {
        userData.password = userProfile.password;
      }

      await api.put(`/users/${userId}`, userData);

      setUpdateSuccess(true);
      setUserProfile({ ...userProfile, password: '', confirmPassword: '' });

      setTimeout(() => setUpdateSuccess(false), 3000);

    } catch (error) {
      console.error('Error updating user profile:', error);
      setUpdateError(error?.response?.data?.message || 'Failed to update profile');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Navbar */}
      <header className="bg-white dark:bg-gray-800 shadow transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Student Dashboard</h1>
          <div className="flex items-center">
          <button
  type="button"
  onClick={toggleTheme}
  className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2"
  aria-label="Toggle theme"
>
  {theme === 'dark' ? <SunIcon className="h-5 w-5" /> : <MoonIcon className="h-5 w-5" />}
</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
    <button type="button" className="cursor-pointer rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500">
      <Avatar>
        <AvatarImage src="/default-avatar.png" />
        <AvatarFallback>
          <User className="h-5 w-5" />
        </AvatarFallback>
      </Avatar>
    </button>
  </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56 bg-white dark:bg-gray-800 border dark:border-gray-700">
              <DropdownMenuLabel className='text-gray-900 dark:text-gray-100'>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setIsUserModalOpen(true)}>
                <Settings className="mr-2 h-4 w-4 text-gray-900 dark:text-gray-100" />
                <span className='text-gray-900 dark:text-gray-100'>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4 text-gray-900 dark:text-gray-100" />
                <span className='text-gray-900 dark:text-gray-100'>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        {/* Stats Section */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-6">
          <Card className="border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200 shadow-sm hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-800 dark:text-gray-200">Total Requests</CardTitle>
            </CardHeader>
            <CardContent className="text-gray-800 dark:text-gray-200">
              <p className="text-2xl font-bold">{stats.total}</p>
            </CardContent>
          </Card>

          <Card className="border dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-yellow-500">{stats.pending}</p>
            </CardContent>
          </Card>

          <Card className="border dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-green-500">{stats.approved}</p>
            </CardContent>
          </Card>

          <Card className="border dark:border-gray-700 bg-white dark:bg-gray-800 transition-colors duration-200">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-red-500">{stats.rejected}</p>
            </CardContent>
          </Card>
        </div>

        {/* Search & Filter Section */}
        <div className="flex flex-col md:flex-row gap-4 mb-6 items-center justify-between">
          <div className="relative w-full md:w-1/3">
            <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
            <Input
              className="pl-10 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Search requests..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex gap-4 w-full md:w-auto">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 bg-white dark:bg-gray-800 border dark:border-gray-700">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent className="bg-white dark:bg-gray-800 border dark:border-gray-700">
                <SelectItem value="all" className='text-gray-900 dark:text-gray-100'>All Status</SelectItem>
                <SelectItem value="pending" className='text-gray-900 dark:text-gray-100'>Pending</SelectItem>
                <SelectItem value="approved" className='text-gray-900 dark:text-gray-100'>Approved</SelectItem>
                <SelectItem value="rejected" className='text-gray-900 dark:text-gray-100'>Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Button
              className="bg-blue-600 hover:bg-blue-700 text-white dark:bg-blue-700 dark:hover:bg-blue-800"
              onClick={() => {
                setIsCreateModalOpen(true);
                fetchAvailableSubjects();
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              New Request
            </Button>
          </div>
        </div>

        {/* Requests List */}
        {loading ? (
          <div className="flex justify-center items-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : error ? (
          <div className="text-center py-10 text-red-500">{error}</div>
        ) : !Array.isArray(filteredRequests) || filteredRequests.length === 0 ? (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            No attendance requests found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredRequests.map((request) => (
              <Card
                key={request.id}
                className="cursor-pointer border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-750 shadow-sm hover:shadow-md transition-all duration-200"
                onClick={() => openRequestModal(request)}
              >
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg font-medium">{request.name}</CardTitle>
                    <Badge variant="default">
                      {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                    </Badge>
                  </div>
                  <CardDescription>
                    {new Date(request.createdAt).toLocaleDateString()}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-sm">
                    <div className="font-medium mb-1 text-gray-800 dark:text-gray-200">Subjects:</div>
                    <div className="space-y-1">
                      {(request.subjectDates || []).slice(0, 2).map((sd) => (
                        <div key={sd.subjectId?.id} className="text-gray-600 dark:text-gray-400">
                          {sd.subjectId?.name} ({sd.subjectId?.day}, {sd.subjectId?.startTime}-{sd.subjectId?.endTime})
                        </div>
                      ))}
                      {(request.subjectDates || []).length > 2 && (
                        <div className="text-gray-600 dark:text-gray-400">
                          + {request.subjectDates.length - 2} more
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-1">
                    {request.reason}
                  </p>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* User Settings Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-50">User Settings</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300">
              Update your profile settings and preferences.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Name</label>
                <Input
                  type="text"
                  value={userProfile.name}
                  onChange={(e) => setUserProfile({...userProfile, name: e.target.value})}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Email</label>
                <Input
                  type="email"
                  value={userProfile.email}
                  onChange={(e) => setUserProfile({...userProfile, email: e.target.value})}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Class</label>
                <Input
                  type="text"
                  value={userProfile.className}
                  onChange={(e) => setUserProfile({...userProfile, className: e.target.value})}
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">New Password</label>
                <Input
                  type="password"
                  value={userProfile.password}
                  onChange={(e) => setUserProfile({...userProfile, password: e.target.value})}
                  placeholder="Leave blank to keep current password"
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Confirm Password</label>
                <Input
                  type="password"
                  value={userProfile.confirmPassword}
                  onChange={(e) => setUserProfile({...userProfile, confirmPassword: e.target.value})}
                  placeholder="Confirm new password"
                  className="bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {updateSuccess && (
              <div className="bg-green-100 dark:bg-green-900/30 border border-green-400 dark:border-green-800 text-green-700 dark:text-green-300 px-4 py-2 rounded-md">
                Profile updated successfully!
              </div>
            )}

            {updateError && (
              <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-2 rounded-md">
                {updateError}
              </div>
            )}

            <div className="flex justify-end items-center pt-2">
              <Button
                variant="default"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={updateUserProfile}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Request Detail Modal */}
      <Dialog open={isRequestModalOpen} onOpenChange={setIsRequestModalOpen}>
        <DialogContent className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200">
          {selectedRequest && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle>{selectedRequest.name}</DialogTitle>
                  <Badge
                    variant={
                      selectedRequest.status === 'approved' ? 'default' :
                      selectedRequest.status === 'rejected' ? 'destructive' : 'outline'
                    }
                  >
                    {selectedRequest.status.charAt(0).toUpperCase() + selectedRequest.status.slice(1)}
                  </Badge>
                </div>
                <DialogDescription>
                  Created on {new Date(selectedRequest.createdAt).toLocaleDateString()}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm mb-1 text-gray-800 dark:text-gray-200">Reason</h4>
                  <p>{selectedRequest.reason}</p>
                </div>

                {selectedRequest.status !== 'pending' && (
                  <div>
                    <h4 className="font-medium text-sm mb-1 text-gray-800 dark:text-gray-200">
                      {selectedRequest.status === 'approved' ? 'Approval' : 'Rejection'} Remarks
                    </h4>
                    <p className="p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md">
                      {selectedRequest.feedbackNote || 'No feedback provided'}
                    </p>
                  </div>
                )}

                {selectedRequest.proof && (
                  <div>
                    <h4 className="font-medium text-sm mb-1">Supporting Document</h4>
                    
                    <a href={selectedRequest.proof}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-500 hover:underline"
                    >
                      View Document
                    </a>
                  </div>
                )}

                <div>
                  <h4 className="font-medium text-sm mb-1">Subjects</h4>
                  <div className="space-y-2">
                    {(selectedRequest.subjectDates || []).map((sd) => (
                      <div
                        key={sd.subjectId?.id}
                        className="p-3 bg-gray-50 dark:bg-gray-700 border dark:border-gray-600 rounded-md"
                      >
                        <div className="font-medium text-gray-900 dark:text-gray-50">{sd.subjectId?.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">
                          {sd.subjectId?.day}, {sd.subjectId?.startTime}-{sd.subjectId?.endTime}, Class: {sd.subjectId?.className}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div>
  <h4 className="font-medium text-sm mb-1">Students</h4>
  <div className="flex flex-wrap gap-2">
    {selectedRequest.student && (
      <span className={`px-3 py-1 rounded-full text-sm ${
        selectedRequest.student.id === userId
          ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
          : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
      }`}>
        {selectedRequest.student.name}{selectedRequest.student.id === userId ? ' (You)' : ''}
      </span>
    )}
    {(selectedRequest.students || []).map(s => (
      <span
        key={s.id}
        className={`px-3 py-1 rounded-full text-sm ${
          s.id === userId
            ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200'
            : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
        }`}
      >
        {s.name}{s.id === userId ? ' (You)' : ''}
      </span>
    ))}
  </div>
</div>
              {isOwner(selectedRequest) ? (
  <>
    <Button
      variant="outline"
      className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
      onClick={() => {
        if (selectedRequest) {
          openEditModal(selectedRequest);
        }
      }}
      disabled={selectedRequest && selectedRequest.status !== 'pending'}
    >
      Edit Request
    </Button>
    <Button
                  variant="destructive"
                  className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
                  onClick={() => {
                    if (selectedRequest) {
                      openDeleteConfirm(selectedRequest.id);
                    }
                  }}
                  disabled={selectedRequest && selectedRequest.status !== 'pending'}
                >
                  Delete Request
                </Button>
  </>
) : (
  <p className="text-sm text-gray-500 dark:text-gray-400">
    You were included in this request by {selectedRequest.student?.name || 'another student'}. Only they can edit or delete it.
  </p>
)}
</>
          )}
        </DialogContent>
      </Dialog>

      {/* Create Request Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">Create Attendance Request</h2>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Name*</label>
                  <input
                    type="text"
                    value={createRequestForm.name}
                    onChange={(e) => setCreateRequestForm({...createRequestForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g. Medical Leave"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Request*</label>
                  <textarea
                    value={createRequestForm.reason}
                    onChange={(e) => setCreateRequestForm({...createRequestForm, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-24"
                    placeholder="Describe your reason..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date for Absence*</label>
                <div className="flex items-center mb-2">
                  <div className="flex items-center mr-4">
                    <input
                      type="checkbox"
                      id="dateRange"
                      checked={isDateRange}
                      onChange={(e) => {
                        setIsDateRange(e.target.checked);
                        if (!e.target.checked) {
                          setEndDate(null);
                        } else if (!endDate) {
                          const nextDay = new Date(requestDate);
                          nextDay.setDate(nextDay.getDate() + 1);
                          setEndDate(nextDay <= maxDate ? nextDay : maxDate);
                        }
                      }}
                      className="h-4 w-4 mr-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="dateRange" className="text-sm text-gray-700 dark:text-gray-300">
                      Select date range
                    </label>
                  </div>
                </div>

                <div className={`${isDateRange ? 'grid grid-cols-2 gap-4' : ''}`}>
                  <div className="relative">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {isDateRange ? 'Start Date' : 'Date'}
                    </label>
                    <DatePicker
                      selected={requestDate}
                      onChange={(date) => setRequestDate(date)}
                      minDate={minDate}
                      maxDate={maxDate}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholderText="Select date"
                      dateFormat="MMMM d, yyyy"
                      highlightDates={[requestDate]}
                      required
                    />
                    {!isDateWithinRange(requestDate) && (
                      <p className="text-xs text-red-500 mt-1">Date must be within the allowed range</p>
                    )}
                  </div>

                  {isDateRange && (
                    <div className="relative">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        minDate={requestDate}
                        maxDate={maxDate}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholderText="Select end date"
                        dateFormat="MMMM d, yyyy"
                        highlightDates={[endDate]}
                        required={isDateRange}
                      />
                      {endDate && !isDateRangeValid() && (
                        <p className="text-xs text-red-500 mt-1">
                          End date must be within the allowed range and after start date
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You can request attendance for today up to 7 days from now
                  {isDateRange && ". Select a range for consecutive days."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supporting Document</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  {!proofFile ? (
                    <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Click to upload a PDF or image</p>
                      <p className="text-xs text-gray-500 dark:text-gray-500">PDF, PNG, JPG up to 5MB</p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded flex items-center">
                        <Check className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm text-gray-800 dark:text-gray-200">{proofFile.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProofFile(null);
                          }}
                          className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Subjects*</label>
                  <button
                    onClick={() => setCalendarView(!calendarView)}
                    className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    {calendarView ? "List View" : "Calendar View"}
                  </button>
                </div>

                {calendarView ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
                      <div className="grid grid-cols-6 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                          <div key={day} className="text-center font-medium text-sm text-gray-700 dark:text-gray-300">
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-6 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                          const filteredSubjects = getFilteredSubjects(
                            availableSubjects.filter(subject => subject.day === day),
                            requestDate,
                            isDateRange ? endDate : null
                          );

                          return (
                            <div key={day} className="min-h-[200px] border border-gray-200 dark:border-gray-700 rounded p-2">
                              {filteredSubjects.map(subject => {
                                const isSelected = selectedSubjects.some(s => s.id === subject.id);
                                return (
                                  <div
                                    key={subject.id}
                                    onClick={() => toggleSubjectSelection(subject)}
                                    className={`mb-2 p-2 rounded text-xs cursor-pointer transition-colors
                                      ${isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                  >
                                    <div className="font-medium">{subject.name}</div>
                                    <div className="text-xs opacity-90">{subject.startTime} - {subject.endTime}</div>
                                  </div>
                                );
                              })}
                              {filteredSubjects.length === 0 && (
                                <div className="text-center text-gray-500 dark:text-gray-400 text-xs py-4">No lectures</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    {(() => {
                      const filteredSubjects = getFilteredSubjects(availableSubjects, requestDate, isDateRange ? endDate : null);
                      return filteredSubjects.length > 0 ? (
                        filteredSubjects.map(subject => {
                          const isSelected = selectedSubjects.some(s => s.id === subject.id);
                          return (
                            <div
                              key={subject.id}
                              onClick={() => toggleSubjectSelection(subject)}
                              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors
                                ${isSelected
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                              <div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{subject.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {subject.day}, {subject.startTime} - {subject.endTime}
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded-full border flex items-center justify-center
                                ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No lectures available for selected date(s)
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Other Students (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      searchStudents(e.target.value);
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Search students by name or SAP ID"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                    <ul className="max-h-40 overflow-y-auto">
                      {searchResults.map(student => (
                        <li
                          key={student.id}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between"
                          onClick={() => toggleStudentSelection(student)}
                        >
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">{student.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{student.sap} - {student.className || 'No class'}</div>
                          </div>
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center
                            ${selectedStudents.some(s => s.id === student.id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300 dark:border-gray-600'}`}
                          >
                            {selectedStudents.some(s => s.id === student.id) && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedStudents.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Selected Students</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudents.map(student => (
                        <div
                          key={student.id}
                          className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center"
                        >
                          {student.name}
                          <button
                            onClick={() => toggleStudentSelection(student)}
                            className="ml-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={createAttendanceRequest}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition
                    ${(!createRequestForm.name || !createRequestForm.reason || selectedSubjects.length === 0)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''}`}
                  disabled={submitting||!createRequestForm.name || !createRequestForm.reason || selectedSubjects.length === 0}
                >
                  {submitting ? 'Submitting...' : 'Create Request'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Request Modal */}
      {isEditModalOpen && editingRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm border border-gray-200 dark:border-gray-700 transition-all duration-200 rounded-lg shadow-lg p-4 sm:p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-50">Edit Attendance Request</h2>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Request Name*</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="e.g. Medical Leave"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Reason for Request*</label>
                  <textarea
                    value={editForm.reason}
                    onChange={(e) => setEditForm({...editForm, reason: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 h-24"
                    placeholder="Describe your reason..."
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Date for Absence*</label>
                <div className="flex items-center mb-2">
                  <div className="flex items-center mr-4">
                    <input
                      type="checkbox"
                      id="dateRangeEdit"
                      checked={isDateRange}
                      onChange={(e) => {
                        setIsDateRange(e.target.checked);
                        if (!e.target.checked) {
                          setEndDate(null);
                        } else if (!endDate) {
                          const nextDay = new Date(requestDate);
                          nextDay.setDate(nextDay.getDate() + 1);
                          setEndDate(nextDay <= maxDate ? nextDay : maxDate);
                        }
                      }}
                      className="h-4 w-4 mr-2 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <label htmlFor="dateRangeEdit" className="text-sm text-gray-700 dark:text-gray-300">
                      Select date range
                    </label>
                  </div>
                </div>

                <div className={`${isDateRange ? 'grid grid-cols-2 gap-4' : ''}`}>
                  <div className="relative">
                    <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">
                      {isDateRange ? 'Start Date' : 'Date'}
                    </label>
                    <DatePicker
                      selected={requestDate}
                      onChange={(date) => setRequestDate(date)}
                      minDate={minDate}
                      maxDate={maxDate}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                      placeholderText="Select date"
                      dateFormat="MMMM d, yyyy"
                      highlightDates={[requestDate]}
                      required
                    />
                    {!isDateWithinRange(requestDate) && (
                      <p className="text-xs text-red-500 mt-1">Date must be within the allowed range</p>
                    )}
                  </div>

                  {isDateRange && (
                    <div className="relative">
                      <label className="block text-xs text-gray-600 dark:text-gray-400 mb-1">End Date</label>
                      <DatePicker
                        selected={endDate}
                        onChange={(date) => setEndDate(date)}
                        minDate={requestDate}
                        maxDate={maxDate}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                        placeholderText="Select end date"
                        dateFormat="MMMM d, yyyy"
                        highlightDates={[endDate]}
                        required={isDateRange}
                      />
                      {endDate && !isDateRangeValid() && (
                        <p className="text-xs text-red-500 mt-1">
                          End date must be within the allowed range and after start date
                        </p>
                      )}
                    </div>
                  )}
                </div>

                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You can request attendance for today up to 7 days from now
                  {isDateRange && ". Select a range for consecutive days."}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Supporting Document</label>
                <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept="image/*,application/pdf"
                    className="hidden"
                  />
                  {!proofFile ? (
                    <div onClick={() => fileInputRef.current?.click()} className="cursor-pointer">
                      {editingRequest.proof ? (
                        <div className="flex flex-col items-center">
                          <Check className="h-12 w-12 text-green-500" />
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                            Document already uploaded. Click to replace.
                          </p>
                          
                          <a href={editingRequest.proof}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="mt-1 text-blue-500 hover:underline text-sm"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View current document
                          </a>
                        </div>
                      ) : (
                        <>
                          <Upload className="mx-auto h-12 w-12 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Click to upload a PDF or image</p>
                          <p className="text-xs text-gray-500 dark:text-gray-500">PDF, PNG, JPG up to 5MB</p>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <div className="bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded flex items-center">
                        <Check className="h-5 w-5 text-blue-500 mr-2" />
                        <span className="text-sm text-gray-800 dark:text-gray-200">{proofFile.name}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setProofFile(null);
                          }}
                          className="ml-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Select Subjects*</label>
                  <button
                    onClick={() => setCalendarView(!calendarView)}
                    className="text-sm text-blue-600 dark:text-blue-400 flex items-center"
                  >
                    <Calendar className="h-4 w-4 mr-1" />
                    {calendarView ? "List View" : "Calendar View"}
                  </button>
                </div>

                {calendarView ? (
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                    <div className="bg-gray-100 dark:bg-gray-700 px-4 py-3 border-b border-gray-300 dark:border-gray-600">
                      <div className="grid grid-cols-6 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => (
                          <div key={day} className="text-center font-medium text-sm text-gray-700 dark:text-gray-300">
                            {day}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="p-4">
                      <div className="grid grid-cols-6 gap-2">
                        {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((day) => {
                          const filteredSubjects = getFilteredSubjects(
                            availableSubjects.filter(subject => subject.day === day),
                            requestDate,
                            isDateRange ? endDate : null
                          );

                          return (
                            <div key={day} className="min-h-[200px] border border-gray-200 dark:border-gray-700 rounded p-2">
                              {filteredSubjects.map(subject => {
                                const isSelected = selectedSubjects.some(s => s.id === subject.id);
                                return (
                                  <div
                                    key={subject.id}
                                    onClick={() => toggleSubjectSelection(subject)}
                                    className={`mb-2 p-2 rounded text-xs cursor-pointer transition-colors
                                      ${isSelected
                                        ? 'bg-blue-500 text-white'
                                        : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'}`}
                                  >
                                    <div className="font-medium">{subject.name}</div>
                                    <div className="text-xs opacity-90">{subject.startTime} - {subject.endTime}</div>
                                  </div>
                                );
                              })}
                              {filteredSubjects.length === 0 && (
                                <div className="text-center text-gray-500 dark:text-gray-400 text-xs py-4">No lectures</div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2">
                    {(() => {
                      const filteredSubjects = getFilteredSubjects(availableSubjects, requestDate, isDateRange ? endDate : null);
                      return filteredSubjects.length > 0 ? (
                        filteredSubjects.map(subject => {
                          const isSelected = selectedSubjects.some(s => s.id === subject.id);
                          return (
                            <div
                              key={subject.id}
                              onClick={() => toggleSubjectSelection(subject)}
                              className={`flex items-center justify-between p-2 rounded cursor-pointer transition-colors
                                ${isSelected
                                  ? 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-800'
                                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}
                            >
                              <div>
                                <div className="font-medium text-gray-800 dark:text-gray-200">{subject.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {subject.day}, {subject.startTime} - {subject.endTime}
                                </div>
                              </div>
                              <div className={`h-5 w-5 rounded-full border flex items-center justify-center
                                ${isSelected ? 'bg-blue-500 border-blue-500' : 'border-gray-300 dark:border-gray-600'}`}>
                                {isSelected && <Check className="h-3 w-3 text-white" />}
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                          No lectures available for selected date(s)
                        </div>
                      );
                    })()}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Add Other Students (Optional)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <SearchIcon className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => {
                      setSearchTerm(e.target.value);
                      searchStudents(e.target.value);
                    }}
                    className="block w-full pl-10 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    placeholder="Search students by name or SAP ID"
                  />
                </div>

                {searchResults.length > 0 && (
                  <div className="mt-2 border border-gray-300 dark:border-gray-600 rounded-md overflow-hidden">
                    <ul className="max-h-40 overflow-y-auto">
                      {searchResults.map(student => (
                        <li
                          key={student.id}
                          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 cursor-pointer flex justify-between"
                          onClick={() => toggleStudentSelection(student)}
                        >
                          <div>
                            <div className="font-medium text-gray-800 dark:text-gray-200">{student.name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{student.sap} - {student.className || 'No class'}</div>
                          </div>
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center
                            ${selectedStudents.some(s => s.id === student.id)
                              ? 'bg-blue-500 border-blue-500'
                              : 'border-gray-300 dark:border-gray-600'}`}
                          >
                            {selectedStudents.some(s => s.id === student.id) && <Check className="h-3 w-3 text-white" />}
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedStudents.length > 0 && (
                  <div className="mt-2 space-y-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Selected Students</label>
                    <div className="flex flex-wrap gap-2">
                      {selectedStudents.map(student => (
                        <div
                          key={student.id}
                          className="bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 px-3 py-1 rounded-full text-sm flex items-center"
                        >
                          {student.name}
                          <button
                            onClick={() => toggleStudentSelection(student)}
                            className="ml-1 text-blue-500 hover:text-blue-700 dark:hover:text-blue-300"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-2">
                <button
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition"
                >
                  Cancel
                </button>
                <button
                  onClick={updateAttendanceRequest}
                  className={`px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition
                    ${(!editForm.name || !editForm.reason || selectedSubjects.length === 0)
                      ? 'opacity-50 cursor-not-allowed'
                      : ''}`}
                  disabled={!editForm.name || !editForm.reason || selectedSubjects.length === 0}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteConfirmOpen} onOpenChange={setIsDeleteConfirmOpen}>
        <DialogContent className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-lg max-w-md mx-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold text-gray-900 dark:text-gray-100">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-gray-600 dark:text-gray-300 mt-2">
              Are you sure you want to delete this attendance request? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDeleteConfirmOpen(false)}
              className="border-gray-300 text-gray-700 hover:bg-gray-100 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-white dark:bg-red-600 dark:hover:bg-red-700"
            >
              Delete Request
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
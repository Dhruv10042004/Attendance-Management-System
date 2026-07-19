import { useState, useEffect, useRef } from 'react';
import api from '../lib/api';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import { format, isToday, addDays, isAfter, isBefore, isEqual } from 'date-fns';
import { Loader2, User, LogOut, Settings, SunIcon, MoonIcon, Calendar, Filter } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '../components/ui/avatar';
import { Button } from '../components/ui/button';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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
import { Badge } from '../components/ui/badge';
import { Table, TableHeader, TableHead, TableBody, TableRow, TableCell } from '../components/ui/table';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

// Temporary teacher ID - will be replaced with auth context in production

export default function TeacherDashboard() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();

const navigate = useNavigate();
const teacherId = user?.id;
  const [absences, setAbsences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(addDays(new Date(), 7));
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: '',
    email: '',
    className: '',
    password: '',
    confirmPassword: ''
  });
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [updateError, setUpdateError] = useState('');
  
  // Fetch teacher's notifications for the selected date range
  const fetchAbsencesByDateRange = async () => {
    try {
      setLoading(true);
      // Use explicit date range in the API call
      const formattedStartDate = format(startDate, 'yyyy-MM-dd');
      const formattedEndDate = format(endDate, 'yyyy-MM-dd');
      
      const res = await api.get(
        `/notifications/teacher/${teacherId}?startDate=${formattedStartDate}&endDate=${formattedEndDate}`
      );
      
      console.log('API Response:', res.data);
      
      // Ensure res.data is an array
      const responseData = Array.isArray(res.data) ? res.data : [];
      
      // Filter notifications that have valid structure
      const validNotifications = responseData.filter(notification => {
  return notification &&
         notification.attendanceRequestId &&
         notification.subject &&
         Array.isArray(notification.students) &&
         notification.date;
});

const absencesMap = new Map();

validNotifications.forEach(notification => {
  const subjectId = notification.subject.id;
  const notificationDate = new Date(notification.date);
  const dateStr = format(notificationDate, 'yyyy-MM-dd');
  const key = `${subjectId}-${dateStr}`;

  if (!absencesMap.has(key)) {
    absencesMap.set(key, {
      subject: notification.subject,
      date: notificationDate,
      students: [],
      absenceReasons: new Map()
    });
  }

  const subjectData = absencesMap.get(key);

  notification.students.forEach(student => {
    if (!subjectData.students.some(s => s.id === student.id)) {
      subjectData.students.push(student);
    }
    subjectData.absenceReasons.set(student.id, notification.reason);
  });
});
      
      // Convert map to array and sort by date, then subject name
      const sortedAbsences = Array.from(absencesMap.values()).sort((a, b) => {
        // First sort by date
        const dateCompare = a.date.getTime() - b.date.getTime();
        if (dateCompare !== 0) return dateCompare;
        
        // Then by subject name
        return a.subject.name.localeCompare(b.subject.name);
      });
      
      setAbsences(sortedAbsences);
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error?.response?.data?.message || 'Error fetching absences');
    } finally {
      setLoading(false);
    }
  };

  // Load absences when component mounts or date range changes
  useEffect(() => {
    fetchAbsencesByDateRange();
  }, [startDate, endDate]);

  // Handle date range changes
  const handleDateRangeChange = () => {
    fetchAbsencesByDateRange();
  };

  // Handle logout
  const handleLogout = () => {
      logout();
    navigate('/login', { replace: true });
  };

  // Format time for better readability
  const formatTime = (timeString) => {
    // Convert 24-hour format to 12-hour format with AM/PM
    const [hours, minutes] = timeString.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const hours12 = hours % 12 || 12;
    return `${hours12}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  // Update user profile
  const updateUserProfile = async () => {
    try {
      setUpdateError('');
      setUpdateSuccess(false);
      
      // Validate password fields if provided
      if (userProfile.password && userProfile.password !== userProfile.confirmPassword) {
        setUpdateError('Passwords do not match');
        return;
      }
      
      const userData = {
        name: userProfile.name,
        email: userProfile.email,
        className: userProfile.className
      };
      
      // Only include password if it was changed
      if (userProfile.password) {
        userData.password = userProfile.password;
      }
      
      await api.put(`/users/${teacherId}`, userData);
      
      setUpdateSuccess(true);
      
      // Reset password fields
      setUserProfile({
        ...userProfile,
        password: '',
        confirmPassword: ''
      });
      
      setTimeout(() => {
        setUpdateSuccess(false);
      }, 3000);
      
    } catch (error) {
      console.error('Error updating user profile:', error);
      setUpdateError(error?.response?.data?.message || 'Failed to update profile');
    }
  };

  // Fetch user profile when modal opens
  useEffect(() => {
    const fetchUserProfile = async () => {
      try {
        const res = await api.get(`/users/${teacherId}`);
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
      {/* Navbar */}
      <header className="bg-white dark:bg-gray-800 shadow transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex justify-between items-center">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
          <div className="flex items-center">
    <button type="button" onClick={toggleTheme} className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2" aria-label="Toggle theme">
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
                <Settings className="mr-2 h-4 w-4 text-gray-900 dark:text-gray-100 " />
                <span className='text-gray-900 dark:text-gray-100'>Settings</span>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              {/* <DropdownMenuItem onClick={toggleTheme}>
                {theme === 'dark' ? (
                  <>
                    <SunIcon className="mr-2 h-4 w-4 text-gray-900 dark:text-gray-100 " />
                    <span className='text-gray-900 dark:text-gray-100'>Light Mode</span>
                  </>
                ) : (
                  <>
                    <MoonIcon className="mr-2 h-4 w-4 text-gray-900 dark:text-gray-100 " />
                    <span className='text-gray-900 dark:text-gray-100'>Dark Mode</span>
                  </>
                )}
              </DropdownMenuItem> */}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="mr-2 h-4 w-4 text-gray-900 dark:text-gray-100 " />
                <span className='text-gray-900 dark:text-gray-100'>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Date Filter */}
        <div className="mb-8 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm">
          <h2 className="text-xl font-semibold mb-4">Filter by Date Range</h2>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Start Date</label>
              <DatePicker
                selected={startDate}
                onChange={(date) => setStartDate(date instanceof Date ? date : new Date())}
                selectsStart
                startDate={startDate}
                endDate={endDate}
                className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">End Date</label>
              <DatePicker
                selected={endDate}
                onChange={(date) => setEndDate(date instanceof Date ? date : addDays(new Date(), 7))}
                selectsEnd
                startDate={startDate}
                endDate={endDate}
                minDate={startDate}
                className="w-full p-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md"
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleDateRangeChange}
                className="w-full sm:w-auto"
                disabled={loading}
              >
                {loading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Filter className="h-4 w-4 mr-2" />}
                Apply Filter
              </Button>
            </div>
          </div>
        </div>

        {/* Absences List */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Student Absences</h2>
          
          {error && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
              {error}
            </div>
          )}
          
          {loading ? (
            <div className="flex justify-center items-center h-32">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : absences.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-6 text-center">
              <p>No student absences found for the selected date range.</p>
            </div>
          ) : (
            // Group absences by date
            Object.entries(
              absences.reduce((acc, absence) => {
                const dateStr = format(absence.date, 'yyyy-MM-dd');
                if (!acc[dateStr]) acc[dateStr] = [];
                acc[dateStr].push(absence);
                return acc;
              }, {})
            ).map(([dateStr, dateAbsences]) => (
              <div key={dateStr} className="mb-8">
                <h3 className="text-xl font-semibold mb-4">
                  {format(new Date(dateStr), 'EEEE, MMMM d, yyyy')}
                  {isToday(new Date(dateStr)) && (
                    <Badge className="ml-2 bg-primary">Today</Badge>
                  )}
                </h3>
                
                {dateAbsences.map((absence, index) => (
                  <Card key={`${absence.subject.id}-${index}`} className="mb-4 bg-white dark:bg-gray-800 overflow-hidden">
  <CardHeader className="bg-gray-100 dark:bg-gray-700 py-2">
    <CardTitle className="text-lg">
      {absence.subject.name} ({absence.subject.className}) - {formatTime(absence.subject.startTime)} to {formatTime(absence.subject.endTime)}
    </CardTitle>
  </CardHeader>
  <CardContent className="p-0">
    <Table>
      <TableHeader>
        <TableRow className="bg-gray-50 dark:bg-gray-750">
          <TableHead>SAP ID</TableHead>
          <TableHead>Name</TableHead>
          <TableHead>Class</TableHead>
          <TableHead>Reason</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {absence.students.map((student) => (
          <TableRow key={student.id} className="hover:bg-gray-100 dark:hover:bg-gray-700">
            <TableCell className="font-medium">{student.sap}</TableCell>
            <TableCell>{student.name}</TableCell>
            <TableCell>{student.className}</TableCell>
            <TableCell>{absence.absenceReasons.get(student.id) || 'No reason provided'}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </CardContent>
</Card>
                ))}
              </div>
            ))
          )}
        </div>
      </main>

      {/* User Settings Modal */}
      <Dialog open={isUserModalOpen} onOpenChange={setIsUserModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
          <DialogHeader>
            <DialogTitle>Edit Profile</DialogTitle>
            <DialogDescription>
              Update your personal information and password.
            </DialogDescription>
          </DialogHeader>
          
          {updateSuccess && (
            <div className="bg-green-100 dark:bg-green-900 border border-green-400 text-green-700 dark:text-green-200 px-4 py-3 rounded mb-4">
              Profile updated successfully!
            </div>
          )}
          
          {updateError && (
            <div className="bg-red-100 dark:bg-red-900 border border-red-400 text-red-700 dark:text-red-200 px-4 py-3 rounded mb-4">
              {updateError}
            </div>
          )}
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <label htmlFor="name" className="text-sm font-medium">
                Name
              </label>
              <Input
                id="name"
                value={userProfile.name}
                onChange={(e) => setUserProfile({ ...userProfile, name: e.target.value })}
                className="bg-white dark:bg-gray-700"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={userProfile.email}
                onChange={(e) => setUserProfile({ ...userProfile, email: e.target.value })}
                className="bg-white dark:bg-gray-700"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="className" className="text-sm font-medium">
                Class
              </label>
              <Input
                id="className"
                value={userProfile.className}
                onChange={(e) => setUserProfile({ ...userProfile, className: e.target.value })}
                className="bg-white dark:bg-gray-700"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="password" className="text-sm font-medium">
                New Password (leave blank to keep current)
              </label>
              <Input
                id="password"
                type="password"
                value={userProfile.password}
                onChange={(e) => setUserProfile({ ...userProfile, password: e.target.value })}
                className="bg-white dark:bg-gray-700"
              />
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="confirmPassword" className="text-sm font-medium">
                Confirm New Password
              </label>
              <Input
                id="confirmPassword"
                type="password"
                value={userProfile.confirmPassword}
                onChange={(e) => setUserProfile({ ...userProfile, confirmPassword: e.target.value })}
                className="bg-white dark:bg-gray-700"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setIsUserModalOpen(false)}
              className="border-gray-300 dark:border-gray-600"
            >
              Cancel
            </Button>
            <Button onClick={updateUserProfile}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

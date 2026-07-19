import { useState, useEffect,useRef } from 'react';
import { Search, Plus, Download, Upload, Edit, Trash2, Filter, X, Check } from 'lucide-react';
import _ from 'lodash';
import { useTheme } from '../context/ThemeContext';
import { useForm, Controller } from 'react-hook-form';
import api from '../lib/api';

// Mock data for demonstration
const mockUsers = [
  { id: 1, sap: 'SAP001', name: 'John Doe', email: 'john.doe@example.com', password: 'hashed_password', isFirstLogin: true, className: '10A', role: 'student' },
  { id: 2, sap: 'SAP002', name: 'Jane Smith', email: 'jane.smith@example.com', password: 'hashed_password', isFirstLogin: false, className: '10A', role: 'student' },
  { id: 3, sap: 'SAP003', name: 'Robert Johnson', email: 'robert.johnson@example.com', password: 'hashed_password', isFirstLogin: false, className: '10B', role: 'student' },
  { id: 4, sap: 'SAP004', name: 'Emily Davis', email: 'emily.davis@example.com', password: 'hashed_password', isFirstLogin: false, className: '', role: 'teacher' },
  { id: 5, sap: 'SAP005', name: 'Michael Wilson', email: 'michael.wilson@example.com', password: 'hashed_password', isFirstLogin: true, className: '', role: 'teacher' },
  { id: 6, sap: 'SAP006', name: 'Sarah Brown', email: 'sarah.brown@example.com', password: 'hashed_password', isFirstLogin: false, className: '', role: 'hod' },
  { id: 7, sap: 'SAP007', name: 'David Miller', email: 'david.miller@example.com', password: 'hashed_password', isFirstLogin: false, className: '', role: 'admin' },
];

const UserManagement = () => {
  const { theme } = useTheme();
  const bulkFileInputRef = useRef(null);
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [bulkFileSelected, setBulkFileSelected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [bulkFile, setBulkFile] = useState(null);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  const [selectedRoleToDelete, setSelectedRoleToDelete] = useState('');

  // Count users by role
  const userCounts = {
    total: users.length,
    student: users.filter(user => user.role === 'student').length,
    teacher: users.filter(user => user.role === 'teacher').length,
    hod: users.filter(user => user.role === 'hod').length,
    admin: users.filter(user => user.role === 'admin').length,
  };

  // Add a useEffect to fetch users when component mounts:
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        setLoading(true);
        const response = await api.get('/users');
        setUsers(response.data);
        setFilteredUsers(response.data);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

  // Update the filtering useEffect:
  useEffect(() => {
    const searchUsers = async () => {
      try {
        setLoading(true);
        // If there's no search term and role is "all", fetch all users
        if (!searchTerm && selectedRole === 'all') {
          const response = await api.get('/users');
          setFilteredUsers(response.data);
        } else {
          // Otherwise, use the search endpoint
          const response = await api.get('/users/search', {
            params: {
              query: searchTerm,
              role: selectedRole
            }
          });
          setFilteredUsers(response.data);
        }
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };

    // Debounce search requests
    const debounceTimer = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchTerm, selectedRole]);

  // Handle add user
  const handleAddUser = async (data) => {
    try {
      // Log the data being sent to the API
      console.log('Sending data to API:', data);
      
      // Ensure all required fields are present
      if (!data.name || !data.email || !data.password || !data.role) {
        setError('All required fields must be filled in.');
        return;
      }
      
      setLoading(true);
      const response = await api.post('/users', data);
      console.log('API Response:', response.data);
      
      setUsers([...users, response.data]);
      setFilteredUsers([...filteredUsers, response.data]);
      setIsAddModalOpen(false);
      setLoading(false);
    } catch (err) {
      console.error('Error creating user:', err.response?.data || err);
      setError(err.response?.data?.message || err.message);
      setLoading(false);
    }
  };

  // Handle update user
  const handleUpdateUser = async (data) => {
  try {
    setLoading(true);
    const response = await api.put(`/users/${currentUser.id}`, data);
    const updatedUsers = users.map(user => 
      user.id === currentUser.id ? response.data : user
    );
    setUsers(updatedUsers);
    setFilteredUsers(updatedUsers.filter(user => {
      const matchesSearch = 
        !searchTerm ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.sap.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      return matchesSearch && matchesRole;
    }));
    setIsEditModalOpen(false);
    setLoading(false);
  } catch (err) {
    setError(err.response?.data?.message || err.message);
    setLoading(false);
  }
  };

  // Handle delete user
  const handleDeleteUser = async () => {
  try {
    setLoading(true);
    await api.delete(`/users/${currentUser.id}`);
    const updatedUsers = users.filter(user => user.id !== currentUser.id);
    setUsers(updatedUsers);
    setFilteredUsers(updatedUsers.filter(user => {
      const matchesSearch = 
        !searchTerm ||
        user.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.sap.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'all' || user.role === selectedRole;
      return matchesSearch && matchesRole;
    }));
    setIsDeleteModalOpen(false);
    setLoading(false);
  } catch (err) {
    setError(err.response?.data?.message || err.message);
    setLoading(false);
  }
  };

  // Handle bulk add
  const handleBulkAdd = async () => {
    if (!bulkFile) {
      setError("Please select a CSV file first");
      return;
    }

    try {
      setLoading(true);
      
      // Create form data to send the file
      const formData = new FormData();
      formData.append('file', bulkFile);
      
      // Send the file directly to the new endpoint
      const response = await api.post('/users/bulk/csv', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      // Show success message
      setError(null);
      
      // Refresh the user list
      const updatedResponse = await api.get('/users');
      const refreshedUsers =  updatedResponse.data;
      setUsers(refreshedUsers);
      setFilteredUsers(refreshedUsers);
      
      // Reset state
      setBulkFile(null);
      setBulkFileSelected(false);
      setIsBulkAddModalOpen(false);
      setLoading(false);
      
      // You might want to show a success notification here
      alert(`Successfully imported ${response.data.created.length} users. ${response.data.skipped.length} users were skipped.`);
    } catch (err) {
      const errorMessage = err.response?.data?.message || err.message;
      setError(`Error importing users: ${errorMessage}`);
      setLoading(false);
    }
  };

  // Generate sample CSV for bulk upload
  const generateSampleCSV = () => {
  const csvContent = 'sap,name,email,password,isFirstLogin,className,role,department\nSAP123,John Doe,john@example.com,password123,true,10A,student,Computer Science\nSAP124,Jane Smith,jane@example.com,password123,true,10A,student,Computer Science';
  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample_users.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

  // Modal component
  const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className={`${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'} rounded-lg p-6 w-full max-w-md`}>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold">{title}</h2>
            <button onClick={onClose} className={`p-1 ${theme === 'dark' ? 'text-gray-300 hover:text-white' : 'text-gray-500 hover:text-gray-700'}`}>
              <X size={20} />
            </button>
          </div>
          {children}
        </div>
      </div>
    );
  };

  // Add User Form Content using react-hook-form
  const AddUserForm = () => {
  const { register, handleSubmit, control, watch, setError, clearErrors, formState: { errors } } = useForm({
    defaultValues: {
      sap: '',
      name: '',
      email: '',
      password: '',
      isFirstLogin: true,
      className: '',
      department: '',
      role: 'student'
    }
  });

  const selectedRole = watch('role');
  const sapRequired = selectedRole === 'student';

  useEffect(() => {
    if (!sapRequired) {
      clearErrors('sap');
    }
  }, [sapRequired, clearErrors]);

  const onSubmit = (data) => {
    if (sapRequired && !data.sap?.trim()) {
      setError('sap', { type: 'manual', message: 'SAP ID is required' });
      return;
    }
    handleAddUser(data);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">
          SAP ID {!sapRequired && <span className="text-xs text-gray-400">(optional for this role)</span>}
        </label>
        <input
          {...register('sap')}
          type="text"
          className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
        />
        {errors.sap && <p className="text-red-500 text-xs mt-1">{errors.sap.message}</p>}
      </div>
      {/* rest of the form unchanged */}
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            {...register('name', { required: 'Name is required' })}
            type="text"
            className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            type="email"
            className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Password</label>
          <input
            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Password must be at least 6 characters' } })}
            type="password"
            className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
          />
          {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Class</label>
          <input
            {...register('className')}
            type="text"
            className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
          />
          <p className="text-xs text-gray-500 mt-1">Leave empty for teacher, HOD, or admin roles</p>
        </div>
        <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Department</label>
          <input
      {...register('department')}
     type="text"
      className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
         />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            {...register('role')}
            className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="hod">HOD</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="flex items-center">
            <Controller
              name="isFirstLogin"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
            <span className="text-sm">Is First Login</span>
          </label>
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={`px-4 py-2 border rounded-lg ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}
            onClick={() => setIsAddModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg ${theme === 'dark' ? 'hover:bg-blue-700' : 'hover:bg-blue-700'}`}
          >
            Add User
          </button>
        </div>
      </form>
    );
  };

  // Edit User Form Content using react-hook-form
  const EditUserForm = () => {
    const { register, handleSubmit, control, formState: { errors } } = useForm({
      defaultValues: currentUser || {}
    });
    
    return (
      <form onSubmit={handleSubmit(handleUpdateUser)}>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">SAP ID</label>
          <input
            {...register('sap')}
            type="text"
            className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
          />
          {errors.sap && <p className="text-red-500 text-xs mt-1">{errors.sap.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            {...register('name', { required: 'Name is required' })}
            type="text"
            className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
          />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Email</label>
          <input
            {...register('email', { 
              required: 'Email is required',
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: 'Invalid email address'
              }
            })}
            type="email"
            className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
          />
          {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
        </div>
        
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Class</label>
          <input
            {...register('className')}
            type="text"
            className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
          />
        </div>
        <div className="mb-4">
  <label className="block text-sm font-medium mb-1">Department</label>
  <input
    {...register('department')}
    type="text"
    className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
  />
</div>
        <div className="mb-4">
          <label className="block text-sm font-medium mb-1">Role</label>
          <select
            {...register('role')}
            className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
          >
            <option value="student">Student</option>
            <option value="teacher">Teacher</option>
            <option value="hod">HOD</option>
            <option value="admin">Admin</option>
          </select>
        </div>
        
        <div className="mb-4">
          <label className="flex items-center">
            <Controller
              name="isFirstLogin"
              control={control}
              render={({ field }) => (
                <input
                  type="checkbox"
                  className="mr-2"
                  checked={field.value}
                  onChange={(e) => field.onChange(e.target.checked)}
                />
              )}
            />
            <span className="text-sm">Is First Login</span>
          </label>
        </div>
        
        <div className="flex justify-end gap-2">
          <button
            type="button"
            className={`px-4 py-2 border rounded-lg ${theme === 'dark' ? 'border-gray-600 text-gray-300 hover:bg-gray-700' : 'border-gray-300 hover:bg-gray-100'}`}
            onClick={() => setIsEditModalOpen(false)}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 bg-blue-600 text-white rounded-lg ${theme === 'dark' ? 'hover:bg-blue-700' : 'hover:bg-blue-700'}`}
          >
            Update User
          </button>
        </div>
      </form>
    );
  };

  // Add this new handler function before the return statement
  const handleBulkDelete = async () => {
  if (!selectedRoleToDelete) {
    setError('Please select a role to delete');
    return;
  }

  try {
    setLoading(true);
    const confirmed = window.confirm(`Are you sure you want to delete ALL ${selectedRoleToDelete}s? This action cannot be undone.`);
    if (!confirmed) {
      setLoading(false);
      return;
    }

    await api.delete(`/users/bulk/${selectedRoleToDelete}`);

    // Refresh the user list
    const updatedResponse = await api.get('/users');
    setUsers(updatedResponse.data);
    setFilteredUsers(updatedResponse.data);

    setIsBulkDeleteModalOpen(false);
    setSelectedRoleToDelete('');
    setLoading(false);

    alert(`Successfully deleted all ${selectedRoleToDelete}s`);
  } catch (err) {
    console.error('Error deleting users:', err);
    setError(err.response?.data?.message || err.message || 'Failed to delete users');
    setLoading(false);
  }
};

  return (
    <div className={`p-6 max-w-6xl mx-auto shadow-lg rounded-lg ${theme === 'dark' ? 'bg-gray-800 text-white' : 'bg-white'}`}>
      {/* User Count Section */}
      <div className="mb-6">
        <h2 className="text-xl font-bold mb-4">User Statistics</h2>
        <div className="grid grid-cols-5 gap-4">
          <div className={`${theme === 'dark' ? 'bg-blue-900 text-blue-300' : 'bg-blue-100 text-blue-700'} p-4 rounded-lg text-center`}>
            <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-blue-300' : 'text-blue-700'}`}>{userCounts.total}</div>
            <div className={`text-sm ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>Total Users</div>
          </div>
          <div className={`${theme === 'dark' ? 'bg-green-900 text-green-300' : 'bg-green-100 text-green-700'} p-4 rounded-lg text-center`}>
            <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-green-300' : 'text-green-700'}`}>{userCounts.student}</div>
            <div className={`text-sm ${theme === 'dark' ? 'text-green-400' : 'text-green-600'}`}>Students</div>
          </div>
          <div className={`${theme === 'dark' ? 'bg-purple-900 text-purple-300' : 'bg-purple-100 text-purple-700'} p-4 rounded-lg text-center`}>
            <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-purple-300' : 'text-purple-700'}`}>{userCounts.teacher}</div>
            <div className={`text-sm ${theme === 'dark' ? 'text-purple-400' : 'text-purple-600'}`}>Teachers</div>
          </div>
          <div className={`${theme === 'dark' ? 'bg-yellow-900 text-yellow-300' : 'bg-yellow-100 text-yellow-700'} p-4 rounded-lg text-center`}>
            <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-yellow-300' : 'text-yellow-700'}`}>{userCounts.hod}</div>
            <div className={`text-sm ${theme === 'dark' ? 'text-yellow-400' : 'text-yellow-600'}`}>HODs</div>
          </div>
          <div className={`${theme === 'dark' ? 'bg-red-900 text-red-300' : 'bg-red-100 text-red-700'} p-4 rounded-lg text-center`}>
            <div className={`text-3xl font-bold ${theme === 'dark' ? 'text-red-300' : 'text-red-700'}`}>{userCounts.admin}</div>
            <div className={`text-sm ${theme === 'dark' ? 'text-red-400' : 'text-red-600'}`}>Admins</div>
          </div>
        </div>
      </div>

      {/* Search and Filter Section */}
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex-1 relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search size={18} className={theme === 'dark' ? 'text-gray-500' : 'text-gray-400'} />
          </div>
          <input
            type="text"
            placeholder="Search users by name, email, or SAP"
            className={`pl-10 pr-4 py-2 border rounded-lg w-full ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'}`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center">
          <Filter size={18} className="text-gray-500 mr-2" />
          <select
            className={`border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="hod">HODs</option>
            <option value="admin">Admins</option>
          </select>
        </div>
        <button
          className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          onClick={() => setIsAddModalOpen(true)}
        >
          <Plus size={18} />
          Add User
        </button>
        <button
          className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          onClick={() => setIsBulkAddModalOpen(true)}
        >
          <Upload size={18} />
          Bulk Add
        </button>
        <button
          className="bg-red-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          onClick={() => setIsBulkDeleteModalOpen(true)}
        >
          <Trash2 size={18} />
          Bulk Delete
        </button>
      </div>

      {/* Users Table */}
      <div className="overflow-x-auto">
        <table className={`min-w-full ${theme === 'dark' ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border`}>
          <thead>
            <tr className={theme === 'dark' ? 'bg-gray-700' : 'bg-gray-100'}>
              <th className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''} text-left`}>SAP</th>
              <th className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''} text-left`}>Name</th>
              <th className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''} text-left`}>Email</th>
              <th className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''} text-left`}>Class</th>
              <th className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''} text-left`}>Role</th>
              <th className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''} text-left`}>First Login</th>
              <th className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''} text-center`}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredUsers.length > 0 ? (
              filteredUsers.map((user) => (
                <tr key={user.id} className={theme === 'dark' ? 'hover:bg-gray-700' : 'hover:bg-gray-50'}>
                  <td className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''}`}>{user.sap}</td>
                  <td className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''}`}>{user.name}</td>
                  <td className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''}`}>{user.email}</td>
                  <td className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''}`}>{user.className || '-'}</td>
                  <td className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''}`}>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium
                      ${user.role === 'student' ? 'bg-green-100 text-green-800' : ''}
                      ${user.role === 'teacher' ? 'bg-purple-100 text-purple-800' : ''}
                      ${user.role === 'hod' ? 'bg-yellow-100 text-yellow-800' : ''}
                      ${user.role === 'admin' ? 'bg-red-100 text-red-800' : ''}
                    `}>
                      {_.startCase(user.role)}
                    </span>
                  </td>
                  <td className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''}`}>
                    {user.isFirstLogin ? (
                      <span className="px-2 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-medium">Yes</span>
                    ) : (
                      <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-800 text-xs font-medium">No</span>
                    )}
                  </td>
                  <td className={`py-2 px-4 border-b ${theme === 'dark' ? 'border-gray-600' : ''}`}>
                    <div className="flex justify-center gap-2">
                      <button
                        className={`p-1 ${theme === 'dark' ? 'bg-blue-700 text-blue-300 hover:bg-blue-600' : 'bg-blue-100 text-blue-600 hover:bg-blue-200'}`}
                        onClick={() => {
                          setCurrentUser(user);
                          setIsEditModalOpen(true);
                        }}
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        className={`p-1 ${theme === 'dark' ? 'bg-red-700 text-red-300 hover:bg-red-600' : 'bg-red-100 text-red-600 hover:bg-red-200'}`}
                        onClick={() => {
                          setCurrentUser(user);
                          setIsDeleteModalOpen(true);
                        }}
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={7} className={`py-4 text-center ${theme === 'dark' ? 'text-gray-400' : 'text-gray-500'}`}>
                  No users found matching your criteria
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add User Modal */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Add New User"
      >
        <AddUserForm />
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit User"
      >
        <EditUserForm />
      </Modal>

      {/* Delete User Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete User"
      >
        {currentUser && (
          <div>
            <p className="mb-4">Are you sure you want to delete user <span className="font-bold">{currentUser.name}</span>?</p>
            <p className="mb-6 text-red-600 text-sm">This action cannot be undone.</p>
            
            <div className="flex justify-end gap-2">
              <button
                className="px-4 py-2 border rounded-lg"
                onClick={() => setIsDeleteModalOpen(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 bg-red-600 text-white rounded-lg"
                onClick={handleDeleteUser}
              >
                Delete
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Bulk Add Modal */}
      <Modal
        isOpen={isBulkAddModalOpen}
        onClose={() => setIsBulkAddModalOpen(false)}
        title="Bulk Add Users"
      >
        <div className="mb-6">
          <p className="mb-4">
            Upload users in bulk by filling out the user details in a CSV file.
          </p>
          <div className="flex items-center justify-between mb-4">
            <button
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg"
              onClick={generateSampleCSV}
            >
              <Download size={18} />
              Download Template
            </button>
          </div>
          
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
  {!bulkFileSelected ? (
    <div>
      <input 
        ref={bulkFileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={(e) => {
          if (e.target.files && e.target.files[0]) {
            setBulkFile(e.target.files[0]);
            setBulkFileSelected(true);
          }
        }}
      />
      <Upload size={36} className="mx-auto mb-2 text-gray-400" />
      <p className="mb-2 text-sm text-gray-500">
        Drag and drop your CSV file here, or click to browse
      </p>
      <button
        type="button"
        className="px-4 py-2 text-sm text-blue-600 border border-blue-600 rounded-lg"
        onClick={() => bulkFileInputRef.current?.click()}
      >
        Browse Files
      </button>
    </div>
  ) : (
    <>
      <div className="flex items-center justify-center mb-2">
        <Check size={24} className="text-green-500 mr-2" />
        <span>{bulkFile ? bulkFile.name : 'CSV file selected'}</span>
      </div>
      <button
        className="px-4 py-2 text-sm text-red-600 border border-red-600 rounded-lg"
        onClick={() => {
          setBulkFile(null);
          setBulkFileSelected(false);
        }}
      >
        Remove File
      </button>
    </>
  )}
</div>
</div>
        
        {error && (
          <p className="mt-2 text-red-500 text-sm">{error}</p>
        )}

        <div className="flex justify-end gap-2 mt-4">
          <button
            className="px-4 py-2 border rounded-lg"
            onClick={() => {
              setBulkFile(null);
              setBulkFileSelected(false);
              setIsBulkAddModalOpen(false);
              setError(null);
            }}
          >
            Cancel
          </button>
          <button
            className="px-4 py-2 bg-green-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            disabled={!bulkFileSelected || loading}
            onClick={handleBulkAdd}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </span>
            ) : (
              "Upload and Add Users"
            )}
          </button>
        </div>
      </Modal>

      {/* Bulk Delete Modal */}
      <Modal
        isOpen={isBulkDeleteModalOpen}
        onClose={() => {
          setIsBulkDeleteModalOpen(false);
          setSelectedRoleToDelete('');
        }}
        title="Bulk Delete Users"
      >
        <div>
          <p className="mb-4 text-red-600 font-medium">Warning: This action will delete ALL users of the selected role. This cannot be undone.</p>
          
          <div className="mb-6">
            <label className="block text-sm font-medium mb-2">Select Role to Delete</label>
            <select
              className={`w-full border ${theme === 'dark' ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'} rounded-lg px-3 py-2`}
              value={selectedRoleToDelete}
              onChange={(e) => setSelectedRoleToDelete(e.target.value)}
            >
              <option value="">Select a role</option>
              <option value="student">Students</option>
              <option value="teacher">Teachers</option>
              <option value="hod">HODs</option>
            </select>
          </div>

          {selectedRoleToDelete && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-red-700">
                You are about to delete ALL {selectedRoleToDelete}s from the system.
                This will affect {users.filter(user => user.role === selectedRoleToDelete).length} users.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              className="px-4 py-2 border rounded-lg"
              onClick={() => {
                setIsBulkDeleteModalOpen(false);
                setSelectedRoleToDelete('');
              }}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 bg-red-600 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={!selectedRoleToDelete || loading}
              onClick={handleBulkDelete}
            >
              {loading ? (
                <span className="flex items-center justify-center">
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Deleting...
                </span>
              ) : (
                "Delete All Selected Role"
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
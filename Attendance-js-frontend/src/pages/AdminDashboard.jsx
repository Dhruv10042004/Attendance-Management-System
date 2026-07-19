import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, 
  Calendar, 
  ClipboardCheck, 
  Settings, 
  LogOut, 
  Palette, 
  Menu,
  X, 
  ChevronUp
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

import AttendanceRequestManagement from './AttendanceRequestManagement';
import TimetableManagement from './TimetableManagement';
import UserManagement from './UserManagement';
import { useAuth } from '../context/AuthContext';
export default function AdminDashboard() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  // State for active content
  const [activeContent, setActiveContent] = useState('user');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const { theme, toggleTheme } = useTheme();
  const [isMobile, setIsMobile] = useState(false);

  // Check if screen size is mobile
  useEffect(() => {
    const checkScreenSize = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth >= 768) {
        setIsMobileMenuOpen(false);
      }
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => {
      window.removeEventListener('resize', checkScreenSize);
    };
  }, []);

  // Toggle user menu
  const toggleUserMenu = (e) => {
    e.stopPropagation();
    setIsUserMenuOpen(!isUserMenuOpen);
  };

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      if (isUserMenuOpen) {
        setIsUserMenuOpen(false);
      }
    };

    document.addEventListener('click', handleClickOutside);
    
    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [isUserMenuOpen]);

  // Dark mode styles
  const isDark = theme === 'dark';
  const sidebarClasses = `
    ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'} 
    ${isMobile ? (isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full') : 'translate-x-0'}
    fixed md:relative h-full md:h-screen z-40 transition-transform duration-300 ease-in-out
    flex flex-col justify-between shadow-lg md:shadow-md w-64
  `;

  const menuItemClasses = `
    flex items-center gap-3 p-3 rounded-lg hover:bg-opacity-80
    ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-200'}
    transition-colors duration-200
  `;

  const activeMenuItemClasses = `
    ${isDark ? 'bg-gray-700' : 'bg-gray-200'} font-medium
  `;

  // Sidebar items with their corresponding components
  const menuItems = [
    { 
      icon: <Users size={20} />, 
      label: 'User Management', 
      id: 'user', 
      active: activeContent === 'user'
    },
    { 
      icon: <Calendar size={20} />, 
      label: 'Timetable Management', 
      id: 'timetable', 
      active: activeContent === 'timetable'
    },
    // { 
    //   icon: <ClipboardCheck size={20} />, 
    //   label: 'Attendance Request Management', 
    //   id: 'attendance', 
    //   active: activeContent === 'attendance'
    // },
  ];

  // User menu items
  const userMenuItems = [
    // { icon: <Settings size={18} />, label: 'Settings', onClick: () => console.log('Settings clicked') },
    // { icon: <Palette size={18} />, label: 'Theme Preferences', onClick: toggleTheme },
    { icon: <LogOut size={18} />, label: 'Logout', onClick: () => {
      logout();
      navigate('/login', { replace: true });
    } }
  ];

  // Render active component based on state
  const renderActiveComponent = () => {
    switch(activeContent) {
      case 'user':
        return <UserManagement />;
      case 'timetable':
        return <TimetableManagement />;
      case 'attendance':
        return <AttendanceRequestManagement />;
      default:
        return <UserManagement />;
    }
  };

  return (
    <div className="flex h-screen overflow-hidden w-full">
      {/* Mobile menu overlay */}
      {isMobile && isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
      
      {/* Mobile menu button */}
      <button 
        className={`fixed top-4 left-4 z-50 md:hidden p-2 rounded-md
          ${isDark ? 'bg-gray-800 text-gray-100' : 'bg-white text-gray-800'}`}
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>
      
      {/* Sidebar */}
      <nav className={sidebarClasses}>
        {/* Top section with logo and navigation */}
        <div className="flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-xl font-bold">Dashboard</h1>
          </div>
          
          <div className="p-4 flex flex-col gap-2">
            {menuItems.map((item) => (
              <a 
                key={item.id}
                href="#" 
                className={`${menuItemClasses} ${item.active ? activeMenuItemClasses : ''}`}
                onClick={(e) => {
                  e.preventDefault();
                  setActiveContent(item.id);
                  if (isMobile) {
                    setIsMobileMenuOpen(false);
                  }
                }}
              >
                {item.icon}
                <span>{item.label}</span>
              </a>
            ))}
          </div>
        </div>
        
        {/* Bottom section with user profile */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 relative">
          {/* User menu popup */}
          {isUserMenuOpen && (
            <div 
              className={`absolute bottom-16 left-4 right-4 rounded-lg shadow-lg
                ${isDark ? 'bg-gray-700' : 'bg-white'}
                border ${isDark ? 'border-gray-600' : 'border-gray-200'}`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="py-2">
                {userMenuItems.map((item, index) => (
                  <button
                    key={index}
                    className={`w-full text-left ${menuItemClasses}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      item.onClick();
                      setIsUserMenuOpen(false);
                    }}
                  >
                    {item.icon}
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-2">
                <ChevronUp className={isDark ? 'text-gray-700' : 'text-white'} />
              </div>
            </div>
          )}
          
          {/* User avatar and info */}
          <button 
            className={`flex items-center gap-3 w-full rounded-lg p-2
              ${isDark ? 'hover:bg-gray-700' : 'hover:bg-gray-100'}`}
            onClick={toggleUserMenu}
          >
            <div className="w-10 h-10 rounded-full bg-indigo-500 flex items-center justify-center text-white font-medium">
              JP
            </div>
            <div className="flex-1 text-left">
              <h3 className="font-medium">Admin</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400">Admin</p>
            </div>
          </button>
        </div>
      </nav>

      {/* Main content area */}
      <div className={`flex-1 p-6 overflow-auto ${isDark ? 'bg-gray-900 text-gray-100' : 'bg-gray-50 text-gray-800'}`}>
        <div className="container mx-auto">
          <h2 className="text-2xl font-bold mb-6">
            {menuItems.find(item => item.id === activeContent)?.label}
          </h2>
          
          {/* Display active component using our renderActiveComponent function */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            {renderActiveComponent()}
          </div>
        </div>
      </div>
    </div>
  );
}
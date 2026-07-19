import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Unauthorized() {
  const { user } = useAuth();

  // Determine where to redirect based on user role
  const getDashboardLink = () => {
    if (!user) return '/login';

    switch (user.role) {
      case 'admin': return '/admin';
      case 'hod': return '/hod';
      case 'teacher': return '/teacher';
      case 'student': return '/student';
      default: return '/login';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900 p-4">
      <div className="w-full max-w-md p-8 bg-white dark:bg-gray-800 rounded-lg shadow">
        <h1 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Unauthorized Access</h1>
        <p className="text-gray-700 dark:text-gray-300 mb-6">
          You don't have permission to access this page.
        </p>
        <Link
          to={getDashboardLink()}
          className="inline-block w-full py-2 px-4 text-center bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
        >
          Go to Dashboard
        </Link>
      </div>
    </div>
  );
}

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function MainLayout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">
                Church Member Management
              </h1>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
              <NavLink to="/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/attendance" className={navLinkClass}>
                Attendance
              </NavLink>
              <NavLink to="/missing-members" className={navLinkClass}>
                Missing Members
              </NavLink>
              <NavLink to="/members" className={navLinkClass}>
                Member Journey
              </NavLink>
              {hasRole(['pastor', 'admin']) && (
                <NavLink to="/admin" className={navLinkClass}>
                  Admin
                </NavLink>
              )}
            </nav>

            {/* User menu */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">{user?.email}</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs uppercase">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <nav className="md:hidden border-t border-gray-200 px-4 py-2">
          <div className="flex flex-wrap gap-2">
            <NavLink to="/dashboard" className={navLinkClass}>
              Dashboard
            </NavLink>
            <NavLink to="/attendance" className={navLinkClass}>
              Attendance
            </NavLink>
            <NavLink to="/missing-members" className={navLinkClass}>
              Missing
            </NavLink>
            <NavLink to="/members" className={navLinkClass}>
              Journey
            </NavLink>
            {hasRole(['pastor', 'admin']) && (
              <NavLink to="/admin" className={navLinkClass}>
                Admin
              </NavLink>
            )}
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-gray-200 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-gray-500">
            Church Member Management System
          </p>
        </div>
      </footer>
    </div>
  );
}

export default MainLayout;

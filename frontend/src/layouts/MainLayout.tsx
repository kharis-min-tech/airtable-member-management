import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { UserRole } from '../types';

/**
 * Navigation tab configuration
 * Requirements: 1.1 - Display tabs for Dashboard, Attendance Explorer, Missing Members, Member Journey, and Admin
 */
interface NavTab {
  to: string;
  label: string;
  mobileLabel: string;
  requiresRole?: UserRole[];
}

const navigationTabs: NavTab[] = [
  { to: '/dashboard', label: 'Dashboard', mobileLabel: 'Dashboard' },
  { to: '/attendance', label: 'Attendance Explorer', mobileLabel: 'Attendance' },
  { to: '/missing-members', label: 'Missing Members', mobileLabel: 'Missing' },
  { to: '/members', label: 'Member Journey', mobileLabel: 'Journey' },
  { to: '/admin', label: 'Admin', mobileLabel: 'Admin', requiresRole: ['pastor', 'admin'] },
];

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

  /**
   * Navigation link styling with clear active state
   * Requirements: 1.3 - Visually indicate the currently active tab
   */
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md transition-colors font-medium whitespace-nowrap ${
      isActive
        ? 'bg-blue-600 text-white shadow-sm'
        : 'text-gray-700 hover:bg-gray-100 hover:text-gray-900'
    }`;

  /**
   * Filter tabs based on user role
   * Requirements: 1.1 - Admin tab only for authorized users
   */
  const visibleTabs = navigationTabs.filter(
    (tab) => !tab.requiresRole || hasRole(tab.requiresRole)
  );

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center flex-shrink-0">
              <h1 className="text-xl font-bold text-blue-600">
                Church Member Management
              </h1>
            </div>

            {/* Desktop Navigation - Requirements: 1.4 - Responsive on desktop */}
            <nav 
              className="hidden md:flex items-center space-x-1 flex-1 justify-center mx-4"
              role="navigation"
              aria-label="Main navigation"
            >
              {visibleTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={navLinkClass}
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>

            {/* User menu */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <div className="text-sm text-gray-600 hidden sm:block">
                <span className="font-medium">{user?.email}</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs uppercase">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md transition-colors font-medium"
                aria-label="Logout"
              >
                Logout
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation - Requirements: 1.5 - Horizontal scrollable tabs on mobile */}
        <nav 
          className="md:hidden border-t border-gray-200 overflow-x-auto"
          role="navigation"
          aria-label="Mobile navigation"
        >
          <div className="flex px-4 py-2 space-x-2 min-w-max">
            {visibleTabs.map((tab) => (
              <NavLink
                key={tab.to}
                to={tab.to}
                className={navLinkClass}
              >
                {tab.mobileLabel}
              </NavLink>
            ))}
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
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

// Export navigation tabs for testing purposes
export { navigationTabs };
export type { NavTab };
export default MainLayout;

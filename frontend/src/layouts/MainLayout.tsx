import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { Menu, X, LogOut, ExternalLink, ChevronDown } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { KharisLogo } from '../assets/KharisLogo';
import type { UserRole } from '../types';

/**
 * Navigation tab configuration
 * Requirements: 6.1, 6.2 - Display tabs with Tailus UI styling and active state
 */
interface NavTab {
  to: string;
  label: string;
  mobileLabel: string;
  requiresRole?: UserRole[];
  isExternal?: boolean;
}

const navigationTabs: NavTab[] = [
  { to: '/dashboard', label: 'Dashboard', mobileLabel: 'Dashboard' },
  { to: '/attendance', label: 'Attendance Explorer', mobileLabel: 'Attendance' },
  { to: '/missing-members', label: 'Missing Members', mobileLabel: 'Missing' },
  { to: '/members', label: 'Member Journey', mobileLabel: 'Journey' },
  { to: '/admin', label: 'Admin', mobileLabel: 'Admin', requiresRole: ['pastor', 'admin'] },
];

/**
 * Quick links to public pages accessible from authenticated view
 */
const quickLinks: NavTab[] = [
  { to: '/forms', label: 'Forms', mobileLabel: 'Forms', isExternal: true },
  { to: '/contacts', label: 'Contacts', mobileLabel: 'Contacts', isExternal: true },
  { to: '/followup', label: 'Follow Up', mobileLabel: 'Follow Up', isExternal: true },
];

function MainLayout() {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isQuickLinksOpen, setIsQuickLinksOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  /**
   * Navigation link styling with clear active state using primary color
   * Requirements: 6.1, 6.2, 6.7 - Tailus UI styling with brand colors and hover feedback
   */
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md transition-colors font-medium whitespace-nowrap ${
      isActive
        ? 'bg-primary dark:bg-primary-dark text-white shadow-sm'
        : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-primary-light dark:hover:text-text-primary-dark'
    }`;

  /**
   * Mobile navigation link styling
   * Requirements: 6.3 - Mobile-friendly navigation format
   */
  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 rounded-md transition-colors font-medium ${
      isActive
        ? 'bg-primary dark:bg-primary-dark text-white'
        : 'text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  /**
   * Filter tabs based on user role
   * Requirements: 6.1 - Admin tab only for authorized users
   */
  const visibleTabs = navigationTabs.filter(
    (tab) => !tab.requiresRole || hasRole(tab.requiresRole)
  );

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      {/* Header */}
      <header className="bg-surface-light dark:bg-surface-dark shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title - Requirements: 11.2, 11.3 */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <KharisLogo className="h-8 w-8" />
              <h1 className="text-xl font-bold text-primary dark:text-white hidden sm:block">
                Member Management
              </h1>
            </div>

            {/* Desktop Navigation - Requirements: 6.1, 6.2, 6.7 */}
            <nav 
              className="hidden lg:flex items-center space-x-2"
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
              
              {/* Quick Links Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setIsQuickLinksOpen(!isQuickLinksOpen)}
                  onBlur={() => setTimeout(() => setIsQuickLinksOpen(false), 150)}
                  className="flex items-center gap-1 px-4 py-2 rounded-md transition-colors font-medium text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-primary-light dark:hover:text-text-primary-dark"
                >
                  Quick Links
                  <ChevronDown className={`h-4 w-4 transition-transform ${isQuickLinksOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {isQuickLinksOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-surface-light dark:bg-surface-dark rounded-md shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
                    {quickLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="flex items-center gap-2 px-4 py-2 text-sm text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                        onClick={() => setIsQuickLinksOpen(false)}
                      >
                        {link.label}
                        <ExternalLink className="h-3 w-3 text-text-secondary-light dark:text-text-secondary-dark" />
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            </nav>

            {/* Right side: Theme toggle, user info, logout - Requirements: 6.4, 6.5, 6.6 */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <ThemeToggle />
              
              {/* User info - Requirements: 6.5 */}
              <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark hidden md:flex items-center gap-2">
                <span className="font-medium text-text-primary-light dark:text-text-primary-dark">
                  {user?.email}
                </span>
                <span className="px-2 py-1 bg-primary/10 dark:bg-primary-dark/20 text-primary dark:text-primary-dark rounded text-xs uppercase font-medium">
                  {user?.role?.replace('_', ' ')}
                </span>
              </div>

              {/* Logout button - Requirements: 6.6 */}
              <button
                onClick={handleLogout}
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors font-medium"
                aria-label="Logout"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden lg:inline">Logout</span>
              </button>

              {/* Mobile menu button - Requirements: 6.3 */}
              <button
                onClick={toggleMobileMenu}
                className="lg:hidden p-2 rounded-md text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                aria-label={isMobileMenuOpen ? 'Close menu' : 'Open menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? (
                  <X className="h-6 w-6" />
                ) : (
                  <Menu className="h-6 w-6" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer - Requirements: 6.3, 4.5 */}
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <div 
              className="lg:hidden fixed inset-0 bg-black/50 z-40"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
            
            {/* Mobile menu panel */}
            <div className="lg:hidden fixed inset-y-0 right-0 w-64 bg-surface-light dark:bg-surface-dark shadow-xl z-50 transform transition-transform duration-200 ease-in-out">
              <div className="flex flex-col h-full">
                {/* Mobile menu header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-semibold text-text-primary-light dark:text-text-primary-dark">
                    Menu
                  </span>
                  <button
                    onClick={closeMobileMenu}
                    className="p-2 rounded-md text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    aria-label="Close menu"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Mobile navigation links */}
                <nav className="flex-1 p-4 space-y-2 overflow-y-auto" role="navigation" aria-label="Mobile navigation">
                  {visibleTabs.map((tab) => (
                    <NavLink
                      key={tab.to}
                      to={tab.to}
                      className={mobileNavLinkClass}
                      onClick={closeMobileMenu}
                    >
                      {tab.mobileLabel}
                    </NavLink>
                  ))}
                  
                  {/* Quick Links Section */}
                  <div className="pt-4 mt-4 border-t border-gray-200 dark:border-gray-700">
                    <p className="px-4 py-2 text-xs font-semibold text-text-secondary-light dark:text-text-secondary-dark uppercase tracking-wider">
                      Quick Links
                    </p>
                    {quickLinks.map((link) => (
                      <Link
                        key={link.to}
                        to={link.to}
                        className="flex items-center gap-2 px-4 py-3 rounded-md transition-colors font-medium text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-800"
                        onClick={closeMobileMenu}
                      >
                        {link.mobileLabel}
                        <ExternalLink className="h-3 w-3 text-text-secondary-light dark:text-text-secondary-dark" />
                      </Link>
                    ))}
                  </div>
                </nav>

                {/* Mobile user info and logout */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 space-y-4">
                  {/* User info */}
                  <div className="text-sm">
                    <p className="font-medium text-text-primary-light dark:text-text-primary-dark truncate">
                      {user?.email}
                    </p>
                    <span className="inline-block mt-1 px-2 py-1 bg-primary/10 dark:bg-primary-dark/20 text-primary dark:text-primary-dark rounded text-xs uppercase font-medium">
                      {user?.role?.replace('_', ' ')}
                    </span>
                  </div>

                  {/* Logout button */}
                  <button
                    onClick={() => {
                      closeMobileMenu();
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-gray-100 dark:bg-gray-800 text-text-primary-light dark:text-text-primary-dark hover:bg-gray-200 dark:hover:bg-gray-700 rounded-md transition-colors font-medium"
                    aria-label="Logout"
                  >
                    <LogOut className="h-4 w-4" />
                    Logout
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
            Member Management System
          </p>
        </div>
      </footer>
    </div>
  );
}

// Export navigation tabs for testing purposes
export { navigationTabs, quickLinks };
export type { NavTab };
export default MainLayout;

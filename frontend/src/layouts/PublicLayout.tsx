import { useState } from 'react';
import { Outlet, NavLink, Link } from 'react-router-dom';
import { Menu, X, LogIn } from 'lucide-react';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { KharisLogo } from '../assets/KharisLogo';

/**
 * Navigation tab configuration for public routes
 * Requirements: 4.2, 5.2 - Public route navigation
 */
interface PublicNavTab {
  to: string;
  label: string;
}

const publicNavigationTabs: PublicNavTab[] = [
  { to: '/forms', label: 'Forms' },
  { to: '/contacts', label: 'Contacts' },
  { to: '/followup', label: 'Follow Up' },
];

/**
 * PublicLayout component for unauthenticated pages
 * 
 * Provides a clean, minimal layout for public pages like forms and contacts
 * without requiring authentication. Includes basic branding, theme support,
 * and navigation between public pages.
 * 
 * Requirements: 4.1, 4.2, 5.2 - Public route accessibility
 */
function PublicLayout() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  /**
   * Navigation link styling with clear active state
   * Requirements: 4.2, 5.2 - Public route navigation styling
   */
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md transition-colors font-medium whitespace-nowrap ${
      isActive
        ? 'bg-primary dark:bg-primary-dark text-white shadow-sm'
        : 'text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-text-primary-light dark:hover:text-text-primary-dark'
    }`;

  /**
   * Mobile navigation link styling
   */
  const mobileNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `block px-4 py-3 rounded-md transition-colors font-medium ${
      isActive
        ? 'bg-primary dark:bg-primary-dark text-white'
        : 'text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      {/* Header */}
      <header className="bg-surface-light dark:bg-surface-dark shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Title */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <KharisLogo className="h-8 w-8" />
              <h1 className="text-xl font-bold text-primary dark:text-white hidden sm:block">
                Member Management
              </h1>
            </div>

            {/* Desktop Navigation - Requirements: 4.2, 5.2 */}
            <nav 
              className="hidden md:flex items-center space-x-2"
              role="navigation"
              aria-label="Public navigation"
            >
              {publicNavigationTabs.map((tab) => (
                <NavLink
                  key={tab.to}
                  to={tab.to}
                  className={navLinkClass}
                >
                  {tab.label}
                </NavLink>
              ))}
            </nav>

            {/* Right side: Theme toggle and Login link */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <ThemeToggle />
              
              {/* Login link for authenticated access */}
              <Link
                to="/login"
                className="hidden md:flex items-center gap-2 px-3 py-2 text-sm text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors font-medium"
                aria-label="Login"
              >
                <LogIn className="h-4 w-4" />
                <span>Login</span>
              </Link>

              {/* Mobile menu button */}
              <button
                onClick={toggleMobileMenu}
                className="md:hidden p-2 rounded-md text-text-secondary-light dark:text-text-secondary-dark hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
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

        {/* Mobile Navigation Drawer */}
        {isMobileMenuOpen && (
          <>
            {/* Overlay */}
            <div 
              className="md:hidden fixed inset-0 bg-black/50 z-40"
              onClick={closeMobileMenu}
              aria-hidden="true"
            />
            
            {/* Mobile menu panel */}
            <div className="md:hidden fixed inset-y-0 right-0 w-64 bg-surface-light dark:bg-surface-dark shadow-xl z-50 transform transition-transform duration-200 ease-in-out">
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
                <nav className="flex-1 p-4 space-y-2" role="navigation" aria-label="Mobile public navigation">
                  {publicNavigationTabs.map((tab) => (
                    <NavLink
                      key={tab.to}
                      to={tab.to}
                      className={mobileNavLinkClass}
                      onClick={closeMobileMenu}
                    >
                      {tab.label}
                    </NavLink>
                  ))}
                </nav>

                {/* Mobile login link */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                  <Link
                    to="/login"
                    onClick={closeMobileMenu}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm bg-primary dark:bg-primary-dark text-white hover:bg-primary/90 dark:hover:bg-primary-dark/90 rounded-md transition-colors font-medium"
                    aria-label="Login"
                  >
                    <LogIn className="h-4 w-4" />
                    Login
                  </Link>
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
export { publicNavigationTabs };
export type { PublicNavTab };
export default PublicLayout;
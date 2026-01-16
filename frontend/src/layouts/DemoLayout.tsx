/**
 * Demo Layout Component
 * Requirements: 5.1, 4.1, 4.2, 6.3, 6.4, 6.7
 * - Demo banner indicating mock data mode
 * - Navigation tabs for all demo pages
 * - No authentication required
 * - Responsive layout with max-w-7xl container
 * - Theme toggle in header
 */

import { Outlet, NavLink } from 'react-router-dom';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { KharisLogo } from '../assets/KharisLogo';

function DemoLayout() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md transition-colors font-medium whitespace-nowrap ${
      isActive
        ? 'bg-primary dark:bg-primary-dark text-white shadow-sm'
        : 'text-text-primary-light dark:text-text-primary-dark hover:bg-gray-100 dark:hover:bg-gray-800'
    }`;

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark flex flex-col">
      {/* Demo Banner */}
      <div className="bg-warning/10 dark:bg-warning/20 border-b border-warning/30">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center gap-2">
            <DemoIcon className="w-5 h-5 text-warning flex-shrink-0" />
            <p className="text-warning dark:text-warning text-sm font-medium">
              Demo Mode: This is showing mock data for preview purposes. No real data is being accessed.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-surface-light dark:bg-surface-dark shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center gap-3 flex-shrink-0">
              <KharisLogo className="h-8 w-8 text-primary dark:text-white" />
              <h1 className="text-xl font-bold text-primary dark:text-white hidden sm:block">
                Member Management
              </h1>
              <span className="px-2 py-1 bg-warning/20 text-warning text-xs font-medium rounded">
                DEMO
              </span>
            </div>

            {/* Navigation - Desktop */}
            <nav className="hidden lg:flex items-center space-x-2">
              <NavLink to="/demo/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/demo/attendance" className={navLinkClass}>
                Attendance
              </NavLink>
              <NavLink to="/demo/missing-members" className={navLinkClass}>
                Missing Members
              </NavLink>
              <NavLink to="/demo/members" className={navLinkClass}>
                Member Journey
              </NavLink>
              <NavLink to="/demo/admin" className={navLinkClass}>
                Admin
              </NavLink>
              <NavLink to="/demo/components" className={navLinkClass}>
                Components
              </NavLink>
            </nav>

            {/* Right side: Theme toggle and user info */}
            <div className="flex items-center space-x-4 flex-shrink-0">
              <ThemeToggle />
              <div className="text-sm text-text-secondary-light dark:text-text-secondary-dark hidden md:block">
                <span className="font-medium text-text-primary-light dark:text-text-primary-dark">demo@church.org</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-xs uppercase">
                  pastor
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile/Tablet navigation */}
        <nav className="lg:hidden border-t border-gray-200 dark:border-gray-700 overflow-x-auto">
          <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
            <div className="flex py-2 space-x-2">
              <NavLink to="/demo/dashboard" className={navLinkClass}>
                Dashboard
              </NavLink>
              <NavLink to="/demo/attendance" className={navLinkClass}>
                Attendance
              </NavLink>
              <NavLink to="/demo/missing-members" className={navLinkClass}>
                Missing
              </NavLink>
              <NavLink to="/demo/members" className={navLinkClass}>
                Journey
              </NavLink>
              <NavLink to="/demo/admin" className={navLinkClass}>
                Admin
              </NavLink>
              <NavLink to="/demo/components" className={navLinkClass}>
                Components
              </NavLink>
            </div>
          </div>
        </nav>
      </header>

      {/* Main content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="bg-surface-light dark:bg-surface-dark border-t border-gray-200 dark:border-gray-700 mt-auto">
        <div className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4">
          <p className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
            Member Management System - Demo Mode
          </p>
        </div>
      </footer>
    </div>
  );
}

function DemoIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

export default DemoLayout;

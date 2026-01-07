/**
 * Demo Layout Component
 * Requirements: 6.3, 6.4, 6.7
 * - Demo banner indicating mock data mode
 * - Navigation tabs for all demo pages
 * - No authentication required
 */

import { Outlet, NavLink } from 'react-router-dom';

function DemoLayout() {
  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-4 py-2 rounded-md transition-colors ${
      isActive
        ? 'bg-blue-600 text-white'
        : 'text-gray-700 hover:bg-gray-100'
    }`;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Demo Banner */}
      <div className="bg-yellow-50 border-b border-yellow-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
          <div className="flex items-center justify-center gap-2">
            <DemoIcon className="w-5 h-5 text-yellow-600" />
            <p className="text-yellow-800 text-sm font-medium">
              Demo Mode: This is showing mock data for preview purposes. No real data is being accessed.
            </p>
          </div>
        </div>
      </div>

      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <div className="flex items-center">
              <h1 className="text-xl font-bold text-blue-600">
                Church Member Management
              </h1>
              <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                DEMO
              </span>
            </div>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-2">
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
            </nav>

            {/* Demo user info */}
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-600">
                <span className="font-medium">demo@church.org</span>
                <span className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs uppercase">
                  pastor
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile navigation */}
        <nav className="md:hidden border-t border-gray-200 px-4 py-2">
          <div className="flex flex-wrap gap-2">
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
            Church Member Management System - Demo Mode
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

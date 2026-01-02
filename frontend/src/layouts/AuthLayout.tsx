import { Outlet } from 'react-router-dom';

function AuthLayout() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo/Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-blue-600">
            Church Member Management
          </h1>
          <p className="text-gray-600 mt-2">
            Sign in to access your dashboard
          </p>
        </div>

        {/* Auth content */}
        <div className="bg-white rounded-lg shadow-lg p-8">
          <Outlet />
        </div>

        {/* Footer */}
        <p className="text-center text-sm text-gray-500 mt-8">
          Powered by AWS &amp; Airtable
        </p>
      </div>
    </div>
  );
}

export default AuthLayout;

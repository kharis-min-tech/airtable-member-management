function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-2xl font-bold text-gray-800 mb-4">Access Denied</h1>
      <p className="text-gray-600 mb-4">You don't have permission to access this page.</p>
      <a href="/dashboard" className="text-blue-600 hover:underline">
        Return to Dashboard
      </a>
    </div>
  );
}

export default UnauthorizedPage;

function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900">
      <h1 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark mb-4">Access Denied</h1>
      <p className="text-text-secondary-light dark:text-text-secondary-dark mb-4">You don't have permission to access this page.</p>
      <a href="/dashboard" className="text-blue-600 dark:text-blue-400 hover:underline">
        Return to Dashboard
      </a>
    </div>
  );
}

export default UnauthorizedPage;

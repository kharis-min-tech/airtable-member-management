import { useState } from 'react';
import type { FormEvent } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { KharisLogo } from '../../assets/KharisLogo';
import { Input } from '../../components/tailus-ui/Input';
import { Button } from '../../components/tailus-ui/Button';

function LoginPage() {
  const { login, error: authError, isLoading, requiresNewPassword, completeNewPassword } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }

    try {
      await login(email, password);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setError(message);
    }
  };

  const handleNewPasswordSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newPassword || !confirmPassword) {
      setError('Please enter and confirm your new password');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    try {
      await completeNewPassword(newPassword);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Password change failed';
      setError(message);
    }
  };

  const displayError = error || authError;

  // Show new password form if required
  if (requiresNewPassword) {
    return (
      <div className="space-y-6">
        {/* Kharis Logo */}
        <div className="flex flex-col items-center space-y-4">
          <KharisLogo className="h-16 w-16" title="Kharis Church" />
          <h1 className="text-xl font-semibold text-primary dark:text-primary-dark">
            Kharis Church
          </h1>
        </div>

        <form onSubmit={handleNewPasswordSubmit} className="space-y-6">
          <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark text-center">
            Set New Password
          </h2>

          <p className="text-sm text-text-secondary-light dark:text-text-secondary-dark text-center">
            You must set a new password before continuing
          </p>

          {displayError && (
            <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md text-sm">
              {displayError}
            </div>
          )}

          <Input
            id="newPassword"
            label="New Password"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="new-password"
          />

          <Input
            id="confirmPassword"
            label="Confirm Password"
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="••••••••"
            disabled={isLoading}
            autoComplete="new-password"
          />

          <div className="text-xs text-text-secondary-light dark:text-text-secondary-dark">
            Password must be at least 8 characters with uppercase, lowercase, and numbers
          </div>

          <Button
            type="submit"
            disabled={isLoading}
            variant="primary"
            size="md"
            className="w-full"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Setting password...
              </span>
            ) : (
              'Set Password'
            )}
          </Button>
        </form>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Kharis Logo */}
      <div className="flex flex-col items-center space-y-4">
        <KharisLogo className="h-16 w-16" title="Kharis Church" />
        <h1 className="text-xl font-semibold text-primary dark:text-primary-dark">
          Kharis Church
        </h1>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <h2 className="text-2xl font-bold text-text-primary-light dark:text-text-primary-dark text-center">
          Sign In
        </h2>

        {displayError && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 px-4 py-3 rounded-md text-sm">
            {displayError}
          </div>
        )}

        <Input
          id="email"
          label="Email Address"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          disabled={isLoading}
          autoComplete="email"
        />

        <Input
          id="password"
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          disabled={isLoading}
          autoComplete="current-password"
        />

        <Button
          type="submit"
          disabled={isLoading}
          variant="primary"
          size="md"
          className="w-full"
        >
          {isLoading ? (
            <span className="flex items-center justify-center">
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Signing in...
            </span>
          ) : (
            'Sign In'
          )}
        </Button>

        <p className="text-center text-sm text-text-secondary-light dark:text-text-secondary-dark">
          Contact your administrator if you need access
        </p>
      </form>
    </div>
  );
}

export default LoginPage;

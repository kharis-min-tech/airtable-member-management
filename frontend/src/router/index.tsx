import { createBrowserRouter, Navigate } from 'react-router-dom';
import { lazy, Suspense } from 'react';
import LoadingSpinner from '../components/LoadingSpinner';
import ProtectedRoute from '../components/ProtectedRoute';
import PublicRoute from '../components/PublicRoute';

// Layout components
const MainLayout = lazy(() => import('../layouts/MainLayout'));
const AuthLayout = lazy(() => import('../layouts/AuthLayout'));

// Auth pages
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));

// Dashboard pages
const PastorDashboard = lazy(() => import('../pages/dashboard/PastorDashboard'));
const DemoDashboard = lazy(() => import('../pages/dashboard/DemoDashboard'));
const AttendanceExplorer = lazy(() => import('../pages/attendance/AttendanceExplorer'));
const MissingMembers = lazy(() => import('../pages/attendance/MissingMembers'));
const MemberJourney = lazy(() => import('../pages/members/MemberJourney'));
const AdminViews = lazy(() => import('../pages/admin/AdminViews'));

// Error pages
const UnauthorizedPage = lazy(() => import('../pages/UnauthorizedPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// Router configuration
export const router = createBrowserRouter([
  {
    // Demo route (no auth required)
    path: '/demo',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <DemoDashboard />
      </Suspense>
    ),
  },
  {
    // Public routes (auth)
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <PublicRoute>
          <AuthLayout />
        </PublicRoute>
      </Suspense>
    ),
    children: [
      {
        path: '/login',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <LoginPage />
          </Suspense>
        ),
      },
    ],
  },
  {
    // Protected routes
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      </Suspense>
    ),
    children: [
      {
        path: '/',
        element: <Navigate to="/dashboard" replace />,
      },
      {
        path: '/dashboard',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <PastorDashboard />
          </Suspense>
        ),
      },
      {
        path: '/attendance',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <AttendanceExplorer />
          </Suspense>
        ),
      },
      {
        path: '/missing-members',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <MissingMembers />
          </Suspense>
        ),
      },
      {
        path: '/members/:memberId',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <MemberJourney />
          </Suspense>
        ),
      },
      {
        path: '/members',
        element: (
          <Suspense fallback={<LoadingSpinner />}>
            <MemberJourney />
          </Suspense>
        ),
      },
      {
        // Admin-only routes
        element: <ProtectedRoute allowedRoles={['pastor', 'admin']} />,
        children: [
          {
            path: '/admin',
            element: (
              <Suspense fallback={<LoadingSpinner />}>
                <AdminViews />
              </Suspense>
            ),
          },
        ],
      },
    ],
  },
  {
    path: '/unauthorized',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <UnauthorizedPage />
      </Suspense>
    ),
  },
  {
    path: '*',
    element: (
      <Suspense fallback={<LoadingSpinner />}>
        <NotFoundPage />
      </Suspense>
    ),
  },
]);

export default router;

import { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import type { ReactNode } from 'react';
import { 
  signIn, 
  signOut, 
  getCurrentUser, 
  fetchAuthSession,
} from 'aws-amplify/auth';
import type { AuthUser } from 'aws-amplify/auth';
import type { UserContext, UserRole, AuthState } from '../types';

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshSession: () => Promise<void>;
  hasRole: (roles: UserRole | UserRole[]) => boolean;
  canAccessAllData: () => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Helper function to determine role from Cognito groups
function determineRole(groups: string[]): UserRole {
  // Priority order: pastor > admin > department_lead > follow_up
  if (groups.includes('pastor')) return 'pastor';
  if (groups.includes('admin')) return 'admin';
  if (groups.includes('department_lead')) return 'department_lead';
  return 'follow_up';
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [authState, setAuthState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    user: null,
    error: null,
  });

  const extractUserContext = useCallback(async (authUser: AuthUser): Promise<UserContext> => {
    try {
      const session = await fetchAuthSession();
      const idToken = session.tokens?.idToken;
      
      // Extract role from Cognito groups
      const groups = idToken?.payload?.['cognito:groups'] as string[] | undefined;
      const role = determineRole(groups || []);
      
      // Extract custom attributes
      const volunteerId = idToken?.payload?.['custom:volunteerId'] as string | undefined;
      const departmentIds = idToken?.payload?.['custom:departmentIds'] as string | undefined;
      
      return {
        userId: authUser.userId,
        email: authUser.signInDetails?.loginId || '',
        role,
        volunteerId,
        departmentIds: departmentIds ? departmentIds.split(',') : undefined,
      };
    } catch {
      // Return default user context if session fetch fails
      return {
        userId: authUser.userId,
        email: authUser.signInDetails?.loginId || '',
        role: 'follow_up',
      };
    }
  }, []);

  const checkAuthState = useCallback(async () => {
    try {
      const authUser = await getCurrentUser();
      const userContext = await extractUserContext(authUser);
      
      setAuthState({
        isAuthenticated: true,
        isLoading: false,
        user: userContext,
        error: null,
      });
    } catch {
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    }
  }, [extractUserContext]);

  useEffect(() => {
    // Use an IIFE to handle the async operation
    void (async () => {
      await checkAuthState();
    })();
  }, [checkAuthState]);

  const login = useCallback(async (email: string, password: string) => {
    setAuthState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const { isSignedIn } = await signIn({ username: email, password });
      
      if (isSignedIn) {
        await checkAuthState();
      } else {
        setAuthState(prev => ({
          ...prev,
          isLoading: false,
          error: 'Sign in was not completed',
        }));
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Login failed';
      setAuthState(prev => ({
        ...prev,
        isLoading: false,
        error: message,
      }));
      throw error;
    }
  }, [checkAuthState]);

  const logout = useCallback(async () => {
    try {
      await signOut();
      setAuthState({
        isAuthenticated: false,
        isLoading: false,
        user: null,
        error: null,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Logout failed';
      setAuthState(prev => ({
        ...prev,
        error: message,
      }));
      throw error;
    }
  }, []);

  const refreshSession = useCallback(async () => {
    await checkAuthState();
  }, [checkAuthState]);

  const hasRole = useCallback((roles: UserRole | UserRole[]): boolean => {
    if (!authState.user) return false;
    const roleArray = Array.isArray(roles) ? roles : [roles];
    return roleArray.includes(authState.user.role);
  }, [authState.user]);

  const canAccessAllData = useCallback((): boolean => {
    return hasRole(['pastor', 'admin']);
  }, [hasRole]);

  const value = useMemo<AuthContextType>(() => ({
    ...authState,
    login,
    logout,
    refreshSession,
    hasRole,
    canAccessAllData,
  }), [authState, login, logout, refreshSession, hasRole, canAccessAllData]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export default AuthContext;

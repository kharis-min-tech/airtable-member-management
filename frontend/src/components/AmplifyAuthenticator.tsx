import { Authenticator, ThemeProvider } from '@aws-amplify/ui-react';
import type { Theme } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';
import type { ReactNode } from 'react';

// Custom theme for the Authenticator
const theme: Theme = {
  name: 'church-theme',
  tokens: {
    colors: {
      brand: {
        primary: {
          10: '{colors.blue.10}',
          20: '{colors.blue.20}',
          40: '{colors.blue.40}',
          60: '{colors.blue.60}',
          80: '{colors.blue.80}',
          90: '{colors.blue.90}',
          100: '{colors.blue.100}',
        },
      },
    },
    components: {
      authenticator: {
        router: {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
          borderWidth: '0',
        },
      },
      button: {
        primary: {
          backgroundColor: '{colors.blue.60}',
          _hover: {
            backgroundColor: '{colors.blue.80}',
          },
        },
      },
    },
  },
};

interface AmplifyAuthenticatorProps {
  children: ReactNode;
}

/**
 * Alternative authentication wrapper using AWS Amplify UI components.
 * This provides a pre-built, customizable authentication UI.
 * 
 * Use this component if you want the full Amplify authentication experience
 * including sign-up, password reset, and MFA support.
 * 
 * For a custom login UI, use the AuthProvider with the LoginPage component instead.
 */
function AmplifyAuthenticator({ children }: AmplifyAuthenticatorProps) {
  return (
    <ThemeProvider theme={theme}>
      <Authenticator
        hideSignUp={true}
        loginMechanisms={['email']}
        components={{
          Header() {
            return (
              <div className="text-center py-6">
                <h1 className="text-2xl font-bold text-blue-600">
                  Church Member Management
                </h1>
                <p className="text-gray-600 mt-2">
                  Sign in to access your dashboard
                </p>
              </div>
            );
          },
          Footer() {
            return (
              <div className="text-center py-4">
                <p className="text-sm text-gray-500">
                  Powered by AWS &amp; Airtable
                </p>
              </div>
            );
          },
        }}
      >
        {children}
      </Authenticator>
    </ThemeProvider>
  );
}

export default AmplifyAuthenticator;

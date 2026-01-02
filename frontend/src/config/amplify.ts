// AWS Amplify configuration
// These values should be set from environment variables in production

export const amplifyConfig = {
  Auth: {
    Cognito: {
      userPoolId: import.meta.env.VITE_COGNITO_USER_POOL_ID || '',
      userPoolClientId: import.meta.env.VITE_COGNITO_CLIENT_ID || '',
      loginWith: {
        email: true,
      },
    },
  },
  API: {
    REST: {
      ChurchAPI: {
        endpoint: import.meta.env.VITE_API_ENDPOINT || 'http://localhost:3000',
        region: import.meta.env.VITE_AWS_REGION || 'eu-west-2',
      },
    },
  },
};

export default amplifyConfig;

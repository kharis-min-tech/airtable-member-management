# Church Member Management - Frontend

React-based frontend application for the Church Member Management System. Built with React 19, TypeScript, Vite, and Tailwind CSS.

## Features

- **Dashboard**: Real-time KPIs and attendance analytics
- **Member Journey**: Track individual member engagement and history
- **Attendance Explorer**: Analyze attendance patterns by service and department
- **Follow-up Management**: Manage follow-up assignments and track progress
- **Admin Views**: Administrative interfaces for member management
- **Forms Integration**: Embedded Airtable forms for data collection
- **Theme Support**: Light and dark mode with persistent preferences
- **Authentication**: AWS Cognito integration with role-based access

## Technology Stack

- **React 19**: Latest React features with improved performance
- **TypeScript**: Type-safe development
- **Vite**: Fast build tooling and HMR
- **Tailwind CSS**: Utility-first styling with Tailus UI components
- **AWS Amplify**: Authentication and API integration
- **Recharts**: Data visualization
- **React Router**: Client-side routing
- **Vitest**: Fast unit testing with property-based tests

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- Backend API deployed and running
- AWS Cognito user pool configured
- Airtable base with required tables

### Installation

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables:
```bash
cp .env.example .env
```

Edit `.env` with your configuration:
- `VITE_COGNITO_USER_POOL_ID`: Your AWS Cognito user pool ID
- `VITE_COGNITO_CLIENT_ID`: Your Cognito app client ID
- `VITE_API_ENDPOINT`: Backend API endpoint URL
- `VITE_AWS_REGION`: AWS region (e.g., eu-west-2)
- `VITE_AIRTABLE_FORMS`: Airtable form configurations
- `VITE_AIRTABLE_CONTACTS_URL`: Airtable contacts embed URL

3. Start development server:
```bash
npm run dev
```

The application will be available at `http://localhost:5173`

## Available Scripts

- `npm run dev`: Start development server with HMR
- `npm run build`: Build for production
- `npm run preview`: Preview production build locally
- `npm run lint`: Run ESLint
- `npm run lint:fix`: Fix ESLint errors automatically
- `npm run format`: Format code with Prettier
- `npm run format:check`: Check code formatting
- `npm run typecheck`: Run TypeScript type checking
- `npm run test`: Run tests once
- `npm run test:watch`: Run tests in watch mode

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── admin/          # Admin-specific views
│   ├── attendance/     # Attendance components
│   ├── common/         # Shared components
│   ├── dashboard/      # Dashboard components
│   ├── members/        # Member-related components
│   └── tailus-ui/      # Tailus UI component library
├── contexts/           # React contexts
│   ├── AuthContext.tsx # Authentication state
│   └── ThemeContext.tsx # Theme preferences
├── hooks/              # Custom React hooks
├── pages/              # Page components
│   ├── admin/         # Admin pages
│   ├── attendance/    # Attendance pages
│   ├── auth/          # Authentication pages
│   ├── dashboard/     # Dashboard pages
│   ├── demo/          # Demo pages
│   ├── followup/      # Follow-up pages
│   ├── forms/         # Forms pages
│   └── members/       # Member pages
├── services/          # API client services
├── types/             # TypeScript type definitions
├── config/            # Configuration files
├── lib/               # Utility functions
└── router/            # Route definitions
```

## Key Concepts

### Authentication

The app uses AWS Cognito for authentication. User context includes:

- `userId`: Cognito user ID
- `email`: User email address
- `role`: User role (pastor, admin, follow_up, department_lead, evangelism)
- `followUpMemberId`: ID of the member record if user is a follow-up member
- `departmentIds`: Array of department IDs if user is a department lead

### Data Scoping

Users see different data based on their role:

- **Pastor**: All members and data
- **Admin**: All members and data
- **Follow-up Member**: Only members assigned to them
- **Department Lead**: Only members in their departments
- **Evangelism**: Evangelism-related data

### Theme System

The app supports light and dark themes with persistent preferences:

- Theme preference stored in localStorage
- Automatic theme switching
- Tailus UI components adapt to theme

## API Integration

The frontend communicates with the backend API using the `church-api` service:

```typescript
import { churchApi } from '@/services';

// Get members
const members = await churchApi.getMembers();

// Get follow-up member capacity
const capacity = await churchApi.getFollowUpMemberCapacity(followUpMemberId);
```

All API responses use consistent property naming:

- `followUpMemberId`: ID of follow-up member
- `followUpMemberName`: Name of follow-up member
- `memberCapacityLimit`: Capacity configuration

## Testing

### Unit Tests

Test individual components and functions:

```bash
npm test
```

### Property-Based Tests

The project includes property-based tests using fast-check to verify universal properties:

```bash
npm test
```

Property tests validate:
- Authentication context property extraction
- Theme persistence across sessions
- Component rendering with various props
- API response structure consistency

## Building for Production

1. Build the application:
```bash
npm run build
```

2. The `dist/` directory contains the production build

3. Preview the production build:
```bash
npm run preview
```

## Deployment

The production build can be deployed to any static hosting service:

- **AWS S3 + CloudFront**: Static website hosting
- **Vercel**: Zero-config deployment
- **Netlify**: Continuous deployment
- **AWS Amplify Hosting**: Integrated with Amplify backend

### Environment Variables

Ensure all required environment variables are configured in your hosting service:

- `VITE_COGNITO_USER_POOL_ID`
- `VITE_COGNITO_CLIENT_ID`
- `VITE_API_ENDPOINT`
- `VITE_AWS_REGION`
- `VITE_AIRTABLE_FORMS`
- `VITE_AIRTABLE_CONTACTS_URL`

## Code Style

- **ESLint**: Enforces code quality rules
- **Prettier**: Maintains consistent formatting
- **TypeScript**: Provides type safety

Run linting and formatting:
```bash
npm run lint:fix
npm run format
```

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs['recommended-typescript'],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

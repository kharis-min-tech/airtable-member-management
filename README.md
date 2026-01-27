# Church Member Management System

A comprehensive member management automation system built with AWS Lambda, Airtable, and React. This system helps churches manage member information, track attendance, handle follow-up assignments, and coordinate evangelism efforts.

## Overview

This application provides a complete solution for church member management with the following key features:

- **Member Management**: Track all church members with their roles, departments, and engagement history
- **Follow-up Assignments**: Assign follow-up members to new visitors and track their progress
- **Attendance Tracking**: Record and analyze attendance patterns across services
- **Evangelism Coordination**: Manage evangelism contacts and conversion tracking
- **Role-Based Access Control**: Secure data access based on user roles and assignments

## Architecture

### Backend (AWS Lambda + Airtable)

The backend is built using AWS CDK and deployed as Lambda functions:

- **API Gateway**: RESTful API endpoints for all operations
- **Lambda Functions**: Serverless handlers for business logic
- **Airtable**: Database for member records, assignments, and attendance
- **DynamoDB**: Configuration storage and user mappings
- **Cognito**: Authentication and authorization

### Frontend (React + TypeScript)

Modern React application with:

- **React 19**: Latest React features
- **TypeScript**: Type-safe development
- **Vite**: Fast build tooling
- **Tailwind CSS**: Utility-first styling
- **AWS Amplify**: Authentication integration

## Key Concepts

### Member Roles

All participants in the church are considered "members" who may take on various roles:

- **Pastor**: Full access to all data and administrative functions
- **Admin**: Administrative access to manage members and view reports
- **Follow-up Member**: Members who provide follow-up support to new visitors
- **Department Lead**: Leaders who manage specific departments
- **Evangelism**: Members involved in evangelism efforts

### Follow-up System

The follow-up system assigns follow-up members to new visitors and tracks their engagement:

- **Capacity Management**: Each follow-up member has a configurable capacity limit (default: 20 active assignments)
- **Automatic Assignment**: New visitors are automatically assigned to available follow-up members
- **Progress Tracking**: Track follow-up interactions and completion status
- **Reassignment**: Automatically reassign when follow-up members reach capacity

### Configuration

The system uses the following configuration properties:

- **memberCapacityLimit**: Maximum number of active assignments per follow-up member (default: 20)
- **defaultFollowUpDueDays**: Number of days until follow-up is due (default: 3)
- **churchId**: Unique identifier for the church (multi-tenant support)

## Project Structure

```
.
├── src/                    # Backend Lambda functions
│   ├── handlers/          # API endpoint handlers
│   ├── services/          # Business logic services
│   └── types/             # TypeScript type definitions
├── frontend/              # React frontend application
│   ├── src/
│   │   ├── components/   # React components
│   │   ├── contexts/     # React contexts (Auth, Theme)
│   │   ├── pages/        # Page components
│   │   ├── services/     # API client services
│   │   └── types/        # Frontend type definitions
│   └── public/           # Static assets
├── lib/                   # CDK infrastructure code
├── test/                  # Backend tests (unit + property-based)
└── .kiro/                # Kiro AI specifications
```

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- AWS CLI configured with appropriate credentials
- Airtable account with API key
- AWS Cognito user pool configured

### Backend Setup

1. Install dependencies:
```bash
npm install
```

2. Configure environment variables (see Configuration section)

3. Build the project:
```bash
npm run build
```

4. Deploy to AWS:
```bash
npm run cdk:deploy
```

### Frontend Setup

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Copy `.env.example` to `.env` and configure:
```bash
cp .env.example .env
```

4. Start development server:
```bash
npm run dev
```

## Configuration

### Backend Environment Variables

The backend uses the following configuration properties stored in DynamoDB:

- `memberCapacityLimit`: Maximum active assignments per follow-up member
- `defaultFollowUpDueDays`: Days until follow-up is due
- `churchId`: Church identifier for multi-tenant support
- `airtableApiKey`: Airtable API key (encrypted)
- `airtableBaseId`: Airtable base ID

### Frontend Environment Variables

See `frontend/.env.example` for required frontend configuration:

- `VITE_COGNITO_USER_POOL_ID`: AWS Cognito user pool ID
- `VITE_COGNITO_CLIENT_ID`: AWS Cognito client ID
- `VITE_API_ENDPOINT`: Backend API endpoint URL
- `VITE_AWS_REGION`: AWS region
- `VITE_AIRTABLE_FORMS`: Airtable form configurations
- `VITE_AIRTABLE_CONTACTS_URL`: Airtable contacts embed URL

## Testing

### Backend Tests

Run all backend tests:
```bash
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

The backend includes both unit tests and property-based tests for comprehensive coverage.

### Frontend Tests

Run frontend tests:
```bash
cd frontend
npm test
```

Run tests in watch mode:
```bash
npm run test:watch
```

## API Documentation

### Authentication

All API endpoints require authentication via AWS Cognito. Include the JWT token in the Authorization header:

```
Authorization: Bearer <token>
```

### Key Endpoints

- `GET /members`: List all members (filtered by user's data scope)
- `GET /members/{id}`: Get member details
- `POST /follow-up/assign`: Create follow-up assignment
- `GET /follow-up/capacity/{followUpMemberId}`: Get follow-up member capacity info
- `GET /attendance`: Query attendance records
- `POST /first-timer`: Register new first-time visitor

### Response Format

All API responses use the following property naming conventions:

- `followUpMemberId`: ID of the member providing follow-up support
- `memberCapacityLimit`: Capacity limit configuration
- `followUpMemberName`: Name of the follow-up member

## Development

### Code Style

- TypeScript for type safety
- ESLint for code quality
- Prettier for code formatting (frontend)
- Property-based testing for correctness validation

### Testing Strategy

The project uses a dual testing approach:

1. **Unit Tests**: Verify specific examples and edge cases
2. **Property-Based Tests**: Verify universal properties across all inputs (minimum 100 iterations)

### Contributing

1. Create a feature branch
2. Make your changes
3. Run tests to ensure everything passes
4. Submit a pull request

## Deployment

### Backend Deployment

Deploy using AWS CDK:

```bash
npm run cdk:deploy
```

### Frontend Deployment

Build for production:

```bash
cd frontend
npm run build
```

The `dist/` directory contains the production build ready for deployment to your hosting service.

## License

MIT

## Support

For questions or issues, please contact the development team.

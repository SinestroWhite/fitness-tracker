# Fitness Backend API

A comprehensive Node.js and Express.js backend for fitness tracking applications with user management, personal profiles, and progress tracking.

## Features

- **User Management**: Registration, authentication, role-based access control
- **Personal Profiles**: User fitness goals, measurements, and plan assignments
- **Progress Tracking**: Weight, body fat, and photo progress with image uploads
- **JWT Authentication**: Access and refresh token system
- **Role-based Authorization**: User, Trainer, and Admin roles
- **File Uploads**: Progress photos with automatic cleanup
- **Pagination & Filtering**: Efficient data retrieval with sorting options
- **Input Validation**: Comprehensive request validation
- **Error Handling**: Standardized error responses

## Quick Start

1. **Install Dependencies**
   \`\`\`bash
   npm install
   \`\`\`

2. **Environment Setup**
   \`\`\`bash
   cp .env.example .env
   # Edit .env with your configuration
   \`\`\`

3. **Start Development Server**
   \`\`\`bash
   npm run dev
   \`\`\`

4. **Production Start**
   \`\`\`bash
   npm start
   \`\`\`

## API Documentation

### Authentication Endpoints

- `POST /auth/register` - Create new user account
- `POST /auth/login` - User login with email/password
- `POST /auth/refresh` - Refresh access token
- `POST /auth/logout` - Invalidate refresh token

### User Management

- `GET /users` - List all users (admin only)
- `GET /users/:id` - Get user by ID (admin or owner)
- `POST /users` - Create user (admin only)
- `PUT /users/:id` - Update user (admin or owner)
- `DELETE /users/:id` - Delete user (admin only)
- `GET /users/me` - Get current user profile
- `PUT /users/me` - Update own profile

### Personal Profiles

- `GET /user-personal/me` - Get own personal profile
- `PUT /user-personal/me` - Update/create personal profile
- `GET /user-personal/:userId` - Get user's profile (admin/trainer)
- `PUT /user-personal/:userId` - Update user's profile (admin)

### Progress Tracking

- `GET /progress/me` - Get own progress entries
- `POST /progress/me` - Create progress entry with photos
- `GET /progress/:userId` - Get user's progress (admin/trainer/owner)
- `PUT /progress/:id` - Update progress entry (owner)
- `DELETE /progress/:id` - Delete progress entry (owner)

## Data Models

### User
- `id` - Primary key
- `email` - Unique email address
- `passwordHash` - Bcrypt hashed password
- `name` - User's full name
- `role` - user | trainer | admin
- `createdAt` - Registration timestamp

### UserPersonal
- `id` - Primary key
- `userId` - Foreign key to User
- `sex` - male | female
- `height` - Height in cm
- `goal` - lose | gain | keep
- `nutritionPlanId` - Optional nutrition plan reference
- `workoutPlanId` - Optional workout plan reference

### Progress
- `id` - Primary key
- `userId` - Foreign key to User
- `weightKg` - Weight in kilograms
- `bodyFat` - Body fat percentage (optional)
- `images` - JSON array of image paths
- `createdAt` - Entry timestamp

## Authorization Levels

- **User**: Can read/write own data
- **Trainer**: Can create domain content and read user data
- **Admin**: Full system access

## Query Parameters

- `page` - Page number for pagination
- `pageSize` - Items per page (max 100)
- `sort` - Sort field and direction (e.g., `createdAt:desc`)
- `include` - Include related data
- Filtering varies by endpoint

## Error Responses

All errors follow the standard format:
\`\`\`json
{
  "error": "Error message",
  "details": "Additional details (optional)"
}
\`\`\`

## File Uploads

Progress photos are uploaded to `/uploads` directory with automatic:
- File size limits (5MB default)
- Image type validation
- Unique filename generation
- Cleanup on entry deletion

## Development

- Uses SQLite for development database
- Automatic table creation on startup
- Hot reload with nodemon
- Comprehensive input validation
- Security headers and rate limiting

## Environment Variables

See `.env.example` for all required configuration options including JWT secrets, database path, and upload settings.

# PowerWacth Main

PowerWacth is a full-stack role-based job platform with separate experiences for job seekers, employers, and admins.

The system includes:
- Account registration and login with JWT authentication
- Job posting and job application workflows
- Employer applicant management (status updates and notes)
- Real-time and API-driven messaging between users
- Role-aware profile and onboarding flows

## Tech Stack

### Frontend
- React (Vite)
- React Router
- Axios
- Socket.IO Client
- CSS

### Backend
- Node.js
- Express
- MongoDB + Mongoose
- JWT authentication
- Multer for file uploads
- Socket.IO

## Repository Structure

- client: React frontend
- server: Express API and Socket.IO server
- server/uploads: uploaded files (resumes, IDs, documents)

## User Roles

- resident: job seeker
- employer: company account that can post jobs and manage applicants
- admin: system management role

## Core Features

### Resident (Job Seeker)
- Register and login
- Browse job listings
- View job details
- Apply to jobs with cover letter and resume
- Update or withdraw own applications
- View employer profile details from job cards
- Access messaging inbox
- Manage profile and onboarding details

### Employer
- Register as employer
- Create, update, and close job postings
- View applicants per job
- Update applicant status with employer note
- Access employer dashboard stats
- Message applicants
- Maintain employer profile and verification details

### Admin
- View users
- View analytics
- Generate invite codes and promote users to employer

## API Overview

Base URL: http://localhost:3000/api

### Auth
- POST /auth/register
- POST /auth/login
- GET /auth/me
- GET /auth/profile
- PUT /auth/profile
- DELETE /auth/profile
- POST /auth/register/employer
- POST /auth/invite (admin)
- PATCH /auth/promote/:userId (admin)

### Jobs
- GET /jobs
- GET /jobs/:id
- POST /jobs (employer)
- PUT /jobs/:id (employer)
- DELETE /jobs/:id (employer)
- POST /jobs/:id/apply (resident)
- GET /jobs/applications/me (resident)
- PUT /jobs/applications/:id (resident)
- DELETE /jobs/applications/:id (resident)
- GET /jobs/mine (employer)

### Employer
- GET /employer/stats
- GET /employer/profile-stats
- GET /employer/jobs
- POST /employer/jobs
- PUT /employer/jobs/:id
- DELETE /employer/jobs/:id
- GET /employer/jobs/:jobId/applicants
- PUT /employer/applications/:applicationId/status

### Messaging
- POST /messages/conversations
- GET /messages/conversations
- GET /messages/conversations/:conversationId/messages
- POST /messages/conversations/:conversationId/messages
- DELETE /messages/conversations/:conversationId
- GET /messages/unread-count

### Admin
- GET /admin/users
- GET /admin/analytics

## Environment Variables

Create server/.env with:

PORT=3000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret

## Local Development

Open two terminals.

### Terminal 1 (Backend)
1. cd server
2. npm install
3. npm run dev

### Terminal 2 (Frontend)
1. cd client
2. npm install
3. npm run dev

Frontend default URL: http://localhost:5173
Backend default URL: http://localhost:3000

## Production Run

### Backend
1. cd server
2. npm start

### Frontend build
1. cd client
2. npm run build
3. npm run preview

## File Upload Notes

- Upload destination: server/uploads
- Accepted files include common document and image formats used by resume/profile flows
- Max upload size is configured at 10MB in route middleware

## Troubleshooting

### Dashboard says "Failed to load dashboard content"
- Confirm backend is running on port 3000
- Confirm frontend is running on port 5173
- Confirm token exists in local storage after login
- Check that MONGO_URI and JWT_SECRET are set

### CORS issues
- Backend allows origin http://localhost:5173
- If frontend runs on a different port, update CORS config in server/server.js

### Empty jobs or applications
- Verify logged-in account role
- Verify data exists in MongoDB
- Check API responses in browser network tab

## Notes

- This README reflects the current code structure and routes in this repository.
- If you add new modules (for example notifications), update this document to keep onboarding accurate.

# CleanWay - Civic Issue Reporting System

A modern web application for reporting and managing civic sanitation issues with a full-stack implementation including database storage.

## Features

### For Citizens (Users)
- **Easy Issue Reporting**: Upload photos, add location, and describe sanitation issues
- **Real-time Tracking**: Monitor the status of your reported issues
- **Community Dashboard**: View community statistics and impact
- **Mobile-friendly Interface**: Responsive design for all devices

### For Authorities
- **Dashboard Analytics**: View comprehensive statistics and reports
- **Issue Management**: Update status of reported issues (submitted → in progress → resolved)
- **Priority Management**: AI-powered severity classification
- **Response Time Tracking**: Monitor average response times

### Technical Features
- **Database Storage**: SQLite database for persistent data storage
- **Authentication**: JWT-based authentication with role-based access
- **File Upload**: Image upload for issue documentation
- **Real-time Updates**: Live data synchronization
- **Dark/Light Theme**: User preference support

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite** for fast development and building
- **Tailwind CSS** for styling
- **Lucide React** for icons

### Backend
- **Node.js** with Express
- **SQLite** database
- **JWT** for authentication
- **Multer** for file uploads
- **bcryptjs** for password hashing

## Setup Instructions

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn

### Installation

1. **Clone and navigate to the project directory**
   ```bash
   cd project
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev:full
   ```
   This will start both the backend server (port 3001) and frontend development server (port 5173).

### Alternative: Run servers separately

**Backend only:**
```bash
npm run server
```

**Frontend only:**
```bash
npm run dev
```

## Database Setup

The application automatically creates the database and tables on first run. The SQLite database file will be created at `server/civic_reports.db`.

### Database Schema

**Users Table:**
- `id` (Primary Key)
- `username` (Unique)
- `password` (Hashed)
- `role` (user/authority)
- `created_at`

**Reports Table:**
- `id` (Primary Key)
- `type` (garbage/drainage/stagnant_water/other)
- `severity` (low/medium/high/critical)
- `description`
- `location`
- `image_path`
- `status` (submitted/in_progress/resolved)
- `timestamp`
- `reporter_id` (Foreign Key to Users)

## Default Users

The system comes with two default users for testing:

### Citizen User
- **Username**: `user`
- **Password**: `user123`
- **Role**: User

### Authority User
- **Username**: `authority`
- **Password**: `auth123`
- **Role**: Authority

## API Endpoints

### Authentication
- `POST /api/login` - User login

### Reports
- `GET /api/reports` - Get all reports (authenticated)
- `POST /api/reports` - Create new report (authenticated)
- `PATCH /api/reports/:id/status` - Update report status (authority only)
- `GET /api/user/reports` - Get user's reports (authenticated)

### Statistics
- `GET /api/stats` - Get system statistics (authenticated)

## Usage

### For Citizens
1. Login with user credentials
2. Navigate to "Report Issue" to submit new reports
3. Use "Community" view to see all reports and statistics
4. Track your submitted reports in the dashboard

### For Authorities
1. Login with authority credentials
2. Use "Dashboard" to view comprehensive statistics
3. Navigate to "Community" to see all reports
4. Click on reports to update their status
5. Monitor response times and resolution rates

## File Structure

```
project/
├── src/
│   ├── services/
│   │   └── api.ts          # API service layer
│   ├── App.tsx             # Main application component
│   ├── Login.tsx           # Login component
│   └── main.tsx            # Application entry point
├── server/
│   ├── uploads/            # Image upload directory
│   ├── civic_reports.db    # SQLite database (auto-created)
│   └── index.js            # Express server
├── package.json
└── README.md
```

## Development

### Adding New Features
1. Update the database schema in `server/index.js`
2. Add new API endpoints
3. Update the API service in `src/services/api.ts`
4. Modify frontend components as needed

### Database Management
- The database is automatically created on first run
- To reset the database, delete `server/civic_reports.db` and restart the server
- Sample data is automatically inserted on first run

## Security Features

- **Password Hashing**: All passwords are hashed using bcrypt
- **JWT Authentication**: Secure token-based authentication
- **Role-based Access**: Different permissions for users and authorities
- **Input Validation**: Server-side validation for all inputs
- **File Upload Security**: Secure file upload handling

## Deployment

### Production Setup
1. Set environment variables:
   - `JWT_SECRET`: Secure secret for JWT tokens
   - `PORT`: Server port (default: 3001)

2. Build the frontend:
   ```bash
   npm run build
   ```

3. Start the production server:
   ```bash
   npm run server
   ```

### Environment Variables
Create a `.env` file in the project root:
```
JWT_SECRET=your-secure-secret-key
PORT=3001
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is open source and available under the MIT License. 
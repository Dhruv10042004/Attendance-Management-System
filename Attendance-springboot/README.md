# Attendance Management System - Spring Boot Migration Guide

## Project Structure

```
Attendance-springboot/
├── src/main/
│   ├── java/com/attendance/
│   │   ├── AttendanceApplication.java          # Main Spring Boot app
│   │   ├── config/
│   │   │   ├── CorsConfig.java                 # CORS configuration
│   │   │   └── SecurityConfig.java             # JWT Security config
│   │   ├── controller/
│   │   │   ├── UserController.java             # User endpoints
│   │   │   ├── SubjectController.java          # Subject endpoints
│   │   │   ├── AttendanceRequestController.java # Attendance endpoints
│   │   │   └── NotificationController.java     # Notification endpoints
│   │   ├── service/
│   │   │   ├── UserService.java                # User business logic
│   │   │   ├── SubjectService.java             # Subject business logic
│   │   │   ├── AttendanceRequestService.java   # Attendance logic
│   │   │   └── NotificationService.java        # Notification logic
│   │   ├── entity/
│   │   │   ├── User.java                       # User entity
│   │   │   ├── Subject.java                    # Subject entity
│   │   │   ├── AttendanceRequest.java          # AttendanceRequest entity
│   │   │   └── Notification.java               # Notification entity
│   │   ├── repository/
│   │   │   ├── UserRepository.java
│   │   │   ├── SubjectRepository.java
│   │   │   ├── AttendanceRequestRepository.java
│   │   │   └── NotificationRepository.java
│   │   ├── dto/
│   │   │   ├── UserDTO.java, UserCreateRequest.java, etc.
│   │   │   └── ApiResponse.java                # Generic API response
│   │   ├── security/
│   │   │   ├── JwtTokenProvider.java           # JWT utilities
│   │   │   └── JwtAuthenticationFilter.java    # JWT filter
│   │   └── exception/
│   │       ├── ResourceNotFoundException.java
│   │       ├── BadRequestException.java
│   │       ├── ErrorResponse.java
│   │       └── GlobalExceptionHandler.java
│   └── resources/
│       └── application.yml                     # Configuration file
└── pom.xml                                     # Maven dependencies
```

## Prerequisites

- Java 17+
- Maven 3.8+
- MongoDB (local or Atlas)
- Node.js & npm (for React frontend)

## Setup Instructions

### 1. Install Java and Maven

```bash
# Check Java version (should be 17+)
java -version

# Check Maven version (should be 3.8+)
mvn -version
```

### 2. Install MongoDB

**Option A: Local Installation**
- Download from: https://www.mongodb.com/try/download/community
- Install and start the MongoDB service
- Default connection: `mongodb://localhost:27017/attendance_db`

**Option B: MongoDB Atlas (Cloud)**
- Go to: https://www.mongodb.com/cloud/atlas
- Create a free cluster
- Get connection string in format: `mongodb+srv://username:password@cluster.mongodb.net/attendance_db`

### 3. Clone or Navigate to Project

```bash
cd Attendance-springboot
```

### 4. Configure MongoDB Connection

Edit `src/main/resources/application.yml`:

```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/attendance_db
      # OR for Atlas:
      # uri: mongodb+srv://username:password@cluster.mongodb.net/attendance_db
```

### 5. Build the Project

```bash
mvn clean install
```

### 6. Run the Application

```bash
mvn spring-boot:run
```

Or run from IDE by right-clicking `AttendanceApplication.java` → Run

The backend will start on `http://localhost:8080/api`

## API Endpoints

### User Endpoints

```
POST   /api/users/login              # Login (returns JWT token)
GET    /api/users                    # Get all users
GET    /api/users/{id}               # Get user by ID
GET    /api/users/search?query=...   # Search users
GET    /api/users/teachers           # Get all teachers
GET    /api/users/role/{role}        # Get users by role
GET    /api/users/class/{className}  # Get users by class
POST   /api/users                    # Create user
PUT    /api/users/{id}               # Update user
DELETE /api/users/{id}               # Delete user
DELETE /api/users/bulk/{role}        # Delete all users with role
```

### Subject Endpoints

```
GET    /api/subjects                          # Get all subjects
GET    /api/subjects/{id}                     # Get subject by ID
GET    /api/subjects/teacher/{teacherId}     # Get teacher's subjects
GET    /api/subjects/class/{className}       # Get class subjects
GET    /api/subjects/day/{day}                # Get subjects by day
GET    /api/subjects/schedule/{class}/{day}  # Get timetable
GET    /api/subjects/search?query=...        # Search subjects
POST   /api/subjects                         # Create subject
PUT    /api/subjects/{id}                    # Update subject
DELETE /api/subjects/{id}                    # Delete subject
```

### Attendance Request Endpoints

```
GET    /api/attendance-requests                      # Get all requests
GET    /api/attendance-requests/{id}                 # Get request by ID
GET    /api/attendance-requests/student/{studentId}  # Get student requests
GET    /api/attendance-requests/status/{status}      # Get by status
GET    /api/attendance-requests/stats/{studentId}    # Get student stats
POST   /api/attendance-requests                      # Create request
PUT    /api/attendance-requests/{id}                 # Update request
PUT    /api/attendance-requests/{id}/status          # Approve/Reject
DELETE /api/attendance-requests/{id}                 # Delete request
```

### Notification Endpoints

```
GET    /api/notifications                                  # Get all
GET    /api/notifications/{id}                             # Get by ID
GET    /api/notifications/teacher/{teacherId}             # Teacher's notifications
GET    /api/notifications/student/{studentId}             # Student's notifications
GET    /api/notifications/unread                          # Unread only
GET    /api/notifications/attendance-request/{requestId}  # For attendance request
POST   /api/notifications                                 # Create notification
PUT    /api/notifications/{id}/read                       # Mark as read
DELETE /api/notifications/{id}                            # Delete
```

## Frontend Integration

### Update React API Calls

In your React frontend, change the API base URL:

**Before (Node.js):**
```typescript
const API_BASE = 'http://localhost:3001/api'
```

**After (Spring Boot):**
```typescript
const API_BASE = 'http://localhost:8080/api'
```

### Update AuthContext

The JWT token handling remains the same:

```typescript
// Save token after login
localStorage.setItem('token', loginResponse.data.token);

// Send token in headers
headers: {
    'Authorization': `Bearer ${token}`
}
```

## Key Features Implemented

✅ User Management (CRUD)
✅ Role-based Access (student, teacher, hod, admin)
✅ Subject Management with Timetable
✅ Attendance Request System
✅ Notifications System
✅ JWT Authentication
✅ MongoDB Integration
✅ Exception Handling
✅ API Response Wrapper
✅ CORS Configuration
✅ Password Encryption (BCrypt)

## Common Issues & Solutions

### 1. MongoDB Connection Failed
```
Error: connect ECONNREFUSED
```
**Solution:** Ensure MongoDB is running locally or check connection string for Atlas

### 2. Port Already in Use
```
Error: Port 8080 already in use
```
**Solution:** Change port in `application.yml`:
```yaml
server:
  port: 8081  # Change to different port
```

### 3. JWT Token Invalid
**Solution:** Change JWT secret in `application.yml`:
```yaml
app:
  jwtSecret: your_new_secret_key_minimum_256_bits_long
```

## Testing with Postman

1. **Login**
   - POST: `http://localhost:8080/api/users/login`
   - Body: `{"email": "user@example.com", "password": "password"}`
   - Copy the `token` from response

2. **Authenticated Requests**
   - Add Header: `Authorization: Bearer <token>`
   - Make requests to protected endpoints

## Build for Production

```bash
mvn clean package -DskipTests
```

This creates a JAR file in `target/attendance-management-system-1.0.0.jar`

Run in production:
```bash
java -jar target/attendance-management-system-1.0.0.jar
```

## Next Steps

1. Update React frontend to use new API endpoints
2. Test all endpoints with Postman
3. Implement file upload for attendance proofs
4. Add logging and monitoring
5. Deploy to cloud (AWS, Azure, Google Cloud)

## Database Schema

All data is stored in MongoDB collections:
- `users` - User accounts
- `subjects` - Class subjects/timetable
- `attendance_requests` - Attendance requests from students
- `notifications` - Notifications to users

MongoDB handles schema flexibility, so you can easily add new fields as needed.

## Support & Troubleshooting

For detailed logs, check console output or add to `application.yml`:
```yaml
logging:
  level:
    com.attendance: DEBUG
```

---

**Happy Coding! 🚀**

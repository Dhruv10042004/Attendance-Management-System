# Attendance Management System - API Documentation

## Base URL
```
http://localhost:8080/api
```

## Authentication
Most endpoints require a JWT token. Include it in the header:
```
Authorization: Bearer <token>
```

---

## 1. User Endpoints

### 1.1 Login
**POST** `/users/login`

Request:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzUxMiJ9...",
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "sap": "SAP001",
      "name": "John Doe",
      "email": "john@example.com",
      "className": "Class 10-A",
      "role": "student",
      "isFirstLogin": true
    }
  }
}
```

---

### 1.2 Get All Users
**GET** `/users`

Response:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": [
    {
      "id": "507f1f77bcf86cd799439011",
      "sap": "SAP001",
      "name": "John Doe",
      "email": "john@example.com",
      "className": "Class 10-A",
      "role": "student",
      "isFirstLogin": true
    }
  ]
}
```

---

### 1.3 Get User by ID
**GET** `/users/{id}`

Parameters:
- `id` (path): User MongoDB ID

Response: Single user object

---

### 1.4 Search Users
**GET** `/users/search?query=john`

Parameters:
- `query` (query): Search string (searches in names)

Response: Array of matching users

---

### 1.5 Get All Teachers
**GET** `/users/teachers`

Response: Array of teacher objects

---

### 1.6 Get Users by Role
**GET** `/users/role/{role}`

Parameters:
- `role` (path): student, teacher, hod, admin

Response: Array of users with specified role

---

### 1.7 Get Users by Class
**GET** `/users/class/{className}`

Parameters:
- `className` (path): Class name

Response: Array of users in specified class

---

### 1.8 Create User
**POST** `/users`

Request:
```json
{
  "sap": "SAP001",
  "name": "Jane Smith",
  "email": "jane@example.com",
  "password": "password123",
  "className": "Class 10-B",
  "role": "student",
  "isFirstLogin": true
}
```

Response: Created user object

Status Code: `201 Created`

---

### 1.9 Update User
**PUT** `/users/{id}`

Request:
```json
{
  "name": "Jane Smith Updated",
  "className": "Class 10-C",
  "role": "student",
  "isFirstLogin": false
}
```

Response: Updated user object

---

### 1.10 Delete User
**DELETE** `/users/{id}`

Response:
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

---

### 1.11 Delete Users by Role
**DELETE** `/users/bulk/{role}`

Parameters:
- `role` (path): student, teacher, hod

Response:
```json
{
  "success": true,
  "message": "Successfully deleted 25 users with role: student"
}
```

---

## 2. Subject Endpoints

### 2.1 Get All Subjects
**GET** `/subjects`

Response: Array of all subjects

---

### 2.2 Get Subject by ID
**GET** `/subjects/{id}`

Response: Single subject object

---

### 2.3 Get Teacher's Subjects
**GET** `/subjects/teacher/{teacherId}`

Parameters:
- `teacherId` (path): Teacher user ID

Response: Array of subjects taught by teacher

---

### 2.4 Get Class Subjects
**GET** `/subjects/class/{className}`

Parameters:
- `className` (path): Class name

Response: Array of subjects for the class

---

### 2.5 Get Subjects by Day
**GET** `/subjects/day/{day}`

Parameters:
- `day` (path): Monday, Tuesday, Wednesday, Thursday, Friday, Saturday

Response: Array of subjects on that day

---

### 2.6 Get Class Timetable
**GET** `/subjects/schedule/{className}/{day}`

Parameters:
- `className` (path): Class name
- `day` (path): Day of week

Response: Array of subjects for class on specific day

---

### 2.7 Search Subjects
**GET** `/subjects/search?query=math`

Parameters:
- `query` (query): Search string

Response: Array of matching subjects

---

### 2.8 Create Subject
**POST** `/subjects`

Request:
```json
{
  "name": "Mathematics",
  "startTime": "09:00",
  "endTime": "10:00",
  "teacherId": "507f1f77bcf86cd799439011",
  "className": "Class 10-A",
  "day": "Monday"
}
```

Response: Created subject object

Status Code: `201 Created`

---

### 2.9 Update Subject
**PUT** `/subjects/{id}`

Request:
```json
{
  "name": "Advanced Mathematics",
  "startTime": "09:30",
  "endTime": "10:30"
}
```

Response: Updated subject object

---

### 2.10 Delete Subject
**DELETE** `/subjects/{id}`

Response: Success message

---

## 3. Attendance Request Endpoints

### 3.1 Get All Requests
**GET** `/attendance-requests`

Response: Array of all attendance requests

---

### 3.2 Get Request by ID
**GET** `/attendance-requests/{id}`

Response: Single attendance request object

---

### 3.3 Get Student's Requests
**GET** `/attendance-requests/student/{studentId}`

Parameters:
- `studentId` (path): Student user ID

Response: Array of student's requests

---

### 3.4 Get Requests by Status
**GET** `/attendance-requests/status/{status}`

Parameters:
- `status` (path): pending, approved, rejected

Response: Array of requests with specified status

---

### 3.5 Get Student Statistics
**GET** `/attendance-requests/stats/{studentId}`

Parameters:
- `studentId` (path): Student user ID

Response:
```json
{
  "success": true,
  "message": "Statistics retrieved successfully",
  "data": {
    "totalRequests": 10,
    "approvedRequests": 7,
    "rejectedRequests": 2,
    "pendingRequests": 1
  }
}
```

---

### 3.6 Create Attendance Request
**POST** `/attendance-requests`

Request:
```json
{
  "name": "Medical Leave",
  "reason": "Doctor appointment - prescription attached",
  "studentId": "507f1f77bcf86cd799439011",
  "subjectDates": [
    {
      "subjectId": "507f1f77bcf86cd799439012",
      "date": "2024-01-15T10:00:00"
    },
    {
      "subjectId": "507f1f77bcf86cd799439013",
      "date": "2024-01-16T10:00:00"
    }
  ],
  "date": "2024-01-15T10:00:00"
}
```

Response: Created request object

Status Code: `201 Created`

---

### 3.7 Update Request
**PUT** `/attendance-requests/{id}`

Request:
```json
{
  "reason": "Updated reason - better medical proof attached"
}
```

Response: Updated request object

---

### 3.8 Update Request Status
**PUT** `/attendance-requests/{id}/status`

Request:
```json
{
  "status": "approved"
}
```

Parameters:
- `status`: approved or rejected

Response: Updated request object with new status

---

### 3.9 Delete Request
**DELETE** `/attendance-requests/{id}`

Response: Success message

---

## 4. Notification Endpoints

### 4.1 Get All Notifications
**GET** `/notifications`

Response: Array of all notifications

---

### 4.2 Get Notification by ID
**GET** `/notifications/{id}`

Response: Single notification object

---

### 4.3 Get Teacher's Notifications
**GET** `/notifications/teacher/{teacherId}`

Parameters:
- `teacherId` (path): Teacher user ID

Response: Array of teacher's notifications

---

### 4.4 Get Student's Notifications
**GET** `/notifications/student/{studentId}`

Parameters:
- `studentId` (path): Student user ID

Response: Array of student's notifications

---

### 4.5 Get Unread Notifications
**GET** `/notifications/unread`

Response: Array of unread notifications

---

### 4.6 Get Notifications for Request
**GET** `/notifications/attendance-request/{requestId}`

Parameters:
- `requestId` (path): Attendance request ID

Response: Array of notifications for the request

---

### 4.7 Create Notification
**POST** `/notifications`

Request:
```json
{
  "attendanceRequestId": "507f1f77bcf86cd799439011",
  "teacherId": "507f1f77bcf86cd799439012",
  "studentIds": ["507f1f77bcf86cd799439013"],
  "subjectId": "507f1f77bcf86cd799439014",
  "date": "2024-01-15T10:00:00"
}
```

Response: Created notification object

Status Code: `201 Created`

---

### 4.8 Mark as Read
**PUT** `/notifications/{id}/read`

Response: Updated notification object with `isRead: true`

---

### 4.9 Delete Notification
**DELETE** `/notifications/{id}`

Response: Success message

---

## Error Responses

### 400 Bad Request
```json
{
  "success": false,
  "message": "Email already exists"
}
```

### 401 Unauthorized
```json
{
  "success": false,
  "message": "Invalid email or password"
}
```

### 404 Not Found
```json
{
  "timestamp": "2024-01-15T10:00:00",
  "message": "User not found with id: 507f1f77bcf86cd799439011",
  "error": "Resource Not Found",
  "status": 404
}
```

### 500 Internal Server Error
```json
{
  "timestamp": "2024-01-15T10:00:00",
  "message": "Internal server error details",
  "error": "Internal Server Error",
  "status": 500
}
```

---

## Common Status Codes

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication failed
- `404 Not Found` - Resource not found
- `500 Internal Server Error` - Server error

---

## Data Types

### Time Format
- Format: `HH:MM` (e.g., "09:00", "14:30")
- 24-hour format

### DateTime Format
- ISO 8601: `YYYY-MM-DDTHH:MM:SS` (e.g., "2024-01-15T10:00:00")

### Roles
- `student` - Student user
- `teacher` - Teacher/Faculty
- `hod` - Head of Department
- `admin` - Administrator

### Days
- Monday, Tuesday, Wednesday, Thursday, Friday, Saturday

### Request Status
- `pending` - Awaiting approval
- `approved` - Request approved
- `rejected` - Request rejected

---

## Example Workflow

### 1. Create Students
```bash
POST /users
{
  "sap": "SAP001",
  "name": "Student One",
  "email": "student1@example.com",
  "password": "pass123",
  "role": "student",
  "className": "Class 10-A"
}
```

### 2. Create Teacher
```bash
POST /users
{
  "sap": "TEACH001",
  "name": "Teacher One",
  "email": "teacher1@example.com",
  "password": "pass123",
  "role": "teacher",
  "className": "Class 10"
}
```

### 3. Create Subject
```bash
POST /subjects
{
  "name": "Mathematics",
  "startTime": "09:00",
  "endTime": "10:00",
  "teacherId": "<teacher_id>",
  "className": "Class 10-A",
  "day": "Monday"
}
```

### 4. Student Login
```bash
POST /users/login
{
  "email": "student1@example.com",
  "password": "pass123"
}
```

### 5. Create Attendance Request
```bash
POST /attendance-requests
{
  "name": "Medical Leave",
  "reason": "Doctor appointment",
  "studentId": "<student_id>",
  "subjectDates": [
    {
      "subjectId": "<subject_id>",
      "date": "2024-01-15T09:30:00"
    }
  ],
  "date": "2024-01-15T09:30:00"
}
```

### 6. Teacher Approves Request
```bash
PUT /attendance-requests/<request_id>/status
{
  "status": "approved"
}
```

### 7. Get Student Stats
```bash
GET /attendance-requests/stats/<student_id>
```

---

## Rate Limiting
Currently no rate limiting is implemented. Consider adding it for production.

## CORS
Allowed origins: `http://localhost:5173`, `http://localhost:3000`

---

**API Documentation v1.0**

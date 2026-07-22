# Attendance Management System

A full-stack attendance management platform for educational institutions. Students raise attendance/leave requests, teachers get notified when their students will be absent, and HODs/Admins manage users, timetables, and approvals.

The project is split into two folders:

```
├── Attendance-springboot/     # Java Spring Boot REST API + MongoDB
├── Attendance-js-frontend/    # React (Vite) single-page application
└── README.md                  # You are here
```

---

## Table of Contents

- [Overview](#overview)
- [Tech Stack](#tech-stack)
- [Features](#features)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Backend Setup (Attendance-springboot)](#backend-setup-attendance-springboot)
- [Frontend Setup (Attendance-js-frontend)](#frontend-setup-attendance-js-frontend)
- [Environment Variables](#environment-variables)
- [Running Both Together](#running-both-together)
- [API Reference](#api-reference)
- [User Roles](#user-roles)
- [Troubleshooting](#troubleshooting)

---

## Overview

This system digitizes the attendance/leave-request workflow for a college or school:

1. **Students** submit an attendance request (with reason, subjects/dates, optional proof document) — either for themselves or as a group with classmates.
2. **HODs** review, approve, or reject requests for their department.
3. **Teachers** see which of their students will be absent for their classes, filtered by date range.
4. **Admins** manage user accounts (single or bulk CSV import), roles, and departments, and maintain the class timetable.

## Tech Stack

**Backend**
- Java 17, Spring Boot 3.2
- Spring Web, Spring Security (JWT-based auth), Spring Data MongoDB
- MongoDB (Atlas or local)
- Cloudinary (attendance proof file storage)
- ModelMapper, Lombok, Apache Commons CSV
- Maven

**Frontend**
- React 18 (Vite)
- React Router
- Axios
- Tailwind CSS (v4) + shadcn/ui-style components (Radix primitives)
- react-hook-form, react-datepicker, date-fns, lucide-react icons

---

## Features

✅ JWT-based authentication & role-based access (student, teacher, hod, admin)
✅ User management — create, update, delete, search, filter, bulk CSV import/export, bulk delete by role
✅ Timetable/subject management per class and day
✅ Attendance/leave request creation (single or grouped students), with proof upload via Cloudinary
✅ Approve/reject workflow with automatic teacher notifications
✅ Department-scoped views for HOD dashboard
✅ Attendance statistics per student (total/approved/rejected/pending)
✅ Dark/light theme toggle on the frontend

---

## Project Structure

```
Attendance-springboot/
├── src/main/java/com/attendance/
│   ├── AttendanceApplication.java
│   ├── config/            # CORS, Security, Cloudinary, Mongo indexes, demo data seeding
│   ├── controller/        # REST controllers (Users, Subjects, AttendanceRequests, Notifications)
│   ├── service/            # Business logic
│   ├── entity/             # MongoDB documents (User, Subject, AttendanceRequest, Notification)
│   ├── repository/         # Spring Data Mongo repositories
│   ├── dto/                 # Request/response DTOs
│   ├── security/            # JWT provider + filter
│   └── exception/            # Custom exceptions + global exception handler
├── src/main/resources/
│   └── application.yml       # Configuration (reads from environment variables)
├── Dockerfile
└── pom.xml

Attendance-js-frontend/
├── src/
│   ├── components/          # Shared UI (shadcn-style components) + ProtectedRoute
│   ├── context/              # AuthContext, ThemeContext
│   ├── lib/                   # axios instance (api.js), utils
│   ├── pages/                  # LoginPage + one dashboard per role
│   └── App.jsx, main.jsx
└── package.json
```

---

## Prerequisites

- **Java 17+**
- **Maven 3.8+**
- **Node.js 18+** and npm
- **MongoDB** — local instance or a free [MongoDB Atlas](https://www.mongodb.com/cloud/atlas) cluster
- A **Cloudinary** account (free tier works) — used to store attendance proof uploads

---

## Backend Setup (Attendance-springboot)

1. **Navigate to the backend folder**

   ```bash
   cd Attendance-springboot
   ```

2. **Create your configuration file**

   Copy the example file and fill in your own values:

   ```bash
   cp src/main/resources/application.yml.example src/main/resources/application.yml
   ```

   > Note: `application.yml` is git-ignored — never commit real secrets to it. See [Environment Variables](#environment-variables) below for what each value means. In production, the values are read from environment variables (`${VAR_NAME}` placeholders already exist in the file), so on Render/Railway/Heroku-style hosts you just need to set the env vars — no need to edit the file.

3. **Set the required environment variables** (locally, you can export them in your shell or use an `.env`-loading tool of your choice):

   | Variable | Description |
   |---|---|
   | `MONGODB_URI` | MongoDB connection string, e.g. `mongodb://localhost:27017/attendance_db` or an Atlas SRV URI |
   | `JWT_SECRET` | A long, random string (256-bit minimum) used to sign JWTs |
   | `PORT` | Port the server listens on (defaults to `8080`) |
   | `DEMO_DATA_ENABLED` | `true`/`false` — seeds demo accounts on startup (see below) |
   | `APP_BASE_URL` | Public base URL of the backend, e.g. `http://localhost:8080` |
   | `UPLOAD_DIR` | Local fallback folder for uploads (defaults to `uploads/attendance-proofs`) |
   | `CLOUDINARY_CLOUD_NAME` | Cloudinary account cloud name |
   | `CLOUDINARY_API_KEY` | Cloudinary API key |
   | `CLOUDINARY_API_SECRET` | Cloudinary API secret |

4. **Build and run**

   ```bash
   mvn clean install
   mvn spring-boot:run
   ```

   Or open the project in your IDE and run `AttendanceApplication.java` directly.

   The API will be available at:

   ```
   http://localhost:8080/api
   ```

5. **(Optional) Seed demo accounts**

   Set `DEMO_DATA_ENABLED=true` before starting the app to auto-create one demo account per role (all use the password `Demo@123`):

   | Role | Email |
   |---|---|
   | Admin | `admin@demo.com` |
   | HOD | `hod@demo.com` |
   | Teacher | `teacher@demo.com` |
   | Student | `student@demo.com` |

6. **(Optional) Run with Docker**

   A `Dockerfile` is included and builds a self-contained runtime image:

   ```bash
   docker build -t attendance-backend .
   docker run -p 8080:8080 --env-file .env attendance-backend
   ```

---

## Frontend Setup (Attendance-js-frontend)

1. **Navigate to the frontend folder**

   ```bash
   cd Attendance-js-frontend
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Point the frontend at your backend**

   The API base URL is read from `VITE_API_BASE_URL` and defaults to `http://localhost:8080/api` (see `src/lib/api.js`). To override it, create a `.env` file in `Attendance-js-frontend/`:

   ```
   VITE_API_BASE_URL=http://localhost:8080/api
   ```

4. **Run the dev server**

   ```bash
   npm run dev
   ```

   The app will be available at:

   ```
   http://localhost:5173
   ```

5. **Build for production**

   ```bash
   npm run build
   npm run preview   # to locally preview the production build
   ```

---

## Environment Variables

### Backend (`Attendance-springboot`)

| Variable | Required | Example |
|---|---|---|
| `MONGODB_URI` | ✅ | `mongodb+srv://user:pass@cluster.mongodb.net/attendance_db` |
| `JWT_SECRET` | ✅ | a random 256-bit+ string |
| `PORT` | ❌ | `8080` |
| `DEMO_DATA_ENABLED` | ❌ | `true` / `false` |
| `APP_BASE_URL` | ❌ | `http://localhost:8080` |
| `UPLOAD_DIR` | ❌ | `uploads/attendance-proofs` |
| `CLOUDINARY_CLOUD_NAME` | ✅ | from your Cloudinary dashboard |
| `CLOUDINARY_API_KEY` | ✅ | from your Cloudinary dashboard |
| `CLOUDINARY_API_SECRET` | ✅ | from your Cloudinary dashboard |

### Frontend (`Attendance-js-frontend`)

| Variable | Required | Example |
|---|---|---|
| `VITE_API_BASE_URL` | ❌ (defaults to `http://localhost:8080/api`) | `https://your-backend.onrender.com/api` |

---

## Running Both Together

From the project root, two convenience scripts are provided that install dependencies and start both servers:

- **Windows:** `Attendance-springboot/start.bat`
- **macOS/Linux:** `Attendance-springboot/start.sh`

```bash
# macOS/Linux
cd Attendance-springboot
chmod +x start.sh
./start.sh
```

This starts:
- Backend on `http://localhost:8080/api`
- Frontend on `http://localhost:5173`

---

## API Reference

All backend routes are prefixed with `/api` (set via `server.servlet.context-path`).

### Users — `/api/users`

| Method | Endpoint | Description |
|---|---|---|
| POST | `/login` | Authenticate, returns JWT + user |
| GET | `/` | List all users |
| GET | `/{id}` | Get user by ID |
| GET | `/search?query=&role=` | Search users by name/email/SAP, optionally filtered by role |
| GET | `/teachers` | List all teachers |
| GET | `/role/{role}` | List users by role |
| GET | `/class/{className}` | List users by class |
| POST | `/` | Create a user |
| PUT | `/{id}` | Update a user |
| DELETE | `/{id}` | Delete a user |
| DELETE | `/bulk/{role}` | Delete all users with a given role |
| POST | `/bulk/csv` | Bulk-create users from an uploaded CSV file |

### Subjects — `/api/subjects`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List all subjects |
| GET | `/{id}` | Get subject by ID |
| GET | `/teacher/{teacherId}` | Subjects taught by a teacher |
| GET | `/class/{className}` | Subjects for a class |
| GET | `/day/{day}` | Subjects on a given day |
| GET | `/schedule/{className}/{day}` | Timetable for class + day |
| GET | `/search?query=` | Search subjects by name |
| POST | `/` | Create a subject |
| PUT | `/{id}` | Update a subject |
| DELETE | `/{id}` | Delete a subject |

### Attendance Requests — `/api/attendance-requests`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List all requests |
| GET | `/{id}` | Get request by ID |
| GET | `/student/{studentId}` | Requests owned by or including a student |
| GET | `/status/{status}` | Filter by status (`pending`/`approved`/`rejected`) |
| GET | `/department/{department}` | Filter by department |
| GET | `/stats/{studentId}` | Aggregate stats for a student |
| POST | `/` | Create a request (multipart form: name, reason, student_id, date, student_ids[], subjectDatesJson, proof file) |
| PUT | `/{id}` | Update a request (multipart form) |
| PUT | `/{id}/status` | Approve/reject a request |
| DELETE | `/{id}` | Delete a request |
| GET | `/proof/{filename}` | Serve a locally-stored proof file (Cloudinary URLs are served directly) |

### Notifications — `/api/notifications`

| Method | Endpoint | Description |
|---|---|---|
| GET | `/` | List all notifications |
| GET | `/{id}` | Get notification by ID |
| GET | `/teacher/{teacherId}?startDate=&endDate=` | Teacher's notifications, optionally date-filtered |
| GET | `/student/{studentId}` | Student's notifications |
| GET | `/unread` | Unread notifications |
| GET | `/attendance-request/{attendanceRequestId}` | Notifications tied to a request |
| POST | `/` | Create a notification |
| PUT | `/{id}/read` | Mark as read |
| DELETE | `/{id}` | Delete a notification |

All endpoints return a consistent envelope:

```json
{
  "success": true,
  "message": "Human readable message",
  "data": { }
}
```

---

## User Roles

| Role | Dashboard route | Capabilities |
|---|---|---|
| `admin` | `/admin` | Manage users (CRUD, bulk import/delete), manage timetable |
| `hod` | `/hod` | Review and approve/reject attendance requests for their department |
| `teacher` | `/teacher` | View student absences for their subjects within a date range |
| `student` | `/student` | Submit, edit, and delete their own attendance requests; view status |

Login redirects users to the correct dashboard automatically based on their role, and unauthorized role access redirects to `/unauthorized`.

---

## Troubleshooting

**MongoDB connection failed**
Ensure MongoDB is running locally, or that your Atlas connection string, username/password, and IP allowlist are correct.

**Port already in use**
Change `PORT` (backend) or run Vite on a different port with `npm run dev -- --port 5174`.

**401 Unauthorized on the frontend**
Confirm the JWT is being stored and sent — check `localStorage` for a `token` key and that `VITE_API_BASE_URL` points at the running backend.

**CSV bulk import skips rows**
Rows are skipped if the email or SAP ID already exists, or if a required column is missing. Check the returned `skipped` list in the API response for the reason per row.

**Proof file upload fails**
Verify `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are set correctly.

---

## License

This project does not currently declare a license. Add one (e.g. MIT) if you plan to share or open-source it.

# Attendance Management System — API Documentation (Current)

This supersedes the original API doc. The attendance-request endpoints in particular changed shape: they moved from JSON bodies to `multipart/form-data`, gained multi-student/multi-subject support, and every read now returns enriched objects (full `UserDTO`/`SubjectDTO`, not just IDs).

## Base URL
```
http://localhost:8080/api
```

## Response Envelope

Every controller wraps its payload:
```json
{ "success": true, "message": "...", "data": { } }
```
except `GlobalExceptionHandler`'s output for uncaught/`ResourceNotFoundException`/`BadRequestException`, which returns a bare `ErrorResponse`:
```json
{ "timestamp": "...", "message": "...", "error": "Resource Not Found", "status": 404 }
```

## Authentication

`POST /users/login` issues a JWT (24h expiry, HS512). Send it as `Authorization: Bearer <token>`.

> **Current state:** `SecurityConfig` permits every request (`.anyRequest().permitAll()`). The JWT filter runs and populates `SecurityContextHolder`, but no endpoint currently rejects missing/invalid tokens or wrong roles. Treat role checks as UI-level only for now, not a server-side guarantee.

---

## 1. User Endpoints (`/users`)

### 1.1 Login — `POST /users/login`
```json
// request
{ "email": "user@example.com", "password": "password123" }
```
```json
// response.data
{
  "token": "eyJhbGciOiJIUzUxMiJ9...",
  "user": {
    "id": "...", "sap": "SAP001", "name": "John Doe", "email": "john@example.com",
    "className": "Class 10-A", "role": "student", "isFirstLogin": true,
    "department": "Computer Science"
  }
}
```
On failure returns `401` with `{ success: false, message: "Invalid email or password" }`.

### 1.2 Get All Users — `GET /users`
### 1.3 Get User by ID — `GET /users/{id}`
### 1.4 Search Users — `GET /users/search?query=&role=`
`role` defaults to `"all"`; matches name, email, or SAP (case-insensitive contains). Passing a specific role narrows the search to that role only.

### 1.5 Get All Teachers — `GET /users/teachers`
### 1.6 Get Users by Role — `GET /users/role/{role}`
### 1.7 Get Users by Class — `GET /users/class/{className}`

### 1.8 Create User — `POST /users`
```json
{
  "sap": "SAP001", "name": "Jane Smith", "email": "jane@example.com",
  "password": "password123", "className": "Class 10-B", "role": "student",
  "isFirstLogin": true, "department": "Computer Science"
}
```
- `email` must be unique → `400 Email already exists`.
- `sap` is optional; if provided and non-blank, must also be unique → `400 SAP already exists`.
- Password is BCrypt-hashed server-side.
- `201 Created`.

### 1.9 Update User — `PUT /users/{id}`
Partial update — only non-null fields in `UserUpdateRequest` are applied: `sap, name, email, className, role, isFirstLogin, department`. Changing `email` or `sap` re-validates uniqueness against other users.

### 1.10 Delete User — `DELETE /users/{id}`
### 1.11 Delete Users by Role — `DELETE /users/bulk/{role}`
Throws `404` if no users have that role.

### 1.12 Bulk CSV Import — `POST /users/bulk/csv`
Multipart form field `file`. Required CSV columns: `sap, name, email, password, role`. Optional: `className, department`. `isFirstLogin` is **always set to `true`** by the importer regardless of any CSV column of that name. Rows whose email (or non-blank sap) already exists are skipped, not overwritten.
```json
// response.data
{ "created": ["a@x.com", "b@x.com"], "skipped": ["c@x.com (already exists)"] }
```

---

## 2. Subject Endpoints (`/subjects`)

Unchanged in shape from the original migration, with one addition: `SubjectDTO` now includes a resolved `teacherName` (looked up server-side; `null` if the teacher record was deleted). `getSubjectById` is cached (`@Cacheable("subjects")`); `updateSubject`/`deleteSubject` evict that cache entry.

```
GET    /subjects
GET    /subjects/{id}
GET    /subjects/teacher/{teacherId}
GET    /subjects/class/{className}
GET    /subjects/day/{day}
GET    /subjects/schedule/{className}/{day}
GET    /subjects/search?query=
POST   /subjects
PUT    /subjects/{id}
DELETE /subjects/{id}
```

`SubjectCreateRequest` / update body:
```json
{ "name": "Mathematics", "startTime": "09:00", "endTime": "10:00", "teacherId": "...", "className": "Class 10-A", "day": "Monday" }
```

---

## 3. Attendance Request Endpoints (`/attendance-requests`)

**These changed the most.** Create/update are now `multipart/form-data`, not JSON, because a proof file can be attached in the same call.

### 3.1 Get All — `GET /attendance-requests`
### 3.2 Get by ID — `GET /attendance-requests/{id}`
### 3.3 Get Student's Requests — `GET /attendance-requests/student/{studentId}`
Returns the union of requests the student **owns** (`studentId`) and requests they were **added to** by someone else (`studentIds` contains them), de-duplicated, owned-first.

### 3.4 Get by Status — `GET /attendance-requests/status/{status}`
### 3.5 Get Student Stats — `GET /attendance-requests/stats/{studentId}`
```json
// response.data — note real field names, NOT "totalRequests"/"approvedRequests" as the old doc showed
{ "total": 10, "approved": 7, "rejected": 2, "pending": 1 }
```

### 3.6 Get by Department — `GET /attendance-requests/department/{department}` — **new**
Used by the HOD dashboard to scope visibility to their own department.

### 3.7 Create Request — `POST /attendance-requests`
**Content-Type: `multipart/form-data`.** Form fields:

| Field | Required | Notes |
|---|---|---|
| `name` | yes | request title |
| `reason` | yes | free text |
| `student_id` | yes | owning student's user id |
| `date` | yes | ISO datetime string |
| `student_ids` | no | repeatable field, other students to include |
| `subjectDatesJson` | yes | JSON string: `[{"subjectId":"...","date":"2026-07-23T09:00:00"}, ...]` |
| `proof` | no | file (image/PDF/etc.) |

Server behavior:
- Verifies `student_id` exists and each `subjectId` in `subjectDatesJson` exists (`404` if not).
- **Duplicate guard**: if the same student already has a `pending` request with the identical `reason`, created within the last 30 seconds, the new one is rejected with `400 A similar request was just submitted. Please wait a moment before resubmitting.`
- If `proof` is present, it's uploaded to Cloudinary (`resource_type: auto`, folder `attendance-proofs`) and the returned `secure_url` is stored as `proof`.
- `department` on the saved request is copied from the student's own `department`.
- Status is always created as `"pending"`.
- `201 Created`.

### 3.8 Update Request — `PUT /attendance-requests/{id}`
Same multipart shape as create, but **every field is optional** (`name, reason, date, student_ids, subjectDatesJson, proof`) — only supplied fields are changed. A new `proof` file replaces the old URL.

### 3.9 Update Status — `PUT /attendance-requests/{id}/status`
```json
{ "status": "approved" }   // or "rejected"
```
- **Atomic**: uses `findAndModify` to flip status only if the request is currently `pending`. If it isn't (already decided), returns `400 Request is no longer pending (current status: approved)`.
- Invalid status strings (anything other than `approved`/`rejected`) → `400 Invalid status. Must be 'approved' or 'rejected'`.
- **On approval only**: creates one `Notification` per entry in `subjectDates`, addressed to that subject's `teacherId`, listing every student on the request (owner + `studentIds`). Rejections create no notifications.
- There is **no** `feedbackNote` field persisted anywhere in this flow, despite the frontend collecting one.

### 3.10 Delete Request — `DELETE /attendance-requests/{id}`

### 3.11 Get Proof File (legacy) — `GET /attendance-requests/proof/{filename}`
Serves a file from the local `UPLOAD_DIR` path. In current practice proof files live on Cloudinary and `proof` on the DTO is already a full `https://res.cloudinary.com/...` URL, so this endpoint is effectively dead code unless something was uploaded before the Cloudinary migration.

### Response Shape — `AttendanceRequestDTO`
```json
{
  "id": "...",
  "name": "Medical Leave",
  "reason": "Doctor appointment",
  "proof": "https://res.cloudinary.com/.../attendance-proofs/xyz.pdf",
  "subjectDates": [
    { "subjectId": { "id": "...", "name": "Mathematics", "day": "Monday", "startTime": "09:00", "endTime": "10:00", "className": "Class 10-A", "teacherId": "...", "teacherName": "Dr. Smith" }, "date": "2026-07-23T09:00:00" }
  ],
  "studentId": "...",
  "studentIds": ["..."],
  "status": "pending",
  "date": "2026-07-23T09:00:00",
  "createdAt": "...",
  "updatedAt": "...",
  "student": { "id": "...", "name": "...", "sap": "...", "email": "...", "className": "...", "role": "student", "department": "..." },
  "students": [ { "...same shape, one per studentIds entry (missing users silently dropped)" } ],
  "department": "Computer Science"
}
```
Note: `subjectDates[].subjectId` is a full `SubjectDTO` object, not a string id, despite the field name. If a referenced subject was deleted, that entry's `subjectId` is `null` rather than failing the whole response. Same soft-fail behavior applies to `student`/`students` for deleted users.

---

## 4. Notification Endpoints (`/notifications`)

### 4.1 Get All — `GET /notifications`
### 4.2 Get by ID — `GET /notifications/{id}`
### 4.3 Get Teacher's Notifications — `GET /notifications/teacher/{teacherId}?startDate=&endDate=`
Both query params optional, format `yyyy-MM-dd`, inclusive on both ends. Filters `Notification.date`'s local date against the range.

### 4.4 Get Student's Notifications — `GET /notifications/student/{studentId}`
### 4.5 Get Unread — `GET /notifications/unread`
### 4.6 Get for a Request — `GET /notifications/attendance-request/{attendanceRequestId}`
### 4.7 Create — `POST /notifications`
```json
{ "teacherId": "...", "studentIds": ["..."], "subjectId": "...", "date": "2026-07-23T09:00:00", "attendanceRequestId": "..." }
```
`teacherId` must resolve to an existing user or this `404`s.

### 4.8 Mark as Read — `PUT /notifications/{id}/read`
### 4.9 Delete — `DELETE /notifications/{id}`

### Response Shape — `NotificationDTO`
```json
{
  "id": "...", "attendanceRequestId": "...", "teacherId": "...",
  "studentIds": ["..."], "subjectId": "...", "date": "...", "isRead": false,
  "subject": { "...full SubjectDTO, null if deleted" },
  "students": [ "...full UserDTO per studentIds entry, missing users dropped" ],
  "reason": "pulled from the linked AttendanceRequest, null if it was deleted"
}
```

---

## Error Responses

**400** (business rule) — `{ "success": false, "message": "..." }`
**401** (login only) — `{ "success": false, "message": "Invalid email or password" }`
**404 / 500** (uncaught / not-found) — `ErrorResponse` shape:
```json
{ "timestamp": "2026-07-23T10:00:00", "message": "...", "error": "Resource Not Found", "status": 404 }
```

## Data Types

- Time: `HH:MM`, 24-hour.
- DateTime: ISO 8601 (`YYYY-MM-DDTHH:MM:SS`); note the backend calls `.substring(0, 19)` on incoming date strings before parsing, so trailing timezone/millisecond suffixes are truncated, not honored.
- Roles: `student`, `teacher`, `hod`, `admin`.
- Days: `Monday`…`Saturday` (no Sunday in the timetable model).
- Attendance status: `pending`, `approved`, `rejected`.

## CORS

Active config is `SecurityConfig.corsConfigurationSource` (not the older `CorsConfig`): allows origin patterns `http://localhost:*`, `http://192.168.*.*:*`, `https://*.vercel.app`, methods `GET,POST,PUT,DELETE,PATCH,OPTIONS`, all headers, credentials enabled.

---
**API Documentation — reflects current implementation as of this writing**

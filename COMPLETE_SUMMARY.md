# 🎓 Attendance Management System — Complete Project Summary (Current)

## Overview

The system has moved well past the original Node.js→Spring Boot migration. It's now a full department-aware attendance workflow with group requests, Cloudinary-backed file storage, CSV bulk onboarding, and a complete React frontend with four role-specific dashboards. This document replaces the original migration summary.

---

## 📁 Project Structure

```
Attendance-springboot/
├── Dockerfile                              ✅ multi-stage build (maven → jre), added since migration
├── pom.xml
│
├── src/main/java/com/attendance/
│   ├── AttendanceApplication.java          ✅ @EnableCaching, ModelMapper bean
│   ├── config/
│   │   ├── CorsConfig.java                 (legacy — superseded by SecurityConfig's CORS)
│   │   ├── SecurityConfig.java             ✅ active CORS + JWT filter chain (currently permitAll)
│   │   ├── CloudinaryConfig.java           ✅ NEW — Cloudinary client bean
│   │   ├── MongoIndexConfig.java           ✅ NEW — partial unique index on `sap`
│   │   └── DemoDataInitializer.java        ✅ NEW — seeds 4 demo accounts, flag-gated
│   │
│   ├── controller/ (4 controllers, 41 endpoints)
│   │   ├── UserController.java             ✅ 12 endpoints (search + CSV import added)
│   │   ├── SubjectController.java          ✅ 10 endpoints
│   │   ├── AttendanceRequestController.java ✅ 10 endpoints (department + proof-file added)
│   │   └── NotificationController.java     ✅ 9 endpoints (date-range filter added)
│   │
│   ├── service/ (7 services)
│   │   ├── UserService.java
│   │   ├── SubjectService.java             ✅ result caching (@Cacheable/@CacheEvict)
│   │   ├── AttendanceRequestService.java   ✅ multipart handling, Cloudinary upload, dedupe guard, atomic status transition
│   │   ├── NotificationService.java        ✅ date-range filtering, enrichment
│   │   ├── CsvImportService.java           ✅ NEW — bulk user import
│   │   ├── CustomUserDetailsService.java
│   │   └── SecurityUtil.java
│   │
│   ├── entity/ (4 entities)
│   │   ├── User.java                       ✅ + `department` field
│   │   ├── Subject.java
│   │   ├── AttendanceRequest.java          ✅ + `studentIds[]`, `subjectDates[]` (was single subject), `department`
│   │   └── Notification.java               ✅ `studentIds[]` (list, was singular in the original design)
│   │
│   ├── repository/ (4 repositories, custom finders per entity)
│   ├── dto/ (16+ DTOs, several enriched: AttendanceRequestDTO.student/students, NotificationDTO.subject/students/reason, SubjectDTO.teacherName)
│   ├── security/ (JwtTokenProvider, JwtAuthenticationFilter)
│   └── exception/ (ResourceNotFoundException, BadRequestException, ErrorResponse, GlobalExceptionHandler)
│
└── src/main/resources/application.yml       ✅ + Cloudinary vars, demo-data flag

Attendance-js-frontend/                       ✅ NEW since migration — full React SPA
├── src/context/ (AuthContext, ThemeContext)
├── src/components/ (ProtectedRoute, Unauthorized, shadcn/ui primitives)
├── src/pages/
│   ├── LoginPage.jsx
│   ├── AdminDashboard.jsx      (User Management + Timetable Management tabs)
│   ├── HodDashboard.jsx        (department-scoped request review)
│   ├── TeacherDashboard.jsx    (date-range absence view)
│   └── StudentDashboard.jsx    (create/edit/delete own requests, group requests, proof upload)
└── src/lib/ (api.js — axios w/ JWT + ApiResponse unwrapping, utils.js)
```

---

## ✨ Features (Current State)

### ✅ User Management
- CRUD, role-based (student/teacher/hod/admin), **department** field
- Search by name/email/SAP, optionally scoped to a role
- Bulk delete by role
- **CSV bulk import** (Apache Commons CSV) — creates users, skips existing, reports both lists

### ✅ Authentication
- JWT (HS512, 24h expiry), BCrypt password hashing
- **⚠️ Authorization is not currently enforced at the endpoint level** — `SecurityConfig` permits all requests; the JWT filter populates the security context but nothing checks it yet. Role gating today lives entirely in the React frontend (`ProtectedRoute`), which is not a security boundary.

### ✅ Subject / Timetable Management
- Full CRUD, per-teacher/class/day views, schedule generator
- `getSubjectById` is **cached**; writes evict the cache
- CSV export in the frontend timetable UI (backend CSV *import* for subjects is referenced by the frontend but not present as a controller endpoint — only user CSV import exists server-side)

### ✅ Attendance Requests — substantially redesigned
- A single request can now cover **multiple subjects/dates** (`subjectDates[]`) and **multiple students** (`studentId` owner + `studentIds[]` others), not one subject for one student
- Create/update take **`multipart/form-data`** (to carry an optional proof file), not JSON
- Proof files upload to **Cloudinary**, not local disk (the old `UPLOAD_DIR` config and the `/proof/{filename}` controller endpoint are legacy holdovers)
- **Duplicate-submission guard**: identical pending request (same student + reason) within 30 seconds is rejected
- **Atomic approve/reject** via `MongoTemplate.findAndModify` — only a `pending` request can transition; re-deciding an already-decided request `400`s
- **Department** is stamped on each request from the owning student, enabling department-scoped HOD review (`GET /attendance-requests/department/{department}`)
- Every read enriches `student`/`students`/`subjectDates[].subjectId` into full objects rather than bare ids; missing referenced records degrade to `null` instead of failing the whole response

### ✅ Notifications
- Created automatically, one per subject/date, **only on approval** (not on rejection), addressed to that subject's teacher
- Teacher lookup supports optional `startDate`/`endDate` filtering
- Enriched with resolved `subject`, `students`, and the originating request's `reason`

### ✅ Frontend (new since the original migration)
- 4 role dashboards behind `ProtectedRoute`
- Dark/light theme via `ThemeContext`, persisted to `localStorage`
- Axios client (`lib/api.js`) auto-attaches the bearer token and **unwraps `ApiResponse.data`** so components work with raw payloads
- shadcn/ui components (button, dialog, dropdown-menu, select, tabs, table, card, avatar, badge, input, textarea) on Radix primitives, styled with Tailwind v4

### ⚠️ Known Gaps / Inconsistencies
- No server-side role/permission enforcement (see above)
- Frontend HOD/Student UIs read/write a `feedbackNote` on approve/reject that the backend **does not persist or return**
- Two CORS configurations exist (`CorsConfig` and `SecurityConfig`); only the Security one is actually wired into the active filter chain
- `/attendance-requests/proof/{filename}` (local-disk serving) is effectively dead code post-Cloudinary
- CSV bulk import exists for users but not for subjects, despite a frontend `importSubjectsCsv`-style call path referenced in `TimetableManagement.jsx`

---

## 🔗 API Endpoints (41 Total)

### Users (12)
```
POST   /users/login
GET    /users
GET    /users/{id}
GET    /users/search?query=&role=
GET    /users/teachers
GET    /users/role/{role}
GET    /users/class/{className}
POST   /users
PUT    /users/{id}
DELETE /users/{id}
DELETE /users/bulk/{role}
POST   /users/bulk/csv
```

### Subjects (10)
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

### Attendance Requests (10)
```
GET    /attendance-requests
GET    /attendance-requests/{id}
GET    /attendance-requests/student/{studentId}
GET    /attendance-requests/status/{status}
GET    /attendance-requests/stats/{studentId}
GET    /attendance-requests/department/{department}
POST   /attendance-requests             (multipart/form-data)
PUT    /attendance-requests/{id}        (multipart/form-data)
PUT    /attendance-requests/{id}/status
DELETE /attendance-requests/{id}
GET    /attendance-requests/proof/{filename}
```

### Notifications (9)
```
GET    /notifications
GET    /notifications/{id}
GET    /notifications/teacher/{teacherId}?startDate=&endDate=
GET    /notifications/student/{studentId}
GET    /notifications/unread
GET    /notifications/attendance-request/{attendanceRequestId}
POST   /notifications
PUT    /notifications/{id}/read
DELETE /notifications/{id}
```

---

## 🚀 Quick Start

```bash
# Backend
cd Attendance-springboot
mvn clean install
mvn spring-boot:run    # http://localhost:8080/api

# Frontend
cd Attendance-js-frontend
npm install
npm run dev             # http://localhost:5173
```

Required backend env vars: `MONGODB_URI`, `JWT_SECRET`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`. Optional: `PORT`, `DEMO_DATA_ENABLED`, `APP_BASE_URL`.

---

## 📊 Database Schema (Current)

| Collection | Notable fields |
|---|---|
| `users` | `+ department`, partial-unique `sap` index |
| `subjects` | unchanged core shape |
| `attendance_requests` | `+ studentIds[]`, `subjectDates[]` (replacing a single subject/date pair), `+ department` |
| `notifications` | `studentIds[]` (list, not singular), `+ attendanceRequestId` |

---

## ✅ Testing Checklist (Updated)

- [ ] Cloudinary credentials valid — proof uploads succeed
- [ ] Duplicate-submission guard triggers on rapid resubmission
- [ ] Status transition rejects a second approve/reject on an already-decided request
- [ ] Department scoping returns correct subset for HOD view
- [ ] Notification created only on approval, one per subject/date, correct teacher
- [ ] CSV import skips existing emails/SAPs and reports both lists
- [ ] Frontend token refresh/expiry handling (currently: no refresh, just re-login on 401)
- [ ] Confirm whether feedbackNote support should be added server-side or removed client-side

---

## 🎯 Suggested Next Steps

1. **Close the security gap** — enforce role-based authorization server-side (`SecurityConfig` currently permits everything).
2. **Resolve the `feedbackNote` mismatch** — either persist it on `AttendanceRequest`/expose it in the DTO, or remove the UI fields.
3. Consolidate the two CORS configs into one.
4. Decide the fate of the local-disk proof endpoint (`/attendance-requests/proof/{filename}`) now that Cloudinary is the actual storage backend.
5. Add subject CSV import to match the user import, or remove the frontend affordance that implies it exists.
6. Add tests around the atomic status-transition and duplicate-guard logic — both are easy to silently regress.

---

**Last Updated**: reflects current repository state

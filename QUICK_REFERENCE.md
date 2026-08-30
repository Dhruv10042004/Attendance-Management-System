# 🚀 Quick Reference Card (Current State)

## Project Basics

| Item | Value |
|------|-------|
| **Framework** | Spring Boot 3.2.0 |
| **Language** | Java 17 |
| **Build Tool** | Maven |
| **Database** | MongoDB |
| **File Storage** | Cloudinary (not local disk) |
| **Authentication** | JWT (24h) — issued **and enforced** server-side via role-based route rules in `SecurityConfig` |
| **Port** | 8080 (`context-path: /api`) |
| **Base URL** | `http://localhost:8080/api` |
| **Frontend** | React 18 + Vite + Tailwind v4 + shadcn/ui |
| **Containerization** | Dockerfile present (multi-stage maven→jre) |

---

## Quick Commands

```bash
# Backend
mvn clean install
mvn spring-boot:run
mvn clean package -DskipTests
java -jar target/attendance-management-system-1.0.0.jar

# Docker
docker build -t attendance-backend ./Attendance-springboot
docker run -p 8080:8080 --env-file .env attendance-backend

# Frontend
cd Attendance-js-frontend && npm install && npm run dev
```

---

## Entity Classes (4 Total — fields updated)

| Entity | Collection | Key Fields |
|--------|-----------|-----------|
| **User** | users | id, sap (partial-unique), email (unique), role, className, **department** |
| **Subject** | subjects | id, name, teacherId, className, day, startTime, endTime |
| **AttendanceRequest** | attendance_requests | id, studentId, **studentIds[]**, **subjectDates[]** (subjectId+date pairs), status, proof (Cloudinary URL), **department** |
| **Notification** | notifications | id, teacherId, **studentIds[]** (list), subjectId, attendanceRequestId, isRead |

---

## Service Classes (7 Total)

| Service | Purpose | Notable Behavior |
|---------|---------|-----------|
| **UserService** | User CRUD | uniqueness checks on email + sap; ownership/role checks for update & delete |
| **SubjectService** | Subject CRUD | `getSubjectById` **cached** (`@Cacheable`), writes evict |
| **AttendanceRequestService** | Request handling | multipart parsing, Cloudinary upload, 30s dedupe guard, atomic `findAndModify` status transition, department-match check on review, notification fan-out on approval |
| **NotificationService** | Notifications | date-range filter, enriches subject/students/reason |
| **CsvImportService** | Bulk user import | required cols: sap,name,email,password,role; optional: className,department; isFirstLogin always `true` |
| **CustomUserDetailsService** | Spring Security | loads by email |
| **SecurityUtil** | Auth helpers | current-user id/email/department + role checks — the second, ownership-level authorization gate behind `SecurityConfig`'s route rules |

---

## Controller Endpoints Summary

| Controller | Endpoints | Base Path |
|-----------|-----------|-----------|
| **UserController** | 12 | /users |
| **SubjectController** | 10 | /subjects |
| **AttendanceRequestController** | 10 | /attendance-requests |
| **NotificationController** | 9 | /notifications |
| **TOTAL** | **41** | - |

---

## API Response Format

```json
{ "success": true, "message": "Operation completed", "data": { } }
```
Exception: uncaught / `ResourceNotFoundException` / `BadRequestException` return a bare `ErrorResponse` (no envelope) via `GlobalExceptionHandler`.

---

## Authentication & Authorization Flow

```
1. POST /users/login → { token, user }
2. Frontend stores token + user in localStorage (see AuthContext.jsx)
3. axios interceptor (lib/api.js) attaches Authorization: Bearer <token>
   AND unwraps ApiResponse.data automatically — components see raw payloads
4. JwtAuthenticationFilter validates token, sets SecurityContext
5. SecurityConfig.filterChain checks the SecurityContext against an explicit
   per-route rule (hasRole / hasAnyRole / authenticated) before the request
   reaches a controller — unauthenticated or under-privileged calls get 401/403
6. Inside the controller, service-level ownership checks (SecurityUtil) enforce
   the finer-grained "only the owner or an admin" rules that a URL pattern
   alone can't express
```

---

## Attendance Request Create/Update — Field Reference

`multipart/form-data`, not JSON:

| Field | Create | Update |
|---|---|---|
| `name` | required | optional |
| `reason` | required | optional |
| `student_id` | required | n/a (immutable) |
| `date` | required | optional |
| `student_ids` | optional, repeatable | optional, repeatable |
| `subjectDatesJson` | required, JSON string | optional, JSON string |
| `proof` | optional file | optional file (replaces) |

`subjectDatesJson` shape: `[{"subjectId":"...","date":"2026-07-23T09:00:00"}]`

---

## Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK |
| 201 | Created |
| 400 | Bad Request (business rule, e.g. dup email, invalid status, duplicate request, wrong-department review) |
| 401 | Unauthenticated — login failure, or missing/invalid token on a protected route |
| 403 | Authenticated but the wrong role or wrong owner for this action |
| 404 | Not Found |
| 500 | Server Error |

---

## Environment Variables

```bash
MONGODB_URI=mongodb+srv://user:pass@cluster/db
JWT_SECRET=your_production_secret_key
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
PORT=8080
DEMO_DATA_ENABLED=false
APP_BASE_URL=https://your-domain.com
```

---

## Demo Accounts (when `DEMO_DATA_ENABLED=true`)

| Email | Role | Password |
|---|---|---|
| admin@demo.com | admin | Demo@123 |
| hod@demo.com | hod | Demo@123 |
| teacher@demo.com | teacher | Demo@123 |
| student@demo.com | student | Demo@123 |

---

## Frontend Dashboards

| Dashboard | Route | Key Data Source |
|---|---|---|
| Admin | `/admin` | `/users`, `/subjects` |
| HOD | `/hod` | `/attendance-requests/department/{department}` |
| Teacher | `/teacher` | `/notifications/teacher/{id}?startDate=&endDate=` |
| Student | `/student` | `/attendance-requests/student/{id}`, `/attendance-requests/stats/{id}` |

`ProtectedRoute` gates these client-side for UX (instant redirect on the wrong role); the real boundary is now `SecurityConfig` on the backend, so a stale or forged client can't bypass it just by skipping `ProtectedRoute`.

---

## Known Gaps to Track

| Gap | Where |
|---|---|
| `feedbackNote` collected in UI but not persisted | Hod/StudentDashboard vs `AttendanceRequestDTO` |
| Local proof-file endpoint effectively dead | `AttendanceRequestController.getProofFile` |
| No subject CSV import despite frontend hook | `TimetableManagement.jsx` calls `/subjects/import/csv` — no such controller endpoint exists |

**Resolved:** server-side authorization is now enforced per-route in `SecurityConfig` (previously a gap); the duplicate `CorsConfig` has been deleted, leaving `SecurityConfig.corsConfigurationSource()` as the single CORS source; a dead request-matcher pattern (`/api/users/class/**`, which could never match since the context-path is stripped before matching) was found and fixed to `/users/class/**`.

---

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Port 8080 in use | Set `PORT` env var |
| MongoDB connection failed | Check `MONGODB_URI` |
| Proof upload fails | Check all 3 `CLOUDINARY_*` vars |
| JWT invalid | Check `JWT_SECRET`, token not expired |
| CORS error | Check origin against `SecurityConfig.corsConfigurationSource` patterns |
| `403 Forbidden` on an endpoint | Expected if the logged-in role doesn't match the route's required role — check the table in `API_DOCUMENTATION.md` |
| Duplicate request rejected unexpectedly | By design — same student+reason within 30s is blocked |
| Status update returns 400 "no longer pending" | Request was already approved/rejected — transitions are one-way |
| Status update returns 400 "outside your department" | Non-admin reviewer's department doesn't match the request's — expected |

---

**Ready for review — reflects current repository state, not the original migration snapshot.**
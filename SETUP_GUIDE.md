# Step-by-Step Setup Guide (Current)

This replaces the original 9-phase guide. Two things are new and required now that weren't before: a **Cloudinary account** (proof files no longer go to local disk) and awareness that **`application.yml` reads everything from environment variables** — there's no plain hardcoded connection string to edit anymore.

---

## Phase 1: Environment Setup

### 1.1 Install Required Software
```bash
java -version   # 17+
mvn -version    # 3.8+
node -v         # 16+
npm -v          # 7+
```

### 1.2 MongoDB
Local (`mongodb://localhost:27017/attendance_db`) or Atlas (`mongodb+srv://user:pass@cluster.mongodb.net/attendance_db`).

### 1.3 Cloudinary Account — **new required step**
1. Sign up at https://cloudinary.com (free tier is enough for dev).
2. From the dashboard, copy: **Cloud name**, **API Key**, **API Secret**.
3. You'll set these as env vars in Phase 3 — proof file uploads (`AttendanceRequestService.saveProofFile`) will throw a `RuntimeException` on every request with an attachment if these are missing or wrong.

---

## Phase 2: Project Structure

Same layout as before, plus:
- `Attendance-springboot/Dockerfile` now exists (multi-stage build) — you don't need to write one.
- `Attendance-springboot/src/main/java/com/attendance/config/CloudinaryConfig.java`, `MongoIndexConfig.java`, `DemoDataInitializer.java` are new config classes.
- A full `Attendance-js-frontend/` React app now exists (was a plain "update your React app" note before) — see Phase 6.

---

## Phase 3: Configure Environment Variables

Unlike the original guide, there is **no `application.yml` value to hand-edit** for the database — it's `${MONGODB_URI}` etc. Set these as actual environment variables (or a `.env` consumed by your run tool / IDE):

```bash
export MONGODB_URI="mongodb://localhost:27017/attendance_db"
export JWT_SECRET="a_long_random_secret_at_least_256_bits"
export CLOUDINARY_CLOUD_NAME="your_cloud_name"
export CLOUDINARY_API_KEY="your_api_key"
export CLOUDINARY_API_SECRET="your_api_secret"

# optional
export PORT=8080
export DEMO_DATA_ENABLED=true     # seeds 4 demo accounts on startup — see Phase 3.1
export APP_BASE_URL="http://localhost:8080"
```

### 3.1 Demo Data (optional, new)
Set `DEMO_DATA_ENABLED=true` and on startup `DemoDataInitializer` will seed, skipping any that already exist by email:

| Email | Role | Password |
|---|---|---|
| admin@demo.com | admin | Demo@123 |
| hod@demo.com | hod | Demo@123 |
| teacher@demo.com | teacher | Demo@123 |
| student@demo.com | student | Demo@123 |

This is the fastest way to get a working login for every role without manually POSTing to `/users`.

---

## Phase 4: Build and Run

```bash
cd Attendance-springboot
mvn clean install
mvn spring-boot:run
```

Verify: `http://localhost:8080/api/users` should return an empty (or demo-seeded) array in the `data` field.

### Alternative: Docker
```bash
docker build -t attendance-backend .
docker run -p 8080:8080 \
  -e MONGODB_URI="..." -e JWT_SECRET="..." \
  -e CLOUDINARY_CLOUD_NAME="..." -e CLOUDINARY_API_KEY="..." -e CLOUDINARY_API_SECRET="..." \
  attendance-backend
```

---

## Phase 5: Test with Postman — updated request shapes

### 5.1 Users — unchanged from before
```
POST /users/login
{ "email": "admin@demo.com", "password": "Demo@123" }
```

### 5.2 New: CSV Bulk Import
```
POST /users/bulk/csv
Content-Type: multipart/form-data
file: <users.csv>
```
CSV header required: `sap,name,email,password,role` (optional: `className,department`).

### 5.3 New: Create an Attendance Request (multipart, not JSON!)
This is the part most likely to trip you up if you're following the old JSON examples — the endpoint now expects **form fields**, not a JSON body:

```
POST /attendance-requests
Content-Type: multipart/form-data

name: Medical Leave
reason: Doctor appointment
student_id: <student_id>
date: 2026-07-23T09:30:00
student_ids: <other_student_id>          (optional, repeat the field per student)
subjectDatesJson: [{"subjectId":"<subject_id>","date":"2026-07-23T09:30:00"}]
proof: <file, optional>
```
In Postman: choose **form-data** body type, add each field as text except `proof`, which you set to type "File".

### 5.4 Approve / Reject (unchanged shape)
```
PUT /attendance-requests/<id>/status
{ "status": "approved" }
```
Try calling this twice in a row — the second call should now return `400 Request is no longer pending`.

### 5.5 New: Department-scoped requests (for HOD testing)
```
GET /attendance-requests/department/Computer Science
```

### 5.6 New: Teacher notifications with date range
```
GET /notifications/teacher/<teacher_id>?startDate=2026-07-20&endDate=2026-07-27
```

---

## Phase 6: Frontend Integration (now a real app, not a stub)

The frontend is a complete Vite + React 18 app in `Attendance-js-frontend/`, not a placeholder to bolt your own UI onto.

### 6.1 Point it at your backend
Create `Attendance-js-frontend/.env`:
```
VITE_API_BASE_URL=http://localhost:8080/api
```
(`src/lib/api.js` falls back to `http://localhost:8080/api` if unset.)

### 6.2 Install & Run
```bash
cd Attendance-js-frontend
npm install
npm run dev
```
Visit `http://localhost:5173`.

### 6.3 What's already wired up
- `AuthContext` — login stores `token`+`user` in `localStorage`, restores session on reload.
- `lib/api.js` — axios instance that attaches `Authorization: Bearer <token>` automatically **and unwraps `{success,message,data}` down to just `data`** — don't re-unwrap it in your components.
- `ThemeContext` — dark/light mode, persisted, toggles a `dark` class on `<html>`.
- `ProtectedRoute` — role-gates `/admin`, `/hod`, `/teacher`, `/student` (client-side only, see security note in Phase 8).

You generally won't need to write new API plumbing — just build on top of the existing dashboard pages.

---

## Phase 7: End-to-End Test Flow

1. Set `DEMO_DATA_ENABLED=true`, start backend — 4 demo accounts now exist.
2. Log in as `student@demo.com` on the frontend → Student Dashboard.
3. Log in (separately, or in another browser) as `admin@demo.com` → create a `Subject` for the student's class via Timetable Management.
4. Back on Student Dashboard → New Request → pick the subject, a date within the next 7 days, optionally attach a proof file → submit.
5. Log in as `hod@demo.com` → HOD Dashboard shows the request scoped to the student's department → Approve.
6. Log in as `teacher@demo.com` (the subject's teacher) → Teacher Dashboard, date range covering the request date → the student should appear as absent for that subject.

---

## Phase 8: Troubleshooting (updated)

| Symptom | Cause | Fix |
|---|---|---|
| `RuntimeException: Failed to upload proof file` | Cloudinary env vars missing/wrong | Recheck `CLOUDINARY_*` |
| `400 A similar request was just submitted...` | Duplicate-guard (same student+reason within 30s) | Wait, or change the reason text |
| `400 Request is no longer pending` | Trying to approve/reject an already-decided request | Expected — transitions are one-way |
| Attendance request POST returns 400 on `subjectDatesJson` | Sent as raw JSON body instead of a multipart form field | Switch to `multipart/form-data`, put the JSON array as a **string** field |
| Frontend shows blank arrays everywhere | `api.js` unwrapping mismatch, or backend returned the raw envelope somewhere it shouldn't | Confirm you're hitting the real endpoints, not a mock |
| Any role can hit any endpoint from Postman | Expected currently — see security note below | Add server-side authorization before relying on role separation |

**Security note:** `SecurityConfig.filterChain` currently permits all requests. This is fine for local development but must be addressed (`@PreAuthorize` is already enabled via `@EnableGlobalMethodSecurity`, just unused) before treating any environment as production.

---

## Phase 9: Production Deployment

See `DEPLOYMENT_GUIDE.md` for the full checklist — the short version:
```bash
mvn clean package -DskipTests
java -jar target/attendance-management-system-1.0.0.jar
```
with the same env vars as Phase 3, `DEMO_DATA_ENABLED` unset/false, and CORS origins in `SecurityConfig` updated to your real domain.

---

**Setup complete — reflects the current codebase, including Cloudinary, department scoping, group attendance requests, and the full frontend.**

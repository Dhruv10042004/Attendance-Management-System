# Deployment & Production Guide (Current)

The biggest change from the original guide: **file storage is Cloudinary, not local disk**, so `UPLOAD_DIR` and any volume-mounting strategy for proof files is no longer load-bearing. A real `Dockerfile` now exists in the repo (multi-stage), replacing the illustrative one from the original guide.

## Pre-Deployment Checklist

- [ ] All tests passed
- [ ] Code reviewed
- [ ] MongoDB connection tested (`MONGODB_URI`)
- [ ] JWT secret set and rotated for production (`JWT_SECRET`)
- [ ] **Cloudinary credentials set** (`CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`) — proof uploads fail hard without these
- [ ] `DEMO_DATA_ENABLED` set to `false` (or unset) in production — otherwise 4 demo accounts with a published password (`Demo@123`) get seeded
- [ ] CORS origin patterns in `SecurityConfig.corsConfigurationSource` updated for your real frontend domain(s)
- [ ] **Authorization enforcement added** — as shipped, `SecurityConfig` permits all requests; do not deploy this publicly without addressing that (see Security section below)
- [ ] Frontend `VITE_API_BASE_URL` points at the deployed backend

---

## Environment Variables (Complete List)

| Variable | Required | Default | Notes |
|---|---|---|---|
| `MONGODB_URI` | yes | — | full connection string |
| `JWT_SECRET` | yes | — | ≥256 bits |
| `PORT` | no | `8080` | |
| `DEMO_DATA_ENABLED` | no | `false`-equivalent | **set false in prod** |
| `APP_BASE_URL` | no | — | used to build absolute links; largely legacy now that proofs are Cloudinary URLs |
| `UPLOAD_DIR` | no | `uploads/attendance-proofs` | legacy local-disk path, effectively unused post-Cloudinary |
| `CLOUDINARY_CLOUD_NAME` | yes | — | |
| `CLOUDINARY_API_KEY` | yes | — | |
| `CLOUDINARY_API_SECRET` | yes | — | |

**Linux/macOS:**
```bash
export MONGODB_URI="mongodb+srv://user:pass@cluster.mongodb.net/attendance_db"
export JWT_SECRET="your_production_secret_key_at_least_256_bits_long"
export CLOUDINARY_CLOUD_NAME="your_cloud_name"
export CLOUDINARY_API_KEY="your_api_key"
export CLOUDINARY_API_SECRET="your_api_secret"
export DEMO_DATA_ENABLED="false"
```

---

## Local Production Build

```bash
cd Attendance-springboot
mvn clean package -DskipTests
java -jar target/attendance-management-system-1.0.0.jar
```

---

## Docker Deployment (actual Dockerfile in repo)

The real `Attendance-springboot/Dockerfile` is a two-stage build — no need to author a new one:

```dockerfile
# Build stage
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app
COPY pom.xml .
COPY src ./src
RUN mvn clean package -DskipTests

# Run stage
FROM eclipse-temurin:17-jre
WORKDIR /app
COPY --from=build /app/target/*.jar app.jar
EXPOSE 8080
ENTRYPOINT ["java", "-Djava.security.egd=file:/dev/./urandom", "-jar", "app.jar"]
```

Build & run:
```bash
docker build -t attendance-backend ./Attendance-springboot
docker run -p 8080:8080 --env-file .env attendance-backend
```

A minimal `docker-compose.yml` (Mongo is optional if you're using Atlas):

```yaml
version: '3.8'
services:
  mongodb:
    image: mongo:6
    ports: ["27017:27017"]
    volumes: ["mongo_data:/data/db"]

  backend:
    build: ./Attendance-springboot
    ports: ["8080:8080"]
    environment:
      MONGODB_URI: mongodb://mongodb:27017/attendance_db
      JWT_SECRET: ${JWT_SECRET}
      CLOUDINARY_CLOUD_NAME: ${CLOUDINARY_CLOUD_NAME}
      CLOUDINARY_API_KEY: ${CLOUDINARY_API_KEY}
      CLOUDINARY_API_SECRET: ${CLOUDINARY_API_SECRET}
    depends_on: [mongodb]

  frontend:
    image: node:18-alpine
    working_dir: /app
    ports: ["5173:5173"]
    volumes: ["../Attendance-js-frontend:/app"]
    command: sh -c "npm install && npm run dev"
    environment:
      VITE_API_BASE_URL: http://localhost:8080/api

volumes:
  mongo_data:
```

> Note there is no `UPLOAD_DIR` volume mount here — it isn't needed. Proof files never touch the container's filesystem; they go straight to Cloudinary from the multipart request bytes in `AttendanceRequestService.saveProofFile`.

---

## Platform-Specific Notes

The system's UserController currently logs the exception on failed login with `e.printStackTrace(); // TEMPORARY - shows real cause in Render logs` — a strong signal this has been run on **Render**. If deploying there:
- Set all env vars above in the Render dashboard.
- Render's ephemeral filesystem is another reason Cloudinary (rather than local disk) was the right call for proof storage — don't reintroduce `UPLOAD_DIR`-based storage on Render, it won't survive a restart/redeploy.
- Remove or downgrade the `printStackTrace()` call before treating this as final production logging.

Other platforms (AWS Elastic Beanstalk / EC2, Heroku, GCP App Engine) work the same as before — the only difference from the original guide is the additional Cloudinary env vars and the fact that no persistent volume for uploads is required anywhere.

---

## Security Before Going Public

The single most important pre-launch item that wasn't relevant in the original guide: **`SecurityConfig.filterChain` currently permits every request** (`.anyRequest().permitAll()`). The JWT filter still runs and authenticates valid tokens into the `SecurityContext`, but nothing currently blocks:
- Unauthenticated access to any endpoint
- A student calling admin/HOD-only endpoints (bulk delete, CSV import, status approval, etc.)

Before any public deployment, add method- or endpoint-level authorization (e.g. `.requestMatchers("/users/bulk/**").hasRole("ADMIN")`, `@PreAuthorize` on service methods — `@EnableGlobalMethodSecurity(prePostEnabled = true)` is already turned on in `SecurityConfig`, it's just unused).

---

## Performance / Indexing

Indexes actually created by the app itself (no manual step needed):
- `users.email` — unique (`@Indexed(unique = true)` on the entity)
- `users.sap` — **partial** unique index, only enforced when `sap` is a non-empty string (`MongoIndexConfig`, runs on `ApplicationReadyEvent`)
- `subjects.teacherId`, `attendance_requests.studentId`, `attendance_requests.status`, `attendance_requests.department`, `notifications.teacherId`, `notifications.studentIds` — all via `@Indexed` on the entities

You do **not** need to run the manual `db.createIndex(...)` commands from the original guide — Spring Data creates these automatically on startup from the entity annotations, plus the explicit partial index from `MongoIndexConfig`.

---

## Backup & Recovery

Unchanged from before — standard `mongodump`/`mongorestore` or MongoDB Atlas's automated backups. Proof documents live in Cloudinary now, so back those up (or rely on Cloudinary's own retention) separately from your MongoDB backup strategy — a Mongo restore alone will bring back `proof` URLs pointing at Cloudinary, but won't restore the Cloudinary assets themselves if those were separately deleted.

---

**Deploy checklist, condensed:** Mongo ✅ · JWT secret ✅ · Cloudinary creds ✅ · demo data off ✅ · CORS origins correct ✅ · authorization actually enforced ⚠️ (do this before going live)

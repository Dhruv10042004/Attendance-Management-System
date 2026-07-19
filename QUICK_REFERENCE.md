# 🚀 Quick Reference Card - Spring Boot Backend

## Project Basics

| Item | Value |
|------|-------|
| **Framework** | Spring Boot 3.2.0 |
| **Language** | Java 17 |
| **Build Tool** | Maven |
| **Database** | MongoDB |
| **Authentication** | JWT (24-hour) |
| **Port** | 8080 |
| **Base URL** | http://localhost:8080/api |

---

## Quick Commands

```bash
# Build Project
mvn clean install

# Run Application
mvn spring-boot:run

# Run Specific Class
java -cp target/classes:target/lib/* com.attendance.AttendanceApplication

# Build JAR
mvn clean package -DskipTests

# Run JAR
java -jar target/attendance-management-system-1.0.0.jar

# Check Logs
tail -f logs/application.log
```

---

## File Locations & Structure

```
Entity Files:           src/main/java/com/attendance/entity/
Repository Files:       src/main/java/com/attendance/repository/
Service Files:          src/main/java/com/attendance/service/
Controller Files:       src/main/java/com/attendance/controller/
DTO Files:              src/main/java/com/attendance/dto/
Security Files:         src/main/java/com/attendance/security/
Config Files:           src/main/java/com/attendance/config/
Exception Files:        src/main/java/com/attendance/exception/
Main Application:       src/main/java/com/attendance/AttendanceApplication.java
Configuration:          src/main/resources/application.yml
POM File:              pom.xml
```

---

## Key Configuration Settings

```yaml
# Database Connection (application.yml)
spring.data.mongodb.uri: mongodb://localhost:27017/attendance_db

# JWT Settings
app.jwtSecret: your_secret_key_minimum_256_bits
app.jwtExpirationMs: 86400000

# Server Port
server.port: 8080

# CORS Origins
http://localhost:5173, http://localhost:3000
```

---

## Entity Classes (4 Total)

| Entity | Collection | Key Fields |
|--------|-----------|-----------|
| **User** | users | id, email, sap, role, className |
| **Subject** | subjects | id, name, teacherId, className, day |
| **AttendanceRequest** | attendance_requests | id, studentId, status, date |
| **Notification** | notifications | id, teacherId, studentIds, isRead |

---

## Service Classes (6 Total)

| Service | Purpose | Key Methods |
|---------|---------|-----------|
| **UserService** | User CRUD | createUser, getUsers, deleteUsersByRole |
| **SubjectService** | Subject CRUD | createSubject, getByTeacher, getByDay |
| **AttendanceRequestService** | Request handling | createRequest, updateStatus, getStats |
| **NotificationService** | Notifications | createNotification, markAsRead |
| **CsvImportService** | Bulk import | importUsersFromCsv |
| **CustomUserDetailsService** | Spring Security | loadUserByUsername |

---

## Controller Endpoints Summary

| Controller | Endpoints | Base Path |
|-----------|-----------|-----------|
| **UserController** | 11 | /users |
| **SubjectController** | 10 | /subjects |
| **AttendanceRequestController** | 9 | /attendance-requests |
| **NotificationController** | 9 | /notifications |
| **TOTAL** | **39** | - |

---

## API Response Format

```json
{
  "success": true,
  "message": "Operation completed",
  "data": { /* optional */ }
}
```

---

## Authentication Flow

```
1. POST /users/login
   └─ Request: { email, password }
   └─ Response: { token, user }

2. Store token in localStorage

3. Send in all protected requests
   └─ Header: Authorization: Bearer <token>

4. JWT validated by JwtAuthenticationFilter

5. User added to SecurityContext
```

---

## Common HTTP Status Codes

| Code | Meaning |
|------|---------|
| 200 | OK - Success |
| 201 | Created - Resource created |
| 400 | Bad Request - Invalid data |
| 401 | Unauthorized - Auth failed |
| 404 | Not Found - Resource missing |
| 500 | Server Error - Backend issue |

---

## Most Used Annotations

```java
@RestController          // REST endpoint class
@RequestMapping          // Map request paths
@GetMapping              // GET requests
@PostMapping             // POST requests
@PutMapping              // PUT requests
@DeleteMapping           // DELETE requests
@PathVariable            // URL path parameter
@RequestBody             // Request body
@Service                 // Service class
@Repository              // Data repository
@Autowired               // Dependency injection
@Entity / @Document      // MongoDB document
@Id                      // Primary key
@Indexed                 // Database index
```

---

## Dependency Versions

| Dependency | Version |
|-----------|---------|
| Spring Boot | 3.2.0 |
| Java | 17 |
| MongoDB Driver | Latest (via Spring) |
| JWT (JJWT) | 0.12.3 |
| Lombok | 1.18.30 |
| ModelMapper | 3.1.1 |
| Apache Commons CSV | 1.10.0 |

---

## Database Queries

```javascript
// MongoDB Shell
// Connect
mongo "mongodb://localhost:27017/attendance_db"

// Common Queries
db.users.find()
db.users.findOne({ email: "user@example.com" })
db.attendance_requests.find({ status: "pending" })
db.notifications.find({ isRead: false })

// Create Indexes
db.users.createIndex({ email: 1 }, { unique: true })
db.subjects.createIndex({ teacherId: 1 })
```

---

## Environment Variables

```bash
# Required for Production
MONGO_URI=mongodb+srv://user:pass@cluster/db
JWT_SECRET=your_production_secret_key
SERVER_PORT=8080
JWT_EXPIRATION_MS=86400000
```

---

## Testing Endpoints with Postman

### Login
```
POST http://localhost:8080/api/users/login
Body: { "email": "user@example.com", "password": "pass" }
```

### Authenticated Request
```
GET http://localhost:8080/api/users
Header: Authorization: Bearer <token>
```

### Create User
```
POST http://localhost:8080/api/users
Body: { "name": "John", "email": "john@example.com", ... }
```

---

## Troubleshooting Quick Fixes

| Issue | Solution |
|-------|----------|
| Port 8080 in use | Change server.port in application.yml |
| MongoDB connection failed | Verify connection string and MongoDB is running |
| JWT token invalid | Check jwtSecret matches and token not expired |
| CORS error | Check allowed origins in CorsConfig.java |
| Database not found | Create database in MongoDB Atlas or locally |

---

## Frontend Integration

```typescript
// Only change needed in React:
const API_BASE_URL = 'http://localhost:8080/api';

// Then use in all API calls
fetch(`${API_BASE_URL}/users`)
```

---

## Deployment Quick Links

- **AWS**: `aws elasticbeanstalk create-environment`
- **Docker**: `docker-compose up --build`
- **Heroku**: `heroku create && git push heroku main`
- **GCP**: `gcloud app deploy`

---

## Performance Tips

1. **Enable Database Indexing** - Improves query speed
2. **Use Connection Pooling** - Reuse connections
3. **Enable Compression** - Reduce response size
4. **Cache Frequently Accessed Data** - Reduce DB hits
5. **Monitor Logs** - Catch issues early

---

## Security Checklist

- [ ] Change JWT secret
- [ ] Update MongoDB credentials
- [ ] Enable HTTPS
- [ ] Configure firewall
- [ ] Enable backups
- [ ] Add rate limiting
- [ ] Validate all inputs
- [ ] Use strong passwords

---

## Documentation Files

| File | Purpose |
|------|---------|
| README.md | Project overview & features |
| SETUP_GUIDE.md | Step-by-step setup (9 phases) |
| API_DOCUMENTATION.md | Complete API reference |
| DEPLOYMENT_GUIDE.md | Cloud deployment options |
| COMPLETE_SUMMARY.md | Full migration summary |

---

## Key Files to Remember

```
pom.xml                     # All dependencies
application.yml             # Configuration
User.java                   # User model (implements UserDetails)
JwtTokenProvider.java       # Token generation
UserController.java         # 11 user endpoints
AttendanceRequestService.java # Business logic
GlobalExceptionHandler.java # Error handling
```

---

## Useful Links

- **Spring Boot Docs**: https://spring.io/projects/spring-boot
- **MongoDB Docs**: https://docs.mongodb.com/
- **JWT Docs**: https://jwt.io/
- **Spring Security**: https://spring.io/projects/spring-security
- **Postman**: https://www.postman.com/

---

## Final Checklist Before Production

- [ ] All 39 endpoints tested
- [ ] Frontend successfully connected
- [ ] Database backups configured
- [ ] Logging enabled
- [ ] Error handling working
- [ ] JWT secret changed
- [ ] CORS properly configured
- [ ] Performance optimized
- [ ] Security audit passed
- [ ] Documentation complete

---

**Ready to Deploy! 🚀**

Keep this reference handy for quick lookups!

# Step-by-Step Setup Guide for Spring Boot Migration

## Phase 1: Environment Setup

### Step 1.1: Install Required Software

1. **Install Java 17**
   - Download from: https://www.oracle.com/java/technologies/downloads/#java17
   - Install and verify:
     ```bash
     java -version
     # Should show: java version "17.x.x" or higher
     ```

2. **Install Maven**
   - Download from: https://maven.apache.org/download.cgi
   - Extract and add to PATH
   - Verify:
     ```bash
     mvn -version
     # Should show: Apache Maven 3.8+
     ```

3. **Install MongoDB**
   - **Local Option:**
     - Download: https://www.mongodb.com/try/download/community
     - Install and start the service
     - Default: mongodb://localhost:27017
   
   - **Cloud Option (Atlas):**
     - Go to: https://www.mongodb.com/cloud/atlas
     - Create free tier cluster
     - Get connection string

4. **Verify Node.js for Frontend**
   ```bash
   node -v  # Should be v16+
   npm -v   # Should be v7+
   ```

### Step 1.2: Verify MongoDB Connection

**For Local MongoDB:**
```bash
# Start MongoDB service (Windows)
net start MongoDB

# Or on macOS/Linux
brew services start mongodb-community
```

**Test connection:**
```bash
# Connect to MongoDB
mongo
# or
mongosh

# You should see the MongoDB shell
```

---

## Phase 2: Project Structure Setup

### Step 2.1: Create Project Directory

```bash
# Create new directory for Spring Boot project
mkdir Attendance-springboot
cd Attendance-springboot

# Create src directory structure
mkdir -p src/main/java/com/attendance
mkdir -p src/main/resources
mkdir -p src/test/java
```

### Step 2.2: Copy All Files

All the files have been created in:
`c:\Users\dhruv\OneDrive\Desktop\ATTENDANCE MANAGEMENT SYSTEM\Attendance-springboot\`

### Step 2.3: Verify File Structure

Ensure you have:
- `pom.xml` - Maven dependencies
- `src/main/resources/application.yml` - Configuration
- `src/main/java/com/attendance/` - All Java classes
- All entity, service, controller, repository, dto classes

---

## Phase 3: Configure MongoDB

### Step 3.1: Update Configuration

Edit: `src/main/resources/application.yml`

**For Local MongoDB:**
```yaml
spring:
  data:
    mongodb:
      uri: mongodb://localhost:27017/attendance_db
```

**For MongoDB Atlas:**
```yaml
spring:
  data:
    mongodb:
      uri: mongodb+srv://username:password@cluster.mongodb.net/attendance_db?retryWrites=true&w=majority
```

### Step 3.2: Update JWT Secret

Edit: `src/main/resources/application.yml`

```yaml
app:
  jwtSecret: your_very_long_secret_key_minimum_256_bits_change_this_in_production_12345678901234567890
  jwtExpirationMs: 86400000
```

---

## Phase 4: Build and Run

### Step 4.1: Build Project

```bash
cd Attendance-springboot
mvn clean install
```

Expected output:
```
...
BUILD SUCCESS
Time elapsed: XX seconds
```

### Step 4.2: Run Application

**Option A: Command Line**
```bash
mvn spring-boot:run
```

**Option B: Using IDE (IntelliJ)**
1. Open project in IntelliJ
2. Right-click `AttendanceApplication.java`
3. Select "Run 'AttendanceApplication.main()'"

**Option C: Using VS Code**
1. Install "Extension Pack for Java"
2. Right-click `AttendanceApplication.java`
3. Select "Run"

Expected output:
```
...
Started AttendanceApplication in X.XXX seconds
```

### Step 4.3: Verify Application Started

Visit: `http://localhost:8080/api/users`

Should return:
```json
{
  "success": true,
  "message": "Users retrieved successfully",
  "data": []
}
```

---

## Phase 5: Test with Postman

### Step 5.1: Import Collection

1. Open Postman
2. Create new collection: "Attendance System"
3. Create requests for each endpoint

### Step 5.2: Test User Endpoints

**1. Create a User**
```
POST http://localhost:8080/api/users
Content-Type: application/json

{
  "sap": "SAP001",
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "className": "Class 10-A",
  "role": "student",
  "isFirstLogin": true
}
```

Expected Response:
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "65abc123...",
    "sap": "SAP001",
    "name": "John Doe",
    "email": "john@example.com",
    "className": "Class 10-A",
    "role": "student"
  }
}
```

**2. Login**
```
POST http://localhost:8080/api/users/login
Content-Type: application/json

{
  "email": "john@example.com",
  "password": "password123"
}
```

Expected Response:
```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzUxMiJ9...",
    "user": {
      "id": "65abc123...",
      "email": "john@example.com",
      "name": "John Doe",
      "role": "student"
    }
  }
}
```

**3. Get All Users**
```
GET http://localhost:8080/api/users
```

**4. Create Teacher**
```
POST http://localhost:8080/api/users
Content-Type: application/json

{
  "sap": "TEACH001",
  "name": "Mrs. Smith",
  "email": "smith@example.com",
  "password": "password123",
  "className": "Class 10",
  "role": "teacher"
}
```

### Step 5.3: Test Subject Endpoints

**1. Create Subject**
```
POST http://localhost:8080/api/subjects
Content-Type: application/json

{
  "name": "Mathematics",
  "startTime": "09:00",
  "endTime": "10:00",
  "teacherId": "<teacher_id>",
  "className": "Class 10-A",
  "day": "Monday"
}
```

Replace `<teacher_id>` with the ID from created teacher

**2. Get All Subjects**
```
GET http://localhost:8080/api/subjects
```

**3. Get Teacher's Subjects**
```
GET http://localhost:8080/api/subjects/teacher/<teacher_id>
```

### Step 5.4: Test Attendance Request Endpoints

**1. Create Attendance Request**
```
POST http://localhost:8080/api/attendance-requests
Content-Type: application/json

{
  "name": "Medical Leave",
  "reason": "Doctor appointment",
  "studentId": "<student_id>",
  "subjectDates": [
    {
      "subjectId": "<subject_id>",
      "date": "2024-01-15T10:00:00"
    }
  ],
  "date": "2024-01-15T10:00:00"
}
```

**2. Get Student's Requests**
```
GET http://localhost:8080/api/attendance-requests/student/<student_id>
```

**3. Get Statistics**
```
GET http://localhost:8080/api/attendance-requests/stats/<student_id>
```

**4. Approve Request**
```
PUT http://localhost:8080/api/attendance-requests/<request_id>/status
Content-Type: application/json

{
  "status": "approved"
}
```

---

## Phase 6: Frontend Integration

### Step 6.1: Update React API Configuration

In your React frontend, find the API configuration file and update it:

**File: `frontend/src/lib/api.ts` (or similar)**

```typescript
// Change from:
export const API_BASE_URL = 'http://localhost:3001/api';

// To:
export const API_BASE_URL = 'http://localhost:8080/api';
```

### Step 6.2: Update AuthContext

**File: `frontend/src/lib/AuthContext.tsx`**

Login method should remain the same:
```typescript
const login = async (email: string, password: string) => {
    const response = await fetch(`${API_BASE_URL}/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    
    const result = await response.json();
    
    if (result.success && result.data.token) {
        localStorage.setItem('token', result.data.token);
        localStorage.setItem('user', JSON.stringify(result.data.user));
        setUser(result.data.user);
        return result.data;
    }
    throw new Error('Login failed');
};
```

### Step 6.3: Update Component API Calls

All existing fetch calls should work by just changing the base URL. For example:

**Before:**
```typescript
const response = await fetch(`http://localhost:3001/api/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

**After:**
```typescript
const response = await fetch(`http://localhost:8080/api/users`, {
    headers: { 'Authorization': `Bearer ${token}` }
});
```

### Step 6.4: Run Frontend

```bash
cd frontend
npm install
npm run dev
```

Visit: `http://localhost:5173`

---

## Phase 7: Testing Workflow

### Step 7.1: Test Complete Flow

1. **Open Frontend**: `http://localhost:5173`
2. **Try Login**: Use created user credentials
3. **View Users**: Check user list loads
4. **Create Subject**: Add new class subject
5. **Create Attendance Request**: Submit a request
6. **Approve Request**: Use teacher role to approve

### Step 7.2: Monitor Backend Logs

In the terminal running Spring Boot, you should see:
```
2024-XX-XX 10:XX:XX.XXX DEBUG com.attendance - Request received
2024-XX-XX 10:XX:XX.XXX INFO  com.attendance - User logged in
```

---

## Phase 8: Troubleshooting

### Issue: MongoDB Connection Failed
**Error**: `connect ECONNREFUSED 127.0.0.1:27017`

**Solution**:
1. Start MongoDB service
2. Check connection string in `application.yml`
3. Verify MongoDB is running on correct port

### Issue: Port 8080 Already in Use
**Error**: `Port 8080 already in use`

**Solution**: Change port in `application.yml`:
```yaml
server:
  port: 8081
```

### Issue: JWT Token Invalid
**Error**: `401 Unauthorized`

**Solution**:
1. Ensure token is sent in header: `Authorization: Bearer <token>`
2. Check token is not expired
3. Verify JWT secret matches in `application.yml`

### Issue: CORS Error in Frontend
**Error**: `Access to XMLHttpRequest blocked by CORS`

**Solution**: Already configured in `CorsConfig.java`, but you can update origins:
```java
registry.addMapping("/api/**")
        .allowedOrigins("http://localhost:5173", "http://localhost:3000")
```

### Issue: MongoDB Atlas Connection Fails
**Error**: `MongoServerSelectionException`

**Solution**:
1. Check connection string has correct username/password
2. Whitelist your IP in Atlas console
3. Ensure database name is correct

---

## Phase 9: Production Deployment

### Step 9.1: Build JAR

```bash
mvn clean package -DskipTests
```

Output: `target/attendance-management-system-1.0.0.jar`

### Step 9.2: Run JAR

```bash
java -jar target/attendance-management-system-1.0.0.jar
```

### Step 9.3: Environment Variables

Create `.env` file or set system variables:
```bash
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/db
JWT_SECRET=your_production_secret_key
JWT_EXPIRATION_MS=86400000
SERVER_PORT=8080
```

---

## Next Steps

✅ Spring Boot backend running
✅ React frontend running
✅ MongoDB connected
✅ APIs tested

### Additional Enhancements:

1. **Add File Upload** for attendance proofs
2. **Add Email Notifications**
3. **Add Admin Dashboard**
4. **Add Batch Processing** for bulk attendance
5. **Add Analytics & Reports**
6. **Add Audit Logging**
7. **Deploy to Cloud** (AWS, Azure, Google Cloud)

---

**Congratulations! Your Attendance Management System is now running on Spring Boot with React and MongoDB!** 🎉

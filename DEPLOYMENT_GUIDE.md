# Deployment & Production Guide

## Pre-Deployment Checklist

- [ ] All tests passed
- [ ] Code reviewed
- [ ] Security vulnerabilities checked
- [ ] MongoDB connection tested
- [ ] JWT secret changed
- [ ] CORS origins updated for production
- [ ] Environment variables configured
- [ ] Database backups created
- [ ] Frontend build successful

---

## Local Production Build

### Step 1: Build Spring Boot JAR

```bash
cd Attendance-springboot
mvn clean package -DskipTests
```

Output: `target/attendance-management-system-1.0.0.jar`

### Step 2: Test JAR Locally

```bash
java -jar target/attendance-management-system-1.0.0.jar
```

Should see:
```
Started AttendanceApplication in X.XXX seconds
```

---

## Environment Configuration

### Create `application-prod.yml`

```yaml
spring:
  application:
    name: Attendance Management System
  data:
    mongodb:
      uri: ${MONGO_URI:mongodb+srv://user:pass@cluster.mongodb.net/attendance_db}
  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 10MB

server:
  port: ${SERVER_PORT:8080}
  servlet:
    context-path: /api

app:
  jwtSecret: ${JWT_SECRET:your_production_secret_key_minimum_256_bits_long_change_this}
  jwtExpirationMs: ${JWT_EXPIRATION_MS:86400000}

logging:
  level:
    root: WARN
    com.attendance: INFO
  file:
    name: logs/application.log
    max-size: 10MB
    max-history: 30
```

### Set Environment Variables

**Linux/macOS:**
```bash
export MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/attendance_db"
export JWT_SECRET="your_production_secret_key_at_least_256_bits_long"
export SERVER_PORT="8080"
export JWT_EXPIRATION_MS="86400000"
```

**Windows (PowerShell):**
```powershell
$env:MONGO_URI="mongodb+srv://username:password@cluster.mongodb.net/attendance_db"
$env:JWT_SECRET="your_production_secret_key_at_least_256_bits_long"
$env:SERVER_PORT="8080"
$env:JWT_EXPIRATION_MS="86400000"
```

**Windows (CMD):**
```cmd
set MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/attendance_db
set JWT_SECRET=your_production_secret_key_at_least_256_bits_long
set SERVER_PORT=8080
set JWT_EXPIRATION_MS=86400000
```

---

## AWS Deployment

### Option 1: Elastic Beanstalk

#### Step 1: Install AWS CLI
```bash
aws --version
```

#### Step 2: Configure AWS Credentials
```bash
aws configure
# Enter your AWS Access Key ID and Secret Access Key
```

#### Step 3: Create Beanstalk Application
```bash
cd Attendance-springboot
eb init -p java-17 attendance-system
```

#### Step 4: Create Environment
```bash
eb create attendance-prod
```

#### Step 5: Deploy
```bash
mvn clean package -DskipTests
eb deploy
```

#### Step 6: Set Environment Variables
```bash
eb setenv MONGO_URI="your_connection_string"
eb setenv JWT_SECRET="your_secret"
```

#### Step 7: Monitor Deployment
```bash
eb logs
eb open
```

### Option 2: EC2 Instance

#### Step 1: Launch EC2 Instance
- AMI: Ubuntu 22.04 LTS
- Instance type: t3.small or larger
- Security group: Allow 8080, 22 (SSH), 443 (HTTPS)

#### Step 2: Connect to Instance
```bash
ssh -i your-key.pem ubuntu@your-instance-ip
```

#### Step 3: Install Java and Maven
```bash
sudo apt update
sudo apt install openjdk-17-jdk maven -y
```

#### Step 4: Upload JAR
```bash
scp -i your-key.pem target/attendance-management-system-1.0.0.jar ubuntu@your-instance-ip:~/
```

#### Step 5: Run Application
```bash
java -jar attendance-management-system-1.0.0.jar
```

Or create systemd service:
```bash
sudo nano /etc/systemd/system/attendance.service
```

```ini
[Unit]
Description=Attendance Management System
After=syslog.target network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/home/ubuntu
ExecStart=java -jar /home/ubuntu/attendance-management-system-1.0.0.jar
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

Enable service:
```bash
sudo systemctl daemon-reload
sudo systemctl enable attendance
sudo systemctl start attendance
```

Check status:
```bash
sudo systemctl status attendance
```

---

## Docker Deployment

### Create Dockerfile

```dockerfile
FROM openjdk:17-jdk-slim

WORKDIR /app

COPY target/attendance-management-system-1.0.0.jar app.jar

ENV MONGO_URI=mongodb://mongo:27017/attendance_db
ENV JWT_SECRET=your_secret_key
ENV SERVER_PORT=8080

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "app.jar"]
```

### Create docker-compose.yml

```yaml
version: '3.8'

services:
  mongodb:
    image: mongo:6
    container_name: attendance-mongo
    ports:
      - "27017:27017"
    volumes:
      - mongo_data:/data/db
    environment:
      MONGO_INITDB_DATABASE: attendance_db

  backend:
    build: .
    container_name: attendance-backend
    ports:
      - "8080:8080"
    environment:
      MONGO_URI: mongodb://mongodb:27017/attendance_db
      JWT_SECRET: your_production_secret
      SERVER_PORT: 8080
    depends_on:
      - mongodb
    networks:
      - attendance-network

  frontend:
    image: node:18-alpine
    container_name: attendance-frontend
    working_dir: /app
    ports:
      - "5173:5173"
    volumes:
      - ../frontend:/app
    command: npm run dev
    environment:
      VITE_API_URL: http://localhost:8080/api
    networks:
      - attendance-network

volumes:
  mongo_data:

networks:
  attendance-network:
    driver: bridge
```

### Build and Run

```bash
docker-compose up --build
```

---

## Heroku Deployment

### Step 1: Install Heroku CLI
```bash
# macOS
brew tap heroku/brew && brew install heroku

# Windows
# Download from https://devcenter.heroku.com/articles/heroku-cli
```

### Step 2: Create Heroku App
```bash
heroku login
heroku create attendance-system-prod
```

### Step 3: Set Environment Variables
```bash
heroku config:set MONGO_URI="your_connection_string"
heroku config:set JWT_SECRET="your_secret"
```

### Step 4: Create Procfile
```
web: java -Dserver.port=$PORT -jar target/attendance-management-system-1.0.0.jar
```

### Step 5: Deploy
```bash
git push heroku main
```

### Step 6: View Logs
```bash
heroku logs --tail
```

---

## Google Cloud Deployment

### Step 1: Install Google Cloud SDK
```bash
# Download from https://cloud.google.com/sdk/docs/install
gcloud init
```

### Step 2: Create GCP Project
```bash
gcloud projects create attendance-system
gcloud config set project attendance-system
```

### Step 3: Deploy to App Engine
```bash
gcloud app deploy
```

### Step 4: Create app.yaml
```yaml
runtime: java17
env: standard
service: attendance-backend

env_variables:
  MONGO_URI: "mongodb+srv://user:pass@cluster.mongodb.net/attendance_db"
  JWT_SECRET: "your_production_secret"

handlers:
  - url: /.*
    script: auto
```

### Step 5: Deploy
```bash
gcloud app deploy app.yaml
```

---

## Performance Optimization

### 1. Database Indexing

Connect to MongoDB and create indexes:
```javascript
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ sap: 1 }, { unique: true })
db.subjects.createIndex({ teacherId: 1 })
db.subjects.createIndex({ className: 1, day: 1 })
db.attendance_requests.createIndex({ studentId: 1 })
db.attendance_requests.createIndex({ status: 1 })
db.notifications.createIndex({ teacherId: 1 })
db.notifications.createIndex({ studentIds: 1 })
```

### 2. Connection Pooling

Update `application.yml`:
```yaml
spring:
  data:
    mongodb:
      uri: ${MONGO_URI}
      connection-string: ${MONGO_URI}
      auto-index-creation: false
```

### 3. Caching

Add Spring Cache configuration:
```java
@Configuration
@EnableCaching
public class CacheConfig {
    @Bean
    public CacheManager cacheManager() {
        return new ConcurrentMapCacheManager("users", "subjects");
    }
}
```

### 4. API Response Compression

Add to `application.yml`:
```yaml
server:
  compression:
    enabled: true
    min-response-size: 1024
```

---

## Monitoring & Logging

### Centralized Logging with ELK Stack

Add to `pom.xml`:
```xml
<dependency>
    <groupId>net.logstash.logback</groupId>
    <artifactId>logstash-logback-encoder</artifactId>
    <version>7.3</version>
</dependency>
```

### Application Monitoring

- AWS CloudWatch
- Google Cloud Monitoring
- Datadog
- New Relic

### Database Monitoring

- MongoDB Atlas monitoring dashboard
- Connection alerts
- Query performance metrics

---

## Security Checklist

### Before Production

- [ ] Change JWT secret
- [ ] Update MongoDB credentials
- [ ] Enable HTTPS/SSL
- [ ] Configure firewall rules
- [ ] Set up backups
- [ ] Enable database encryption
- [ ] Add rate limiting
- [ ] Implement request validation
- [ ] Add API versioning
- [ ] Set up monitoring

### HTTPS Setup

#### AWS/Heroku/GCP
Most platforms provide automatic HTTPS via their service

#### Self-hosted
Use Let's Encrypt:
```bash
sudo apt install certbot python3-certbot-nginx -y
sudo certbot certonly --standalone -d yourdomain.com
```

Update `application.yml`:
```yaml
server:
  ssl:
    key-store: /path/to/keystore.p12
    key-store-password: password
    key-store-type: PKCS12
```

---

## Backup & Recovery

### MongoDB Atlas Backup

1. Go to Dashboard
2. Click "Backup" in sidebar
3. Enable automated backups (default: every 6 hours)
4. Configure retention policy

### Manual Backup

```bash
mongodump --uri="your_connection_string" --out=/backup/attendance_db
```

### Restore Backup

```bash
mongorestore --uri="your_connection_string" /backup/attendance_db
```

---

## Scaling Strategy

### Vertical Scaling
Increase server resources (RAM, CPU)

### Horizontal Scaling
Add load balancer with multiple instances:

```
Load Balancer
├── Instance 1 (Backend)
├── Instance 2 (Backend)
└── Instance 3 (Backend)
    └── Shared MongoDB
```

### Database Scaling
- Enable MongoDB sharding for large datasets
- Use replica sets for high availability

---

## Troubleshooting Production Issues

### High Memory Usage
```bash
# Monitor with jps
jps -l -m

# Adjust heap size
java -Xmx1024m -Xms512m -jar app.jar
```

### Connection Timeouts
Check MongoDB connection:
```bash
mongo "your_connection_string"
```

### JWT Token Issues
Verify JWT secret matches on all instances:
```yaml
app:
  jwtSecret: ${JWT_SECRET}
```

### CORS Errors
Update allowed origins in CorsConfig:
```java
registry.addMapping("/api/**")
        .allowedOrigins("https://yourdomain.com")
```

---

## Post-Deployment

1. Test all endpoints with Postman collection
2. Run frontend integration tests
3. Monitor logs for errors
4. Check database disk space
5. Verify backups are working
6. Document deployment details
7. Set up alerting rules

---

## Maintenance

### Weekly
- Check logs for errors
- Monitor disk space
- Verify backups completed

### Monthly
- Review performance metrics
- Test backup restoration
- Update dependencies
- Review security logs

### Quarterly
- Full security audit
- Load testing
- Database optimization
- Update documentation

---

**Happy Deploying! 🚀**

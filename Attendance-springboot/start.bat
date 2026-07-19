@echo off
REM Start Script for Attendance Management System (Spring Boot + React)

echo ======================================
echo Attendance Management System - Startup
echo ======================================
echo.

REM Check if Java is installed
java -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Java is not installed or not in PATH
    echo Please install Java 17 or higher
    pause
    exit /b 1
)

REM Check if Maven is installed
mvn -version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Maven is not installed or not in PATH
    echo Please install Maven
    pause
    exit /b 1
)

REM Check if Node is installed
node -v >nul 2>&1
if errorlevel 1 (
    echo WARNING: Node.js is not installed - Frontend will not work
)

echo Java and Maven are installed.
echo.

REM Create two terminal windows - one for backend, one for frontend
echo Starting Backend (Spring Boot)...
start cmd /k "cd Attendance-springboot && mvn clean install && mvn spring-boot:run"

echo.
echo Waiting 15 seconds for backend to start...
timeout /t 15 /nobreak

echo.
echo Starting Frontend (React)...
start cmd /k "cd frontend && npm install && npm run dev"

echo.
echo ======================================
echo Startup Complete!
echo ======================================
echo.
echo Backend running on: http://localhost:8080/api
echo Frontend running on: http://localhost:5173
echo.
echo Press any key to close this window...
pause

#!/bin/bash

# Start Script for Attendance Management System (Spring Boot + React)

echo "======================================"
echo "Attendance Management System - Startup"
echo "======================================"
echo ""

# Check if Java is installed
if ! command -v java &> /dev/null; then
    echo "ERROR: Java is not installed"
    echo "Please install Java 17 or higher"
    exit 1
fi

# Check if Maven is installed
if ! command -v mvn &> /dev/null; then
    echo "ERROR: Maven is not installed"
    echo "Please install Maven"
    exit 1
fi

# Check if Node is installed
if ! command -v node &> /dev/null; then
    echo "WARNING: Node.js is not installed - Frontend will not work"
fi

echo "Java and Maven are installed."
echo ""

# Start backend in background
echo "Starting Backend (Spring Boot)..."
cd Attendance-springboot
mvn clean install
mvn spring-boot:run &
BACKEND_PID=$!

echo ""
echo "Waiting 15 seconds for backend to start..."
sleep 15

echo ""
echo "Starting Frontend (React)..."
cd ../frontend
npm install
npm run dev &
FRONTEND_PID=$!

echo ""
echo "======================================"
echo "Startup Complete!"
echo "======================================"
echo ""
echo "Backend running on: http://localhost:8080/api"
echo "Frontend running on: http://localhost:5173"
echo ""
echo "Press Ctrl+C to stop both services"

# Wait for user interrupt
wait

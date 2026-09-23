package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.service.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/attendance")
public class AttendanceController {

    @Autowired
    private AttendanceService attendanceService;

    @GetMapping("/lecture-slots")
    public ResponseEntity<ApiResponse<List<LectureSlotDTO>>> getLectureSlots(
            @RequestParam(required = false) String teacherId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Lecture slots retrieved successfully",
                attendanceService.getLectureSlots(teacherId)));
    }

    @GetMapping("/roster")
    public ResponseEntity<ApiResponse<AttendanceRosterDTO>> getRoster(
            @RequestParam String subjectId,
            @RequestParam String date) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Roster retrieved successfully",
                attendanceService.getRoster(subjectId, date)));
    }

    @PostMapping("/mark")
    public ResponseEntity<ApiResponse<AttendanceRosterDTO>> markAttendance(
            @RequestBody MarkAttendanceRequest request) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Attendance saved successfully",
                attendanceService.markAttendance(request)));
    }

    // Grouped by (subject name, class) — the same course taught n times a week shows once.
    @GetMapping("/courses")
    public ResponseEntity<ApiResponse<List<CourseGroupDTO>>> getCourseGroups(
            @RequestParam(required = false) String teacherId) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Courses retrieved successfully",
                attendanceService.getCourseGroups(teacherId)));
    }

    @GetMapping("/sheet")
    public ResponseEntity<ApiResponse<AttendanceSheetDTO>> getSheet(
            @RequestParam(required = false) String teacherId,
            @RequestParam String subjectName,
            @RequestParam String className) {
        return ResponseEntity.ok(new ApiResponse<>(true, "Attendance sheet retrieved successfully",
                attendanceService.getAttendanceSheet(teacherId, subjectName, className)));
    }
}
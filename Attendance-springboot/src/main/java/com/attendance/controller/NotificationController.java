package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.service.NotificationService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    @Autowired
    private NotificationService notificationService;

    // Get all notifications
    @GetMapping
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getAllNotifications() {
        List<NotificationDTO> notifications = notificationService.getAllNotifications();
        return ResponseEntity.ok(new ApiResponse<>(true, "Notifications retrieved successfully", notifications));
    }

    // Get notification by ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<NotificationDTO>> getNotificationById(@PathVariable String id) {
        NotificationDTO notification = notificationService.getNotificationById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Notification retrieved successfully", notification));
    }

    // Get notifications by teacher
    @GetMapping("/teacher/{teacherId}")
public ResponseEntity<ApiResponse<List<NotificationDTO>>> getNotificationsByTeacher(
        @PathVariable String teacherId,
        @RequestParam(required = false) String startDate,
        @RequestParam(required = false) String endDate) {
    List<NotificationDTO> notifications = notificationService.getNotificationsByTeacher(teacherId, startDate, endDate);
    return ResponseEntity.ok(new ApiResponse<>(true, "Notifications retrieved successfully", notifications));
}

    // Get notifications by student
    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getNotificationsByStudent(
            @PathVariable String studentId) {
        List<NotificationDTO> notifications = notificationService.getNotificationsByStudent(studentId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Notifications retrieved successfully", notifications));
    }

    // Get unread notifications
    @GetMapping("/unread")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getUnreadNotifications() {
        List<NotificationDTO> notifications = notificationService.getUnreadNotifications();
        return ResponseEntity.ok(new ApiResponse<>(true, "Unread notifications retrieved successfully", notifications));
    }

    // Get notifications by attendance request
    @GetMapping("/attendance-request/{attendanceRequestId}")
    public ResponseEntity<ApiResponse<List<NotificationDTO>>> getNotificationsByAttendanceRequest(
            @PathVariable String attendanceRequestId) {
        List<NotificationDTO> notifications = notificationService
                .getNotificationsByAttendanceRequest(attendanceRequestId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Notifications retrieved successfully", notifications));
    }

    // Create notification
    @PostMapping
    public ResponseEntity<ApiResponse<NotificationDTO>> createNotification(
            @RequestBody NotificationDTO request) {
        NotificationDTO notification = notificationService.createNotification(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Notification created successfully", notification));
    }

    // Mark notification as read
    @PutMapping("/{id}/read")
    public ResponseEntity<ApiResponse<NotificationDTO>> markAsRead(@PathVariable String id) {
        NotificationDTO notification = notificationService.markAsRead(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Notification marked as read", notification));
    }

    // Delete notification
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteNotification(@PathVariable String id) {
        notificationService.deleteNotification(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Notification deleted successfully"));
    }
}

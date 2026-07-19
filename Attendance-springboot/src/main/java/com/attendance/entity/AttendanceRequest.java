package com.attendance.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "attendance_requests")
public class AttendanceRequest {

    @Id
    private String id;

    private String name;

    private String reason;

    private String proof; // URL to uploaded proof document

    private List<SubjectDate> subjectDates;
    @Indexed
    private String studentId; // Reference to User

    private List<String> studentIds; // For bulk requests
    @Indexed
    private String status = "pending"; // pending, approved, rejected

    private LocalDateTime date;

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();
    @Indexed
    private String department;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SubjectDate {
        private String subjectId;
        private LocalDateTime date;

    }
}

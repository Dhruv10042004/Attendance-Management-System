package com.attendance.dto;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRequestDTO {

    private String id;
    private String name;
    private String reason;
    private String proof;
    private List<SubjectDateDTO> subjectDates;
    private String studentId;
    private List<String> studentIds;
    private String status;
    private LocalDateTime date;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private UserDTO student;        // NEW: enriched owner
    private List<UserDTO> students; 
    private String department;
}
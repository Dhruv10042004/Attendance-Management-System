package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDTO {

    private String id;
    private String attendanceRequestId;
    private String teacherId;
    private List<String> studentIds;
    private String subjectId;
    private LocalDateTime date;
    private Boolean isRead;
    private SubjectDTO subject;
    private List<UserDTO> students;
    private String reason; // pulled from the linked attendance request
}

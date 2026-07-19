package com.attendance.dto;

import com.attendance.entity.AttendanceRequest;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRequestCreateRequest {

    private String name;
    private String reason;
    private List<AttendanceRequest.SubjectDate> subjectDates;
    private String studentId;
    private List<String> studentIds;
    private LocalDateTime date;
}

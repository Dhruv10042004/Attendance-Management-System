package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceRosterDTO {
    private String subjectId;
    private String subjectName;
    private String className;
    private LocalDate date;
    private String day;
    private boolean editable;
    private List<StudentAttendanceDTO> students;
}
package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubjectCreateRequest {

    private String name;
    private String startTime;
    private String endTime;
    private String teacherId;
    private String className;
    private String day;

    // Optional: restrict this slot to specific students (elective, or one batch of
    // a split lab).
    // Null/empty means "whole class", same as before this field existed.
    private java.util.List<String> enrolledStudentIds;

    // Optional: other classes this one slot should also appear in (e.g. I2, I3 for
    // a shared lecture).
    private java.util.List<String> extraClassNames;
}
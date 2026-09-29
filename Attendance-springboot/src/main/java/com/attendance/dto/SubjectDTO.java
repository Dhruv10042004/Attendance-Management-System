package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubjectDTO {

    private String id;
    private String name;
    private String startTime;
    private String endTime;
    private String teacherId;
    private String className;
    private String day;
    private String teacherName;

    // Null/empty = whole class. Non-empty = only these student ids are enrolled
    // (elective / one lab batch).
    private java.util.List<String> enrolledStudentIds;

    // Other classes this slot also appears in (multi-class lecture). Null/empty =
    // just className.
    private java.util.List<String> extraClassNames;
}
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
}

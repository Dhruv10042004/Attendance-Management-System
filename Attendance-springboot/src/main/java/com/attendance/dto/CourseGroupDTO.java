package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class CourseGroupDTO {
    private String subjectName;
    private String className; // division
    private List<String> subjectIds; // every timetable slot that makes up this course
    private List<String> slotSummaries; // e.g. "Monday 09:00-10:00", one per slot
}
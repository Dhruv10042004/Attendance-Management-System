package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceSheetDTO {
    private String subjectName;
    private String className;
    private List<LectureColumnDTO> lectureColumns; // one per actual lecture occurrence, across all slots
    private List<AttendanceSheetRowDTO> rows;
}
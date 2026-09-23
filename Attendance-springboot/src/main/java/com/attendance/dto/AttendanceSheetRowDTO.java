package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceSheetRowDTO {
    private String studentId;
    private String sap;
    private String name;
    private Map<String, String> marksByColumn; // LectureColumnDTO.key -> "P" / "A" / "-"
    private double presentHours; // sum of durationHours across columns marked Present
    private double totalHours; // sum of durationHours across all columns
    private double percentage; // presentHours / totalHours * 100
}
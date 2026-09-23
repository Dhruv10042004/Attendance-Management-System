package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LectureColumnDTO {
    private String key;        // subjectId + "_" + date — uniquely identifies one lecture occurrence
    private String subjectId;
    private LocalDate date;
    private String day;
    private String startTime;
    private String endTime;
    private double durationHours; // e.g. 09:00-10:00 = 1.0, 14:00-16:00 = 2.0 — used to weight attendance %
}
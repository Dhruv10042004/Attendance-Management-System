package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AttendanceStatsDTO {

    private Long total;
    private Long approved;
    private Long rejected;
    private Long pending;
}
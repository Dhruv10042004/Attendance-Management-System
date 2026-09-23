
package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class LectureSlotDTO {
    private String subjectId;
    private String subjectName;
    private String className; // division
    private String day;
    private String startTime;
    private String endTime;
    private LocalDate date; // actual calendar date this occurrence falls on
    private boolean editable; // true only while date == today
    private boolean marked; // true if attendance already saved for this occurrence
}

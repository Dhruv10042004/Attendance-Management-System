package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class MarkAttendanceRequest {
    private String subjectId;
    private String date; // yyyy-MM-dd
    private List<Entry> records;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Entry {
        private String studentId;
        private boolean present;
    }
}
package com.attendance.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "attendance_records")
@CompoundIndex(name = "subject_date_student_idx", def = "{'subjectId': 1, 'date': 1, 'studentId': 1}", unique = true)
public class AttendanceRecord {

    @Id
    private String id;

    private String subjectId;
    private LocalDate date;
    private String studentId;

    private Boolean present = false;
    private String markedByTeacherId;

    private LocalDateTime createdAt = LocalDateTime.now();
    private LocalDateTime updatedAt = LocalDateTime.now();
}
package com.attendance.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.index.Indexed;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "subjects")
public class Subject {

    @Id
    private String id;

    private String name;

    private String startTime; // HH:MM format

    private String endTime; // HH:MM format
    @Indexed
    private String teacherId; // Reference to User

    private String className;

    private String day; // Monday, Tuesday, Wednesday, Thursday, Friday, Saturday

    // Null/empty = every student in className takes this slot (the historical
    // default).
    // Non-empty = ONLY these student ids do — used for electives and batch-split
    // labs
    // (e.g. two "DS Lab" slots, one per weekly occurrence, each listing its own
    // half of the class).
    private java.util.List<String> enrolledStudentIds;

    // Other classes whose timetable this SAME slot also appears in (e.g. one
    // "Advanced Security"
    // lecture shared by I1, I2 and I3). className stays the primary/owning class.
    private java.util.List<String> extraClassNames;

    /** className plus extraClassNames: every class this slot appears in. */
    public java.util.List<String> classesServed() {
        java.util.List<String> all = new java.util.ArrayList<>();
        if (className != null)
            all.add(className);
        if (extraClassNames != null) {
            for (String c : extraClassNames) {
                if (c != null && !all.contains(c))
                    all.add(c);
            }
        }
        return all;
    }

    private LocalDateTime createdAt = LocalDateTime.now();

    private LocalDateTime updatedAt = LocalDateTime.now();
}
package com.attendance.entity;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.List;

/**
 * A named, reusable list of students — a lab batch (e.g. "I1-1"), or a cross-class elective's
 * roster (e.g. "Advanced Security" drawing from I1/I2/I3) — set once per semester by CSV upload,
 * then attached to one or more {@link Subject} slots instead of re-picking students by hand each time.
 * Attaching just copies studentIds onto the subject at that moment: editing a group afterwards does
 * NOT retroactively change subjects that already used it (kept simple on purpose — see StudentGroupService).
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "student_groups")
public class StudentGroup {

    @Id
    private String id;

    private String name;

    private List<String> studentIds;

    // Snapshotted at upload time: every distinct class these students belong to. Lets the timetable UI
    // show (read-only) which classes a batch will appear in, without re-joining against Users each time.
    private List<String> classes;

    private LocalDateTime createdAt = LocalDateTime.now();
}
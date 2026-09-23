package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentAttendanceDTO {
    private String studentId;
    private String sap;
    private String name;
    private String className;
    private boolean present;
    private boolean grantedByHod; // pre-checked: HOD already approved an excused-attendance request for this lecture
}

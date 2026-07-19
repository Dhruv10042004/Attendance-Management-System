package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserCreateRequest {

    private String sap;
    private String name;
    private String email;
    private String password;
    private String className;
    private String role; // student, teacher, hod, admin
    private Boolean isFirstLogin;
    private String department;
}

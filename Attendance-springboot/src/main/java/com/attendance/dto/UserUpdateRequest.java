package com.attendance.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserUpdateRequest {

    private String sap;
    private String name;
    private String email;
    private String className;
    private String role;
    private Boolean isFirstLogin;
    private String department;
}

package com.attendance.controller;

import java.io.IOException;
import com.attendance.dto.*;
import com.attendance.entity.User;
import com.attendance.security.JwtTokenProvider;
import com.attendance.service.CsvImportService;
import com.attendance.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import com.attendance.service.CsvImportService;

import java.util.List;

@RestController
@RequestMapping("/users")
public class UserController {

    @Autowired
    private UserService userService;

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private JwtTokenProvider jwtTokenProvider;

    @Autowired
    private CsvImportService csvImportService;

    // Get all users
    @GetMapping
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllUsers() {
        List<UserDTO> users = userService.getAllUsers();
        return ResponseEntity.ok(new ApiResponse<>(true, "Users retrieved successfully", users));
    }

    // Get user by ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> getUserById(@PathVariable String id) {
        UserDTO user = userService.getUserById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "User retrieved successfully", user));
    }

    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<UserDTO>>> searchUsers(
            @RequestParam String query,
            @RequestParam(required = false, defaultValue = "all") String role) {
        List<UserDTO> users = userService.searchUsers(query, role);
        return ResponseEntity.ok(new ApiResponse<>(true, "Search completed", users));
    }

    // Get all teachers
    @GetMapping("/teachers")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getAllTeachers() {
        List<UserDTO> teachers = userService.getUsersByRole("teacher");
        return ResponseEntity.ok(new ApiResponse<>(true, "Teachers retrieved successfully", teachers));
    }

    // Login endpoint
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<LoginResponse>> login(@RequestBody LoginRequest request) {
        try {
            Authentication authentication = authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            request.getEmail(),
                            request.getPassword()));

            String token = jwtTokenProvider.generateToken(authentication);
            User user = userService.getUserEntityByEmail(request.getEmail());
            UserDTO userDTO = new UserDTO(
                    user.getId(),
                    user.getSap(),
                    user.getName(),
                    user.getEmail(),
                    user.getClassName(),
                    user.getRole(),
                    user.getIsFirstLogin(),
                    user.getDepartment());

            LoginResponse response = new LoginResponse(token, userDTO);
            return ResponseEntity.ok(new ApiResponse<>(true, "Login successful", response));
        } catch (Exception e) {
            e.printStackTrace(); // TEMPORARY - shows real cause in Render logs
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED)
                    .body(new ApiResponse<>(false, "Invalid email or password"));
        }
    }

    // Create user
    @PostMapping
    public ResponseEntity<ApiResponse<UserDTO>> createUser(@RequestBody UserCreateRequest request) {
        UserDTO user = userService.createUser(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "User created successfully", user));
    }

    // Update user
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<UserDTO>> updateUser(
            @PathVariable String id,
            @RequestBody UserUpdateRequest request) {
        UserDTO user = userService.updateUser(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "User updated successfully", user));
    }

    // Delete user
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "User deleted successfully"));
    }

    // Delete users by role
    @DeleteMapping("/bulk/{role}")
    public ResponseEntity<ApiResponse<String>> deleteUsersByRole(@PathVariable String role) {
        Long deletedCount = userService.deleteUsersByRole(role);
        return ResponseEntity.ok(new ApiResponse<>(true,
                "Successfully deleted " + deletedCount + " users with role: " + role));
    }

    // Bulk create users from CSV
    @PostMapping("/bulk/csv")
    public ResponseEntity<ApiResponse<CsvImportResult>> bulkCreateUsers(
            @RequestParam("file") MultipartFile file) {
        try {
            CsvImportResult result = csvImportService.importUsersFromCsv(file);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new ApiResponse<>(true, "Bulk import completed", result));
        } catch (IOException e) {
            return ResponseEntity.badRequest()
                    .body(new ApiResponse<>(false, "Failed to process CSV file: " + e.getMessage()));
        }
    }

    // Get users by role
    @GetMapping("/role/{role}")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getUsersByRole(@PathVariable String role) {
        List<UserDTO> users = userService.getUsersByRole(role);
        return ResponseEntity.ok(new ApiResponse<>(true, "Users retrieved successfully", users));
    }

    // Get users by class
    @GetMapping("/class/{className}")
    public ResponseEntity<ApiResponse<List<UserDTO>>> getUsersByClass(@PathVariable String className) {
        List<UserDTO> users = userService.getUsersByClassName(className);
        return ResponseEntity.ok(new ApiResponse<>(true, "Users retrieved successfully", users));
    }
}

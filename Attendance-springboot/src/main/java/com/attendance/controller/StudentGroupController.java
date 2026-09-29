package com.attendance.controller;

import com.attendance.dto.ApiResponse;
import com.attendance.entity.StudentGroup;
import com.attendance.service.StudentGroupService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/student-groups")
public class StudentGroupController {

    @Autowired
    private StudentGroupService groupService;

    @GetMapping
    public ResponseEntity<ApiResponse<List<StudentGroup>>> getAll() {
        return ResponseEntity.ok(new ApiResponse<>(true, "Groups retrieved", groupService.getAll()));
    }

    @PostMapping
    public ResponseEntity<ApiResponse<StudentGroup>> upload(
            @RequestParam("name") String name, @RequestParam("file") MultipartFile file) {
        try {
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(new ApiResponse<>(true, "Group created", groupService.importFromCsv(name, file)));
        } catch (IOException e) {
            return ResponseEntity.badRequest().body(new ApiResponse<>(false, "Failed to read file: " + e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> delete(@PathVariable String id) {
        groupService.delete(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Group deleted"));
    }
}
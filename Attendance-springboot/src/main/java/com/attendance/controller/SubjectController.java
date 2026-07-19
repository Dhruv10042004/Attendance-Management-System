package com.attendance.controller;

import com.attendance.dto.*;
import com.attendance.service.SubjectService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/subjects")
public class SubjectController {

    @Autowired
    private SubjectService subjectService;

    // Get all subjects
    @GetMapping
    public ResponseEntity<ApiResponse<List<SubjectDTO>>> getAllSubjects() {
        List<SubjectDTO> subjects = subjectService.getAllSubjects();
        return ResponseEntity.ok(new ApiResponse<>(true, "Subjects retrieved successfully", subjects));
    }

    // Get subject by ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<SubjectDTO>> getSubjectById(@PathVariable String id) {
        SubjectDTO subject = subjectService.getSubjectById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Subject retrieved successfully", subject));
    }

    // Get subjects by teacher
    @GetMapping("/teacher/{teacherId}")
    public ResponseEntity<ApiResponse<List<SubjectDTO>>> getSubjectsByTeacher(
            @PathVariable String teacherId) {
        List<SubjectDTO> subjects = subjectService.getSubjectsByTeacher(teacherId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Subjects retrieved successfully", subjects));
    }

    // Get subjects by class
    @GetMapping("/class/{className}")
    public ResponseEntity<ApiResponse<List<SubjectDTO>>> getSubjectsByClass(
            @PathVariable String className) {
        List<SubjectDTO> subjects = subjectService.getSubjectsByClassName(className);
        return ResponseEntity.ok(new ApiResponse<>(true, "Subjects retrieved successfully", subjects));
    }

    // Get subjects by day
    @GetMapping("/day/{day}")
    public ResponseEntity<ApiResponse<List<SubjectDTO>>> getSubjectsByDay(
            @PathVariable String day) {
        List<SubjectDTO> subjects = subjectService.getSubjectsByDay(day);
        return ResponseEntity.ok(new ApiResponse<>(true, "Subjects retrieved successfully", subjects));
    }

    // Get subjects by class and day
    @GetMapping("/schedule/{className}/{day}")
    public ResponseEntity<ApiResponse<List<SubjectDTO>>> getSubjectsByClassAndDay(
            @PathVariable String className,
            @PathVariable String day) {
        List<SubjectDTO> subjects = subjectService.getSubjectsByClassAndDay(className, day);
        return ResponseEntity.ok(new ApiResponse<>(true, "Subjects retrieved successfully", subjects));
    }

    // Search subjects
    @GetMapping("/search")
    public ResponseEntity<ApiResponse<List<SubjectDTO>>> searchSubjects(@RequestParam String query) {
        List<SubjectDTO> subjects = subjectService.searchSubjects(query);
        return ResponseEntity.ok(new ApiResponse<>(true, "Search completed", subjects));
    }

    // Create subject
    @PostMapping
    public ResponseEntity<ApiResponse<SubjectDTO>> createSubject(
            @RequestBody SubjectCreateRequest request) {
        SubjectDTO subject = subjectService.createSubject(request);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Subject created successfully", subject));
    }

    // Update subject
    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<SubjectDTO>> updateSubject(
            @PathVariable String id,
            @RequestBody SubjectCreateRequest request) {
        SubjectDTO subject = subjectService.updateSubject(id, request);
        return ResponseEntity.ok(new ApiResponse<>(true, "Subject updated successfully", subject));
    }

    // Delete subject
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteSubject(@PathVariable String id) {
        subjectService.deleteSubject(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Subject deleted successfully"));
    }
}

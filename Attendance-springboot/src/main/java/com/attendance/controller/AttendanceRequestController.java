package com.attendance.controller;
import java.io.IOException;
import com.attendance.dto.*;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.service.AttendanceRequestService;
import com.fasterxml.jackson.core.JsonProcessingException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.MediaType;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
@RestController
@RequestMapping("/attendance-requests")
public class AttendanceRequestController {

    @Autowired
    private AttendanceRequestService attendanceRequestService;
    @GetMapping("/department/{department}")
    public ResponseEntity<ApiResponse<List<AttendanceRequestDTO>>> getRequestsByDepartment(
        @PathVariable String department) {
    List<AttendanceRequestDTO> requests = attendanceRequestService.getRequestsByDepartment(department);
    return ResponseEntity.ok(new ApiResponse<>(true, "Attendance requests retrieved successfully", requests));
    }
    // Get all requests
    @GetMapping
    public ResponseEntity<ApiResponse<List<AttendanceRequestDTO>>> getAllRequests() {
        List<AttendanceRequestDTO> requests = attendanceRequestService.getAllRequests();
        return ResponseEntity.ok(new ApiResponse<>(true, "Attendance requests retrieved successfully", requests));
    }

    // Get request by ID
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<AttendanceRequestDTO>> getRequestById(@PathVariable String id) {
        AttendanceRequestDTO request = attendanceRequestService.getRequestById(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Attendance request retrieved successfully", request));
    }

    // Get requests by student ID
    @GetMapping("/student/{studentId}")
    public ResponseEntity<ApiResponse<List<AttendanceRequestDTO>>> getRequestsByStudentId(
            @PathVariable String studentId) {
        List<AttendanceRequestDTO> requests = attendanceRequestService.getRequestsByStudentId(studentId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Attendance requests retrieved successfully", requests));
    }

    // Get requests by status
    @GetMapping("/status/{status}")
    public ResponseEntity<ApiResponse<List<AttendanceRequestDTO>>> getRequestsByStatus(
            @PathVariable String status) {
        List<AttendanceRequestDTO> requests = attendanceRequestService.getRequestsByStatus(status);
        return ResponseEntity.ok(new ApiResponse<>(true, "Attendance requests retrieved successfully", requests));
    }

    // Get stats for student
    @GetMapping("/stats/{studentId}")
    public ResponseEntity<ApiResponse<AttendanceStatsDTO>> getStudentStats(
            @PathVariable String studentId) {
        AttendanceStatsDTO stats = attendanceRequestService.getStudentRequestStats(studentId);
        return ResponseEntity.ok(new ApiResponse<>(true, "Statistics retrieved successfully", stats));
    }

    // Create request
    @PostMapping
    public ResponseEntity<ApiResponse<AttendanceRequestDTO>> createRequest(
            @RequestParam("name") String name,
            @RequestParam("reason") String reason,
            @RequestParam("student_id") String studentId,
            @RequestParam("date") String date,
            @RequestParam(value = "student_ids", required = false) String[] studentIds,
            @RequestParam("subjectDatesJson") String subjectDatesJson,
            @RequestParam(value = "proof", required = false) MultipartFile proof) throws JsonProcessingException {
        System.out.println(name);
        List<String> studentIdsList = studentIds != null ? Arrays.asList(studentIds) : new ArrayList<>();

        AttendanceRequestDTO createdRequest = attendanceRequestService.createRequest(
                name, reason, studentId, date, studentIdsList, subjectDatesJson, proof);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(new ApiResponse<>(true, "Attendance request created successfully", createdRequest));
    }

    // Update request
    @PutMapping(path = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<ApiResponse<AttendanceRequestDTO>> updateRequest(
            @PathVariable String id,
            @RequestParam(value = "name", required = false) String name,
            @RequestParam(value = "reason", required = false) String reason,
            @RequestParam(value = "date", required = false) String date,
            @RequestParam(value = "student_ids", required = false) String[] studentIds,
            @RequestParam(value = "subjectDatesJson", required = false) String subjectDatesJson,
            @RequestParam(value = "proof", required = false) MultipartFile proof) throws JsonProcessingException {

        List<String> studentIdsList = studentIds != null ? Arrays.asList(studentIds) : null;

        AttendanceRequestDTO updatedRequest = attendanceRequestService.updateRequest(
                id, name, reason, date, studentIdsList, subjectDatesJson, proof);

        return ResponseEntity.ok(new ApiResponse<>(true, "Attendance request updated successfully", updatedRequest));
    }

    // Update request status
    @PutMapping("/{id}/status")
    public ResponseEntity<ApiResponse<AttendanceRequestDTO>> updateRequestStatus(
            @PathVariable String id,
            @RequestBody AttendanceStatusUpdateRequest request) {
        AttendanceRequestDTO updatedRequest = attendanceRequestService.updateRequestStatus(id, request.getStatus());
        return ResponseEntity
                .ok(new ApiResponse<>(true, "Attendance request status updated successfully", updatedRequest));
    }

    // Delete request
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiResponse<String>> deleteRequest(@PathVariable String id) {
        attendanceRequestService.deleteRequest(id);
        return ResponseEntity.ok(new ApiResponse<>(true, "Attendance request deleted successfully"));
    }

@Value("${app.upload.dir:uploads/attendance-proofs}")
private String uploadDir;

@GetMapping("/proof/{filename}")
public ResponseEntity<Resource> getProofFile(@PathVariable String filename) throws IOException {
    Path filePath = Paths.get(uploadDir).resolve(filename).normalize();
    Resource resource = new UrlResource(filePath.toUri());

    if (!resource.exists() || !resource.isReadable()) {
        throw new ResourceNotFoundException("Proof file not found: " + filename);
    }

    String contentType = Files.probeContentType(filePath);
    return ResponseEntity.ok()
            .contentType(MediaType.parseMediaType(contentType != null ? contentType : "application/octet-stream"))
            .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + filename + "\"")
            .body(resource);
}
}

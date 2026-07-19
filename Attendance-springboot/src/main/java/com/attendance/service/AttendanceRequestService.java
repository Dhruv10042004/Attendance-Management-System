package com.attendance.service;

import com.attendance.dto.SubjectDateDTO;
import com.attendance.dto.UserDTO;
import com.attendance.dto.SubjectDTO;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.dto.AttendanceRequestDTO;
import com.attendance.dto.AttendanceRequestCreateRequest;
import com.attendance.dto.AttendanceStatsDTO;
import com.attendance.entity.AttendanceRequest;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.repository.AttendanceRequestRepository;
import com.attendance.repository.NotificationRepository;
import com.attendance.entity.Notification;
import com.attendance.repository.NotificationRepository;
import com.attendance.entity.Subject;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import org.springframework.web.multipart.MultipartFile;
import java.time.LocalDateTime;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.UUID;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.core.type.TypeReference;
import java.util.Objects;
@Service
public class AttendanceRequestService {

    @Autowired
    private AttendanceRequestRepository attendanceRequestRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private UserService userService;
    @Autowired
    private NotificationRepository notificationRepository;
    @Autowired
    private SubjectService subjectService;
    public AttendanceRequest getRequestEntityById(String id) {
    return attendanceRequestRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Attendance request not found with id: " + id));
    }
    public List<AttendanceRequestDTO> getAllRequests() {
    return attendanceRequestRepository.findAll()
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }
    public AttendanceRequestDTO getRequestById(String id) {
    AttendanceRequest request = attendanceRequestRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Attendance request not found with id: " + id));
    return mapToDTO(request);
    }

    public List<AttendanceRequestDTO> getRequestsByStudentId(String studentId) {
    userService.getUserEntityById(studentId);

    List<AttendanceRequest> ownRequests = attendanceRequestRepository.findByStudentId(studentId);
    List<AttendanceRequest> includedRequests = attendanceRequestRepository.findByStudentIdsContaining(studentId);

    Map<String, AttendanceRequest> merged = new LinkedHashMap<>();
    for (AttendanceRequest r : ownRequests) merged.put(r.getId(), r);
    for (AttendanceRequest r : includedRequests) merged.putIfAbsent(r.getId(), r);

    return merged.values().stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    public List<AttendanceRequestDTO> getRequestsByStatus(String status) {
    return attendanceRequestRepository.findByStatus(status)
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    public List<AttendanceRequestDTO> getRequestsByStudentAndStatus(String studentId, String status) {
    userService.getUserEntityById(studentId);
    return attendanceRequestRepository.findByStudentIdAndStatus(studentId, status)
            .stream()
            .map(this::mapToDTO)
            .collect(Collectors.toList());
    }

    public AttendanceStatsDTO getStudentRequestStats(String studentId) {
        userService.getUserEntityById(studentId);

        Long totalRequests = (long) attendanceRequestRepository.findByStudentId(studentId).size();
        Long approvedCount = attendanceRequestRepository.countByStudentIdAndStatus(studentId, "approved");
        Long rejectedCount = attendanceRequestRepository.countByStudentIdAndStatus(studentId, "rejected");
        Long pendingCount = attendanceRequestRepository.countByStudentIdAndStatus(studentId, "pending");

        return new AttendanceStatsDTO(totalRequests, approvedCount, rejectedCount, pendingCount);
    }

    private AttendanceRequestDTO mapToDTO(AttendanceRequest request) {
        AttendanceRequestDTO dto = new AttendanceRequestDTO();
        dto.setId(request.getId());
        dto.setName(request.getName());
        dto.setReason(request.getReason());
        dto.setProof(request.getProof());
        dto.setStudentId(request.getStudentId());
        dto.setStudentIds(request.getStudentIds());
        dto.setStatus(request.getStatus());
        dto.setDate(request.getDate());
        dto.setCreatedAt(request.getCreatedAt());
        dto.setUpdatedAt(request.getUpdatedAt());

        List<SubjectDateDTO> enrichedSubjectDates = (request.getSubjectDates() == null)
                ? new ArrayList<>()
                : request.getSubjectDates().stream()
                        .map(sd -> {
                            SubjectDTO subjectDTO = null;
                            try {
                                subjectDTO = subjectService.getSubjectById(sd.getSubjectId());
                            } catch (ResourceNotFoundException e) {
                                // subject may have been deleted since; leave null rather than failing the whole
                                // request
                            }
                            return new SubjectDateDTO(subjectDTO, sd.getDate());
                        })
                        .collect(Collectors.toList());

        dto.setSubjectDates(enrichedSubjectDates);
        try {
    dto.setStudent(userService.getUserById(request.getStudentId()));
} catch (ResourceNotFoundException e) {
    dto.setStudent(null);
}

List<UserDTO> enrichedStudents = (request.getStudentIds() == null)
        ? new ArrayList<>()
        : request.getStudentIds().stream()
            .map(id -> {
                try {
                    return userService.getUserById(id);
                } catch (ResourceNotFoundException e) {
                    return null;
                }
            })
            .filter(Objects::nonNull)
            .collect(Collectors.toList());
        dto.setStudents(enrichedStudents);
        return dto;
    }

    public AttendanceRequestDTO createRequest(
            String name,
            String reason,
            String studentId,
            String date,
            List<String> studentIds,
            String subjectDatesJson,
            MultipartFile proof) throws com.fasterxml.jackson.core.JsonProcessingException {

        userService.getUserEntityById(studentId);

        ObjectMapper mapper = new ObjectMapper();
        List<Map<String, String>> rawSubjectDates = mapper.readValue(
                subjectDatesJson, new TypeReference<List<Map<String, String>>>() {
                });

        List<AttendanceRequest.SubjectDate> subjectDates = new ArrayList<>();
        for (Map<String, String> entry : rawSubjectDates) {
            String subjectId = entry.get("subjectId");
            String dateStr = entry.get("date");

            subjectService.getSubjectEntityById(subjectId); // verify it exists

            AttendanceRequest.SubjectDate sd = new AttendanceRequest.SubjectDate();
            sd.setSubjectId(subjectId);
            if (dateStr != null) {
                sd.setDate(LocalDateTime.parse(dateStr.substring(0, 19)));
            }
            subjectDates.add(sd);
        }

        AttendanceRequest attendanceRequest = new AttendanceRequest();
        attendanceRequest.setName(name);
        attendanceRequest.setReason(reason);
        attendanceRequest.setSubjectDates(subjectDates);
        attendanceRequest.setStudentId(studentId);
        attendanceRequest.setStudentIds(studentIds);
        attendanceRequest.setStatus("pending");
        attendanceRequest.setDate(date != null ? LocalDateTime.parse(date.substring(0, 19)) : LocalDateTime.now());
        attendanceRequest.setCreatedAt(LocalDateTime.now());

        if (proof != null && !proof.isEmpty()) {
            String proofUrl = saveProofFile(proof);
            attendanceRequest.setProof(proofUrl);
        }

        AttendanceRequest savedRequest = attendanceRequestRepository.save(attendanceRequest);
        return mapToDTO(savedRequest);
    }

    public AttendanceRequestDTO updateRequest(
            String id,
            String name,
            String reason,
            String date,
            List<String> studentIds,
            String subjectDatesJson,
            MultipartFile proof) throws com.fasterxml.jackson.core.JsonProcessingException {

        AttendanceRequest attendanceRequest = attendanceRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance request not found with id: " + id));

        if (name != null)
            attendanceRequest.setName(name);
        if (reason != null)
            attendanceRequest.setReason(reason);

        if (date != null) {
            attendanceRequest.setDate(LocalDateTime.parse(date.substring(0, 19)));
        }

        if (studentIds != null) {
            attendanceRequest.setStudentIds(studentIds);
        }

        if (subjectDatesJson != null) {
            ObjectMapper mapper = new ObjectMapper();
            List<Map<String, String>> rawSubjectDates = mapper.readValue(
                    subjectDatesJson, new TypeReference<List<Map<String, String>>>() {
                    });

            List<AttendanceRequest.SubjectDate> subjectDates = new ArrayList<>();
            for (Map<String, String> entry : rawSubjectDates) {
                String subjectId = entry.get("subjectId");
                String dateStr = entry.get("date");

                subjectService.getSubjectEntityById(subjectId); // verify it exists

                AttendanceRequest.SubjectDate sd = new AttendanceRequest.SubjectDate();
                sd.setSubjectId(subjectId);
                if (dateStr != null) {
                    sd.setDate(LocalDateTime.parse(dateStr.substring(0, 19)));
                }
                subjectDates.add(sd);
            }
            attendanceRequest.setSubjectDates(subjectDates);
        }

        if (proof != null && !proof.isEmpty()) {
            attendanceRequest.setProof(saveProofFile(proof));
        }

        attendanceRequest.setUpdatedAt(LocalDateTime.now());

        AttendanceRequest updatedRequest = attendanceRequestRepository.save(attendanceRequest);
        return mapToDTO(updatedRequest);
    }

    public AttendanceRequestDTO updateRequestStatus(String id, String status) {
        AttendanceRequest attendanceRequest = attendanceRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance request not found with id: " + id));

        if (!status.equals("approved") && !status.equals("rejected")) {
            throw new IllegalArgumentException("Invalid status. Must be 'approved' or 'rejected'");
        }

        attendanceRequest.setStatus(status);
        if (status.equals("approved")) {
    List<String> allStudentIds = new ArrayList<>();
    allStudentIds.add(attendanceRequest.getStudentId());
    if (attendanceRequest.getStudentIds() != null) {
        allStudentIds.addAll(attendanceRequest.getStudentIds());
    }

    for (AttendanceRequest.SubjectDate sd : attendanceRequest.getSubjectDates()) {
        Subject subject = subjectService.getSubjectEntityById(sd.getSubjectId());

        Notification notification = new Notification();
        notification.setAttendanceRequestId(attendanceRequest.getId());
        notification.setTeacherId(subject.getTeacherId());
        notification.setStudentIds(allStudentIds);
        notification.setSubjectId(sd.getSubjectId());
        notification.setDate(sd.getDate());
        notification.setIsRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        notificationRepository.save(notification);
        }
        }
        attendanceRequest.setUpdatedAt(LocalDateTime.now());

        AttendanceRequest updatedRequest = attendanceRequestRepository.save(attendanceRequest);
        return mapToDTO(updatedRequest);
    }

    public void deleteRequest(String id) {
        AttendanceRequest request = attendanceRequestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Attendance request not found with id: " + id));
        attendanceRequestRepository.delete(request);
    }

    @Value("${app.upload.dir:uploads/attendance-proofs}")
    private String uploadDir;

    @Value("${app.base-url:http://localhost:8080}")
    private String baseUrl;

    private String saveProofFile(MultipartFile file) {
        try {
            // Ensure the upload directory exists
            Path uploadPath = Paths.get(uploadDir);
            if (!Files.exists(uploadPath)) {
                Files.createDirectories(uploadPath);
            }

            // Generate a unique filename to avoid collisions
            String originalFilename = file.getOriginalFilename();
            String extension = "";
            if (originalFilename != null && originalFilename.contains(".")) {
                extension = originalFilename.substring(originalFilename.lastIndexOf("."));
            }
            String uniqueFilename = UUID.randomUUID().toString() + extension;

            // Save the file to disk
            Path targetPath = uploadPath.resolve(uniqueFilename);
            Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);

            // Return a URL that can be used to access the file
            return baseUrl + "/api/attendance-requests/proof/" + uniqueFilename;

        } catch (IOException e) {
            throw new RuntimeException("Failed to store proof file: " + e.getMessage(), e);
        }
    }

}

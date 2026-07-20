package com.attendance.service;

import com.attendance.dto.NotificationDTO;
import com.attendance.dto.UserDTO;
import com.attendance.entity.Notification;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.repository.NotificationRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;
import java.util.Objects;

@Service
public class NotificationService {

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private UserService userService;
    @Autowired
    private SubjectService subjectService;

    @Autowired
    private AttendanceRequestService attendanceRequestService;

    private NotificationDTO mapToDTO(Notification notification) {
        NotificationDTO dto = new NotificationDTO();
        dto.setId(notification.getId());
        dto.setAttendanceRequestId(notification.getAttendanceRequestId());
        dto.setTeacherId(notification.getTeacherId());
        dto.setStudentIds(notification.getStudentIds());
        dto.setSubjectId(notification.getSubjectId());
        dto.setDate(notification.getDate());
        dto.setIsRead(notification.getIsRead());

        try {
            dto.setSubject(subjectService.getSubjectById(notification.getSubjectId()));
        } catch (ResourceNotFoundException e) {
            dto.setSubject(null);
        }

        List<UserDTO> enrichedStudents = (notification.getStudentIds() == null)
                ? new ArrayList<>()
                : notification.getStudentIds().stream()
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

        try {
            dto.setReason(
                    attendanceRequestService.getRequestEntityById(notification.getAttendanceRequestId()).getReason());
        } catch (ResourceNotFoundException e) {
            dto.setReason(null);
        }

        return dto;
    }

    public List<NotificationDTO> getAllNotifications() {
        return notificationRepository.findAll()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public NotificationDTO getNotificationById(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        return modelMapper.map(notification, NotificationDTO.class);
    }

    public List<NotificationDTO> getNotificationsByTeacher(String teacherId, String startDate, String endDate) {
        userService.getUserEntityById(teacherId);

        List<Notification> notifications = notificationRepository.findByTeacherId(teacherId);

        if (startDate != null && !startDate.isBlank()) {
            LocalDate start = LocalDate.parse(startDate);
            notifications = notifications.stream()
                    .filter(n -> !n.getDate().toLocalDate().isBefore(start))
                    .collect(Collectors.toList());
        }

        if (endDate != null && !endDate.isBlank()) {
            LocalDate end = LocalDate.parse(endDate);
            notifications = notifications.stream()
                    .filter(n -> !n.getDate().toLocalDate().isAfter(end))
                    .collect(Collectors.toList());
        }

        return notifications.stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    public List<NotificationDTO> getNotificationsByStudent(String studentId) {
        userService.getUserEntityById(studentId);
        return notificationRepository.findByStudentIdsContaining(studentId)
                .stream()
                .map(notification -> modelMapper.map(notification, NotificationDTO.class))
                .collect(Collectors.toList());
    }

    public List<NotificationDTO> getUnreadNotifications() {
        return notificationRepository.findByIsRead(false)
                .stream()
                .map(notification -> modelMapper.map(notification, NotificationDTO.class))
                .collect(Collectors.toList());
    }

    public List<NotificationDTO> getNotificationsByAttendanceRequest(String attendanceRequestId) {
        return notificationRepository.findByAttendanceRequestId(attendanceRequestId)
                .stream()
                .map(notification -> modelMapper.map(notification, NotificationDTO.class))
                .collect(Collectors.toList());
    }

    public NotificationDTO createNotification(NotificationDTO dto) {
        userService.getUserEntityById(dto.getTeacherId());

        Notification notification = new Notification();
        notification.setAttendanceRequestId(dto.getAttendanceRequestId());
        notification.setTeacherId(dto.getTeacherId());
        notification.setStudentIds(dto.getStudentIds());
        notification.setSubjectId(dto.getSubjectId());
        notification.setDate(dto.getDate() != null ? dto.getDate() : LocalDateTime.now());
        notification.setIsRead(false);
        notification.setCreatedAt(LocalDateTime.now());

        Notification savedNotification = notificationRepository.save(notification);
        return modelMapper.map(savedNotification, NotificationDTO.class);
    }

    public NotificationDTO markAsRead(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));

        notification.setIsRead(true);
        notification.setUpdatedAt(LocalDateTime.now());

        Notification updatedNotification = notificationRepository.save(notification);
        return modelMapper.map(updatedNotification, NotificationDTO.class);
    }

    public void deleteNotification(String id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Notification not found with id: " + id));
        notificationRepository.delete(notification);
    }
}

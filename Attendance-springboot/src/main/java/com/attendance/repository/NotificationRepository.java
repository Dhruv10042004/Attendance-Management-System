package com.attendance.repository;

import com.attendance.entity.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    List<Notification> findByTeacherId(String teacherId);

    List<Notification> findByStudentIdsContaining(String studentId);

    List<Notification> findByIsRead(Boolean isRead);

    List<Notification> findByAttendanceRequestId(String attendanceRequestId);
}

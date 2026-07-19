package com.attendance.repository;

import com.attendance.entity.AttendanceRequest;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface AttendanceRequestRepository extends MongoRepository<AttendanceRequest, String> {

    List<AttendanceRequest> findByStudentId(String studentId);

    List<AttendanceRequest> findByStatus(String status);

    List<AttendanceRequest> findByStudentIdAndStatus(String studentId, String status);

    List<AttendanceRequest> findByStudentIdAndDateBetween(
            String studentId, LocalDateTime startDate, LocalDateTime endDate);

    Long countByStudentIdAndStatus(String studentId, String status);

    List<AttendanceRequest> findByStudentIdsContaining(String studentId);
    List<AttendanceRequest> findByDepartment(String department);
}

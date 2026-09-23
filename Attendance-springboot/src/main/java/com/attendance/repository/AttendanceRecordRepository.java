package com.attendance.repository;
import com.attendance.entity.AttendanceRecord;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AttendanceRecordRepository extends MongoRepository<AttendanceRecord, String> {

    List<AttendanceRecord> findBySubjectIdAndDate(String subjectId, LocalDate date);

    Optional<AttendanceRecord> findBySubjectIdAndDateAndStudentId(String subjectId, LocalDate date, String studentId);

    List<AttendanceRecord> findByStudentId(String studentId);
    
    List<AttendanceRecord> findBySubjectId(String subjectId);
}
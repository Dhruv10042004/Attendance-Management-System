package com.attendance.repository;

import com.attendance.entity.Subject;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubjectRepository extends MongoRepository<Subject, String> {

    List<Subject> findByTeacherId(String teacherId);

    List<Subject> findByClassName(String className);

    List<Subject> findByDay(String day);

    List<Subject> findByClassNameAndDay(String className, String day);

    List<Subject> findByNameContainingIgnoreCase(String name);
}

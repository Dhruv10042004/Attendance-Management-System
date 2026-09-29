package com.attendance.repository;

import com.attendance.entity.Subject;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SubjectRepository extends MongoRepository<Subject, String> {

    List<Subject> findByTeacherId(String teacherId);

    // "This class's timetable": slots owned by the class OR shared into it via
    // extraClassNames.
    @Query("{ $or: [ { className: ?0 }, { extraClassNames: ?0 } ] }")
    List<Subject> findByClassName(String className);

    List<Subject> findByDay(String day);

    @Query("{ day: ?1, $or: [ { className: ?0 }, { extraClassNames: ?0 } ] }")
    List<Subject> findByClassNameAndDay(String className, String day);

    List<Subject> findByNameContainingIgnoreCase(String name);

    List<Subject> findByTeacherIdAndNameAndClassName(String teacherId, String name, String className);
}
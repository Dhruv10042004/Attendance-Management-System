package com.attendance.repository;

import com.attendance.entity.StudentGroup;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentGroupRepository extends MongoRepository<StudentGroup, String> {
}
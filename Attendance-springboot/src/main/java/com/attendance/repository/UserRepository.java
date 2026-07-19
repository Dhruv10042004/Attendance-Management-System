package com.attendance.repository;

import com.attendance.entity.User;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {

    Optional<User> findByEmail(String email);

    Optional<User> findBySap(String sap);

    List<User> findByRole(String role);

    List<User> findByClassName(String className);

    List<User> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrSapContainingIgnoreCase(
        String name, String email, String sap);

    List<User> findByRoleAndNameContainingIgnoreCaseOrRoleAndEmailContainingIgnoreCaseOrRoleAndSapContainingIgnoreCase(
        String role1, String name, String role2, String email, String role3, String sap);

    boolean existsByEmail(String email);

    boolean existsBySap(String sap);
}

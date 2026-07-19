package com.attendance.service;

import com.attendance.dto.UserDTO;
import com.attendance.dto.UserCreateRequest;
import com.attendance.dto.UserUpdateRequest;
import com.attendance.entity.User;
import com.attendance.exception.BadRequestException;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.repository.UserRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ModelMapper modelMapper;

    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(user -> modelMapper.map(user, UserDTO.class))
                .collect(Collectors.toList());
    }

    public UserDTO getUserById(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        return modelMapper.map(user, UserDTO.class);
    }

    public UserDTO getUserByEmail(String email) {
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
        return modelMapper.map(user, UserDTO.class);
    }

    public List<UserDTO> getUsersByRole(String role) {
        return userRepository.findByRole(role)
                .stream()
                .map(user -> modelMapper.map(user, UserDTO.class))
                .collect(Collectors.toList());
    }

    public List<UserDTO> getUsersByClassName(String className) {
        return userRepository.findByClassName(className)
                .stream()
                .map(user -> modelMapper.map(user, UserDTO.class))
                .collect(Collectors.toList());
    }

    public List<UserDTO> searchUsers(String query, String role) {
        List<User> results;

        if (role == null || role.equalsIgnoreCase("all")) {
            results = userRepository
                    .findByNameContainingIgnoreCaseOrEmailContainingIgnoreCaseOrSapContainingIgnoreCase(
                            query, query, query);
        } else {
            results = userRepository
                    .findByRoleAndNameContainingIgnoreCaseOrRoleAndEmailContainingIgnoreCaseOrRoleAndSapContainingIgnoreCase(
                            role, query, role, query, role, query);
        }

        return results.stream()
                .map(user -> modelMapper.map(user, UserDTO.class))
                .collect(Collectors.toList());
    }

    public UserDTO createUser(UserCreateRequest request) {
    if (userRepository.existsByEmail(request.getEmail())) {
        throw new BadRequestException("Email already exists");
    }

    boolean hasSap = request.getSap() != null && !request.getSap().isBlank();

    if (hasSap && userRepository.existsBySap(request.getSap())) {
        throw new BadRequestException("SAP already exists");
    }

    User user = new User();
    user.setSap(hasSap ? request.getSap() : null);
    user.setName(request.getName());
    user.setEmail(request.getEmail());
    user.setPassword(passwordEncoder.encode(request.getPassword()));
    user.setClassName(request.getClassName());
    user.setRole(request.getRole());
    user.setDepartment(request.getDepartment());
    user.setIsFirstLogin(request.getIsFirstLogin() != null ? request.getIsFirstLogin() : true);
    user.setCreatedAt(LocalDateTime.now());

    User savedUser = userRepository.save(user);
    return modelMapper.map(savedUser, UserDTO.class);
}

    public UserDTO updateUser(String id, UserUpdateRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));

        if (request.getName() != null)
            user.setName(request.getName());

        if (request.getEmail() != null && !request.getEmail().equals(user.getEmail())) {
            if (userRepository.existsByEmail(request.getEmail())) {
                throw new BadRequestException("Email already exists");
            }
            user.setEmail(request.getEmail());
        }

        if (request.getSap() != null && !request.getSap().isBlank() && !request.getSap().equals(user.getSap())) {
    if (userRepository.existsBySap(request.getSap())) {
        throw new BadRequestException("SAP already exists");
    }
    user.setSap(request.getSap());
}

        if (request.getClassName() != null)
            user.setClassName(request.getClassName());
        if (request.getRole() != null)
            user.setRole(request.getRole());
        if (request.getIsFirstLogin() != null)
            user.setIsFirstLogin(request.getIsFirstLogin());
        if (request.getDepartment() != null)
            user.setDepartment(request.getDepartment());
        user.setUpdatedAt(LocalDateTime.now());

        User updatedUser = userRepository.save(user);
        return modelMapper.map(updatedUser, UserDTO.class);
    }

    public void deleteUser(String id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
        userRepository.delete(user);
    }

    public Long deleteUsersByRole(String role) {
        List<User> users = userRepository.findByRole(role);
        if (users.isEmpty()) {
            throw new ResourceNotFoundException("No users found with role: " + role);
        }
        userRepository.deleteAll(users);
        return (long) users.size();
    }

    public User getUserEntityById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + id));
    }

    public User getUserEntityByEmail(String email) {
        return userRepository.findByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with email: " + email));
    }
}

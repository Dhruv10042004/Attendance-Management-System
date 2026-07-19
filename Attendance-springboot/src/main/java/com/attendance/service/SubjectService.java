package com.attendance.service;

import com.attendance.dto.SubjectDTO;
import com.attendance.dto.SubjectCreateRequest;
import com.attendance.entity.Subject;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.repository.SubjectRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class SubjectService {

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private ModelMapper modelMapper;

    @Autowired
    private UserService userService;

    public List<SubjectDTO> getAllSubjects() {
        return subjectRepository.findAll()
                .stream()
                .map(subject -> modelMapper.map(subject, SubjectDTO.class))
                .collect(Collectors.toList());
    }
    @Cacheable(value = "subjects", key = "#id")
    public SubjectDTO getSubjectById(String id) {
    Subject subject = subjectRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + id));
    SubjectDTO dto = modelMapper.map(subject, SubjectDTO.class);
    try {
        dto.setTeacherName(userService.getUserEntityById(subject.getTeacherId()).getName());
    } catch (ResourceNotFoundException e) {
        dto.setTeacherName(null);
    }
    return dto;
}

    public List<SubjectDTO> getSubjectsByTeacher(String teacherId) {
        userService.getUserEntityById(teacherId); // Verify teacher exists
        return subjectRepository.findByTeacherId(teacherId)
                .stream()
                .map(subject -> modelMapper.map(subject, SubjectDTO.class))
                .collect(Collectors.toList());
    }

    public List<SubjectDTO> getSubjectsByClassName(String className) {
        return subjectRepository.findByClassName(className)
                .stream()
                .map(subject -> modelMapper.map(subject, SubjectDTO.class))
                .collect(Collectors.toList());
    }

    public List<SubjectDTO> getSubjectsByDay(String day) {
        return subjectRepository.findByDay(day)
                .stream()
                .map(subject -> modelMapper.map(subject, SubjectDTO.class))
                .collect(Collectors.toList());
    }

    public List<SubjectDTO> getSubjectsByClassAndDay(String className, String day) {
        return subjectRepository.findByClassNameAndDay(className, day)
                .stream()
                .map(subject -> modelMapper.map(subject, SubjectDTO.class))
                .collect(Collectors.toList());
    }

    public List<SubjectDTO> searchSubjects(String query) {
        return subjectRepository.findByNameContainingIgnoreCase(query)
                .stream()
                .map(subject -> modelMapper.map(subject, SubjectDTO.class))
                .collect(Collectors.toList());
    }

    public SubjectDTO createSubject(SubjectCreateRequest request) {
        userService.getUserEntityById(request.getTeacherId()); // Verify teacher exists

        Subject subject = new Subject();
        subject.setName(request.getName());
        subject.setStartTime(request.getStartTime());
        subject.setEndTime(request.getEndTime());
        subject.setTeacherId(request.getTeacherId());
        subject.setClassName(request.getClassName());
        subject.setDay(request.getDay());
        subject.setCreatedAt(LocalDateTime.now());

        Subject savedSubject = subjectRepository.save(subject);
        return modelMapper.map(savedSubject, SubjectDTO.class);
    }
    @CacheEvict(value = "subjects", key = "#id")
    public SubjectDTO updateSubject(String id, SubjectCreateRequest request) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + id));

        if (request.getName() != null)
            subject.setName(request.getName());
        if (request.getStartTime() != null)
            subject.setStartTime(request.getStartTime());
        if (request.getEndTime() != null)
            subject.setEndTime(request.getEndTime());
        if (request.getClassName() != null)
            subject.setClassName(request.getClassName());
        if (request.getDay() != null)
            subject.setDay(request.getDay());
        subject.setUpdatedAt(LocalDateTime.now());

        Subject updatedSubject = subjectRepository.save(subject);
        return modelMapper.map(updatedSubject, SubjectDTO.class);
    }
    @CacheEvict(value = "subjects", key = "#id")
    public void deleteSubject(String id) {
        Subject subject = subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + id));
        subjectRepository.delete(subject);
    }

    public Subject getSubjectEntityById(String id) {
        return subjectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Subject not found with id: " + id));
    }
}

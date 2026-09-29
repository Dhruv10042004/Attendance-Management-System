package com.attendance.service;

import com.attendance.dto.SubjectDTO;
import com.attendance.dto.SubjectCreateRequest;
import com.attendance.dto.UserDTO;
import com.attendance.entity.Subject;
import com.attendance.entity.User;
import com.attendance.exception.BadRequestException;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.repository.SubjectRepository;
import org.modelmapper.ModelMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
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

    /**
     * When non-empty, restricts this slot to exactly these students (elective, or one batch of a
     * split lab) instead of the whole class. Every id must be a real student — but NOT necessarily
     * of this subject's className: some electives (e.g. "Advanced Security") are shared across
     * several classes, so className here is just "where this slot is managed from", not a roster limit.
     */
    private void validateEnrolledStudentIds(List<String> ids) {
        if (ids == null || ids.isEmpty()) return;
        for (String id : ids) {
            User u = userService.getUserEntityById(id); // throws ResourceNotFoundException if missing
            if (!"student".equalsIgnoreCase(u.getRole())) {
                throw new BadRequestException("User " + id + " is not a student");
            }
        }
    }

    /**
     * "HH:mm" -> minutes since midnight, so two slots' times can be compared as plain numbers.
     */
    private int toMinutes(String hhmm) {
        String[] p = hhmm.split(":");
        return Integer.parseInt(p[0]) * 60 + Integer.parseInt(p[1]);
    }

    private boolean overlaps(String start1, String end1, String start2, String end2) {
        return toMinutes(start1) < toMinutes(end2) && toMinutes(start2) < toMinutes(end1);
    }

    /**
     * Every id actually attending this subject: its restricted list, or (unrestricted) every student of
     * every class it serves. classRosters caches each class's ids so one save reads a class only once.
     */
    private Set<String> effectiveEnrolled(Subject subject, Map<String, Set<String>> classRosters) {
        List<String> restricted = subject.getEnrolledStudentIds();
        if (restricted != null && !restricted.isEmpty()) return new HashSet<>(restricted);
        Set<String> everyone = new HashSet<>();
        for (String c : subject.classesServed()) {
            everyone.addAll(classRosters.computeIfAbsent(c, k -> userService.getUsersByClassName(k).stream()
                    .map(UserDTO::getId).collect(Collectors.toSet())));
        }
        return everyone;
    }

    /**
     * A student can only be in one place at a time. Rejects any candidate who is already committed
     * — via another subject's restricted list, or simply by being in a class that other subject serves —
     * to a DIFFERENT subject whose day and time overlap this slot's, in ANY of the classes this slot serves.
     * candidate is the subject being saved (its id, when editing, keeps it from conflicting with itself).
     * Only called when the slot being saved is itself restricted: an ordinary whole-class subject's
     * scheduling is unaffected, so this can't newly block schedules nobody asked to change.
     */
    private void validateNoDoubleBooking(Subject candidate, List<String> candidateIds) {
        if (candidateIds == null || candidateIds.isEmpty()) return;
        Map<String, Subject> sameDay = new LinkedHashMap<>();
        for (String c : candidate.classesServed()) {
            for (Subject s : subjectRepository.findByClassNameAndDay(c, candidate.getDay())) {
                sameDay.putIfAbsent(s.getId(), s);
            }
        }
        Map<String, Set<String>> classRosters = new HashMap<>();

        for (Subject other : sameDay.values()) {
            if (candidate.getId() != null && candidate.getId().equals(other.getId())) continue;
            if (!overlaps(candidate.getStartTime(), candidate.getEndTime(), other.getStartTime(), other.getEndTime())) continue;

            Set<String> busy = effectiveEnrolled(other, classRosters);
            for (String id : candidateIds) {
                if (busy.contains(id)) {
                    User u = userService.getUserEntityById(id);
                    throw new BadRequestException("Student " + u.getName() + " (" + u.getSap()
                            + ") is already in " + other.getName() + " on " + other.getDay() + " "
                            + other.getStartTime() + "-" + other.getEndTime() + " and cannot also be enrolled here");
                }
            }
        }
    }

    /** Other classes for a shared slot: no blanks, no duplicates, and never the primary class itself. */
    private List<String> cleanExtraClasses(String primary, List<String> extras) {
        if (extras == null) return null;
        return extras.stream()
                .filter(c -> c != null && !c.isBlank() && !c.equals(primary))
                .distinct()
                .collect(Collectors.toList());
    }

    /**
     * Which class(es) this slot shows up in is only picked by hand for a WHOLE-class subject. Once it
     * is restricted to specific students (a batch, or several batches combined), the classes are instead
     * derived from whichever classes those students actually belong to — so "Advanced Security" enrolling
     * I1+I2+I3 students automatically shows in all three timetables, with nothing manually chosen, and a
     * single-class batch like "I1-1" automatically stays a single-class entry.
     */
    private List<String> resolveClasses(List<String> enrolledIds, String requestedClassName, List<String> requestedExtras) {
        if (enrolledIds == null || enrolledIds.isEmpty()) { // whole class: exactly what was picked by hand
            List<String> picked = new ArrayList<>();
            picked.add(requestedClassName);
            if (requestedExtras != null) picked.addAll(requestedExtras);
            return picked;
        }
        List<String> classes = userService.getUserEntitiesByIds(enrolledIds).stream()
                .map(User::getClassName)
                .filter(c -> c != null && !c.isBlank())
                .distinct()
                .sorted()
                .collect(Collectors.toList());
        if (classes.isEmpty()) {
            throw new BadRequestException("Could not determine any class for the selected students");
        }
        return classes; // [0] becomes the primary className, the rest become extraClassNames
    }

    private void applyResolvedClasses(Subject subject, List<String> resolved) {
        subject.setClassName(resolved.get(0));
        subject.setExtraClassNames(cleanExtraClasses(resolved.get(0),
                resolved.size() > 1 ? resolved.subList(1, resolved.size()) : null));
    }

    public SubjectDTO createSubject(SubjectCreateRequest request) {
        userService.getUserEntityById(request.getTeacherId()); // Verify teacher exists
        validateEnrolledStudentIds(request.getEnrolledStudentIds());

        Subject subject = new Subject();
        subject.setName(request.getName());
        subject.setStartTime(request.getStartTime());
        subject.setEndTime(request.getEndTime());
        subject.setTeacherId(request.getTeacherId());
        applyResolvedClasses(subject, resolveClasses(request.getEnrolledStudentIds(), request.getClassName(), request.getExtraClassNames()));
        subject.setDay(request.getDay());
        subject.setEnrolledStudentIds(request.getEnrolledStudentIds());
        subject.setCreatedAt(LocalDateTime.now());
        // ponytail: a student pulled in from a class this slot does NOT serve isn't checked against that
        // class's own schedule; only the classes the slot serves are scanned. Widen if it bites in practice.
        validateNoDoubleBooking(subject, request.getEnrolledStudentIds());

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
        // Classes are only editable by hand while the request keeps this a whole-class subject; the moment
        // enrolledStudentIds is set (now or already), the served classes are re-derived from those students.
        boolean staysWholeClass = request.getEnrolledStudentIds() == null
                ? (subject.getEnrolledStudentIds() == null || subject.getEnrolledStudentIds().isEmpty())
                : request.getEnrolledStudentIds().isEmpty();
        if (staysWholeClass && request.getExtraClassNames() != null) {
            subject.setExtraClassNames(cleanExtraClasses(subject.getClassName(), request.getExtraClassNames()));
        }
        if (request.getEnrolledStudentIds() != null) { // empty list is a valid, explicit "back to whole class"
            validateEnrolledStudentIds(request.getEnrolledStudentIds());
            if (!request.getEnrolledStudentIds().isEmpty()) {
                applyResolvedClasses(subject, resolveClasses(request.getEnrolledStudentIds(), null, null));
            }
            validateNoDoubleBooking(subject, request.getEnrolledStudentIds());
            subject.setEnrolledStudentIds(request.getEnrolledStudentIds());
        }
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
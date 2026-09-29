package com.attendance.service;

import com.attendance.dto.*;
import com.attendance.entity.AttendanceRecord;
import com.attendance.entity.Subject;
import com.attendance.entity.User;
import com.attendance.exception.BadRequestException;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.repository.AttendanceRecordRepository;
import com.attendance.repository.NotificationRepository;
import com.attendance.repository.SubjectRepository;
import com.attendance.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;
import java.util.stream.Stream;
import java.time.LocalTime;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;

@Service
public class AttendanceService {

    @Autowired
    private SubjectService subjectService;

    @Autowired
    private SubjectRepository subjectRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private AttendanceRecordRepository attendanceRecordRepository;

    @Autowired
    private SecurityUtil securityUtil;

    /** How far back the "recent lectures" marking dropdown looks. */
    private static final int LECTURE_LOOKBACK_DAYS = 21;

    // ---------- helpers ----------

    /**
     * Duration of a lecture slot in hours, computed from its HH:mm start/end times.
     * Falls back to 1.0 hour if the times are missing/unparseable, so a
     * misconfigured slot still contributes something rather than zeroing out
     * the whole percentage calculation.
     */
    double slotDurationHours(String startTime, String endTime) { // package-private: reused by AttendanceStatsService
        if (startTime == null || endTime == null)
            return 1.0;
        try {
            LocalTime start = LocalTime.parse(startTime.trim());
            LocalTime end = LocalTime.parse(endTime.trim());
            long minutes = ChronoUnit.MINUTES.between(start, end);
            if (minutes <= 0)
                return 1.0; // guards against bad data (end <= start)
            return minutes / 60.0;
        } catch (DateTimeParseException e) {
            return 1.0;
        }
    }

    private LocalDate parseDate(String raw) {
        return LocalDate.parse(raw.length() > 10 ? raw.substring(0, 10) : raw);
    }

    private DayOfWeek parseDay(String day) {
        if (day == null)
            return null;
        try {
            return DayOfWeek.valueOf(day.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }

    private void checkOwnership(Subject subject) {
        boolean isAdmin = securityUtil.hasRole("admin");
        if (!isAdmin && !subject.getTeacherId().equals(securityUtil.getCurrentUserId())) {
            throw new BadRequestException("You do not have permission to manage attendance for this class");
        }
    }

    /**
     * Attendance can be entered/changed only on the lecture's own calendar date.
     */
    private boolean isEditable(LocalDate lectureDate) {
        return lectureDate.isEqual(LocalDate.now());
    }

    /**
     * Confirms the given date is an actual scheduled occurrence of this subject
     * (correct day-of-week).
     */
    private void assertScheduledLecture(Subject subject, LocalDate date) {
        DayOfWeek expected = parseDay(subject.getDay());
        if (expected == null) {
            throw new BadRequestException("Subject '" + subject.getName() + "' has no valid day configured");
        }
        if (date.getDayOfWeek() != expected) {
            throw new BadRequestException(
                    "No " + subject.getName() + " lecture is scheduled on " + date + " (" +
                            date.getDayOfWeek() + "); this slot runs on " + subject.getDay());
        }
    }

    private String resolveTeacherId(String requestedTeacherId) {
        boolean isAdmin = securityUtil.hasRole("admin");
        String currentUserId = securityUtil.getCurrentUserId();
        if (requestedTeacherId == null || requestedTeacherId.isBlank()) {
            return currentUserId;
        }
        if (!requestedTeacherId.equals(currentUserId) && !isAdmin) {
            throw new BadRequestException("You do not have permission to view another teacher's data");
        }
        return requestedTeacherId;
    }

    /** Students in the given division/class, sorted alphabetically by name. */
    private List<User> getClassStudentsSorted(String className) {
        return userRepository.findByClassName(className).stream()
                .filter(u -> "student".equalsIgnoreCase(u.getRole()))
                .sorted(Comparator.comparing(
                        u -> Optional.ofNullable(u.getName()).orElse(""),
                        String.CASE_INSENSITIVE_ORDER))
                .collect(Collectors.toList());
    }

    /**
     * Students who actually take THIS slot: the whole class, unless the subject
     * restricts it to a
     * specific list (an elective, or one batch of a split lab). Used for both
     * marking and rostering,
     * so a teacher only ever sees/marks the students who are really meant to be
     * there.
     */
    /**
     * Students who actually take THIS slot: the whole class, unless the subject
     * restricts it to a
     * specific list (an elective, or one batch of a split lab). Resolved by id
     * directly — not by
     * intersecting with one class's roster — so a cross-class elective (e.g. one
     * subject shared by
     * I1/I2/I3) still gets its real roster instead of silently losing everyone
     * outside className.
     */
    private List<User> getRosterStudents(Subject subject) {
        List<String> enrolled = subject.getEnrolledStudentIds();
        if (enrolled == null || enrolled.isEmpty())
            return getStudentsOfClasses(subject.classesServed());
        return sortByName(userRepository.findAllById(enrolled));
    }

    /**
     * Students of one or more classes (a shared lecture serves several),
     * de-duplicated, sorted by name.
     */
    private List<User> getStudentsOfClasses(Collection<String> classNames) {
        Map<String, User> byId = new LinkedHashMap<>();
        for (String c : classNames) {
            for (User u : getClassStudentsSorted(c))
                byId.putIfAbsent(u.getId(), u);
        }
        return sortByName(byId.values());
    }

    private List<User> sortByName(Iterable<User> users) {
        List<User> list = new ArrayList<>();
        users.forEach(list::add);
        list.sort(
                Comparator.comparing(u -> Optional.ofNullable(u.getName()).orElse(""), String.CASE_INSENSITIVE_ORDER));
        return list;
    }

    /**
     * Students to show on a combined attendance sheet for a (subjectName,
     * className) course made up
     * of one or more timetable slots. Unrestricted (or every restriction unioning
     * back to the whole
     * class, as with two batch-split lab slots) yields the whole class, same as
     * before this feature
     * existed. Any genuine restriction narrows the sheet to only the students
     * enrolled somewhere in it.
     */
    private List<User> sheetStudents(List<Subject> matchingSlots, String className) {
        boolean anyRestricted = matchingSlots.stream()
                .anyMatch(s -> s.getEnrolledStudentIds() != null && !s.getEnrolledStudentIds().isEmpty());
        if (!anyRestricted) {
            Set<String> classes = new LinkedHashSet<>();
            classes.add(className);
            matchingSlots.forEach(s -> classes.addAll(s.classesServed()));
            return getStudentsOfClasses(classes);
        }

        Set<String> unionIds = matchingSlots.stream()
                .flatMap(s -> s.getEnrolledStudentIds() == null
                        ? Stream.<String>empty()
                        : s.getEnrolledStudentIds().stream())
                .collect(Collectors.toSet());
        return sortByName(userRepository.findAllById(unionIds)); // by id: covers cross-class electives too
    }

    // ---------- lecture slots (marking dropdown — one entry per physical
    // occurrence) ----------

    public List<LectureSlotDTO> getLectureSlots(String requestedTeacherId) {
        String teacherId = resolveTeacherId(requestedTeacherId);
        List<Subject> subjects = subjectRepository.findByTeacherId(teacherId);

        LocalDate today = LocalDate.now();
        LocalDate start = today.minusDays(LECTURE_LOOKBACK_DAYS);

        List<LectureSlotDTO> slots = new ArrayList<>();
        for (Subject subject : subjects) {
            DayOfWeek targetDay = parseDay(subject.getDay());
            if (targetDay == null)
                continue;

            for (LocalDate d = today; !d.isBefore(start); d = d.minusDays(1)) {
                if (d.getDayOfWeek() != targetDay)
                    continue;

                boolean marked = !attendanceRecordRepository.findBySubjectIdAndDate(subject.getId(), d).isEmpty();
                slots.add(new LectureSlotDTO(
                        subject.getId(), subject.getName(), subject.getClassName(),
                        subject.getDay(), subject.getStartTime(), subject.getEndTime(),
                        d, isEditable(d), marked));
            }
        }

        slots.sort(Comparator.comparing(LectureSlotDTO::getDate).reversed()
                .thenComparing(LectureSlotDTO::getStartTime));
        return slots;
    }

    // ---------- roster / marking (per single slot occurrence) ----------

    public AttendanceRosterDTO getRoster(String subjectId, String dateStr) {
        Subject subject = subjectService.getSubjectEntityById(subjectId);
        checkOwnership(subject);

        LocalDate date = parseDate(dateStr);
        assertScheduledLecture(subject, date);

        List<User> students = getRosterStudents(subject);

        Set<String> grantedStudentIds = new HashSet<>();
        for (var notification : notificationRepository.findBySubjectId(subjectId)) {
            LocalDateTime notifDate = notification.getDate();
            if (notifDate == null || !notifDate.toLocalDate().isEqual(date))
                continue;
            List<String> ids = notification.getStudentIds();
            if (ids == null)
                continue;
            for (String id : ids) {
                if (id != null)
                    grantedStudentIds.add(id.trim());
            }
        }

        Map<String, Boolean> savedMarks = new HashMap<>();
        for (AttendanceRecord r : attendanceRecordRepository.findBySubjectIdAndDate(subjectId, date)) {
            savedMarks.put(r.getStudentId(), r.getPresent());
        }

        List<StudentAttendanceDTO> roster = new ArrayList<>();
        for (User s : students) {
            boolean granted = grantedStudentIds.contains(s.getId());
            boolean present = savedMarks.containsKey(s.getId()) ? savedMarks.get(s.getId()) : granted;
            roster.add(
                    new StudentAttendanceDTO(s.getId(), s.getSap(), s.getName(), s.getClassName(), present, granted));
        }

        return new AttendanceRosterDTO(subject.getId(), subject.getName(), subject.getClassName(),
                date, subject.getDay(), isEditable(date), roster);
    }

    public AttendanceRosterDTO markAttendance(MarkAttendanceRequest request) {
        if (request.getSubjectId() == null || request.getDate() == null) {
            throw new BadRequestException("subjectId and date are required");
        }

        Subject subject = subjectService.getSubjectEntityById(request.getSubjectId());
        checkOwnership(subject);

        LocalDate date = parseDate(request.getDate());
        assertScheduledLecture(subject, date);

        if (!isEditable(date)) {
            throw new BadRequestException(
                    "Attendance for the " + date
                            + " lecture can no longer be edited (only editable on the lecture's own date)");
        }

        // Defense in depth: even if the request carries an id outside this slot's
        // roster (stale
        // client state, tampered payload), a restricted subject only ever accepts its
        // own students.
        List<String> enrolledIds = subject.getEnrolledStudentIds();
        Set<String> allowedIds = enrolledIds == null || enrolledIds.isEmpty() ? null : new HashSet<>(enrolledIds);

        String currentUserId = securityUtil.getCurrentUserId();
        if (request.getRecords() != null) {
            for (MarkAttendanceRequest.Entry entry : request.getRecords()) {
                if (allowedIds != null && !allowedIds.contains(entry.getStudentId())) {
                    continue; // not enrolled in this elective/batch — ignore rather than fail the whole batch
                }
                AttendanceRecord record = attendanceRecordRepository
                        .findBySubjectIdAndDateAndStudentId(request.getSubjectId(), date, entry.getStudentId())
                        .orElseGet(AttendanceRecord::new);

                record.setSubjectId(request.getSubjectId());
                record.setDate(date);
                record.setStudentId(entry.getStudentId());
                record.setPresent(entry.isPresent());
                record.setMarkedByTeacherId(currentUserId);
                record.setUpdatedAt(LocalDateTime.now());
                attendanceRecordRepository.save(record);
            }
        }

        return getRoster(request.getSubjectId(), request.getDate());
    }

    // ---------- course groups (for the sheet selector) ----------

    /**
     * Groups a teacher's timetable slots by (subject name, class) — the same
     * course taught n times a week shows as ONE group here, even though it's
     * backed by n separate Subject/slot documents.
     */
    public List<CourseGroupDTO> getCourseGroups(String requestedTeacherId) {
        String teacherId = resolveTeacherId(requestedTeacherId);
        List<Subject> subjects = subjectRepository.findByTeacherId(teacherId);

        Map<String, List<Subject>> grouped = subjects.stream()
                .collect(Collectors.groupingBy(s -> s.getName() + "||" + s.getClassName()));

        List<CourseGroupDTO> groups = new ArrayList<>();
        for (List<Subject> slotGroup : grouped.values()) {
            Subject first = slotGroup.get(0);
            List<String> ids = slotGroup.stream().map(Subject::getId).collect(Collectors.toList());
            List<String> summaries = slotGroup.stream()
                    .sorted(Comparator.comparing((Subject s) -> Optional.ofNullable(s.getDay()).orElse(""))
                            .thenComparing(s -> Optional.ofNullable(s.getStartTime()).orElse("")))
                    .map(s -> s.getDay() + " " + s.getStartTime() + "-" + s.getEndTime())
                    .collect(Collectors.toList());
            groups.add(new CourseGroupDTO(first.getName(), first.getClassName(), ids, summaries));
        }

        groups.sort(Comparator.comparing(CourseGroupDTO::getSubjectName, String.CASE_INSENSITIVE_ORDER)
                .thenComparing(CourseGroupDTO::getClassName));
        return groups;
    }

    // ---------- attendance sheet (aggregated across every slot of the course)
    // ----------

    public AttendanceSheetDTO getAttendanceSheet(String requestedTeacherId, String subjectName, String className) {
        String teacherId = resolveTeacherId(requestedTeacherId);

        List<Subject> matchingSlots = subjectRepository
                .findByTeacherIdAndNameAndClassName(teacherId, subjectName, className);
        if (matchingSlots.isEmpty()) {
            throw new ResourceNotFoundException(
                    "No timetable slots found for " + subjectName + " / " + className + " under this teacher");
        }

        Map<String, Subject> subjectsById = matchingSlots.stream()
                .collect(Collectors.toMap(Subject::getId, s -> s));

        List<AttendanceRecord> records = new ArrayList<>();
        for (String sid : subjectsById.keySet()) {
            records.addAll(attendanceRecordRepository.findBySubjectId(sid));
        }

        // One column per (subjectId, date) that's actually been marked. Each column
        // carries its own duration in hours, so a 2-hour slot weighs twice as much
        // as a 1-hour slot when computing the overall percentage.
        Map<String, LectureColumnDTO> columnsByKey = new LinkedHashMap<>();
        for (AttendanceRecord r : records) {
            String key = r.getSubjectId() + "_" + r.getDate();
            columnsByKey.computeIfAbsent(key, k -> {
                Subject subj = subjectsById.get(r.getSubjectId());
                String startTime = subj != null ? subj.getStartTime() : null;
                String endTime = subj != null ? subj.getEndTime() : null;
                return new LectureColumnDTO(
                        key, r.getSubjectId(), r.getDate(),
                        subj != null ? subj.getDay() : null,
                        startTime, endTime,
                        slotDurationHours(startTime, endTime));
            });
        }

        List<LectureColumnDTO> lectureColumns = columnsByKey.values().stream()
                .sorted(Comparator.comparing(LectureColumnDTO::getDate)
                        .thenComparing(c -> Optional.ofNullable(c.getStartTime()).orElse("")))
                .collect(Collectors.toList());

        Map<String, Map<String, Boolean>> byStudentColumn = new HashMap<>();
        for (AttendanceRecord r : records) {
            String key = r.getSubjectId() + "_" + r.getDate();
            byStudentColumn.computeIfAbsent(r.getStudentId(), k -> new HashMap<>()).put(key, r.getPresent());
        }

        // If ANY slot in this course restricts its roster, only show students enrolled
        // in at least one
        // of them (a true elective). If every slot is unrestricted, or restrictions
        // between slots union
        // back to the whole class (e.g. two batch-split lab slots covering everyone
        // between them),
        // this naturally reduces to the original "every class student" behaviour.
        List<User> students = sheetStudents(matchingSlots, className);

        List<AttendanceSheetRowDTO> rows = new ArrayList<>();
        for (User s : students) {
            Map<String, Boolean> marks = byStudentColumn.getOrDefault(s.getId(), Collections.emptyMap());
            Map<String, String> marksByColumn = new LinkedHashMap<>();
            double presentHours = 0.0;
            double totalHours = 0.0;

            for (LectureColumnDTO col : lectureColumns) {
                totalHours += col.getDurationHours();
                Boolean p = marks.get(col.getKey());
                if (Boolean.TRUE.equals(p)) {
                    marksByColumn.put(col.getKey(), "P");
                    presentHours += col.getDurationHours();
                } else if (p != null) {
                    marksByColumn.put(col.getKey(), "A");
                } else {
                    marksByColumn.put(col.getKey(), "-"); // never marked (e.g. joined class later) — not counted either
                                                          // way
                    totalHours -= col.getDurationHours(); // don't penalize for lectures that predate enrollment
                }
            }

            double pct = totalHours <= 0 ? 0.0 : Math.round(presentHours * 10000.0 / totalHours) / 100.0;

            rows.add(new AttendanceSheetRowDTO(s.getId(), s.getSap(), s.getName(), marksByColumn, presentHours,
                    totalHours, pct));
        }

        return new AttendanceSheetDTO(subjectName, className, lectureColumns, rows);
    }
}
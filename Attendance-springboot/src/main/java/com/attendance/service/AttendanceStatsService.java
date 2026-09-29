package com.attendance.service;

import com.attendance.dto.AttendanceRequestDTO;
import com.attendance.entity.AttendanceRequest;
import com.attendance.entity.Subject;
import com.attendance.entity.User;
import com.attendance.exception.BadRequestException;
import com.attendance.repository.AttendanceRecordRepository;
import com.attendance.repository.AttendanceRequestRepository;
import com.attendance.repository.SubjectRepository;
import com.attendance.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Stream;

import static java.util.stream.Collectors.*;

/**
 * Read-only attendance analytics, scoped to the signed-in user's role.
 *
 * This is the ONLY place the AI layer gets data from. Authorization lives here
 * (not in the
 * LLM, not in the prompt): every public method starts from
 * {@link #students(String)}, which
 * derives the visible student set from the SecurityContext. Nothing the model
 * passes in can widen it.
 *
 * Scope: admin = everyone, hod = own department, teacher = students of the
 * classes they teach,
 * counting only the teacher's own subjects. Anyone else (or nobody) is refused.
 *
 * Percentages use the same hour-weighted formula as
 * {@link AttendanceService#getAttendanceSheet}.
 */
@Service
public class AttendanceStatsService {

    private static final int MAX_ROWS = 25;
    private static final double DROP_POINTS = 15; // a fall of this many points counts as "significant decline"
    private static final List<String> DAYS = List.of("monday", "tuesday", "wednesday", "thursday", "friday", "saturday",
            "sunday");

    // ---- result types (plain records => JSON for the model and for the React UI)
    // ----
    // Dates are Strings on purpose: the tool JSON mapper's date format is not ours
    // to guess.
    public record SubjectStat(String subject, Double attendancePct) {
    }

    public record StudentStat(String name, String sap, String className, String department,
            Double attendancePct, String lowestSubject) {
    }

    public record StudentDetail(String name, String sap, String className, Double overallPct,
            List<SubjectStat> bySubject) {
    }

    /**
     * A student's own view: % plus how many lectures they attended out of how many
     * were held.
     */
    public record MySubject(String subject, Double attendancePct, int attended, int total) {
    }

    public record MyAttendance(String name, String sap, String className, Double overallPct,
            int attended, int total, List<MySubject> bySubject) {
    }

    public record BelowThreshold(double threshold, int totalMatches, List<StudentStat> students) {
    }

    public record AboveThreshold(double threshold, int totalMatches, List<StudentStat> students) {
    }

    public record DeptSummary(String department, String hod, int students, Double overallPct,
            Double last7DaysPct, Double previous7DaysPct, double requiredPct,
            int belowRequired, int below60, String lowestSubject) {
    }

    public record TodaySummary(String date, long presentMarks, long absentMarks, long studentsAbsent) {
    }

    public record Decline(String name, String sap, String className, Double previousPct, Double recentPct) {
    }

    public record LeaveRow(String status, String reason, String date) {
    }

    public record LeaveHistory(String name, String sap, int total, int approved, int pending,
            int rejected, List<LeaveRow> recent) {
    }

    public record PendingRow(String name, String sap, String className, String reason, String date) {
    }

    public record SlotRow(String subject, String day, String start, String end, String teacher) {
    }

    public record Facts(String generatedOn, String scope, List<DeptSummary> departments, List<SubjectStat> subjects,
            BelowThreshold belowRequired, List<Decline> declining) {
    }

    private record Mark(String studentId, String subject, LocalDate date, double hours, boolean present) {
    }

    private record Data(List<User> students, List<Mark> marks) {
    }

    private final UserRepository users;
    private final SubjectRepository subjects;
    private final AttendanceRecordRepository records;
    private final AttendanceRequestRepository requests;
    private final AttendanceService attendanceService;
    private final AttendanceRequestService requestService;
    private final SecurityUtil security;
    private final double required;

    public AttendanceStatsService(UserRepository users, SubjectRepository subjects,
            AttendanceRecordRepository records, AttendanceRequestRepository requests,
            AttendanceService attendanceService, AttendanceRequestService requestService,
            SecurityUtil security,
            @Value("${app.attendance.required-percent:75}") double required) {
        this.users = users;
        this.subjects = subjects;
        this.records = records;
        this.requests = requests;
        this.attendanceService = attendanceService;
        this.requestService = requestService;
        this.security = security;
        this.required = required;
    }

    // ------------------------------------------------------------------ public API

    public StudentDetail studentAttendance(String nameOrSap) {
        User u = findStudent(nameOrSap);
        List<Mark> m = marks(List.of(u));
        return new StudentDetail(u.getName(), u.getSap(), u.getClassName(), pct(m), subjectStats(m));
    }

    /**
     * A student's own overall + per-subject attendance. Deliberately has NO lookup
     * parameter: the
     * student is identified only from their own JWT, so there is no way for this
     * method to be used
     * to view anyone else's record.
     */
    public MyAttendance myAttendance() {
        if (!security.hasRole("student")) {
            throw new BadRequestException("Only a student can view their own attendance this way");
        }
        User u = users.findById(security.getCurrentUserId())
                .orElseThrow(() -> new BadRequestException("Student profile not found"));
        List<Mark> m = marks(List.of(u));
        List<MySubject> bySubject = m.stream().collect(groupingBy(Mark::subject)).entrySet().stream()
                .map(e -> new MySubject(e.getKey(), pct(e.getValue()),
                        (int) e.getValue().stream().filter(Mark::present).count(), e.getValue().size()))
                .sorted(Comparator.comparing(MySubject::subject, String.CASE_INSENSITIVE_ORDER))
                .toList();
        return new MyAttendance(u.getName(), u.getSap(), u.getClassName(), pct(m),
                (int) m.stream().filter(Mark::present).count(), m.size(), bySubject);
    }

    public BelowThreshold belowThreshold(String department, Double threshold) {
        return belowRows(load(department), threshold == null ? required : threshold);
    }

    /**
     * "Perfect"/high attendance lookups (e.g. "who has 100%"). Defaults to 100
     * since that is the common ask.
     */
    public AboveThreshold aboveThreshold(String department, Double threshold) {
        Data d = load(department);
        double t = validPct(threshold == null ? 100 : threshold);
        List<StudentStat> hits = studentStats(d.students(), d.marks()).stream()
                .filter(s -> s.attendancePct() != null && s.attendancePct() >= t)
                .sorted(Comparator.comparing(StudentStat::attendancePct, Comparator.reverseOrder()))
                .toList();
        return new AboveThreshold(t, hits.size(), hits.stream().limit(MAX_ROWS).toList());
    }

    public List<SubjectStat> subjectAttendance(String department) {
        return subjectStats(load(department).marks());
    }

    public List<DeptSummary> departmentSummaries(String department) {
        return summaries(load(department), LocalDate.now());
    }

    public TodaySummary today(String department) {
        LocalDate d = LocalDate.now();
        List<Mark> m = window(load(department).marks(), d, d);
        return new TodaySummary(d.toString(),
                m.stream().filter(Mark::present).count(),
                m.stream().filter(x -> !x.present()).count(),
                m.stream().filter(x -> !x.present()).map(Mark::studentId).distinct().count());
    }

    public List<Decline> decliningStudents(String department, Integer days) {
        int n = days == null ? 14 : Math.max(1, Math.min(days, 90));
        return decliners(load(department), n, LocalDate.now());
    }

    public LeaveHistory leaveHistory(String nameOrSap) {
        requireHodOrAdmin();
        User u = findStudent(nameOrSap);
        List<AttendanceRequestDTO> all = requestService.getRequestsByStudentId(u.getId()); // existing logic, reused
        List<LeaveRow> recent = all.stream()
                .sorted(Comparator.comparing(AttendanceRequestDTO::getCreatedAt,
                        Comparator.nullsLast(Comparator.<LocalDateTime>reverseOrder())))
                .limit(10)
                .map(r -> new LeaveRow(r.getStatus(), clip(r.getReason()), Objects.toString(r.getDate(), null)))
                .toList();
        return new LeaveHistory(u.getName(), u.getSap(), all.size(),
                count(all, "approved"), count(all, "pending"), count(all, "rejected"), recent);
    }

    public List<PendingRow> pendingRequests(String department) {
        requireHodOrAdmin();
        Map<String, User> visible = students(department).stream().collect(toMap(User::getId, u -> u));
        return requests.findByStatus("pending").stream()
                .filter(r -> visible.containsKey(r.getStudentId()))
                .sorted(Comparator.comparing(AttendanceRequest::getCreatedAt,
                        Comparator.nullsLast(Comparator.<LocalDateTime>naturalOrder())))
                .limit(MAX_ROWS)
                .map(r -> {
                    User u = visible.get(r.getStudentId());
                    return new PendingRow(u.getName(), u.getSap(), u.getClassName(), clip(r.getReason()),
                            Objects.toString(r.getDate(), null));
                })
                .toList();
    }

    public List<SlotRow> timetable(String className) {
        if (className == null || className.isBlank())
            throw new BadRequestException("className is required");
        Set<String> classes = students(null).stream().map(User::getClassName)
                .filter(Objects::nonNull).collect(toCollection(TreeSet::new));
        String match = classes.stream().filter(c -> c.equalsIgnoreCase(className.trim())).findFirst()
                .orElseThrow(() -> new BadRequestException("Unknown class '" + className
                        + "' in your access. Available classes: " + String.join(", ", classes)));
        List<Subject> slots = subjects.findByClassName(match);
        Map<String, String> teachers = users.findAllById(
                slots.stream().map(Subject::getTeacherId).filter(Objects::nonNull).distinct().toList())
                .stream().collect(toMap(User::getId, u -> Objects.toString(u.getName(), "unknown")));
        return slots.stream()
                .sorted(Comparator
                        .comparingInt((Subject x) -> DAYS.indexOf(Objects.toString(x.getDay(), "").toLowerCase()))
                        .thenComparing(x -> Objects.toString(x.getStartTime(), "")))
                .map(x -> new SlotRow(x.getName(), x.getDay(), x.getStartTime(), x.getEndTime(),
                        teachers.get(x.getTeacherId())))
                .toList();
    }

    /**
     * Everything the dashboard insight / report needs, computed with a single data
     * load.
     */
    public Facts facts(String department) {
        Data d = load(department);
        LocalDate today = LocalDate.now();
        return new Facts(today.toString(), scopeDescription(), summaries(d, today), subjectStats(d.marks()),
                belowRows(d, required), decliners(d, 14, today));
    }

    // ------------------------------------------------------------------ scope (the
    // security boundary)

    private List<User> students(String department) {
        Stream<User> s = users.findAll().stream().filter(u -> "student".equalsIgnoreCase(u.getRole()));
        if (security.hasRole("admin")) {
            // organisation-wide
        } else if (security.hasRole("hod")) {
            String dept = security.getCurrentUserDepartment();
            s = s.filter(u -> dept != null && dept.equalsIgnoreCase(u.getDepartment()));
        } else if (security.hasRole("teacher")) {
            Set<String> classes = teacherClasses();
            s = s.filter(u -> classes.contains(u.getClassName()));
        } else {
            throw new BadRequestException("You do not have access to attendance analytics");
        }
        // ponytail: findAll + in-memory filter; fine for one college, add
        // findByRoleAndDepartment if users reach ~100k
        List<User> visible = s.toList();

        if (department == null || department.isBlank())
            return visible;
        String wanted = department.trim();
        List<User> narrowed = visible.stream().filter(u -> wanted.equalsIgnoreCase(u.getDepartment())).toList();
        if (narrowed.isEmpty()) { // narrowing only: a department outside the caller's scope looks like "no such
                                  // department"
            throw new BadRequestException("No students found for department '" + wanted + "' in your access. "
                    + "Available departments: " + visible.stream().map(User::getDepartment)
                            .filter(Objects::nonNull).distinct().sorted().collect(joining(", ")));
        }
        return narrowed;
    }

    private Set<String> teacherClasses() {
        return subjects.findByTeacherId(security.getCurrentUserId()).stream()
                .flatMap(s -> s.classesServed().stream()).collect(toSet());
    }

    /**
     * Human sentence naming exactly whose data a Facts/insight covers, for the LLM
     * to open its summary with.
     */
    private String scopeDescription() {
        if (security.hasRole("admin"))
            return "organisation-wide, across every department";
        if (security.hasRole("hod")) {
            return "the " + security.getCurrentUserDepartment() + " department (your department)";
        }
        if (security.hasRole("teacher")) {
            List<Subject> mine = subjects.findByTeacherId(security.getCurrentUserId());
            String subjectNames = mine.stream().map(Subject::getName).distinct().sorted().collect(joining(", "));
            String classNames = mine.stream().flatMap(s -> s.classesServed().stream()).distinct().sorted()
                    .collect(joining(", "));
            return "only the subjects you teach (" + subjectNames + ") in class(es) " + classNames
                    + " \u2014 not the whole department";
        }
        throw new BadRequestException("You do not have access to attendance analytics");
    }

    private void requireHodOrAdmin() {
        if (!security.hasRole("admin") && !security.hasRole("hod")) {
            throw new BadRequestException("Leave information is available to HODs and admins only");
        }
    }

    private User findStudent(String query) {
        if (query == null || query.isBlank())
            throw new BadRequestException("Student name or SAP id is required");
        String needle = query.trim().toLowerCase();
        List<User> visible = students(null);
        List<User> hits = visible.stream().filter(u -> needle.equalsIgnoreCase(u.getSap())).toList();
        if (hits.isEmpty()) {
            hits = visible.stream()
                    .filter(u -> u.getName() != null && u.getName().toLowerCase().contains(needle)).toList();
        }
        if (hits.isEmpty())
            throw new BadRequestException("No student matching '" + query + "' in your access");
        if (hits.size() > 1) {
            throw new BadRequestException("Several students match '" + query + "': "
                    + hits.stream().limit(5).map(u -> u.getName() + " (SAP " + u.getSap() + ")").collect(joining(", "))
                    + ". Ask the user for the SAP id.");
        }
        return hits.get(0);
    }

    // ------------------------------------------------------------------
    // computation

    private Data load(String department) {
        List<User> st = students(department);
        return new Data(st, marks(st));
    }

    /**
     * One Mark per stored attendance record, weighted by the lecture's duration.
     */
    private List<Mark> marks(List<User> students) {
        Stream<Subject> ss = subjects.findAll().stream();
        if (security.hasRole("teacher")) { // a teacher only ever sees attendance in their own subjects
            String me = security.getCurrentUserId();
            ss = ss.filter(x -> Objects.equals(x.getTeacherId(), me));
        }
        Map<String, Subject> byId = ss.collect(toMap(Subject::getId, x -> x));
        List<String> ids = students.stream().map(User::getId).toList();
        // ponytail: loads all in-scope records into memory; move to a Mongo aggregation
        // past ~500k records
        return records.findByStudentIdIn(ids).stream()
                .filter(r -> byId.containsKey(r.getSubjectId()) && r.getDate() != null)
                .map(r -> {
                    Subject sub = byId.get(r.getSubjectId());
                    return new Mark(r.getStudentId(), sub.getName(), r.getDate(),
                            attendanceService.slotDurationHours(sub.getStartTime(), sub.getEndTime()),
                            Boolean.TRUE.equals(r.getPresent()));
                })
                .toList();
    }

    /**
     * Hour-weighted percentage, 2 decimals; null when there is nothing to compute
     * from.
     */
    private static Double pct(Collection<Mark> m) {
        double total = m.stream().mapToDouble(Mark::hours).sum();
        if (total <= 0)
            return null;
        double present = m.stream().filter(Mark::present).mapToDouble(Mark::hours).sum();
        return Math.round(present * 10000.0 / total) / 100.0;
    }

    private static List<Mark> window(List<Mark> m, LocalDate from, LocalDate to) {
        return m.stream().filter(x -> !x.date().isBefore(from) && !x.date().isAfter(to)).toList();
    }

    /** Lowest first. */
    private static List<SubjectStat> subjectStats(Collection<Mark> m) {
        return m.stream().collect(groupingBy(Mark::subject)).entrySet().stream()
                .map(e -> new SubjectStat(e.getKey(), pct(e.getValue())))
                .sorted(Comparator.comparing(SubjectStat::attendancePct))
                .toList();
    }

    private static List<StudentStat> studentStats(List<User> students, List<Mark> marks) {
        Map<String, List<Mark>> byStudent = marks.stream().collect(groupingBy(Mark::studentId));
        return students.stream().filter(u -> byStudent.containsKey(u.getId())).map(u -> {
            List<Mark> m = byStudent.get(u.getId());
            List<SubjectStat> subj = subjectStats(m);
            return new StudentStat(u.getName(), u.getSap(), u.getClassName(), u.getDepartment(), pct(m),
                    subj.isEmpty() ? null : subj.get(0).subject());
        }).toList();
    }

    private static double validPct(double t) {
        if (t < 0 || t > 100)
            throw new BadRequestException("threshold must be between 0 and 100");
        return t;
    }

    private BelowThreshold belowRows(Data d, double t) {
        validPct(t);
        List<StudentStat> hits = studentStats(d.students(), d.marks()).stream()
                .filter(s -> s.attendancePct() != null && s.attendancePct() < t)
                .sorted(Comparator.comparing(StudentStat::attendancePct))
                .toList();
        return new BelowThreshold(t, hits.size(), hits.stream().limit(MAX_ROWS).toList());
    }

    private List<Decline> decliners(Data d, int n, LocalDate today) {
        Map<String, List<Mark>> byStudent = d.marks().stream().collect(groupingBy(Mark::studentId));
        return d.students().stream().map(u -> {
            List<Mark> m = byStudent.getOrDefault(u.getId(), List.of());
            Double recent = pct(window(m, today.minusDays(n - 1L), today));
            Double prev = pct(window(m, today.minusDays(2L * n - 1), today.minusDays(n)));
            return recent != null && prev != null && prev - recent >= DROP_POINTS
                    ? new Decline(u.getName(), u.getSap(), u.getClassName(), prev, recent)
                    : null;
        })
                .filter(Objects::nonNull)
                .sorted(Comparator.comparingDouble((Decline x) -> x.recentPct() - x.previousPct()))
                .limit(MAX_ROWS)
                .toList();
    }

    private List<DeptSummary> summaries(Data d, LocalDate today) {
        Map<String, String> hods = users.findAll().stream()
                .filter(u -> "hod".equalsIgnoreCase(u.getRole()) && u.getDepartment() != null)
                .collect(toMap(u -> u.getDepartment().toLowerCase(), u -> Objects.toString(u.getName(), "unknown"),
                        (a, b) -> a));
        Map<String, List<User>> byDept = d.students().stream()
                .collect(groupingBy(u -> Objects.toString(u.getDepartment(), "Unassigned"), TreeMap::new, toList()));
        List<DeptSummary> out = new ArrayList<>();
        byDept.forEach((dept, list) -> {
            Set<String> ids = list.stream().map(User::getId).collect(toSet());
            List<Mark> m = d.marks().stream().filter(x -> ids.contains(x.studentId())).toList();
            List<StudentStat> ss = studentStats(list, m);
            List<SubjectStat> subj = subjectStats(m);
            out.add(new DeptSummary(dept, hods.get(dept.toLowerCase()), list.size(), pct(m),
                    pct(window(m, today.minusDays(6), today)),
                    pct(window(m, today.minusDays(13), today.minusDays(7))),
                    required, countBelow(ss, required), countBelow(ss, 60),
                    subj.isEmpty() ? null : subj.get(0).subject()));
        });
        return out;
    }

    private static int countBelow(List<StudentStat> ss, double t) {
        return (int) ss.stream().filter(s -> s.attendancePct() != null && s.attendancePct() < t).count();
    }

    private static int count(List<AttendanceRequestDTO> all, String status) {
        return (int) all.stream().filter(r -> status.equals(r.getStatus())).count();
    }

    /** Free text written by students goes to the model: keep it short. */
    private static String clip(String s) {
        return s == null || s.length() <= 120 ? s : s.substring(0, 120) + "...";
    }
}
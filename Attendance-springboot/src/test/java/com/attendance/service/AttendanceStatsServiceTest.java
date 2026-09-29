package com.attendance.service;

import com.attendance.entity.AttendanceRecord;
import com.attendance.entity.Subject;
import com.attendance.entity.User;
import com.attendance.exception.BadRequestException;
import com.attendance.repository.AttendanceRecordRepository;
import com.attendance.repository.AttendanceRequestRepository;
import com.attendance.repository.SubjectRepository;
import com.attendance.repository.UserRepository;
import com.attendance.service.AttendanceStatsService.BelowThreshold;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

/**
 * The rules that matter most: what each role can see, and that the numbers are
 * right.
 * Plain unit test: no Spring context, no Mongo, no Ollama.
 */
class AttendanceStatsServiceTest {

    UserRepository users = mock(UserRepository.class);
    SubjectRepository subjects = mock(SubjectRepository.class);
    AttendanceRecordRepository records = mock(AttendanceRecordRepository.class);
    AttendanceService attendanceService = mock(AttendanceService.class);
    SecurityUtil security = mock(SecurityUtil.class);
    List<AttendanceRecord> stored = new ArrayList<>();
    AttendanceStatsService service;

    @BeforeEach
    void setUp() {
        // Two departments. Rahul (IT) attends 1 of 2 lectures = 50%; Priya (CE) attends
        // 0 of 2 = 0%.
        when(users.findAll()).thenReturn(List.of(
                user("u1", "Rahul Sharma", "S1", "IT-A", "IT"),
                user("u2", "Priya Patel", "S2", "CE-A", "CE")));
        when(subjects.findAll()).thenReturn(List.of(subject("dbms", "T1"), subject("os", "T2")));
        when(attendanceService.slotDurationHours(any(), any())).thenReturn(1.0);
        when(records.findByStudentIdIn(anyCollection())).thenAnswer(inv -> {
            Collection<String> ids = inv.getArgument(0);
            return stored.stream().filter(r -> ids.contains(r.getStudentId())).toList();
        });
        stored.add(mark("dbms", "u1", true));
        stored.add(mark("os", "u1", false));
        stored.add(mark("dbms", "u2", false));
        stored.add(mark("os", "u2", false));

        service = new AttendanceStatsService(users, subjects, records, mock(AttendanceRequestRepository.class),
                attendanceService, mock(AttendanceRequestService.class), security, 75);
    }

    @Test
    void adminSeesEveryoneAndPercentIsHourWeighted() {
        when(security.hasRole("admin")).thenReturn(true);

        BelowThreshold below = service.belowThreshold(null, null); // default = required 75%

        assertThat(below.totalMatches()).isEqualTo(2);
        assertThat(below.students()).extracting("name").containsExactly("Priya Patel", "Rahul Sharma"); // lowest first
        assertThat(below.students().get(1).attendancePct()).isEqualTo(50.0);
    }

    @Test
    void aboveThresholdDefaultsTo100AndSortsHighestFirst() {
        when(security.hasRole("admin")).thenReturn(true);

        var above = service.aboveThreshold(null, null); // default = 100%, only Rahul qualifies... actually neither hits
                                                        // 100

        assertThat(above.threshold()).isEqualTo(100.0);
        assertThat(above.students()).isEmpty(); // Rahul=50%, Priya=0%, neither is 100%

        var above50 = service.aboveThreshold(null, 50.0);
        assertThat(above50.students()).extracting("name").containsExactly("Rahul Sharma");
    }

    @Test
    void scopeDescriptionNamesTheRoleAndSubjectsForATeacher() {
        when(security.hasRole("teacher")).thenReturn(true);
        when(security.getCurrentUserId()).thenReturn("T1");
        when(subjects.findByTeacherId("T1")).thenReturn(List.of(subject("dbms", "T1", "IT-A")));

        assertThat(service.facts(null).scope()).contains("dbms").contains("IT-A").contains("not the whole department");
    }

    @Test
    void hodOnlySeesOwnDepartmentAndCannotWidenIt() {
        when(security.hasRole("hod")).thenReturn(true);
        when(security.getCurrentUserDepartment()).thenReturn("IT");

        assertThat(service.belowThreshold(null, 75.0).students()).extracting("name").containsExactly("Rahul Sharma");
        assertThatThrownBy(() -> service.belowThreshold("CE", 75.0)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.studentAttendance("Priya")).isInstanceOf(BadRequestException.class);
    }

    @Test
    void teacherOnlyCountsTheirOwnSubjects() {
        when(security.hasRole("teacher")).thenReturn(true);
        when(security.getCurrentUserId()).thenReturn("T1"); // teaches dbms only
        when(subjects.findByTeacherId("T1")).thenReturn(List.of(subject("dbms", "T1", "IT-A")));

        var detail = service.studentAttendance("Rahul"); // present in dbms, absent in os (T2's subject)

        assertThat(detail.overallPct()).isEqualTo(100.0);
        assertThat(detail.bySubject()).extracting("subject").containsExactly("dbms");
        assertThatThrownBy(() -> service.studentAttendance("Priya")).isInstanceOf(BadRequestException.class); // other
                                                                                                              // class
    }

    @Test
    void nobodyOrUnknownRoleIsRefused() {
        assertThatThrownBy(() -> service.facts(null)).isInstanceOf(BadRequestException.class);
    }

    @Test
    void studentCanOnlySeeTheirOwnAttendanceViaMyAttendance() {
        when(security.hasRole("student")).thenReturn(true);
        when(security.getCurrentUserId()).thenReturn("u1");
        when(users.findById("u1")).thenReturn(java.util.Optional.of(
                user("u1", "Rahul Sharma", "S1", "IT-A", "IT")));

        var mine = service.myAttendance();

        assertThat(mine.name()).isEqualTo("Rahul Sharma");
        assertThat(mine.overallPct()).isEqualTo(50.0); // present in dbms, absent in os
        assertThat(mine.bySubject()).hasSize(2);
        assertThat(mine.attended()).isEqualTo(1); // lectures attended out of lectures held
        assertThat(mine.total()).isEqualTo(2);
        assertThat(mine.bySubject()).extracting("subject").containsExactly("dbms", "os"); // alphabetical
        assertThat(mine.bySubject().get(0).attended()).isEqualTo(1);
        assertThat(mine.bySubject().get(1).attended()).isEqualTo(0);
    }

    @Test
    void teacherScopeIncludesClassesASharedLectureIsAlsoShownIn() {
        when(security.hasRole("teacher")).thenReturn(true);
        when(security.getCurrentUserId()).thenReturn("T4");
        Subject shared = subject("gis", "T4", "IT-A");
        shared.setExtraClassNames(List.of("CE-A"));
        when(subjects.findByTeacherId("T4")).thenReturn(List.of(shared));

        var priya = service.studentAttendance("Priya"); // CE-A student, reachable only via the shared class

        assertThat(priya.name()).isEqualTo("Priya Patel");
        assertThat(service.facts(null).scope()).contains("CE-A").contains("IT-A");
    }

    @Test
    void nonStudentCannotUseMyAttendance() {
        when(security.hasRole("admin")).thenReturn(true);
        assertThatThrownBy(() -> service.myAttendance()).isInstanceOf(BadRequestException.class);
    }

    @Test
    void leaveDataIsHodOrAdminOnly() {
        when(security.hasRole("teacher")).thenReturn(true);
        assertThatThrownBy(() -> service.pendingRequests(null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.leaveHistory("Rahul")).isInstanceOf(BadRequestException.class);
    }

    // ---- fixtures ----
    private static User user(String id, String name, String sap, String cls, String dept) {
        User u = new User();
        u.setId(id);
        u.setName(name);
        u.setSap(sap);
        u.setClassName(cls);
        u.setDepartment(dept);
        u.setRole("student");
        return u;
    }

    private static Subject subject(String id, String teacherId) {
        return subject(id, teacherId, "X");
    }

    private static Subject subject(String id, String teacherId, String cls) {
        Subject s = new Subject();
        s.setId(id);
        s.setName(id);
        s.setTeacherId(teacherId);
        s.setClassName(cls);
        return s;
    }

    private static AttendanceRecord mark(String subjectId, String studentId, boolean present) {
        AttendanceRecord r = new AttendanceRecord();
        r.setSubjectId(subjectId);
        r.setStudentId(studentId);
        r.setDate(LocalDate.now());
        r.setPresent(present);
        return r;
    }
}
package com.attendance.service;

import com.attendance.dto.SubjectCreateRequest;
import com.attendance.dto.SubjectDTO;
import com.attendance.dto.UserDTO;
import com.attendance.entity.Subject;
import com.attendance.entity.User;
import com.attendance.exception.BadRequestException;
import com.attendance.repository.SubjectRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.modelmapper.ModelMapper;

import java.lang.reflect.Field;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import org.mockito.ArgumentCaptor;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

/**
 * The rule from the "Advanced Security" / "Gamification" conversation: a
 * student already
 * committed to one subject at a given day+time cannot also be enrolled in a
 * different subject
 * that overlaps that same day+time. Plain unit test: no Spring context, no
 * Mongo.
 */
class SubjectServiceTest {

    SubjectRepository subjectRepository = mock(SubjectRepository.class);
    UserService userService = mock(UserService.class);
    SubjectService service = new SubjectService();

    @BeforeEach
    void setUp() throws Exception {
        set("subjectRepository", subjectRepository);
        set("userService", userService);
        set("modelMapper", new ModelMapper());

        when(userService.getUserEntityById("t1")).thenReturn(teacher());
        when(userService.getUsersByClassName("IT-A")).thenReturn(List.of(
                userDto("s1", "Alice", "A1"), userDto("s2", "Bob", "A2"), userDto("s3", "Cara", "A3"),
                userDto("s4", "Dan", "A4"), userDto("s5", "Eve", "A5")));
        when(userService.getUserEntityById("s1")).thenReturn(student("s1", "Alice", "A1"));
        when(userService.getUserEntityById("s2")).thenReturn(student("s2", "Bob", "A2"));
        when(userService.getUserEntityById("s3")).thenReturn(student("s3", "Cara", "A3"));
        when(userService.getUserEntityById("s4")).thenReturn(student("s4", "Dan", "A4"));
        when(userService.getUserEntityById("s5")).thenReturn(student("s5", "Eve", "A5"));
        when(subjectRepository.save(any(Subject.class))).thenAnswer(inv -> inv.getArgument(0));

        // resolveClasses() looks students up in bulk; keep it consistent with the
        // individual stubs above.
        java.util.Map<String, User> byId = new java.util.HashMap<>(java.util.Map.of(
                "s1", student("s1", "Alice", "A1"), "s2", student("s2", "Bob", "A2"),
                "s3", student("s3", "Cara", "A3"), "s4", student("s4", "Dan", "A4"),
                "s5", student("s5", "Eve", "A5")));
        when(userService.getUserEntitiesByIds(any())).thenAnswer(inv -> {
            List<String> ids = inv.getArgument(0);
            List<User> found = new java.util.ArrayList<>();
            for (String id : ids) {
                User u = byId.get(id);
                if (u != null)
                    found.add(u);
            }
            return found;
        });
        userEntitiesById = byId; // exposed so a single test can add "s6" (Fay, IT-B) without touching the rest
    }

    private java.util.Map<String, User> userEntitiesById;

    @Test
    void rejectsAStudentAlreadyEnrolledInAnOverlappingSubject() {
        Subject advancedSecurity = subject("advsec", "Advanced Security", "Tuesday", "15:00", "16:00",
                List.of("s2", "s4"));
        when(subjectRepository.findByClassNameAndDay("IT-A", "Tuesday")).thenReturn(List.of(advancedSecurity));

        SubjectCreateRequest gamification = request("Gamification", "Tuesday", "15:00", "16:00", List.of("s2", "s5"));

        assertThatThrownBy(() -> service.createSubject(gamification))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Bob")
                .hasMessageContaining("Advanced Security");
    }

    @Test
    void allowsAStudentNotInAnyOverlappingSubject() {
        Subject advancedSecurity = subject("advsec", "Advanced Security", "Tuesday", "15:00", "16:00",
                List.of("s2", "s4"));
        when(subjectRepository.findByClassNameAndDay("IT-A", "Tuesday")).thenReturn(List.of(advancedSecurity));

        SubjectCreateRequest gamification = request("Gamification", "Tuesday", "15:00", "16:00", List.of("s5"));

        assertThat(service.createSubject(gamification)).isNotNull();
    }

    @Test
    void differentTimeOnTheSameDayDoesNotConflict() {
        Subject advancedSecurity = subject("advsec", "Advanced Security", "Tuesday", "15:00", "16:00", List.of("s2"));
        when(subjectRepository.findByClassNameAndDay("IT-A", "Tuesday")).thenReturn(List.of(advancedSecurity));

        SubjectCreateRequest eveningClub = request("Evening Club", "Tuesday", "16:00", "17:00", List.of("s2"));

        assertThat(service.createSubject(eveningClub)).isNotNull();
    }

    @Test
    void unrestrictedSubjectCountsEveryClassStudentAsBusy() {
        Subject coreMaths = subject("core", "Core Maths", "Thursday", "09:00", "10:00", null); // whole class
        when(subjectRepository.findByClassNameAndDay("IT-A", "Thursday")).thenReturn(List.of(coreMaths));

        SubjectCreateRequest chessClub = request("Chess Club", "Thursday", "09:30", "10:30", List.of("s3"));

        assertThatThrownBy(() -> service.createSubject(chessClub))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Cara")
                .hasMessageContaining("Core Maths");
    }

    @Test
    void restrictedSubjectAutoDerivesItsClassesFromTheActualStudents() {
        // Fay is a genuine IT-B student, so enrolling her alongside an IT-A student
        // must serve BOTH
        // classes automatically — no className/extraClassNames picked by hand at all.
        userEntitiesById.put("s6", student("s6", "Fay", "A6", "IT-B"));
        when(subjectRepository.findByClassNameAndDay(eq("IT-B"), any())).thenReturn(List.of());

        SubjectCreateRequest shared = request("Advanced Security", "Tuesday", "15:00", "16:00", List.of("s1", "s6"));
        SubjectDTO saved = service.createSubject(shared);

        assertThat(saved).isNotNull();
        ArgumentCaptor<Subject> captor = ArgumentCaptor.forClass(Subject.class);
        verify(subjectRepository, atLeastOnce()).save(captor.capture());
        Subject persisted = captor.getValue();
        assertThat(persisted.classesServed()).containsExactlyInAnyOrder("IT-A", "IT-B");
    }

    @Test
    void restrictedSingleClassBatchIgnoresWhateverClassWasSentAndDerivesItsOwnAlone() {
        SubjectCreateRequest lab = request("I1-1 Lab", "Sunday", "10:00", "11:00", List.of("s1")); // Alice, IT-A only
        lab.setClassName("SOMETHING-ELSE"); // must be ignored: classes come from the actual student, not this
        lab.setExtraClassNames(List.of("ALSO-IGNORED"));

        ArgumentCaptor<Subject> captor = ArgumentCaptor.forClass(Subject.class);
        service.createSubject(lab);
        verify(subjectRepository, atLeastOnce()).save(captor.capture());

        assertThat(captor.getValue().getClassName()).isEqualTo("IT-A");
        assertThat(captor.getValue().getExtraClassNames()).isNullOrEmpty();
    }

    @Test
    void wholeClassSubjectKeepsExactlyTheManuallyPickedClasses() {
        SubjectCreateRequest wholeClass = request("Maths", "Sunday", "09:00", "10:00", List.of());
        wholeClass.setClassName("IT-A");
        wholeClass.setExtraClassNames(List.of("IT-B"));

        ArgumentCaptor<Subject> captor = ArgumentCaptor.forClass(Subject.class);
        service.createSubject(wholeClass);
        verify(subjectRepository, atLeastOnce()).save(captor.capture());

        assertThat(captor.getValue().getClassName()).isEqualTo("IT-A");
        assertThat(captor.getValue().getExtraClassNames()).containsExactly("IT-B");
    }

    @Test
    void extraClassesAreCleanedOfBlanksDuplicatesAndThePrimaryClass() {
        SubjectCreateRequest messy = request("Cyber Law", "Saturday", "10:00", "11:00", List.of());
        messy.setClassName("IT-A"); // whole-class mode: extras are the ones picked by hand, just cleaned up
        messy.setExtraClassNames(java.util.Arrays.asList("IT-A", "", "IT-B", "IT-B", null));

        ArgumentCaptor<Subject> captor = ArgumentCaptor.forClass(Subject.class);
        service.createSubject(messy);
        verify(subjectRepository, atLeastOnce()).save(captor.capture());

        assertThat(captor.getValue().getExtraClassNames()).containsExactly("IT-B");
    }

    @Test
    void editingASubjectNeverConflictsWithItself() {
        Subject gamification = subject("gam", "Gamification", "Tuesday", "15:00", "16:00", List.of("s5"));
        when(subjectRepository.findById("gam")).thenReturn(java.util.Optional.of(gamification));
        when(subjectRepository.findByClassNameAndDay("IT-A", "Tuesday")).thenReturn(List.of(gamification));

        SubjectCreateRequest addEve = request("Gamification", "Tuesday", "15:00", "16:00", List.of("s5"));
        assertThat(service.updateSubject("gam", addEve)).isNotNull(); // re-saving its own students must not
                                                                      // self-conflict
    }

    // ---- fixtures ----
    private static User teacher() {
        User u = new User();
        u.setId("t1");
        u.setName("Teach");
        u.setRole("teacher");
        return u;
    }

    private static User student(String id, String name, String sap) {
        return student(id, name, sap, "IT-A");
    }

    private static User student(String id, String name, String sap, String className) {
        User u = new User();
        u.setId(id);
        u.setName(name);
        u.setSap(sap);
        u.setRole("student");
        u.setClassName(className);
        return u;
    }

    private static UserDTO userDto(String id, String name, String sap) {
        UserDTO d = new UserDTO();
        d.setId(id);
        d.setName(name);
        d.setSap(sap);
        d.setRole("student");
        d.setClassName("IT-A");
        return d;
    }

    private static Subject subject(String id, String name, String day, String start, String end,
            List<String> enrolled) {
        Subject s = new Subject();
        s.setId(id);
        s.setName(name);
        s.setClassName("IT-A");
        s.setDay(day);
        s.setStartTime(start);
        s.setEndTime(end);
        s.setEnrolledStudentIds(enrolled);
        return s;
    }

    private static SubjectCreateRequest request(String name, String day, String start, String end,
            List<String> enrolled) {
        SubjectCreateRequest r = new SubjectCreateRequest();
        r.setName(name);
        r.setTeacherId("t1");
        r.setClassName("IT-A");
        r.setDay(day);
        r.setStartTime(start);
        r.setEndTime(end);
        r.setEnrolledStudentIds(enrolled);
        return r;
    }

    private void set(String field, Object value) throws Exception {
        Field f = SubjectService.class.getDeclaredField(field);
        f.setAccessible(true);
        f.set(service, value);
    }
}
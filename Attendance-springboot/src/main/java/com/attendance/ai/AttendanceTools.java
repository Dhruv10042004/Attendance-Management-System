package com.attendance.ai;

import com.attendance.exception.BadRequestException;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.service.AttendanceStatsService;
import com.attendance.service.AttendanceStatsService.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.model.ToolContext;
import org.springframework.ai.tool.annotation.Tool;
import org.springframework.ai.tool.annotation.ToolParam;
import org.springframework.stereotype.Component;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Supplier;

/**
 * The ONLY things the LLM can do. Read-only, one line each: every method
 * delegates to
 * {@link AttendanceStatsService}, which enforces the caller's role.
 *
 * There is deliberately no write method here (no approve/reject/mark) and no
 * free-form query
 * method. A tool that does not exist cannot be prompt-injected into running.
 *
 * Tool arguments never contain the caller's identity: that comes from the
 * SecurityContext, and
 * this only works because {@code ChatClient...call()} runs tools on the request
 * thread.
 * (Streaming or an out-of-process MCP server would lose the SecurityContext,
 * see AI_FEATURES.md.)
 */
@Component
public class AttendanceTools {

    /** ToolContext key under which the per-request collector lives. */
    static final String CALLS = "calls";

    /** One executed tool call: what the UI shows as "Data from the database". */
    public record ToolCall(String tool, Object result) {
    }

    private static final Logger log = LoggerFactory.getLogger(AttendanceTools.class);
    private final AttendanceStatsService stats;

    public AttendanceTools(AttendanceStatsService stats) {
        this.stats = stats;
    }

    @Tool(description = "Overall and per-subject attendance percentage of ONE student, looked up by name or SAP id.")
    public StudentDetail getStudentAttendance(
            @ToolParam(description = "Student name (full or partial) or SAP id") String nameOrSap, ToolContext ctx) {
        return run(ctx, "getStudentAttendance", nameOrSap, () -> stats.studentAttendance(nameOrSap));
    }

    @Tool(description = "List students whose overall attendance is below a percentage, lowest first. Also gives the total count.")
    public BelowThreshold findStudentsBelowAttendanceThreshold(
            @ToolParam(required = false, description = "Department name; omit for everything the user may see") String department,
            @ToolParam(required = false, description = "Percentage 0-100; omit to use the required attendance") Double threshold,
            ToolContext ctx) {
        return run(ctx, "findStudentsBelowAttendanceThreshold", department + "/" + threshold,
                () -> stats.belowThreshold(department, threshold));
    }

    @Tool(description = "List students whose overall attendance is AT OR ABOVE a percentage, highest first. Use for "
            + "'perfect attendance', '100% attendance', or any 'above X%' question. Threshold defaults to 100.")
    public AboveThreshold findStudentsAboveAttendanceThreshold(
            @ToolParam(required = false, description = "Department name; omit for everything the user may see") String department,
            @ToolParam(required = false, description = "Percentage 0-100; omit to mean 100 (perfect attendance)") Double threshold,
            ToolContext ctx) {
        return run(ctx, "findStudentsAboveAttendanceThreshold", department + "/" + threshold,
                () -> stats.aboveThreshold(department, threshold));
    }

    @Tool(description = "Attendance percentage per subject, lowest first. Use for 'which subjects have the lowest attendance'.")
    public List<SubjectStat> getSubjectAttendance(
            @ToolParam(required = false, description = "Department name; omit for everything the user may see") String department,
            ToolContext ctx) {
        return run(ctx, "getSubjectAttendance", department, () -> stats.subjectAttendance(department));
    }

    @Tool(description = "Per-department summary: HOD name, student count, overall attendance, last 7 days vs previous 7 days, "
            + "students below the required percentage and below 60, and the weakest subject. Use to compare departments.")
    public List<DeptSummary> getDepartmentSummary(
            @ToolParam(required = false, description = "Department name; omit to get every department the user may see") String department,
            ToolContext ctx) {
        return run(ctx, "getDepartmentSummary", department, () -> stats.departmentSummaries(department));
    }

    @Tool(description = "Today's attendance: present marks, absent marks, and number of students absent in at least one lecture.")
    public TodaySummary getTodayAttendance(
            @ToolParam(required = false, description = "Department name; omit for everything the user may see") String department,
            ToolContext ctx) {
        return run(ctx, "getTodayAttendance", department, () -> stats.today(department));
    }

    @Tool(description = "Students whose attendance dropped sharply (15+ points) in the last N days compared with the N days before.")
    public List<Decline> findDecliningStudents(
            @ToolParam(required = false, description = "Department name; omit for everything the user may see") String department,
            @ToolParam(required = false, description = "Window size in days, default 14, max 90") Integer days,
            ToolContext ctx) {
        return run(ctx, "findDecliningStudents", department + "/" + days,
                () -> stats.decliningStudents(department, days));
    }

    @Tool(description = "Attendance-request (leave) history of ONE student: counts by status and the 10 most recent. HOD/admin only.")
    public LeaveHistory getStudentLeaveHistory(
            @ToolParam(description = "Student name (full or partial) or SAP id") String nameOrSap, ToolContext ctx) {
        return run(ctx, "getStudentLeaveHistory", nameOrSap, () -> stats.leaveHistory(nameOrSap));
    }

    @Tool(description = "Attendance requests (leave) that are still pending review, oldest first. HOD/admin only. Read-only: cannot approve or reject.")
    public List<PendingRow> getPendingLeaveRequests(
            @ToolParam(required = false, description = "Department name; omit for everything the user may see") String department,
            ToolContext ctx) {
        return run(ctx, "getPendingLeaveRequests", department, () -> stats.pendingRequests(department));
    }

    @Tool(description = "Weekly timetable (subject, day, start, end, teacher) of one class/division.")
    public List<SlotRow> getTimetable(
            @ToolParam(description = "Class / division name") String className, ToolContext ctx) {
        return run(ctx, "getTimetable", className, () -> stats.timetable(className));
    }

    /**
     * Logging, timing, result capture and error policy shared by every tool.
     * - BadRequest/NotFound: message is safe and useful, so the model sees it (it
     * can retry or explain).
     * - Anything else (Mongo down, bug): logged here, model only sees a generic
     * sentence, so no
     * connection strings or stack details ever reach the model or the user.
     * Student names/args are DEBUG only; INFO logs carry no student data.
     */
    private <T> T run(ToolContext ctx, String tool, Object args, Supplier<T> body) {
        long t0 = System.nanoTime();
        try {
            T result = body.get();
            calls(ctx).add(new ToolCall(tool, result));
            log.info("ai.tool name={} status=ok ms={}", tool, ms(t0));
            log.debug("ai.tool name={} args={}", tool, args);
            return result;
        } catch (BadRequestException | ResourceNotFoundException e) {
            log.info("ai.tool name={} status=rejected ms={}", tool, ms(t0));
            log.debug("ai.tool name={} args={} reason={}", tool, args, e.getMessage());
            throw e;
        } catch (RuntimeException e) {
            log.error("ai.tool name={} status=error ms={}", tool, ms(t0), e);
            throw new IllegalStateException("The attendance data source is temporarily unavailable.");
        }
    }

    @SuppressWarnings("unchecked")
    private static List<ToolCall> calls(ToolContext ctx) {
        Object c = ctx == null ? null : ctx.getContext().get(CALLS);
        return c instanceof List<?> ? (List<ToolCall>) c : new ArrayList<>();
    }

    private static long ms(long t0) {
        return (System.nanoTime() - t0) / 1_000_000;
    }
}

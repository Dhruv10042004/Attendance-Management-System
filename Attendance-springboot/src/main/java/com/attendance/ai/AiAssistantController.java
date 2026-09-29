package com.attendance.ai;

import org.springframework.web.bind.annotation.*;

/**
 * Thin HTTP layer. Access control: SecurityConfig (/ai/** = admin, hod, teacher) and the
 * role scoping inside AttendanceStatsService. Nothing here touches the model or the database.
 * Responses are plain JSON (not ApiResponse-wrapped), matching the contract in the spec.
 */
@RestController
@RequestMapping("/ai/attendance")
public class AiAssistantController {

    public record QueryRequest(String question) {}

    public record ReportRequest(String department) {}

    private final AiAssistantService ai;

    public AiAssistantController(AiAssistantService ai) {
        this.ai = ai;
    }

    /** Natural-language question -> {answer, toolsUsed, data}. */
    @PostMapping("/query")
    public AiAssistantService.Answer query(@RequestBody QueryRequest request) {
        return ai.ask(request.question());
    }

    /** Dashboard "AI Insights": application facts + 2-3 sentence narrative. */
    @GetMapping("/insights")
    public AiAssistantService.Narrated insights(@RequestParam(required = false) String department) {
        return ai.insights(department);
    }

    /** Longer report: application facts + AI-written narrative (kept in separate fields). */
    @PostMapping("/report")
    public AiAssistantService.Narrated report(@RequestBody(required = false) ReportRequest request) {
        return ai.report(request == null ? null : request.department());
    }
}

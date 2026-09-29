package com.attendance.ai;

import com.attendance.ai.AttendanceTools.ToolCall;
import com.attendance.exception.BadRequestException;
import com.attendance.exception.ResourceNotFoundException;
import com.attendance.service.AttendanceStatsService;
import com.attendance.service.AttendanceStatsService.Facts;
import com.attendance.service.SecurityUtil;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.ai.chat.client.ChatClient;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.NestedExceptionUtils;
import org.springframework.dao.DataAccessException;
import org.springframework.stereotype.Service;

import java.net.ConnectException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;
import java.net.http.HttpTimeoutException;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CopyOnWriteArrayList;
import java.util.function.Supplier;

/**
 * The only class that talks to the LLM. Controllers call this, never ChatClient.
 * The model name is not mentioned here: it comes from spring.ai.ollama.chat.options.model.
 *
 * Two flows:
 *  - ask():      LLM + tools (LLM decides which read-only tool to call; application returns the facts)
 *  - insights()/report(): application computes facts FIRST, LLM only writes prose around them.
 *    Facts and narrative are returned as separate fields, so the UI can label them differently.
 */
@Service
public class AiAssistantService {

    public record Answer(String answer, List<String> toolsUsed, List<ToolCall> data) {}

    public record Narrated(Facts facts, String narrative, String narrativeError) {}

    private static final Logger log = LoggerFactory.getLogger(AiAssistantService.class);
    private static final int MAX_QUESTION = 500;

    private final ChatClient chat;
    private final AttendanceTools tools;
    private final AttendanceStatsService stats;
    private final SecurityUtil security;
    private final ObjectMapper json;
    private final String model;

    public AiAssistantService(ChatClient.Builder builder, AttendanceTools tools, AttendanceStatsService stats,
                              SecurityUtil security, ObjectMapper json,
                              @Value("${spring.ai.ollama.chat.options.model:unknown}") String model) {
        this.chat = builder.build();
        this.tools = tools;
        this.stats = stats;
        this.security = security;
        this.json = json;
        this.model = model;
    }

    public Answer ask(String question) {
        if (question == null || question.isBlank() || question.length() > MAX_QUESTION) {
            throw new BadRequestException("Question must be between 1 and " + MAX_QUESTION + " characters");
        }
        List<ToolCall> calls = new CopyOnWriteArrayList<>();
        log.info("ai.query user={} questionLength={}", security.getCurrentUserId(), question.length());
        log.debug("ai.query text={}", question);

        long t0 = System.nanoTime();
        String text = guard(() -> chat.prompt()
                .system(s -> s.text(AttendancePrompt.ASSISTANT)
                        .param("today", LocalDate.now().toString())
                        .param("role", roleLabel()))
                .user(u -> u.text("{question}").param("question", question)) // param, so braces in the question are inert
                .tools(tools)
                .toolContext(Map.<String, Object>of(AttendanceTools.CALLS, calls))
                .call()
                .content());
        List<String> used = calls.stream().map(ToolCall::tool).distinct().toList();
        log.info("ai.query done tools={} llmMs={}", used, (System.nanoTime() - t0) / 1_000_000);

        if (text == null || text.isBlank()) {
            text = "I could not produce an answer. Please rephrase the question.";
        }
        return new Answer(text, used, calls);
    }

    public Narrated insights(String department) {
        return narrate(AttendancePrompt.INSIGHT_TASK, department);
    }

    public Narrated report(String department) {
        return narrate(AttendancePrompt.REPORT_TASK, department);
    }

    private Narrated narrate(String task, String department) {
        Facts facts = guard(() -> stats.facts(department)); // scope errors -> 400, DB down -> 503
        try {
            long t0 = System.nanoTime();
            String factsJson = guard(() -> {
                try {
                    return json.writeValueAsString(facts);
                } catch (JsonProcessingException e) {
                    throw new IllegalStateException(e);
                }
            });
            String text = guard(() -> chat.prompt()
                    .system(AttendancePrompt.NARRATOR)
                    .user(u -> u.text(task + "\n\nFACTS (JSON):\n{facts}").param("facts", factsJson))
                    .call()
                    .content());
            log.info("ai.narrate done llmMs={}", (System.nanoTime() - t0) / 1_000_000);
            return new Narrated(facts, text, null);
        } catch (AiUnavailableException e) {
            // The numbers are still valid, so the dashboard keeps working when Ollama is down.
            return new Narrated(facts, null, e.getMessage());
        }
    }

    private String roleLabel() {
        if (security.hasRole("admin")) return "admin (organisation-wide access)";
        if (security.hasRole("hod")) return "HOD of " + security.getCurrentUserDepartment();
        return "teacher (own classes and subjects only)";
    }

    /** Turns model/network/database failures into one 503 with a message the user can act on. */
    private <T> T guard(Supplier<T> call) {
        try {
            return call.get();
        } catch (BadRequestException | ResourceNotFoundException | AiUnavailableException e) {
            throw e;
        } catch (RuntimeException e) {
            log.error("ai.failure type={}", e.getClass().getSimpleName(), e);
            throw new AiUnavailableException(explain(e));
        }
    }

    private String explain(RuntimeException e) {
        if (e instanceof DataAccessException) return "The attendance database is temporarily unavailable.";
        Throwable root = NestedExceptionUtils.getMostSpecificCause(e);
        if (root instanceof ConnectException || root instanceof UnknownHostException) {
            return "Cannot reach the local AI model. Start Ollama (ollama serve) and try again.";
        }
        if (root instanceof SocketTimeoutException || root instanceof HttpTimeoutException) {
            return "The AI model took too long to respond. Try again, or configure a smaller/faster model.";
        }
        // ponytail: string matches on Ollama's error bodies; replace with typed checks if Spring AI exposes them
        String msg = String.valueOf(root.getMessage()).toLowerCase();
        if (msg.contains("does not support tools")) {
            return "The configured model '" + model + "' cannot call tools (gemma3 and vision models cannot). "
                    + "Use a tool-capable model such as qwen2.5:7b or llama3.1:8b.";
        }
        if (msg.contains("not found")) {
            return "The configured model '" + model + "' is not installed. Run: ollama pull " + model;
        }
        return "The AI assistant could not complete the request.";
    }
}

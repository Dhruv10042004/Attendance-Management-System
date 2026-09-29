package com.attendance.ai;

/** The AI feature (model, timeout, data source) cannot serve this request right now. Mapped to HTTP 503. */
public class AiUnavailableException extends RuntimeException {
    public AiUnavailableException(String message) {
        super(message);
    }
}

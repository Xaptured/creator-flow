package com.creatorflow.scheduler_service.dto.response;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public class ErrorResponse {
    private final String code;
    private final int status;
    private final String message;

    private ErrorResponse(String code, int status, String message) {
        this.code = code;
        this.status = status;
        this.message = message;
    }

    public static ErrorResponse of(String code, HttpStatus status, String message) {
        return new ErrorResponse(code, status.value(), message);
    }
}

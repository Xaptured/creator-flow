package com.creatorflow.auth_service.dto.response;

import org.springframework.http.HttpStatus;

public record ErrorResponse(String code, int status, String message) {

    public static ErrorResponse of(String code, HttpStatus httpStatus, String message) {
        return new ErrorResponse(code, httpStatus.value(), message);
    }
}

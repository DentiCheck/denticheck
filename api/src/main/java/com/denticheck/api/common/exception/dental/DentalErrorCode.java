package com.denticheck.api.common.exception.dental;

import com.denticheck.api.common.exception.ErrorCode;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;

@Getter
@RequiredArgsConstructor
public enum DentalErrorCode implements ErrorCode {
    // 3000번대: 치과 관련 (기존 병원 코드 3000 유지)
    DENTAL_NOT_FOUND(HttpStatus.NOT_FOUND, 3000, "치과를 찾을 수 없습니다.");

    private final HttpStatus httpStatus;
    private final int code;
    private final String message;
}

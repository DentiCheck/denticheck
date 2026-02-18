package com.denticheck.api.common.exception.dental;

import com.denticheck.api.common.exception.BusinessException;
import lombok.Getter;

@Getter
public class DentalException extends BusinessException {
    public DentalException(DentalErrorCode errorCode) {
        super(errorCode);
    }
}

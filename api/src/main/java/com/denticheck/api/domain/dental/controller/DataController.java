package com.denticheck.api.domain.dental.controller;

import com.denticheck.api.domain.dental.repository.DentalRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
public class DataController {

    private final DentalRepository dentalRepository;

    @GetMapping("/api/v1/data/count")
    public long getDentalCount() {
        return dentalRepository.count();
    }
}

package com.denticheck.api.domain.dental.service.impl;

import com.denticheck.api.domain.dental.entity.DentalEntity;
import com.denticheck.api.domain.dental.entity.DentalLikeEntity;
import com.denticheck.api.domain.dental.repository.DentalLikeRepository;
import com.denticheck.api.domain.dental.repository.DentalRepository;
import com.denticheck.api.domain.dental.service.DentalService;
import com.denticheck.api.domain.user.entity.UserEntity;
import com.denticheck.api.domain.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DentalServiceImpl implements DentalService {

    private final DentalRepository dentalRepository;
    private final DentalLikeRepository dentalLikeRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public List<DentalEntity> getAllDentals() {
        return dentalRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DentalEntity> getNearbyDentals(double latitude, double longitude, double radiusKm) {
        return dentalRepository.findNearbyDentals(latitude, longitude, radiusKm);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DentalEntity> getMyFavoriteDentals(String username) {
        UserEntity user = userRepository.findByUsername(username)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + username));

        return dentalLikeRepository.findByUserId(user.getId()).stream()
                .map(DentalLikeEntity::getDental)
                .collect(Collectors.toList());
    }
}

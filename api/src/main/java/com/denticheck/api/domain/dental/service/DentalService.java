package com.denticheck.api.domain.dental.service;

import com.denticheck.api.domain.dental.entity.DentalEntity;

import java.util.List;

public interface DentalService {
    List<DentalEntity> getAllDentals();

    List<DentalEntity> getNearbyDentals(double latitude, double longitude, double radiusKm);

    List<DentalEntity> getMyFavoriteDentals(String username);
}

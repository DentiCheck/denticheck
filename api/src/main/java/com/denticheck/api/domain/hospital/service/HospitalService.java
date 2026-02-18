package com.denticheck.api.domain.hospital.service;

import com.denticheck.api.domain.hospital.entity.HospitalEntity;
import java.util.List;

public interface HospitalService {
    List<HospitalEntity> getAllHospitals();

    List<HospitalEntity> getNearbyHospitals(double latitude, double longitude, double radiusKm);

    List<HospitalEntity> getMyFavoriteHospitals(String username);
}

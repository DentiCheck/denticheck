package com.denticheck.api.graphql.resolver;

import com.denticheck.api.common.util.UserRoleOnly;
import com.denticheck.api.domain.hospital.entity.HospitalEntity;
import com.denticheck.api.domain.hospital.service.HospitalService;
import lombok.RequiredArgsConstructor;
import org.springframework.graphql.data.method.annotation.Argument;
import org.springframework.graphql.data.method.annotation.QueryMapping;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Controller;

import java.util.List;

@Controller
@UserRoleOnly
@RequiredArgsConstructor
public class HospitalResolver {

    private final HospitalService hospitalService;

    @QueryMapping
    public List<HospitalEntity> hospitals() {
        return hospitalService.getAllHospitals();
    }

    @QueryMapping
    public List<HospitalEntity> searchHospitals(@Argument("latitude") double latitude,
            @Argument("longitude") double longitude,
            @Argument("radius") Double radius) {
        // Default radius to 5km if not provided
        double searchRadius = (radius != null) ? radius : 5.0;
        return hospitalService.getNearbyHospitals(latitude, longitude, searchRadius);
    }

    @QueryMapping
    public List<HospitalEntity> myFavoriteHospitals() {
        String username = SecurityContextHolder.getContext().getAuthentication().getName();
        return hospitalService.getMyFavoriteHospitals(username);
    }
}

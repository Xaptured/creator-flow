package com.creatorflow.auth_service.repository;

import com.creatorflow.auth_service.model.Region;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface RegionRepository extends JpaRepository<Region, String> {

    List<Region> findByActiveTrueOrderByDisplayOrderAsc();
}

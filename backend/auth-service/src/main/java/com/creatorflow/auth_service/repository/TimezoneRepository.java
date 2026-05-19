package com.creatorflow.auth_service.repository;

import com.creatorflow.auth_service.model.Timezone;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TimezoneRepository extends JpaRepository<Timezone, Integer> {

    /**
     * Returns all active timezones ordered by display_order ascending.
     * Used to populate the timezone dropdown in the Settings UI.
     */
    List<Timezone> findByActiveTrueOrderByDisplayOrderAsc();
}

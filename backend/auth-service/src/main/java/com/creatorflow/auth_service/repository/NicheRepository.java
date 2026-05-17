package com.creatorflow.auth_service.repository;

import com.creatorflow.auth_service.model.Niche;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NicheRepository extends JpaRepository<Niche, Integer> {

    /**
     * Returns all active niches ordered by display_order ascending.
     * Used to populate the niche dropdown in the Settings UI.
     */
    List<Niche> findByActiveTrueOrderByDisplayOrderAsc();
}

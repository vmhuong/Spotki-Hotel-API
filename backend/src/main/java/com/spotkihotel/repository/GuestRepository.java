package com.spotkihotel.repository;

import com.spotkihotel.entity.Guest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.util.Optional;

public interface GuestRepository extends JpaRepository<Guest, Integer>, JpaSpecificationExecutor<Guest> {
    Optional<Guest> findByEmailIgnoreCase(String email);
    Optional<Guest> findByPhone(String phone);
    boolean existsByEmailIgnoreCase(String email);
}

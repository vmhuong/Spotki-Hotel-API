package com.spotkihotel.repository;

import com.spotkihotel.entity.Guest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface GuestRepository extends JpaRepository<Guest, Integer>, JpaSpecificationExecutor<Guest> {
    Optional<Guest> findByEmailIgnoreCase(String email);
    Optional<Guest> findByPhone(String phone);
    boolean existsByEmailIgnoreCase(String email);

    @Query("""
        SELECT g FROM Guest g
        WHERE (g.phone IS NOT NULL AND LOWER(TRIM(g.phone)) = LOWER(TRIM(:identifier)))
           OR (g.identityNo IS NOT NULL AND LOWER(TRIM(g.identityNo)) = LOWER(TRIM(:identifier)))
        ORDER BY CASE WHEN g.passwordHash IS NOT NULL THEN 0 ELSE 1 END, g.loyaltyPoints DESC, g.id ASC
        """)
    List<Guest> findMatchingMembersByIdentifier(@Param("identifier") String identifier);
}

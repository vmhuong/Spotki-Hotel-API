package com.spotkihotel.repository;

import com.spotkihotel.entity.Guest;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface GuestRepository extends JpaRepository<Guest, Integer> {
    Optional<Guest> findByEmailIgnoreCase(String email);
    Optional<Guest> findByPhone(String phone);
    boolean existsByEmailIgnoreCase(String email);

    @Query("""
        SELECT g FROM Guest g
        WHERE (:keyword IS NULL OR :keyword = ''
               OR LOWER(g.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR g.phone LIKE CONCAT('%', :keyword, '%')
               OR LOWER(g.email) LIKE LOWER(CONCAT('%', :keyword, '%')))
        """)
    Page<Guest> searchGuests(@Param("keyword") String keyword, Pageable pageable);
}

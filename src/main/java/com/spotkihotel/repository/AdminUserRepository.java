package com.spotkihotel.repository;

import com.spotkihotel.entity.AdminUser;
import com.spotkihotel.entity.enums.StaffRole;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface AdminUserRepository extends JpaRepository<AdminUser, Integer> {
    Optional<AdminUser> findByUsername(String username);
    boolean existsByUsername(String username);

    @Query("""
        SELECT a FROM AdminUser a
        WHERE (:hotelId IS NULL OR a.hotelId = :hotelId)
          AND (:role IS NULL OR a.role = :role)
        """)
    Page<AdminUser> findByFilters(
            @Param("hotelId") Integer hotelId,
            @Param("role") StaffRole role,
            Pageable pageable
    );
}

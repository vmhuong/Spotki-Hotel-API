package com.spotkihotel.repository;

import com.spotkihotel.entity.Review;
import com.spotkihotel.entity.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface ReviewRepository extends JpaRepository<Review, Integer>, JpaSpecificationExecutor<Review> {
    @EntityGraph(attributePaths = {"booking", "room", "guest"})
    Page<Review> findByRoomIdAndStatusOrderByCreatedAtDesc(Integer roomId, ReviewStatus status, Pageable pageable);

    @Override
    @EntityGraph(attributePaths = {"booking", "room", "guest"})
    Page<Review> findAll(Specification<Review> spec, Pageable pageable);

    boolean existsByBookingId(Integer bookingId);
}

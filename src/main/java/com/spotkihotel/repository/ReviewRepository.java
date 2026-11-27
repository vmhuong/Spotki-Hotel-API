package com.spotkihotel.repository;

import com.spotkihotel.entity.Review;
import com.spotkihotel.entity.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewRepository extends JpaRepository<Review, Integer> {
    Page<Review> findByRoomIdAndStatusOrderByCreatedAtDesc(Integer roomId, ReviewStatus status, Pageable pageable);
    boolean existsByBookingId(Integer bookingId);
}

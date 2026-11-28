package com.spotkihotel.repository;

import com.spotkihotel.entity.Hotel;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HotelRepository extends JpaRepository<Hotel, Integer> {
    List<Hotel> findByIsActiveTrueOrderByStarRatingDescHotelNameAsc();
}

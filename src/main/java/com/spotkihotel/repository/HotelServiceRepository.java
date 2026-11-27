package com.spotkihotel.repository;

import com.spotkihotel.entity.HotelService;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface HotelServiceRepository extends JpaRepository<HotelService, Integer> {
    List<HotelService> findByIsActiveTrueOrderByServiceNameAsc();
}

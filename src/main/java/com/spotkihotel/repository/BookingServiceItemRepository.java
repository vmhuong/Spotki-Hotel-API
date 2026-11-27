package com.spotkihotel.repository;

import com.spotkihotel.entity.BookingServiceItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface BookingServiceItemRepository extends JpaRepository<BookingServiceItem, Integer> {
    List<BookingServiceItem> findByBookingIdOrderByCreatedAtAsc(Integer bookingId);
}

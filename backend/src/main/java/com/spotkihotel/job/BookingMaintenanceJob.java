package com.spotkihotel.job;

import com.spotkihotel.entity.Booking;
import com.spotkihotel.entity.enums.ActorType;
import com.spotkihotel.entity.enums.BookingStatus;
import com.spotkihotel.repository.BookingRepository;
import com.spotkihotel.service.SecurityLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Slf4j
@Configuration
@EnableScheduling
@RequiredArgsConstructor
public class BookingMaintenanceJob {

    private final BookingRepository bookingRepository;
    private final SecurityLogService securityLogService;

    @Scheduled(cron = "0 0 2 * * *")
    @Transactional
    public void cancelOverdueBookings() {
        LocalDate cutoff = LocalDate.now().minusDays(1);
        List<Booking> overdue = bookingRepository.findByStatusAndCheckInBefore(BookingStatus.booked, cutoff);
        if (overdue.isEmpty()) {
            return;
        }
        for (Booking booking : overdue) {
            booking.setStatus(BookingStatus.cancelled);
        }
        bookingRepository.saveAll(overdue);
        securityLogService.log(ActorType.system, 0, "booking_auto_cancel", "success",
                "Auto-cancelled " + overdue.size() + " overdue booking(s) prior to " + cutoff);
        log.info("Auto-cancelled {} overdue bookings prior to {}", overdue.size(), cutoff);
    }
}

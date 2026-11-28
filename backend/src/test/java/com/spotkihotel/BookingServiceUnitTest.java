package com.spotkihotel;

import com.spotkihotel.dto.booking.BookingDtos.CustomerEditBookingRequest;
import com.spotkihotel.dto.booking.BookingDtos.InvoiceSummaryResponse;
import com.spotkihotel.entity.*;
import com.spotkihotel.entity.enums.BookingStatus;
import com.spotkihotel.entity.enums.PricingMode;
import com.spotkihotel.exception.BusinessException;
import com.spotkihotel.repository.*;
import com.spotkihotel.security.UserPrincipal;
import com.spotkihotel.service.BookingService;
import com.spotkihotel.service.SecurityLogService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingServiceUnitTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private RoomRepository roomRepository;
    @Mock private GuestRepository guestRepository;
    @Mock private HotelServiceRepository hotelServiceRepository;
    @Mock private BookingServiceItemRepository bookingServiceItemRepository;
    @Mock private PaymentRepository paymentRepository;
    @Mock private PaymentGatewayTransactionRepository paymentGatewayTransactionRepository;
    @Mock private SecurityLogService securityLogService;

    @InjectMocks
    private BookingService bookingService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(bookingService, "vatRate", new BigDecimal("0.08"));
        ReflectionTestUtils.setField(bookingService, "depositRate", new BigDecimal("0.50"));
        ReflectionTestUtils.setField(bookingService, "loyaltyVndPerPoint", 10000);
    }

    @Test
    void buildInvoiceSummary_shouldCalculateExtraGuestSurchargeServicesAndVat8Percent() {
        Room room = Room.builder()
                .id(1)
                .roomNumber("SG-101")
                .capacity(2)
                .pricePerNight(new BigDecimal("1000000"))
                .extraGuestRatePercent(new BigDecimal("25.00"))
                .build();

        Guest guest = Guest.builder().id(10).fullName("Test Guest").build();
        Booking booking = Booking.builder()
                .id(5)
                .bookingCode("BK-TEST01")
                .room(room)
                .guest(guest)
                .checkIn(LocalDate.of(2026, 12, 10))
                .checkOut(LocalDate.of(2026, 12, 12)) // 2 nights = 2,000,000
                .pricingMode(PricingMode.night)
                .adults(3) // 1 extra guest -> +25% of 2,000,000 = 500,000
                .children(0)
                .build();

        BookingServiceItem item = BookingServiceItem.builder()
                .id(1)
                .service(HotelService.builder().id(1).serviceName("Nuoc suoi").build())
                .quantity(2)
                .price(new BigDecimal("50000")) // 100,000
                .build();

        Payment deposit = Payment.builder()
                .id(1)
                .amount(new BigDecimal("1250000"))
                .method("Deposit 50%")
                .build();

        when(bookingServiceItemRepository.findByBookingIdOrderByCreatedAtAsc(5)).thenReturn(List.of(item));
        when(paymentRepository.findByBookingIdOrderByPaidAtAsc(5)).thenReturn(List.of(deposit));

        InvoiceSummaryResponse invoice = bookingService.buildInvoiceSummary(booking);

        // Subtotal = 2,000,000 + 500,000 + 100,000 = 2,600,000; VAT 8% = 208,000; GrandTotal = 2,808,000
        assertThat(invoice.getRoomCharge()).isEqualByComparingTo("2000000");
        assertThat(invoice.getExtraGuestSurcharge()).isEqualByComparingTo("500000");
        assertThat(invoice.getServiceCharge()).isEqualByComparingTo("100000");
        assertThat(invoice.getVatAmount()).isEqualByComparingTo("208000");
        assertThat(invoice.getGrandTotal()).isEqualByComparingTo("2808000");
        assertThat(invoice.getRemainingBalance()).isEqualByComparingTo("1558000");
    }

    @Test
    void customerEditBooking_shouldRejectSecondEdit() {
        Guest guest = Guest.builder().id(10).build();
        Booking booking = Booking.builder()
                .id(5)
                .guest(guest)
                .status(BookingStatus.booked)
                .customerEditCount(1)
                .build();

        when(bookingRepository.findById(5)).thenReturn(Optional.of(booking));

        UserPrincipal principal = UserPrincipal.builder()
                .id(10)
                .userType("CUSTOMER")
                .role("ROLE_CUSTOMER")
                .active(true)
                .build();

        CustomerEditBookingRequest req = new CustomerEditBookingRequest(
                LocalDate.now().plusDays(5), LocalDate.now().plusDays(7), 2, 0, "Edit 2");

        assertThatThrownBy(() -> bookingService.customerEditBooking(5, req, principal))
                .isInstanceOf(BusinessException.class)
                .hasMessageContaining("only edit a booking once");
    }
}

package com.spotkihotel;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@Transactional
class BookingAndAuthIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void fullBookingCheckInCheckOutAndAuditFlow() throws Exception {
        // 1. Customer login
        MvcResult customerLogin = mockMvc.perform(post("/api/v1/auth/customer/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"guest@spotkihotel.vn\",\"password\":\"Customer@12345\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andReturn();
        String customerToken = extractToken(customerLogin);

        // 2. Admin login
        MvcResult adminLogin = mockMvc.perform(post("/api/v1/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"Admin@12345\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.role").value("ROLE_ADMIN"))
                .andReturn();
        String adminToken = extractToken(adminLogin);

        // 3. Create booking for Room 1 (2026-12-01 to 2026-12-03)
        MvcResult bookingRes = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roomId": 1,
                                  "checkIn": "2026-12-01",
                                  "checkOut": "2026-12-03",
                                  "adults": 2,
                                  "children": 0,
                                  "contactName": "Nguyen Van A",
                                  "contactPhone": "0901234567"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.status").value("booked"))
                .andExpect(jsonPath("$.data.depositAmount").value(1800000))
                .andReturn();

        JsonNode createdBooking = objectMapper.readTree(bookingRes.getResponse().getContentAsString()).path("data");
        int bookingId = createdBooking.path("id").asInt();
        String bookingCode = createdBooking.path("bookingCode").asText();

        // Lookup guest booking publicly by code & phone
        mockMvc.perform(get("/api/v1/bookings/lookup")
                        .param("bookingCode", bookingCode)
                        .param("phone", "0901234567"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.bookingCode").value(bookingCode));

        // Room catalog returns image URLs from V4 migration
        mockMvc.perform(get("/api/v1/rooms/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.imageUrl").isNotEmpty());

        // 4. Overlapping booking should return 409 Conflict
        mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + customerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roomId": 1,
                                  "checkIn": "2026-12-02",
                                  "checkOut": "2026-12-04",
                                  "adults": 1,
                                  "children": 0,
                                  "contactName": "Nguyen Van B",
                                  "contactPhone": "0909999999"
                                }
                                """))
                .andExpect(status().isConflict());

        // 5. Staff check-in, add room service, and record extra payment
        mockMvc.perform(post("/api/v1/admin/bookings/" + bookingId + "/check-in")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("checked_in"));

        mockMvc.perform(post("/api/v1/admin/bookings/" + bookingId + "/services")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"serviceId\":1,\"quantity\":2}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.lineTotal").value(30000));

        mockMvc.perform(post("/api/v1/admin/bookings/" + bookingId + "/payments")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"amount\":500000,\"method\":\"Tien mat\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.amount").value(500000));

        // 6. Staff check-out (calculates 8% VAT & awards loyalty points)
        // Room 2 nights (3,600,000) + Service (30,000) = 3,630,000 + 8% VAT (290,400) = 3,920,400
        mockMvc.perform(post("/api/v1/admin/bookings/" + bookingId + "/check-out")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.grandTotal").value(3920400))
                .andExpect(jsonPath("$.data.loyaltyPointsEarned").value(392))
                .andExpect(jsonPath("$.data.services.length()").value(1))
                .andExpect(jsonPath("$.data.payments.length()").value(2));
    }

    private String extractToken(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("accessToken").asText();
    }
}

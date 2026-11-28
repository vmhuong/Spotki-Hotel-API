package com.spotkihotel;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.testcontainers.containers.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers(disabledWithoutDocker = true)
@TestPropertySource(properties = {
        "app.token-store.redis=false",
        "spring.cache.type=simple",
        "app.jwt.secret=TestcontainersJwtSecretKeyForSpotkiHotelPostgres16MustBeLongEnough!"
})
class PostgresTestcontainersIntegrationTest {

    @Container
    @ServiceConnection
    static PostgreSQLContainer<?> postgres = new PostgreSQLContainer<>("postgres:16-alpine");

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void flywayJpaAndBookingWorkflowShouldWorkOnRealPostgres16() throws Exception {
        MvcResult adminLogin = mockMvc.perform(post("/api/v1/auth/admin/login")
                        .header("X-Forwarded-For", "198.51.100.10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"Admin@12345\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String adminToken = objectMapper.readTree(adminLogin.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();

        // Search rooms on real PostgreSQL 16
        mockMvc.perform(get("/api/v1/rooms?checkIn=2027-01-10&checkOut=2027-01-12"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content.length()").value(5));

        // Create booking on real PostgreSQL 16 (exercises PESSIMISTIC_WRITE lock & Flyway sequences)
        MvcResult bookingRes = mockMvc.perform(post("/api/v1/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roomId": 1,
                                  "checkIn": "2027-01-10",
                                  "checkOut": "2027-01-12",
                                  "adults": 2,
                                  "children": 0,
                                  "contactName": "Postgres Tester",
                                  "contactPhone": "0909111222"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.depositAmount").value(1800000))
                .andReturn();

        int bookingId = objectMapper.readTree(bookingRes.getResponse().getContentAsString())
                .path("data").path("id").asInt();

        mockMvc.perform(post("/api/v1/admin/bookings/" + bookingId + "/check-in")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());

        mockMvc.perform(post("/api/v1/admin/bookings/" + bookingId + "/check-out")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.grandTotal").value(3888000));

        // Verify Specification-based queries on real PostgreSQL 16 (no untyped NULL parameter errors)
        mockMvc.perform(get("/api/v1/admin/bookings")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/payments")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/reports/revenue")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/guests")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/staff")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
        mockMvc.perform(get("/api/v1/admin/audit-logs")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk());
    }
}

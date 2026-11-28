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
class AdminCrudAndGatewayIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void adminCrudReportsAndIdempotentPaymentGatewayFlow() throws Exception {
        MvcResult loginRes = mockMvc.perform(post("/api/v1/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"admin\",\"password\":\"Admin@12345\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String adminToken = objectMapper.readTree(loginRes.getResponse().getContentAsString())
                .path("data").path("accessToken").asText();

        // 1. Create hotel
        mockMvc.perform(post("/api/v1/admin/hotels")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "hotelName": "Spotki Phu Quoc",
                                  "starRating": 5,
                                  "address": "10 Tran Hung Dao",
                                  "city": "Phu Quoc"
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.hotelName").value("Spotki Phu Quoc"));

        // 2. Create staff
        mockMvc.perform(post("/api/v1/admin/staff")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "letan_dn",
                                  "password": "Reception@12345",
                                  "fullName": "Le Tan Da Nang",
                                  "role": "reception",
                                  "hotelId": 2
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.data.username").value("letan_dn"));

        // 3. Search guests & mark VIP
        mockMvc.perform(get("/api/v1/admin/guests?keyword=Nguyen")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.content[0].fullName").value("Nguyen Van A"));

        // 4. Create booking & test Payment Gateway + Idempotent Callback
        MvcResult bookingRes = mockMvc.perform(post("/api/v1/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roomId": 2,
                                  "checkIn": "2026-12-20",
                                  "checkOut": "2026-12-22",
                                  "adults": 2,
                                  "children": 0,
                                  "contactName": "Tran Van B",
                                  "contactPhone": "0912345678"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        int bookingId = objectMapper.readTree(bookingRes.getResponse().getContentAsString())
                .path("data").path("id").asInt();

        MvcResult initRes = mockMvc.perform(post("/api/v1/payments/gateway/initiate")
                        .header("Authorization", "Bearer " + adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"bookingId\":" + bookingId + ",\"amount\":1000000,\"provider\":\"VIETQR\"}"))
                .andExpect(status().isOk())
                .andReturn();

        JsonNode initData = objectMapper.readTree(initRes.getResponse().getContentAsString()).path("data");
        String appTransId = initData.path("appTransId").asText();
        String mac = initData.path("sampleHmacSignature").asText();

        String callbackPayload = """
                {
                  "provider": "VIETQR",
                  "appTransId": "%s",
                  "gatewayTransId": "GW-998877",
                  "amount": 1000000,
                  "mac": "%s"
                }
                """.formatted(appTransId, mac);

        // First callback -> processed
        mockMvc.perform(post("/api/v1/payments/gateway/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(callbackPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.status").value("paid"))
                .andExpect(jsonPath("$.data.idempotentReplay").value(false));

        // Second callback (replay) -> idempotentReplay = true
        mockMvc.perform(post("/api/v1/payments/gateway/callback")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(callbackPayload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.idempotentReplay").value(true));

        // 5. Revenue report
        mockMvc.perform(get("/api/v1/admin/reports/revenue")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.transactionCount").value(2));
    }
}

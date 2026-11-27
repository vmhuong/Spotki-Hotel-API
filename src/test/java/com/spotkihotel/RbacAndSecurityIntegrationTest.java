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
class RbacAndSecurityIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;

    @Test
    void rbacBranchScopeAndIdorProtectionShouldBeEnforced() throws Exception {
        // Login customer 1 (seeded guest@spotkihotel.vn)
        String customer1Token = loginCustomer("guest@spotkihotel.vn", "Customer@12345");

        // Register & login customer 2
        MvcResult reg2 = mockMvc.perform(post("/api/v1/auth/customer/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName": "Customer Two",
                                  "phone": "0988888888",
                                  "email": "cust2@spotkihotel.vn",
                                  "password": "Customer@12345"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        String customer2Token = extractToken(reg2);

        // Customer 1 creates a booking
        MvcResult bookingRes = mockMvc.perform(post("/api/v1/bookings")
                        .header("Authorization", "Bearer " + customer1Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "roomId": 1,
                                  "checkIn": "2026-12-15",
                                  "checkOut": "2026-12-17",
                                  "adults": 2,
                                  "children": 0,
                                  "contactName": "Nguyen Van A",
                                  "contactPhone": "0901234567"
                                }
                                """))
                .andExpect(status().isCreated())
                .andReturn();
        int bookingId = objectMapper.readTree(bookingRes.getResponse().getContentAsString())
                .path("data").path("id").asInt();

        // IDOR check: Customer 2 CANNOT view Customer 1's invoice
        mockMvc.perform(get("/api/v1/bookings/" + bookingId + "/invoice")
                        .header("Authorization", "Bearer " + customer2Token))
                .andExpect(status().isUnauthorized());

        // Customer 1 CAN view their own invoice & profile
        mockMvc.perform(get("/api/v1/bookings/" + bookingId + "/invoice")
                        .header("Authorization", "Bearer " + customer1Token))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/customers/me")
                        .header("Authorization", "Bearer " + customer1Token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.membershipTier").value("Silver"));

        // RBAC: Customer cannot access admin reports
        mockMvc.perform(get("/api/v1/admin/reports/summary")
                        .header("Authorization", "Bearer " + customer1Token))
                .andExpect(status().isForbidden());

        // RBAC: Housekeeping cannot access staff management
        String hkToken = loginAdmin("housekeeping_sg", "Housekeeping@12345");
        mockMvc.perform(get("/api/v1/admin/staff")
                        .header("Authorization", "Bearer " + hkToken))
                .andExpect(status().isForbidden());

        // Branch scope: Saigon manager (hotelId=1) cannot create room in Da Nang (hotelId=2)
        String managerSgToken = loginAdmin("manager_sg", "Manager@12345");
        mockMvc.perform(post("/api/v1/admin/rooms")
                        .header("Authorization", "Bearer " + managerSgToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "hotelId": 2,
                                  "roomNumber": "DN-999",
                                  "roomType": "Suite",
                                  "pricePerNight": 2000000,
                                  "hourlyRate": 500000
                                }
                                """))
                .andExpect(status().isUnauthorized());

        // Housekeeping branch isolation: Saigon housekeeping (hotelId=1) cannot update room 3 (Da Nang, hotelId=2)
        mockMvc.perform(patch("/api/v1/admin/housekeeping/rooms/3")
                        .header("Authorization", "Bearer " + hkToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"housekeepingStatus\":\"cleaning\"}"))
                .andExpect(status().isUnauthorized());

        // Refresh Token rotation & Logout blacklist
        MvcResult loginRes = mockMvc.perform(post("/api/v1/auth/customer/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"guest@spotkihotel.vn\",\"password\":\"Customer@12345\"}"))
                .andExpect(status().isOk())
                .andReturn();
        JsonNode authData = objectMapper.readTree(loginRes.getResponse().getContentAsString()).path("data");
        String accessToken = authData.path("accessToken").asText();
        String refreshToken = authData.path("refreshToken").asText();

        // Refresh rotates token
        MvcResult refreshRes = mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.accessToken").isNotEmpty())
                .andReturn();
        String newAccessToken = extractToken(refreshRes);

        // Old refresh token cannot be reused after rotation
        mockMvc.perform(post("/api/v1/auth/refresh")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"refreshToken\":\"" + refreshToken + "\"}"))
                .andExpect(status().isUnauthorized());

        // Logout blacklists access token
        mockMvc.perform(post("/api/v1/auth/logout")
                        .header("Authorization", "Bearer " + newAccessToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/api/v1/customers/me")
                        .header("Authorization", "Bearer " + newAccessToken))
                .andExpect(status().isForbidden());

        // Original access token still works until logged out
        mockMvc.perform(get("/api/v1/customers/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk());
    }

    private String loginCustomer(String email, String password) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/v1/auth/customer/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"" + email + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return extractToken(res);
    }

    private String loginAdmin(String username, String password) throws Exception {
        MvcResult res = mockMvc.perform(post("/api/v1/auth/admin/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"username\":\"" + username + "\",\"password\":\"" + password + "\"}"))
                .andExpect(status().isOk())
                .andReturn();
        return extractToken(res);
    }

    private String extractToken(MvcResult result) throws Exception {
        JsonNode root = objectMapper.readTree(result.getResponse().getContentAsString());
        return root.path("data").path("accessToken").asText();
    }
}

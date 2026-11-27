package com.spotkihotel.config;

import com.spotkihotel.entity.AdminUser;
import com.spotkihotel.entity.Guest;
import com.spotkihotel.entity.enums.StaffRole;
import com.spotkihotel.repository.AdminUserRepository;
import com.spotkihotel.repository.GuestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class DataSeeder implements CommandLineRunner {

    private final AdminUserRepository adminUserRepository;
    private final GuestRepository guestRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) {
        if (adminUserRepository.count() == 0) {
            adminUserRepository.save(AdminUser.builder()
                    .username("admin")
                    .passwordHash(passwordEncoder.encode("Admin@12345"))
                    .fullName("Vu Manh Huong")
                    .email("vmhuong05@gmail.com")
                    .role(StaffRole.admin)
                    .hotelId(0)
                    .isActive(true)
                    .build());

            adminUserRepository.save(AdminUser.builder()
                    .username("manager_sg")
                    .passwordHash(passwordEncoder.encode("Manager@12345"))
                    .fullName("Saigon Branch Manager")
                    .email("manager.sg@spotkihotel.vn")
                    .role(StaffRole.manager)
                    .hotelId(1)
                    .isActive(true)
                    .build());

            adminUserRepository.save(AdminUser.builder()
                    .username("reception_sg")
                    .passwordHash(passwordEncoder.encode("Reception@12345"))
                    .fullName("Saigon Receptionist")
                    .email("reception.sg@spotkihotel.vn")
                    .role(StaffRole.reception)
                    .hotelId(1)
                    .isActive(true)
                    .build());

            adminUserRepository.save(AdminUser.builder()
                    .username("accounting_sg")
                    .passwordHash(passwordEncoder.encode("Accounting@12345"))
                    .fullName("Saigon Accountant")
                    .email("accounting.sg@spotkihotel.vn")
                    .role(StaffRole.accounting)
                    .hotelId(1)
                    .isActive(true)
                    .build());

            adminUserRepository.save(AdminUser.builder()
                    .username("housekeeping_sg")
                    .passwordHash(passwordEncoder.encode("Housekeeping@12345"))
                    .fullName("Saigon Housekeeping")
                    .email("hk.sg@spotkihotel.vn")
                    .role(StaffRole.housekeeping)
                    .hotelId(1)
                    .isActive(true)
                    .build());
        }

        if (guestRepository.count() == 0) {
            guestRepository.save(Guest.builder()
                    .fullName("Nguyen Van A")
                    .phone("0901234567")
                    .email("guest@spotkihotel.vn")
                    .passwordHash(passwordEncoder.encode("Customer@12345"))
                    .customerIsActive(true)
                    .loyaltyPoints(120)
                    .isVip(false)
                    .build());
        }
    }
}

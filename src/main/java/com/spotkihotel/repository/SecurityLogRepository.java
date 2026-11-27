package com.spotkihotel.repository;

import com.spotkihotel.entity.SecurityLog;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SecurityLogRepository extends JpaRepository<SecurityLog, Integer> {
}

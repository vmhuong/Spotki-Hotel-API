package com.spotkihotel.repository;

import com.spotkihotel.entity.SecurityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

public interface SecurityLogRepository extends JpaRepository<SecurityLog, Integer>, JpaSpecificationExecutor<SecurityLog> {
}

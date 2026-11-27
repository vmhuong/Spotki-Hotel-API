package com.spotkihotel.service;

import com.spotkihotel.entity.SecurityLog;
import com.spotkihotel.entity.enums.ActorType;
import com.spotkihotel.repository.SecurityLogRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class SecurityLogService {

    private final SecurityLogRepository securityLogRepository;

    @Transactional
    public void log(ActorType actorType, Integer actorId, String action, String status, String message) {
        securityLogRepository.save(SecurityLog.builder()
                .actorType(actorType != null ? actorType : ActorType.guest)
                .actorId(actorId)
                .action(action)
                .status(status)
                .message(message)
                .build());
    }
}

package com.spotkihotel.service;

import com.spotkihotel.dto.service.ServiceDtos.UpsertServiceRequest;
import com.spotkihotel.entity.HotelService;
import com.spotkihotel.exception.ResourceNotFoundException;
import com.spotkihotel.repository.HotelServiceRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.cache.annotation.CacheEvict;
import org.springframework.cache.annotation.Cacheable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ServiceCatalogService {

    private final HotelServiceRepository hotelServiceRepository;

    @Cacheable("services")
    @Transactional(readOnly = true)
    public List<HotelService> getActiveServices() {
        return hotelServiceRepository.findByIsActiveTrueOrderByServiceNameAsc();
    }

    @Transactional(readOnly = true)
    public List<HotelService> getAllServicesForAdmin() {
        return hotelServiceRepository.findAllByOrderByServiceNameAsc();
    }

    @CacheEvict(value = "services", allEntries = true)
    @Transactional
    public HotelService createService(UpsertServiceRequest request) {
        return hotelServiceRepository.save(HotelService.builder()
                .serviceName(request.getServiceName().trim())
                .unit(request.getUnit().trim())
                .price(request.getPrice())
                .isActive(true)
                .build());
    }

    @CacheEvict(value = "services", allEntries = true)
    @Transactional
    public HotelService updateService(Integer id, UpsertServiceRequest request) {
        HotelService service = hotelServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + id));
        service.setServiceName(request.getServiceName().trim());
        service.setUnit(request.getUnit().trim());
        service.setPrice(request.getPrice());
        return hotelServiceRepository.save(service);
    }

    @CacheEvict(value = "services", allEntries = true)
    @Transactional
    public HotelService toggleStatus(Integer id, boolean active) {
        HotelService service = hotelServiceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Service not found: " + id));
        service.setIsActive(active);
        return hotelServiceRepository.save(service);
    }
}

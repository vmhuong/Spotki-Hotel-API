INSERT INTO hotels (hotel_name, brand_name, star_rating, address, city, phone, email, description, is_active) VALUES
('Spotki Hotel Saigon', 'Spotki Hotels', 5, '128 Nguyen Hue, District 1', 'Ho Chi Minh City', '028-3822-9999', 'saigon@spotkihotel.vn', 'Luxury flagship hotel in the heart of District 1', TRUE),
('Spotki Hotel Da Nang', 'Spotki Hotels', 5, '88 Vo Nguyen Giap, Son Tra', 'Da Nang', '0236-399-8888', 'danang@spotkihotel.vn', 'Beachfront resort and business hotel in Da Nang', TRUE),
('Spotki Hotel Hanoi', 'Spotki Hotels', 5, '25 Ly Thuong Kiet, Hoan Kiem', 'Hanoi', '024-3939-7777', 'hanoi@spotkihotel.vn', 'Boutique heritage luxury hotel near Hoan Kiem Lake', TRUE);

INSERT INTO rooms (id_hotel, room_number, room_type, floor_no, capacity, room_size, bed_type, price_per_night, hourly_rate, extra_guest_rate_percent, amenities, package_name, status, is_active) VALUES
(1, 'SG-101', 'Deluxe King', 1, 2, '35m2', '1 King Bed', 1800000.00, 450000.00, 25.00, 'WiFi, Air Conditioning, Mini Bar, Smart TV, City View', 'Breakfast Included', 'available', TRUE),
(1, 'SG-201', 'Executive Suite', 2, 3, '55m2', '1 King Bed + Sofa Bed', 3200000.00, 750000.00, 25.00, 'WiFi, Bathtub, Lounge Access, Mini Bar, Balcony', 'VIP Lounge & Spa', 'available', TRUE),
(2, 'DN-101', 'Ocean View Deluxe', 1, 2, '40m2', '1 King Bed', 2200000.00, 550000.00, 25.00, 'WiFi, Ocean Balcony, Mini Bar, Bathtub', 'Beachfront Breakfast', 'available', TRUE),
(2, 'DN-301', 'Family Suite', 3, 4, '70m2', '2 Queen Beds', 4100000.00, 950000.00, 20.00, 'WiFi, Kitchenette, Ocean View, Kids Corner', 'Family Fun Package', 'available', TRUE),
(3, 'HN-101', 'Heritage Deluxe', 1, 2, '32m2', '1 Queen Bed', 1650000.00, 400000.00, 25.00, 'WiFi, Air Conditioning, Tea Set, Smart TV', 'Old Quarter Tour', 'available', TRUE);

INSERT INTO services (service_name, unit, price, is_active) VALUES
('Nuoc suoi', 'chai', 15000.00, TRUE),
('Nuoc ngot', 'lon', 25000.00, TRUE),
('Bia', 'lon', 35000.00, TRUE),
('Mi ly', 'ly', 30000.00, TRUE),
('Giat ui nhanh', 'lan', 80000.00, TRUE);

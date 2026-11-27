# Spotki Hotel Management API (Spring Boot 3)

RESTful Backend API for multi-branch hotel management, room availability search, booking & 50% deposit workflow, check-in/check-out with 8% VAT invoicing, loyalty points, housekeeping operations, and role-based access control (RBAC).

## Tech Stack

- **Language & Framework**: Java 21, Spring Boot 3.3.5
- **Data & Caching**: Spring Data JPA, Hibernate, PostgreSQL 16, Flyway, Redis Cache, H2 (for isolated integration tests)
- **Security**: Spring Security 6, Stateless JWT (`jjwt`), BCrypt password hashing, method-level RBAC (`@PreAuthorize`), IDOR & branch-scope protection
- **API Documentation**: SpringDoc OpenAPI 3 / Swagger UI
- **Testing & CI**: JUnit 5, Mockito, Spring Boot Test, MockMvc, GitHub Actions CI
- **Containerization**: Docker, Docker Compose (PostgreSQL 16 + Redis 7 + Spring Boot API)

## Architecture Highlights

```text
src/main/java/com/spotkihotel/
├── config/          # SecurityConfig, OpenApiConfig, DataSeeder
├── controller/      # REST controllers (/api/v1/...)
├── dto/             # Request/Response DTOs with Jakarta Bean Validation
├── entity/          # JPA entities & domain enums
├── exception/       # GlobalExceptionHandler (@RestControllerAdvice)
├── repository/      # Spring Data JPA repositories & JPQL queries
├── security/        # JwtService, JwtAuthenticationFilter, UserPrincipal
└── service/         # Transactional business logic & security logging
```

## Key Features

- **Dual Authentication & RBAC**: Separate JWT login flows for customers (`ROLE_CUSTOMER`) and staff (`ROLE_ADMIN`, `ROLE_MANAGER`, `ROLE_RECEPTION`, `ROLE_ACCOUNTING`, `ROLE_HOUSEKEEPING`) with branch-level (`hotelId`) isolation for non-admin staff.
- **Room Search & Overlap Prevention**: Date-range availability filtering excluding rooms with active `booked` or `checked_in` reservations; conflict detection (`409 Conflict`) on booking creation and edits.
- **Booking & Invoicing Lifecycle**:
  - Automatic 50% deposit calculation and payment recording on booking creation.
  - Extra guest surcharge calculation based on room capacity.
  - Customer self-service booking modification (limited to 1 edit while `booked`).
  - Check-in -> Room service charges -> Check-out with 8% VAT invoice calculation, loyalty point awarding, and automatic housekeeping queue trigger.
- **Concurrency & Performance**: `PESSIMISTIC_WRITE` row locking on room booking to prevent double-booking race conditions, `@EntityGraph` to avoid N+1 queries, and Redis caching for hotel/service catalogs.
- **Admin Operations & Reporting**: Full CRUD for hotels, rooms, staff, guests (VIP), and services; date-range revenue reports, top booked rooms, and paginated payment history.
- **Scheduled Maintenance & Payment Webhook**: `@Scheduled` job to auto-cancel overdue bookings, plus sandbox payment gateway initiation and idempotent HMAC-SHA256 webhook callback.

## Getting Started

### Option 1: Run with Docker Compose (Recommended)

```bash
docker compose up --build
```

- API Base URL (Docker): `http://localhost:8088` (configurable via `API_PORT`)
- Swagger UI (Docker): `http://localhost:8088/swagger-ui.html`

### Option 2: Run Locally with Maven Wrapper

1. Ensure PostgreSQL 16 is running on `localhost:5432` (configured via `.env.example` or environment variables).
2. Run tests (uses in-memory H2 in PostgreSQL mode, no external DB required):

```bash
./mvnw test
```

3. Start the application:

```bash
./mvnw spring-boot:run
```

## Sample Accounts (Seeded Automatically)

| Role | Endpoint | Username / Email | Password |
| --- | --- | --- | --- |
| Admin | `POST /api/v1/auth/admin/login` | `admin` | `Admin@12345` |
| Manager (Saigon) | `POST /api/v1/auth/admin/login` | `manager_sg` | `Manager@12345` |
| Reception (Saigon) | `POST /api/v1/auth/admin/login` | `reception_sg` | `Reception@12345` |
| Accounting (Saigon) | `POST /api/v1/auth/admin/login` | `accounting_sg` | `Accounting@12345` |
| Housekeeping (Saigon) | `POST /api/v1/auth/admin/login` | `housekeeping_sg` | `Housekeeping@12345` |
| Customer | `POST /api/v1/auth/customer/login` | `guest@spotkihotel.vn` | `Customer@12345` |

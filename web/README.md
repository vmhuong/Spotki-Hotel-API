# Spotki-Hotel-Web

Enterprise React + TypeScript + Vite + Tailwind CSS v4 frontend for [Spotki-Hotel-API](https://github.com/vmhuong/Spotki-Hotel-API).

## Features
- **Public & Guest Booking**: Search rooms by branch, real check-in/check-out overlap dates, capacity, max price, Grid/List views, image Lightbox, itemized surcharge breakdown, and VietQR Sandbox HMAC-SHA256 gateway simulation.
- **Customer Portal**: Loyalty tier progression (`Bronze -> Silver -> Gold -> Platinum`), booking journey stepper, 1-time date modification, print-ready VAT 8% invoices (`window.print()`), and verified guest reviews.
- **Staff & Admin Portal**: Collapsible sidebar shell with strict RBAC (`ADMIN`, `MANAGER`, `RECEPTION`, `ACCOUNTING`, `HOUSEKEEPING`), Room Status Donut & Top Rooms charts, Front Desk Floor Matrix, Housekeeping queue, full Edit modals for Hotels/Rooms/Services/Staff, Security Audit Log filters, and pagination.

## Local Development
```bash
npm install
npm run dev
```

Open `http://localhost:5173`. Ensure `Spotki-Hotel-API` is running at `http://localhost:8088` (configure `VITE_API_BASE_URL` in `.env` if needed).

## Production Build & Docker
```bash
npm run build
docker build --build-arg VITE_API_BASE_URL=http://localhost:8088 -t spotki-hotel-web .
docker run -p 3000:80 spotki-hotel-web
```

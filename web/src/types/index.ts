export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data: T;
  timestamp?: string;
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  number: number;
  size: number;
}

export type StaffRole = 'admin' | 'manager' | 'reception' | 'accounting' | 'housekeeping';
export type RoomStatus = 'available' | 'occupied' | 'cleaning' | 'maintenance';
export type HousekeepingStatus = 'pending' | 'cleaning';
export type BookingStatus = 'booked' | 'checked_in' | 'checked_out' | 'cancelled';
export type PricingMode = 'night' | 'hour';
export type ReviewStatus = 'visible' | 'hidden';

export interface AuthUser {
  userId: number;
  username: string;
  fullName: string;
  role: string;
  hotelId?: number | null;
}

export interface AuthResponse extends AuthUser {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  expiresInMs: number;
}

export interface Hotel {
  id: number;
  hotelName: string;
  brandName: string;
  starRating: number;
  address: string;
  city: string;
  phone?: string;
  email?: string;
  heroImage?: string;
  description?: string;
  isActive: boolean;
}

export interface Room {
  id: number;
  hotelId: number;
  hotelName: string;
  roomNumber: string;
  roomType: string;
  floorNo: number;
  capacity: number;
  roomSize?: string;
  bedType?: string;
  pricePerNight: number;
  hourlyRate: number;
  extraGuestRatePercent: number;
  amenities?: string;
  packageName?: string;
  imageUrl?: string;
  galleryUrls?: string;
  status: RoomStatus;
  housekeepingStatus?: HousekeepingStatus | null;
}

export interface HotelServiceItem {
  id: number;
  serviceName: string;
  unit: string;
  price: number;
  isActive: boolean;
}

export interface Booking {
  id: number;
  bookingCode: string;
  roomId: number;
  roomNumber: string;
  roomType: string;
  hotelId: number;
  hotelName: string;
  guestId: number;
  guestName: string;
  checkIn: string;
  checkOut: string;
  pricingMode: PricingMode;
  adults: number;
  children: number;
  status: BookingStatus;
  estimatedRoomTotal: number;
  depositAmount: number;
  totalPaid: number;
  customerEditCount: number;
  createdAt: string;
}

export interface BookingServiceItemResponse {
  id: number;
  bookingId: number;
  serviceId: number;
  serviceName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  createdAt: string;
}

export interface PaymentResponse {
  id: number;
  bookingId: number;
  bookingCode: string;
  amount: number;
  method: string;
  paidAt: string;
  payerName?: string;
  cashierName?: string;
  note?: string;
}

export interface InvoiceSummary {
  bookingId: number;
  bookingCode: string;
  roomCharge: number;
  extraGuestSurcharge: number;
  serviceCharge: number;
  subtotal: number;
  vatAmount: number;
  grandTotal: number;
  totalPaid: number;
  remainingBalance: number;
  loyaltyPointsEarned: number;
  services?: BookingServiceItemResponse[];
  payments?: PaymentResponse[];
}

export interface Review {
  id: number;
  bookingId: number;
  roomId: number;
  guestName: string;
  roomRating: number;
  serviceRating: number;
  comment?: string;
  status: ReviewStatus;
  createdAt: string;
}

export interface CustomerProfile {
  id: number;
  fullName: string;
  phone: string;
  email: string;
  identityNo?: string;
  address?: string;
  isVip: boolean;
  loyaltyPoints: number;
  membershipTier: string;
  createdAt: string;
}

export interface StaffUser {
  id: number;
  username: string;
  fullName: string;
  email?: string;
  role: StaffRole;
  hotelId?: number | null;
  isActive: boolean;
  createdAt: string;
}

export interface Guest {
  id: number;
  fullName: string;
  phone: string;
  email?: string;
  identityNo?: string;
  address?: string;
  isVip: boolean;
  loyaltyPoints: number;
  customerIsActive: boolean;
  createdAt: string;
}

export interface PaymentRecord extends PaymentResponse {
  hotelId?: number;
}

export interface ReportSummary {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  cleaningRooms: number;
  totalBookings: number;
  activeBookedCount: number;
  checkedInCount: number;
  checkedOutCount: number;
  totalRevenue: number;
}

export interface RevenueReport {
  from?: string;
  to?: string;
  hotelId?: number | null;
  totalRevenue: number;
  transactionCount: number;
}

export interface TopRoomReport {
  roomId: number;
  roomNumber: string;
  roomType: string;
  hotelName: string;
  bookingCount: number;
}

export interface SecurityLog {
  id: number;
  actorType: string;
  actorId?: number;
  action: string;
  status: string;
  message?: string;
  createdAt: string;
}

export interface GatewayInitResponse {
  provider: string;
  appTransId: string;
  amount: number;
  status: string;
  orderUrl: string;
  sampleHmacSignature: string;
}

export interface GatewayCallbackResponse {
  appTransId: string;
  status: string;
  idempotentReplay: boolean;
  paymentId: number;
  paidAt: string;
}

import React, { useState } from 'react';
import { api, getErrorMessage } from '../api/client';
import type { ApiResponse, Booking } from '../types';
import { BOOKING_STATUS_BADGE, formatVnd } from '../utils/format';

export const LookupBookingPage: React.FC = () => {
  const [bookingCode, setBookingCode] = useState('');
  const [phone, setPhone] = useState('');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setBooking(null);
    try {
      const res = await api.get<ApiResponse<Booking>>('/bookings/lookup', {
        params: { bookingCode: bookingCode.trim(), phone: phone.trim() },
      });
      setBooking(res.data.data);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const badge = booking ? BOOKING_STATUS_BADGE[booking.status] : null;

  return (
    <div className="max-w-xl mx-auto px-4 py-16">
      <div className="card-editorial rounded-2xl p-7 sm:p-9 space-y-6 shadow-sm">
        <div className="border-b border-[#E6E0D6] pb-5">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A63429]">Tra cứu trực tuyến</p>
          <h1 className="font-display text-3xl font-semibold text-[#181615] mt-1.5">Tra cứu đơn đặt phòng</h1>
          <p className="text-sm text-[#5E5852] mt-1.5">
            Nhập mã đặt phòng và số điện thoại đã dùng khi tạo đơn để kiểm tra trạng thái lưu trú.
          </p>
        </div>

        <form onSubmit={handleLookup} className="space-y-4 text-sm">
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C] mb-1.5">
              Mã đặt phòng
            </label>
            <input
              type="text"
              required
              placeholder="VD: BK-A1B2C3D4"
              value={bookingCode}
              onChange={(e) => setBookingCode(e.target.value)}
              className="w-full h-11 rounded-lg border border-[#D9D1C5] px-3.5 font-mono-num focus:outline-none focus:border-[#181615]"
            />
          </div>
          <div>
            <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C] mb-1.5">
              Số điện thoại
            </label>
            <input
              type="text"
              required
              placeholder="0901234567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full h-11 rounded-lg border border-[#D9D1C5] px-3.5 font-mono-num focus:outline-none focus:border-[#181615]"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full h-11 rounded-lg text-xs uppercase tracking-[0.14em] cursor-pointer disabled:opacity-60"
          >
            {loading ? 'Đang tra cứu...' : 'Tra cứu đơn'}
          </button>
        </form>

        {error && (
          <div className="p-4 rounded-xl bg-[#FBEFEE] border border-[#F0CFCB] text-[#A63429] text-xs font-semibold">
            {error}
          </div>
        )}

        {booking && (
          <div className="border border-[#E6E0D6] rounded-xl p-5 bg-[#F7F4EF] space-y-3 text-sm tabular-nums">
            <div className="flex items-center justify-between pb-3 border-b border-[#E6E0D6]">
              <span className="font-mono-num font-bold text-[#181615] text-base">{booking.bookingCode}</span>
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${
                  badge?.className || ''
                }`}
              >
                {badge && <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />}
                {badge?.label || booking.status}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#5E5852]">Chi nhánh / Phòng</span>
              <span className="font-semibold text-[#181615] text-right">
                {booking.hotelName} · P.{booking.roomNumber} ({booking.roomType})
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#5E5852]">Thời gian lưu trú</span>
              <span className="font-mono-num font-medium text-[#181615]">
                {booking.checkIn} → {booking.checkOut}
              </span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-[#5E5852]">Khách hàng</span>
              <span className="font-medium text-[#181615]">{booking.guestName}</span>
            </div>
            <div className="flex justify-between gap-2 pt-3 border-t border-[#E6E0D6]">
              <span className="text-[#5E5852]">Đã thanh toán / Dự kiến</span>
              <span className="font-mono-num font-bold text-emerald-700">
                {formatVnd(booking.totalPaid)}{' '}
                <span className="text-[#8B847C] font-normal">/ {formatVnd(booking.estimatedRoomTotal)}</span>
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

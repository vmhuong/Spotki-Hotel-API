import React, { useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import type {
  ApiResponse,
  Booking,
  Guest,
  Hotel,
  HotelServiceItem,
  PageResponse,
  Room,
} from '../../types';
import { FALLBACK_ROOM_IMG, formatVnd } from '../../utils/format';
import { AdminHeaderBar } from './AdminHeaderBar';
import { PaymentBillModal } from './PaymentBillModal';

export const LiveRoomsTab: React.FC<{ role: string }> = ({ role }) => {
  const toast = useToast();
  const isHousekeeping = role === 'ROLE_HOUSEKEEPING';

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [services, setServices] = useState<HotelServiceItem[]>([]);
  const [selectedHotelId, setSelectedHotelId] = useState<string>('');
  const [keyword, setKeyword] = useState('');
  const [loading, setLoading] = useState(true);

  const [guestModal, setGuestModal] = useState<{ booking: Booking; guest?: Guest } | null>(null);
  const [paymentBookingId, setPaymentBookingId] = useState<number | null>(null);

  const loadLiveRooms = async () => {
    try {
      const [bRes, rRes, hRes, sRes, gRes] = await Promise.all([
        api.get<ApiResponse<PageResponse<Booking>>>('/admin/bookings?status=checked_in&size=100'),
        api.get<ApiResponse<PageResponse<Room>>>('/rooms?size=100'),
        api.get<ApiResponse<Hotel[]>>('/hotels'),
        api.get<ApiResponse<HotelServiceItem[]>>('/services'),
        isHousekeeping
          ? Promise.resolve(null)
          : api.get<ApiResponse<PageResponse<Guest>>>('/admin/guests?size=200').catch(() => null),
      ]);

      setBookings(bRes.data.data.content || []);
      setRooms(rRes.data.data.content || []);
      setHotels(hRes.data.data || []);
      setServices(sRes.data.data || []);
      if (gRes?.data?.data?.content) {
        setGuests(gRes.data.data.content);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLiveRooms();
    const intervalId = window.setInterval(loadLiveRooms, 30000);
    return () => window.clearInterval(intervalId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const roomById = useMemo(() => {
    const map = new Map<number, Room>();
    rooms.forEach((r) => map.set(r.id, r));
    return map;
  }, [rooms]);

  const guestById = useMemo(() => {
    const map = new Map<number, Guest>();
    guests.forEach((g) => map.set(g.id, g));
    return map;
  }, [guests]);

  const filteredBookings = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return bookings.filter((b) => {
      if (selectedHotelId && String(b.hotelId) !== selectedHotelId) return false;
      if (!q) return true;
      return (
        b.roomNumber.toLowerCase().includes(q) ||
        b.guestName.toLowerCase().includes(q) ||
        b.bookingCode.toLowerCase().includes(q)
      );
    });
  }, [bookings, selectedHotelId, keyword]);

  return (
    <div className="space-y-5 tabular-nums">
      <AdminHeaderBar>
        <select
          value={selectedHotelId}
          onChange={(e) => setSelectedHotelId(e.target.value)}
          className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs font-semibold bg-white text-[#181615] focus:outline-none focus:border-[#181615]"
        >
          <option value="">Tất cả cơ sở ({hotels.length})</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.hotelName}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Lọc số phòng, tên khách, mã BK-..."
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          className="h-9 rounded-lg border border-[#D9D1C5] bg-white px-3 text-xs w-52 focus:outline-none focus:border-[#181615]"
        />

        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EDF5F0] border border-[#CBE3D5] text-[#1E5F3E] text-[11px] font-semibold">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
          30s
        </span>
        <button
          type="button"
          onClick={loadLiveRooms}
          className="px-3.5 h-9 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold text-[#181615] cursor-pointer"
        >
          Làm mới
        </button>
      </AdminHeaderBar>

      {/* Live Occupied Rooms Grid */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-60 rounded-xl bg-[#E9E3D9] animate-pulse" />
          ))}
        </div>
      ) : filteredBookings.length === 0 ? (
        <div className="card-editorial rounded-xl p-12 text-center text-sm text-[#8B847C]">
          Hiện chưa có phòng nào đang check-in hoặc khớp bộ lọc.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredBookings.map((b) => {
            const room = roomById.get(b.roomId);
            const guest = guestById.get(b.guestId);
            const paidPct =
              b.estimatedRoomTotal > 0 ? Math.min(100, Math.round((b.totalPaid / b.estimatedRoomTotal) * 100)) : 100;

            return (
              <article
                key={b.id}
                className="card-editorial rounded-xl overflow-hidden flex flex-col hover:shadow-md transition-shadow"
              >
                <div className="relative h-32 bg-[#EFECE6]">
                  <img
                    src={room?.imageUrl || FALLBACK_ROOM_IMG}
                    alt={b.roomType}
                    className="w-full h-full object-cover"
                  />
                  <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded bg-[#141312]/80 text-white text-[10px] font-mono-num font-semibold">
                    {b.bookingCode}
                  </span>
                  <span className="absolute top-2.5 right-2.5 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#FBEFEE] border border-[#F0CFCB] text-[#9E2E23] text-[10px] font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#A63429]" />
                    Đang ở
                  </span>
                </div>

                <div className="p-3.5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5 text-[11px]">
                    <div className="pb-1.5 border-b border-[#F1ECE3]">
                      <div className="text-[10px] text-[#8B847C] truncate">
                        {b.hotelName} · {b.roomType}
                      </div>
                      <h3 className="font-display text-base font-semibold text-[#181615] leading-tight mt-0.5">
                        Phòng <span className="font-mono-num">{b.roomNumber}</span>
                      </h3>
                    </div>
                    <div className="flex justify-between gap-2 py-1 border-b border-[#F1ECE3]">
                      <span className="text-[#8B847C] shrink-0">Khách</span>
                      <strong className="text-[#181615] truncate">{b.guestName}</strong>
                    </div>
                    <div className="flex justify-between gap-2 py-1 border-b border-[#F1ECE3]">
                      <span className="text-[#8B847C] shrink-0">Lưu trú</span>
                      <span className="font-mono-num font-medium text-[#181615]">
                        {b.checkIn} → {b.checkOut}
                      </span>
                    </div>
                    {!isHousekeeping && (
                      <div className="pt-0.5">
                        <div className="flex justify-between mb-1">
                          <span className="text-[#8B847C]">Đã thu</span>
                          <span className="font-mono-num font-bold text-emerald-700">
                            {formatVnd(b.totalPaid)}{' '}
                            <span className="text-[#8B847C] font-normal">/ {formatVnd(b.estimatedRoomTotal)}</span>
                          </span>
                        </div>
                        <div className="h-1 rounded-full bg-[#EFECE6] overflow-hidden">
                          <div className="h-full bg-emerald-700 rounded-full" style={{ width: `${paidPct}%` }} />
                        </div>
                      </div>
                    )}
                  </div>

                  {!isHousekeeping ? (
                    <div className="pt-2.5 border-t border-[#E6E0D6] grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setGuestModal({ booking: b, guest })}
                        className="py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-[11px] font-semibold text-[#181615] cursor-pointer"
                      >
                        Thông tin khách
                      </button>
                      <button
                        type="button"
                        onClick={() => setPaymentBookingId(b.id)}
                        className="btn-primary py-1.5 rounded-lg text-[11px] cursor-pointer"
                      >
                        Thanh toán
                      </button>
                    </div>
                  ) : (
                    <div className="text-[11px] text-[#8B847C] pt-2 border-t border-[#E6E0D6]">
                      Chỉ xem phòng đang hoạt động
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}

      {/* Guest Info Modal */}
      {guestModal && (
        <div
          className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setGuestModal(null)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full border border-[#E6E0D6] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E6E0D6] bg-[#F7F4EF] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B8925A]">
                  Guest Profile
                </div>
                <h3 className="font-display text-lg font-semibold text-[#181615]">Thông tin khách hàng</h3>
              </div>
              <button
                type="button"
                onClick={() => setGuestModal(null)}
                className="px-3 py-1 rounded-lg border border-[#D9D1C5] bg-white text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
            <div className="p-6 space-y-3 text-sm tabular-nums">
              <div className="flex justify-between py-1.5 border-b border-[#F1ECE3]">
                <span className="text-[#8B847C]">Mã khách</span>
                <strong className="font-mono-num text-[#181615]">
                  KH{String(guestModal.booking.guestId).padStart(5, '0')}
                </strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1ECE3]">
                <span className="text-[#8B847C]">Họ và tên</span>
                <strong className="text-[#181615]">{guestModal.guest?.fullName || guestModal.booking.guestName}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1ECE3]">
                <span className="text-[#8B847C]">Điện thoại</span>
                <strong className="font-mono-num text-[#181615]">{guestModal.guest?.phone || '—'}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1ECE3]">
                <span className="text-[#8B847C]">Email</span>
                <strong className="text-[#181615]">{guestModal.guest?.email || '—'}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1ECE3]">
                <span className="text-[#8B847C]">CCCD / Hộ chiếu</span>
                <strong className="font-mono-num text-[#181615]">{guestModal.guest?.identityNo || '—'}</strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1ECE3]">
                <span className="text-[#8B847C]">Địa chỉ</span>
                <strong className="text-[#181615] text-right max-w-[220px]">
                  {guestModal.guest?.address || '—'}
                </strong>
              </div>
              <div className="flex justify-between py-1.5 border-b border-[#F1ECE3]">
                <span className="text-[#8B847C]">Hạng thành viên</span>
                <strong className="text-[#946421]">
                  {guestModal.guest?.membershipTier || (guestModal.guest?.isVip ? 'VIP' : 'Thành viên')}
                </strong>
              </div>
              <div className="flex justify-between py-1.5">
                <span className="text-[#8B847C]">Điểm tích lũy</span>
                <strong className="font-mono-num text-[#181615]">
                  {guestModal.guest?.loyaltyPoints ?? 0} điểm
                </strong>
              </div>
            </div>
          </div>
        </div>
      )}

      <PaymentBillModal
        bookingId={paymentBookingId}
        services={services}
        onClose={() => setPaymentBookingId(null)}
        onChanged={loadLiveRooms}
      />
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import type {
  ApiResponse,
  Booking,
  Guest,
  Hotel,
  HotelServiceItem,
  InvoiceSummary,
  PageResponse,
  Room,
} from '../../types';
import { FALLBACK_ROOM_IMG, formatVnd } from '../../utils/format';
import { InvoiceModal } from '../InvoiceModal';

const VND_PER_POINT = 1000;

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
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);

  // Unified Payment & Checkout Modal State
  const [checkoutModal, setCheckoutModal] = useState<{ booking: Booking; guest?: Guest } | null>(null);
  const [checkoutInvoice, setCheckoutInvoice] = useState<InvoiceSummary | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1);
  const [payAmount, setPayAmount] = useState<number>(0);
  const [payMethod, setPayMethod] = useState<string>('Tien mat');
  const [processing, setProcessing] = useState(false);

  const loadLiveRooms = async () => {
    try {
      const [bRes, rRes, hRes, sRes, gRes] = await Promise.all([
        api.get<ApiResponse<PageResponse<Booking>>>('/admin/bookings?status=checked_in&size=100'),
        api.get<ApiResponse<PageResponse<Room>>>('/rooms?size=100'),
        api.get<ApiResponse<Hotel[]>>('/admin/hotels'),
        api.get<ApiResponse<HotelServiceItem[]>>('/services'),
        isHousekeeping
          ? Promise.resolve(null)
          : api.get<ApiResponse<PageResponse<Guest>>>('/admin/guests?size=200').catch(() => null),
      ]);

      setBookings(bRes.data.data.content || []);
      setRooms(rRes.data.data.content || []);
      setHotels(hRes.data.data || []);
      const activeServices = sRes.data.data || [];
      setServices(activeServices);
      if (activeServices.length > 0) {
        setSelectedServiceId((prev) => prev || activeServices[0].id);
      }
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

  const openPaymentModal = async (booking: Booking, guest?: Guest) => {
    setCheckoutModal({ booking, guest });
    setPayMethod('Tien mat');
    setQuantity(1);
    try {
      const res = await api.get<ApiResponse<InvoiceSummary>>(`/bookings/${booking.id}/invoice`);
      const inv = res.data.data;
      setCheckoutInvoice(inv);
      setPayAmount(Math.max(0, inv.remainingBalance));
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const refreshCheckoutInvoice = async (bookingId: number) => {
    const res = await api.get<ApiResponse<InvoiceSummary>>(`/bookings/${bookingId}/invoice`);
    const inv = res.data.data;
    setCheckoutInvoice(inv);
    setPayAmount(Math.max(0, inv.remainingBalance));
  };

  const handleAddServiceInModal = async () => {
    if (!checkoutModal) return;
    setProcessing(true);
    try {
      await api.post(`/admin/bookings/${checkoutModal.booking.id}/services`, {
        serviceId: selectedServiceId,
        quantity,
      });
      await refreshCheckoutInvoice(checkoutModal.booking.id);
      toast.success('Đã thêm dịch vụ vào hóa đơn.');
      loadLiveRooms();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleRecordPaymentInModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!checkoutModal || payAmount <= 0) return;

    const guestPoints = checkoutModal.guest?.loyaltyPoints ?? 0;
    const maxRedeemVnd = guestPoints * VND_PER_POINT;
    if (payMethod === 'Diem thuong' && payAmount > maxRedeemVnd) {
      toast.error(`Khách chỉ có ${guestPoints} điểm (tối đa ${formatVnd(maxRedeemVnd)}).`);
      return;
    }

    setProcessing(true);
    try {
      const pointsUsed = payMethod === 'Diem thuong' ? Math.ceil(payAmount / VND_PER_POINT) : 0;
      await api.post(`/admin/bookings/${checkoutModal.booking.id}/payments`, {
        amount: payAmount,
        method: payMethod,
        note: payMethod === 'Diem thuong' ? `Quy doi ${pointsUsed} diem` : undefined,
      });
      await refreshCheckoutInvoice(checkoutModal.booking.id);
      toast.success(
        payMethod === 'Diem thuong'
          ? `Đã thanh toán ${formatVnd(payAmount)} bằng ${pointsUsed} điểm thưởng.`
          : `Đã ghi nhận thanh toán ${formatVnd(payAmount)}.`
      );
      loadLiveRooms();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const handleFinishCheckout = async () => {
    if (!checkoutModal) return;
    setProcessing(true);
    try {
      const res = await api.post<ApiResponse<InvoiceSummary>>(
        `/admin/bookings/${checkoutModal.booking.id}/check-out`
      );
      toast.success(`Đã trả phòng ${checkoutModal.booking.roomNumber} và xuất hóa đơn.`);
      setCheckoutModal(null);
      setCheckoutInvoice(null);
      if (res.data.data) setInvoice(res.data.data);
      loadLiveRooms();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setProcessing(false);
    }
  };

  const guestPoints = checkoutModal?.guest?.loyaltyPoints ?? 0;
  const maxPointsVnd = guestPoints * VND_PER_POINT;

  return (
    <div className="space-y-6 tabular-nums">
      {/* Control & Filter Bar */}
      <div className="card-editorial p-4 rounded-xl flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
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
            className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs w-60 focus:outline-none focus:border-[#181615]"
          />
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#EDF5F0] border border-[#CBE3D5] text-[#1E5F3E] text-[11px] font-semibold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            Tự cập nhật 30s
          </span>
          <button
            type="button"
            onClick={loadLiveRooms}
            className="px-4 h-9 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold text-[#181615] cursor-pointer"
          >
            Làm mới
          </button>
        </div>
      </div>

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
                        onClick={() => openPaymentModal(b, guest)}
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
                <strong className="text-[#946421]">{guestModal.guest?.isVip ? 'VIP' : 'Thành viên'}</strong>
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

      {/* Unified Payment, Services, Points & Checkout Modal */}
      {checkoutModal && (
        <div
          className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setCheckoutModal(null)}
        >
          <div
            className="bg-white rounded-xl max-w-2xl w-full max-h-[92vh] overflow-y-auto border border-[#E6E0D6] shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-[#E6E0D6] bg-[#F7F4EF] flex items-center justify-between">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[#B8925A]">
                  {checkoutModal.booking.hotelName} · {checkoutModal.booking.bookingCode}
                </div>
                <h3 className="font-display text-xl font-semibold text-[#181615]">
                  Thanh toán Phòng {checkoutModal.booking.roomNumber}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setCheckoutModal(null)}
                className="px-3.5 py-1.5 rounded-lg border border-[#D9D1C5] bg-white text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="p-6 space-y-5 text-sm">
              {/* Add Service Section */}
              <div className="p-4 rounded-xl bg-[#F7F4EF] border border-[#E6E0D6] space-y-2.5">
                <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5E5852]">
                  Chọn thêm dịch vụ phát sinh
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_90px_auto] gap-2">
                  <select
                    value={selectedServiceId}
                    onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                    className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs bg-white"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.serviceName} ({formatVnd(s.price)} / {s.unit})
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value)))}
                    className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs font-mono-num bg-white"
                  />
                  <button
                    type="button"
                    disabled={processing}
                    onClick={handleAddServiceInModal}
                    className="btn-dark px-4 h-9 rounded-lg text-xs cursor-pointer disabled:opacity-50"
                  >
                    + Thêm dịch vụ
                  </button>
                </div>
              </div>

              {/* Live Invoice Summary */}
              {checkoutInvoice && (
                <div className="border border-[#E6E0D6] rounded-xl p-4 space-y-2 text-xs tabular-nums">
                  <div className="flex justify-between text-[#5E5852]">
                    <span>Tiền phòng &amp; phụ thu</span>
                    <span className="font-mono-num font-semibold text-[#181615]">
                      {formatVnd(checkoutInvoice.roomCharge + checkoutInvoice.extraGuestSurcharge)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#5E5852]">
                    <span>Dịch vụ ({checkoutInvoice.services?.length || 0} mục)</span>
                    <span className="font-mono-num font-semibold text-[#181615]">
                      {formatVnd(checkoutInvoice.serviceCharge)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[#5E5852]">
                    <span>Thuế GTGT (8%)</span>
                    <span className="font-mono-num font-semibold text-[#181615]">
                      {formatVnd(checkoutInvoice.vatAmount)}
                    </span>
                  </div>
                  <div className="border-t border-[#E6E0D6] pt-2 flex justify-between font-bold text-sm text-[#181615]">
                    <span>Tổng cộng</span>
                    <span className="font-mono-num">{formatVnd(checkoutInvoice.grandTotal)}</span>
                  </div>
                  <div className="flex justify-between text-emerald-700 font-semibold">
                    <span>Đã thanh toán</span>
                    <span className="font-mono-num">{formatVnd(checkoutInvoice.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-[#A63429] font-bold text-sm">
                    <span>Còn lại phải thu</span>
                    <span className="font-mono-num">{formatVnd(checkoutInvoice.remainingBalance)}</span>
                  </div>
                </div>
              )}

              {/* Payment Form (supports Points) */}
              <form onSubmit={handleRecordPaymentInModal} className="space-y-3 border-t border-[#E6E0D6] pt-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#5E5852]">
                    Ghi nhận thanh toán
                  </div>
                  <div className="text-xs text-[#946421] font-semibold">
                    Điểm khách hiện có: <span className="font-mono-num">{guestPoints} điểm</span> (≈{' '}
                    <span className="font-mono-num">{formatVnd(maxPointsVnd)}</span>)
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#8B847C] mb-1">
                      Phương thức
                    </label>
                    <select
                      value={payMethod}
                      onChange={(e) => {
                        const m = e.target.value;
                        setPayMethod(m);
                        if (m === 'Diem thuong' && checkoutInvoice) {
                          setPayAmount(Math.min(checkoutInvoice.remainingBalance, maxPointsVnd));
                        }
                      }}
                      className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs bg-white"
                    >
                      <option value="Tien mat">Tiền mặt</option>
                      <option value="Chuyen khoan">Chuyển khoản / VietQR</option>
                      <option value="The tin dung">Thẻ tín dụng</option>
                      <option value="Diem thuong">Thanh toán bằng điểm</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.12em] text-[#8B847C] mb-1">
                      Số tiền (VND)
                    </label>
                    <input
                      type="number"
                      min={1000}
                      step={1000}
                      value={payAmount}
                      onChange={(e) => setPayAmount(Number(e.target.value))}
                      className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs font-mono-num"
                    />
                  </div>
                  <div className="flex items-end">
                    <button
                      type="submit"
                      disabled={processing || payAmount <= 0}
                      className="w-full h-10 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer disabled:opacity-50"
                    >
                      Thu tiền
                    </button>
                  </div>
                </div>
              </form>

              {/* Footer Actions */}
              <div className="pt-4 border-t border-[#E6E0D6] flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => checkoutInvoice && setInvoice(checkoutInvoice)}
                  className="px-4 py-2.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold text-[#181615] cursor-pointer"
                >
                  Xem &amp; In hóa đơn
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={handleFinishCheckout}
                  className="btn-primary px-6 py-2.5 rounded-lg text-xs cursor-pointer disabled:opacity-50"
                >
                  Hoàn tất Check-out &amp; Xuất Bill
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />
    </div>
  );
};

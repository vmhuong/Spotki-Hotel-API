import React, { useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { ConfirmModal } from '../ConfirmModal';
import { InvoiceModal } from '../InvoiceModal';
import { Pagination } from '../Pagination';
import { useToast } from '../../context/ToastContext';
import type { ApiResponse, Booking, HotelServiceItem, InvoiceSummary, PageResponse, Room, RoomStatus } from '../../types';
import { BOOKING_STATUS_BADGE, FALLBACK_ROOM_IMG, formatVnd, ROOM_STATUS_BADGE } from '../../utils/format';

const TILE_BORDER_BY_STATUS: Record<string, string> = {
  available: 'border-l-4 border-l-emerald-700 bg-white hover:border-emerald-600',
  occupied: 'border-l-4 border-l-[#A63429] bg-[#FBEFEE]/40 hover:border-[#A63429]',
  cleaning: 'border-l-4 border-l-[#B8925A] bg-[#FAF3E8]/50 hover:border-[#B8925A]',
  maintenance: 'border-l-4 border-l-[#8B847C] bg-[#F1ECE3] hover:border-[#5E5852]',
};

export const FrontDeskTab: React.FC<{ initialView?: 'bookings' | 'matrix' }> = ({
  initialView = 'bookings',
}) => {
  const toast = useToast();
  const [subView, setSubView] = useState<'bookings' | 'matrix'>(initialView);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [selectedRoomTile, setSelectedRoomTile] = useState<Room | null>(null);
  const [services, setServices] = useState<HotelServiceItem[]>([]);
  const [keyword, setKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);

  const [serviceModalBooking, setServiceModalBooking] = useState<Booking | null>(null);
  const [selectedServiceId, setSelectedServiceId] = useState<number>(1);
  const [quantity, setQuantity] = useState<number>(1);

  const [paymentModalBooking, setPaymentModalBooking] = useState<Booking | null>(null);
  const [payAmount, setPayAmount] = useState<number>(500000);
  const [payMethod, setPayMethod] = useState('Tien mat');

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const loadBookings = async (targetPage = page) => {
    try {
      const params = new URLSearchParams({ size: '12', page: String(targetPage) });
      if (keyword) params.set('keyword', keyword);
      if (statusFilter) params.set('status', statusFilter);
      const [bRes, sRes, rRes] = await Promise.all([
        api.get<ApiResponse<PageResponse<Booking>>>(`/admin/bookings?${params.toString()}`),
        api.get<ApiResponse<HotelServiceItem[]>>('/services'),
        api.get<ApiResponse<PageResponse<Room>>>('/rooms?size=100&sort=floorNo,asc'),
      ]);
      setBookings(bRes.data.data.content || []);
      setTotalPages(bRes.data.data.totalPages || 0);
      setTotalElements(bRes.data.data.totalElements || 0);
      setAllRooms(rRes.data.data.content || []);
      const activeServices = sRes.data.data || [];
      setServices(activeServices);
      if (activeServices.length > 0 && !selectedServiceId) {
        setSelectedServiceId(activeServices[0].id);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadBookings(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, page]);

  const groupedRooms = useMemo(() => {
    const groups: Record<string, Room[]> = {};
    allRooms.forEach((r) => {
      const key = `${r.hotelName} · Tầng ${r.floorNo}`;
      if (!groups[key]) groups[key] = [];
      groups[key].push(r);
    });
    return Object.entries(groups);
  }, [allRooms]);

  const roomStatusCounts = useMemo(() => {
    return {
      available: allRooms.filter((r) => r.status === 'available').length,
      occupied: allRooms.filter((r) => r.status === 'occupied').length,
      cleaning: allRooms.filter((r) => r.status === 'cleaning').length,
      maintenance: allRooms.filter((r) => r.status === 'maintenance').length,
    };
  }, [allRooms]);

  const handleAction = async (url: string, successMsg: string, showInvoice = false) => {
    try {
      const res = await api.post<ApiResponse<InvoiceSummary>>(url);
      toast.success(successMsg);
      if (showInvoice && res.data.data) setInvoice(res.data.data);
      loadBookings(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRoomStatusChange = async (roomId: number, status: RoomStatus) => {
    try {
      await api.patch(`/admin/rooms/${roomId}/status?status=${status}`);
      toast.success(`Đã chuyển trạng thái phòng sang "${status}".`);
      setSelectedRoomTile(null);
      loadBookings(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.post(`/bookings/${cancelTarget.id}/cancel`);
      toast.success(`Đã hủy booking ${cancelTarget.bookingCode}.`);
      setCancelTarget(null);
      loadBookings(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceModalBooking) return;
    try {
      await api.post(`/admin/bookings/${serviceModalBooking.id}/services`, {
        serviceId: selectedServiceId,
        quantity,
      });
      setServiceModalBooking(null);
      toast.success('Đã thêm dịch vụ vào phòng.');
      loadBookings(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalBooking) return;
    try {
      await api.post(`/admin/bookings/${paymentModalBooking.id}/payments`, {
        amount: payAmount,
        method: payMethod,
      });
      setPaymentModalBooking(null);
      toast.success('Đã ghi nhận thanh toán.');
      loadBookings(page);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openInvoice = async (bookingId: number) => {
    try {
      const res = await api.get<ApiResponse<InvoiceSummary>>(`/bookings/${bookingId}/invoice`);
      setInvoice(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-5">
      <div className="card-editorial p-4 rounded-xl flex flex-wrap gap-3 items-center justify-between">
        <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
          {[
            { id: '', label: 'Tất cả' },
            { id: 'booked', label: 'Chờ Check-in' },
            { id: 'checked_in', label: 'Đang lưu trú' },
            { id: 'checked_out', label: 'Đã trả phòng' },
            { id: 'cancelled', label: 'Đã hủy' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setStatusFilter(tab.id);
                setPage(0);
              }}
              className={`px-3.5 py-1.5 rounded-full border cursor-pointer transition ${
                statusFilter === tab.id
                  ? 'bg-[#A63429] text-white border-[#A63429]'
                  : 'bg-[#F7F4EF] text-[#5E5852] border-[#E6E0D6] hover:bg-[#EFECE6]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              setPage(0);
              loadBookings(0);
            }}
            className="flex gap-2 items-center"
          >
            <input
              type="text"
              placeholder="Tìm mã BK-, SĐT, tên..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs w-52 focus:outline-none focus:border-[#181615]"
            />
            <button type="submit" className="btn-dark px-4 h-9 rounded-lg text-xs cursor-pointer">
              Tìm
            </button>
          </form>
        </div>
      </div>

      {subView === 'bookings' ? (
        <div className="card-editorial rounded-xl p-5 space-y-4">
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm tabular-nums">
              <thead className="bg-[#F3EFE8] text-[#5E5852] text-[11px] font-bold uppercase tracking-[0.12em] border-b border-[#E6E0D6]">
                <tr>
                  <th className="text-left px-3.5 py-3">Mã đơn</th>
                  <th className="text-left px-3.5 py-3">Phòng</th>
                  <th className="text-left px-3.5 py-3">Khách hàng</th>
                  <th className="text-left px-3.5 py-3">Nhận — Trả</th>
                  <th className="text-right px-3.5 py-3">Tiến độ thanh toán</th>
                  <th className="text-center px-3.5 py-3">Trạng thái</th>
                  <th className="text-right px-3.5 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0D6]">
                {bookings.map((b) => {
                  const badge = BOOKING_STATUS_BADGE[b.status] || {
                    label: b.status,
                    className: '',
                    dot: 'bg-[#8B847C]',
                  };
                  const pct =
                    b.estimatedRoomTotal > 0 ? Math.min(100, Math.round((b.totalPaid / b.estimatedRoomTotal) * 100)) : 100;
                  return (
                    <tr key={b.id} className="hover:bg-[#F7F4EF]/60 transition-colors">
                      <td className="px-3.5 py-3.5 font-mono-num font-bold text-[#181615]">{b.bookingCode}</td>
                      <td className="px-3.5 py-3.5">
                        <div className="font-semibold text-[#181615]">{b.roomNumber}</div>
                        <div className="text-xs text-[#8B847C]">{b.hotelName}</div>
                      </td>
                      <td className="px-3.5 py-3.5 font-medium text-[#181615]">{b.guestName}</td>
                      <td className="px-3.5 py-3.5 text-xs font-mono-num text-[#5E5852]">
                        {b.checkIn} → {b.checkOut}
                      </td>
                      <td className="px-3.5 py-3.5 text-right text-xs min-w-[170px]">
                        <div className="font-mono-num">
                          <span className="font-bold text-emerald-700">{formatVnd(b.totalPaid)}</span>
                          <span className="text-[#8B847C]"> / {formatVnd(b.estimatedRoomTotal)}</span>
                        </div>
                        <div className="h-1.5 rounded-full bg-[#EFECE6] mt-1.5 overflow-hidden">
                          <div className="h-full bg-emerald-700 rounded-full" style={{ width: `${pct}%` }} />
                        </div>
                      </td>
                      <td className="px-3.5 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}
                        >
                          {badge.dot && <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />}
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-3.5 py-3.5 text-right">
                        {b.status === 'booked' ? (
                          <button
                            type="button"
                            onClick={() => handleAction(`/admin/bookings/${b.id}/check-in`, 'Check-in thành công.')}
                            className="px-3.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                          >
                            Check-in
                          </button>
                        ) : (
                          <span className="text-xs text-[#8B847C]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Interactive Legend Bar */}
          <div className="card-editorial rounded-xl px-5 py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap gap-5 font-semibold text-[#181615]">
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" /> Sẵn sàng ({roomStatusCounts.available})
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#A63429]" /> Đang có khách ({roomStatusCounts.occupied})
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#B8925A]" /> Chờ / Đang dọn ({roomStatusCounts.cleaning})
              </span>
              <span className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#8B847C]" /> Bảo trì ({roomStatusCounts.maintenance})
              </span>
            </div>
            <span className="text-[#8B847C]">Bấm vào ô phòng để cập nhật trạng thái nhanh</span>
          </div>

          {groupedRooms.map(([floorTitle, floorRooms]) => (
            <div key={floorTitle} className="card-editorial rounded-xl p-5">
              <h3 className="font-display font-semibold text-base text-[#181615] mb-3.5">{floorTitle}</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 tabular-nums">
                {floorRooms.map((r) => {
                  const badge = ROOM_STATUS_BADGE[r.status] || {
                    label: r.status,
                    className: 'bg-[#F3EFE8] text-[#5E5852]',
                    dot: 'bg-[#8B847C]',
                  };
                  const borderStyle = TILE_BORDER_BY_STATUS[r.status] || 'border-[#E6E0D6] bg-white';
                  return (
                    <button
                      key={r.id}
                      type="button"
                      onClick={() => setSelectedRoomTile(r)}
                      className={`text-left p-3.5 rounded-xl border border-[#E6E0D6] transition shadow-2xs cursor-pointer space-y-1.5 ${borderStyle}`}
                    >
                      <div className="flex items-center justify-between gap-1">
                        <span className="font-mono-num font-bold text-base text-[#181615]">{r.roomNumber}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${badge.className}`}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="text-xs font-medium text-[#5E5852] truncate">{r.roomType}</div>
                      <div className="text-[11px] text-[#8B847C] font-mono-num">
                        {r.capacity} khách · {formatVnd(r.pricePerNight)}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />

      <ConfirmModal
        open={Boolean(cancelTarget)}
        title="Hủy đơn đặt phòng?"
        description={`Xác nhận hủy đơn ${cancelTarget?.bookingCode || ''} của khách ${cancelTarget?.guestName || ''}?`}
        confirmText="Xác nhận hủy"
        variant="danger"
        loading={cancelling}
        onConfirm={confirmCancel}
        onCancel={() => setCancelTarget(null)}
      />

      {selectedRoomTile && (
        <div
          className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setSelectedRoomTile(null)}
        >
          <div
            className="bg-white rounded-xl max-w-md w-full border border-[#E6E0D6] overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="aspect-video bg-[#EFECE6]">
              <img
                src={selectedRoomTile.imageUrl || FALLBACK_ROOM_IMG}
                alt={selectedRoomTile.roomType}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-6 space-y-4">
              <div>
                <div className="text-xs font-semibold text-[#8B847C]">
                  {selectedRoomTile.hotelName} · Tầng {selectedRoomTile.floorNo}
                </div>
                <h3 className="font-display text-xl font-semibold text-[#181615] mt-0.5">
                  Phòng {selectedRoomTile.roomNumber} — {selectedRoomTile.roomType}
                </h3>
                <p className="text-xs text-[#5E5852] mt-1 font-mono-num">
                  Giá đêm: {formatVnd(selectedRoomTile.pricePerNight)} · Sức chứa: {selectedRoomTile.capacity} khách
                </p>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-2">
                  Đổi nhanh trạng thái phòng
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs font-semibold">
                  {(['available', 'occupied', 'cleaning', 'maintenance'] as RoomStatus[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => handleRoomStatusChange(selectedRoomTile.id, st)}
                      className={`py-2.5 rounded-lg border cursor-pointer transition ${
                        selectedRoomTile.status === st
                          ? 'bg-[#181615] text-white border-[#181615]'
                          : 'bg-white text-[#5E5852] border-[#D9D1C5] hover:bg-[#F7F4EF]'
                      }`}
                    >
                      {ROOM_STATUS_BADGE[st]?.label || st}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRoomTile(null)}
                className="w-full py-2.5 rounded-lg bg-[#F7F4EF] hover:bg-[#EFECE6] text-xs font-semibold text-[#181615] cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {serviceModalBooking && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={handleAddService}
            className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 border border-[#E6E0D6] shadow-2xl"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">
              Thêm dịch vụ — {serviceModalBooking.bookingCode}
            </h3>
            <select
              value={selectedServiceId}
              onChange={(e) => setSelectedServiceId(Number(e.target.value))}
              className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-sm bg-white"
            >
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.serviceName} ({formatVnd(s.price)})
                </option>
              ))}
            </select>
            <input
              type="number"
              min={1}
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-sm font-mono-num"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setServiceModalBooking(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                Thêm dịch vụ
              </button>
            </div>
          </form>
        </div>
      )}

      {paymentModalBooking && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={handleRecordPayment}
            className="bg-white rounded-xl p-6 max-w-sm w-full space-y-4 border border-[#E6E0D6] shadow-2xl"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">
              Thu tiền — {paymentModalBooking.bookingCode}
            </h3>
            <input
              type="number"
              min={1000}
              step={1000}
              value={payAmount}
              onChange={(e) => setPayAmount(Number(e.target.value))}
              className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-sm font-mono-num"
            />
            <select
              value={payMethod}
              onChange={(e) => setPayMethod(e.target.value)}
              className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-sm bg-white"
            >
              <option value="Tien mat">Tiền mặt</option>
              <option value="Chuyen khoan">Chuyển khoản</option>
              <option value="The tin dung">Thẻ tín dụng</option>
            </select>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPaymentModalBooking(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
              >
                Xác nhận thu
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

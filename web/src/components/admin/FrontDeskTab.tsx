import React, { useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { ConfirmModal } from '../ConfirmModal';
import { DateRangeInput, type BookedRange } from '../DateRangeInput';
import { InvoiceModal } from '../InvoiceModal';
import { Pagination } from '../Pagination';
import { AdminHeaderBar } from './AdminHeaderBar';
import { useToast } from '../../context/ToastContext';
import type { ApiResponse, Booking, Hotel, HotelServiceItem, InvoiceSummary, PageResponse, PricingMode, Room, RoomStatus } from '../../types';
import { BOOKING_STATUS_BADGE, FALLBACK_ROOM_IMG, formatVnd, ROOM_STATUS_BADGE } from '../../utils/format';

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const tomorrowStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const currentTimeStr = () => {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
};
const formatViDate = (iso: string) => {
  const [y, m, d] = iso.split('-');
  return y && m && d ? `${d}/${m}/${y}` : iso;
};
const formatDt = (d: Date) =>
  `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')} · ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;

interface WalkInFormState {
  entryMode: 'booking' | 'walkin' | 'edit';
  editingBookingId?: number;
  editingBookingCode?: string;
  hotelId: string;
  roomId: number;
  pricingMode: PricingMode;
  checkIn: string;
  checkOut: string;
  startTime: string;
  durationHours: number;
  adults: number;
  children: number;
  contactName: string;
  contactPhone: string;
  identityNo: string;
  contactEmail: string;
  address: string;
  paymentMethod: string;
  depositAmount: number;
  checkInNow: boolean;
  note: string;
}

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
  const { user: currentUser } = useAuth();
  const isBranchScopedStaff = Boolean(currentUser?.hotelId && currentUser.role !== 'ROLE_ADMIN');
  const [subView, setSubView] = useState<'bookings' | 'matrix'>(initialView);

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);

  const [allRooms, setAllRooms] = useState<Room[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [selectedRoomTile, setSelectedRoomTile] = useState<Room | null>(null);
  const [walkInModal, setWalkInModal] = useState<WalkInFormState | null>(null);
  const [roomBookedRanges, setRoomBookedRanges] = useState<BookedRange[]>([]);
  const [loadingSchedule, setLoadingSchedule] = useState(false);
  const [walkInSubmitting, setWalkInSubmitting] = useState(false);
  const [services, setServices] = useState<HotelServiceItem[]>([]);
  const [keyword, setKeyword] = useState('');
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
      const params = new URLSearchParams({ size: '12', page: String(targetPage), status: 'booked' });
      if (keyword) params.set('keyword', keyword);
      const [bRes, sRes, rRes, hRes] = await Promise.all([
        api.get<ApiResponse<PageResponse<Booking>>>(`/admin/bookings?${params.toString()}`),
        api.get<ApiResponse<HotelServiceItem[]>>('/services'),
        api.get<ApiResponse<PageResponse<Room>>>('/rooms?size=100&sort=floorNo,asc'),
        api.get<ApiResponse<Hotel[]>>('/hotels'),
      ]);
      setBookings(bRes.data.data.content || []);
      setTotalPages(bRes.data.data.totalPages || 0);
      setTotalElements(bRes.data.data.totalElements || 0);
      setAllRooms(rRes.data.data.content || []);
      setHotels(hRes.data.data || []);
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
  }, [page]);

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

  const availableRoomsForWalkIn = useMemo(() => {
    return allRooms.filter((r) => {
      if (walkInModal?.checkInNow) {
        if (r.status !== 'available') return false;
      } else if (r.status === 'maintenance') {
        return false;
      }
      if (walkInModal?.hotelId && String(r.hotelId) !== walkInModal.hotelId) return false;
      return true;
    });
  }, [allRooms, walkInModal?.hotelId, walkInModal?.checkInNow]);

  const walkInSelectedRoom = useMemo(() => {
    if (!walkInModal) return undefined;
    return allRooms.find((r) => r.id === walkInModal.roomId);
  }, [allRooms, walkInModal]);

  useEffect(() => {
    const roomId = walkInModal?.roomId;
    if (!roomId) {
      setRoomBookedRanges([]);
      return;
    }
    let cancelled = false;
    setLoadingSchedule(true);
    api
      .get<ApiResponse<BookedRange[]>>(`/rooms/${roomId}/booked-dates`)
      .then((res) => {
        if (!cancelled) setRoomBookedRanges(res.data.data || []);
      })
      .catch(() => {
        if (!cancelled) setRoomBookedRanges([]);
      })
      .finally(() => {
        if (!cancelled) setLoadingSchedule(false);
      });
    return () => {
      cancelled = true;
    };
  }, [walkInModal?.roomId]);

  const effectiveBookedRanges = useMemo(
    () =>
      roomBookedRanges.filter(
        (r) => !walkInModal?.editingBookingCode || r.bookingCode !== walkInModal.editingBookingCode
      ),
    [roomBookedRanges, walkInModal?.editingBookingCode]
  );

  const nightlyDisabledRanges = useMemo(
    () => effectiveBookedRanges.filter((r) => r.pricingMode !== 'hour'),
    [effectiveBookedRanges]
  );

  const nightlyHasOverlap = useMemo(() => {
    if (!walkInModal || walkInModal.pricingMode !== 'night') return false;
    return nightlyDisabledRanges.some(
      (r) => r.checkIn < walkInModal.checkOut && r.checkOut > walkInModal.checkIn
    );
  }, [walkInModal, nightlyDisabledRanges]);

  const hourlyWindowInfo = useMemo(() => {
    if (!walkInModal || walkInModal.pricingMode !== 'hour') return null;
    const startDate = walkInModal.checkIn || todayStr();
    const startTime = walkInModal.startTime || '14:00';
    const startDt = new Date(`${startDate}T${startTime}:00`);
    const hours = Math.max(1, walkInModal.durationHours || 1);
    const endDt = new Date(startDt.getTime() + hours * 3600000);

    // Inspect active bookings covering startDt or starting after startDt
    let activeOverlap: BookedRange | null = null;
    let nextBooking: BookedRange | null = null;
    let nextCutoff: Date | null = null;

    const sorted = [...effectiveBookedRanges].sort((a, b) => a.checkIn.localeCompare(b.checkIn));
    for (const r of sorted) {
      const rStart =
        r.pricingMode === 'hour' && r.checkInAt
          ? new Date(r.checkInAt)
          : new Date(`${r.checkIn}T12:00:00`); // 12:00 noon turnover cutoff before 14:00 check-in
      const rEnd =
        r.pricingMode === 'hour' && r.expectedCheckOutAt
          ? new Date(r.expectedCheckOutAt)
          : new Date(`${r.checkOut}T12:00:00`);

      if (startDt < rEnd && startDt >= rStart) {
        activeOverlap = r;
        break;
      }
      if (rStart > startDt) {
        if (!nextCutoff || rStart < nextCutoff) {
          nextCutoff = rStart;
          nextBooking = r;
        }
      }
    }

    const maxHoursUntilCutoff = nextCutoff
      ? Math.max(0, Math.floor((nextCutoff.getTime() - startDt.getTime()) / 3600000))
      : null;
    const exceedsCutoff = Boolean(nextCutoff && endDt > nextCutoff);

    return {
      startDt,
      endDt,
      activeOverlap,
      nextBooking,
      nextCutoff,
      maxHoursUntilCutoff,
      exceedsCutoff,
    };
  }, [walkInModal, effectiveBookedRanges]);

  const walkInEstimatedTotal = useMemo(() => {
    if (!walkInModal || !walkInSelectedRoom) return 0;
    let base = 0;
    if (walkInModal.pricingMode === 'hour') {
      const hrs = Math.max(1, walkInModal.durationHours || 1);
      base = (walkInSelectedRoom.hourlyRate || 0) * hrs;
    } else {
      const inDate = new Date(walkInModal.checkIn);
      const outDate = new Date(walkInModal.checkOut);
      const nights = Math.max(1, Math.round((outDate.getTime() - inDate.getTime()) / (1000 * 60 * 60 * 24)));
      base = (walkInSelectedRoom.pricePerNight || 0) * nights;
    }
    const totalGuests = (walkInModal.adults || 1) + (walkInModal.children || 0);
    if (totalGuests > walkInSelectedRoom.capacity) {
      const extra = totalGuests - walkInSelectedRoom.capacity;
      base += Math.round(base * ((walkInSelectedRoom.extraGuestRatePercent || 0) / 100) * extra);
    }
    return base;
  }, [walkInModal, walkInSelectedRoom]);

  const openBookingEntryModal = (entryMode: 'booking' | 'walkin') => {
    const scopedHotelId = isBranchScopedStaff && currentUser?.hotelId ? String(currentUser.hotelId) : '';
    const firstHotel = scopedHotelId
      ? hotels.find((h) => String(h.id) === scopedHotelId) || hotels[0]
      : hotels[0];
    const targetHotelId = scopedHotelId || (firstHotel ? String(firstHotel.id) : '');
    const isEligible = (r: Room) => (entryMode === 'walkin' ? r.status === 'available' : r.status !== 'maintenance');
    const initialRoom =
      allRooms.find((r) => isEligible(r) && (!targetHotelId || String(r.hotelId) === targetHotelId)) ||
      (isBranchScopedStaff ? undefined : allRooms.find(isEligible));
    const defaultTotal = initialRoom ? initialRoom.pricePerNight : 0;
    setWalkInModal({
      entryMode,
      hotelId: targetHotelId,
      roomId: initialRoom?.id || 0,
      pricingMode: 'night',
      checkIn: todayStr(),
      checkOut: tomorrowStr(),
      startTime: currentTimeStr(),
      durationHours: 2,
      adults: 1,
      children: 0,
      contactName: '',
      contactPhone: '',
      identityNo: '',
      contactEmail: '',
      address: '',
      paymentMethod: entryMode === 'walkin' ? 'Tien mat' : 'Chuyen khoan VietQR',
      depositAmount: Math.round(defaultTotal * 0.5),
      checkInNow: entryMode === 'walkin',
      note: entryMode === 'walkin' ? 'Khách vãng lai tại quầy' : 'Nhận booking qua điện thoại / tại quầy',
    });
  };

  const openEditBookingModal = (b: Booking) => {
    const isHour = b.pricingMode === 'hour';
    const startDtStr = b.checkInAt ? b.checkInAt.slice(0, 10) : b.checkIn;
    const startTimeStr = b.checkInAt ? b.checkInAt.slice(11, 16) : '14:00';
    const hrs =
      isHour && b.checkInAt && b.expectedCheckOutAt
        ? Math.max(1, Math.round((new Date(b.expectedCheckOutAt).getTime() - new Date(b.checkInAt).getTime()) / 3600000))
        : 2;
    setWalkInModal({
      entryMode: 'edit',
      editingBookingId: b.id,
      editingBookingCode: b.bookingCode,
      hotelId: isBranchScopedStaff && currentUser?.hotelId ? String(currentUser.hotelId) : String(b.hotelId),
      roomId: b.roomId,
      pricingMode: b.pricingMode,
      checkIn: startDtStr,
      checkOut: isHour ? startDtStr : b.checkOut,
      startTime: startTimeStr,
      durationHours: hrs,
      adults: b.adults || 1,
      children: b.children || 0,
      contactName: b.contactName || b.guestName || '',
      contactPhone: b.contactPhone || '',
      identityNo: '',
      contactEmail: '',
      address: '',
      paymentMethod: 'Tien mat',
      depositAmount: b.depositAmount || 0,
      checkInNow: false,
      note: b.note || '',
    });
  };

  const handleSubmitWalkIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walkInModal || !walkInModal.roomId) {
      toast.error('Vui lòng chọn phòng trống hợp lệ.');
      return;
    }
    if (walkInModal.pricingMode === 'hour' && (hourlyWindowInfo?.activeOverlap || hourlyWindowInfo?.exceedsCutoff)) {
      toast.error('Khoảng giờ đang chọn trùng với lịch đặt kế tiếp của phòng. Vui lòng giảm số giờ hoặc đổi phòng.');
      return;
    }
    if (walkInModal.pricingMode === 'night' && nightlyHasOverlap) {
      toast.error('Khoảng ngày đã có đơn đặt trước trên phòng này.');
      return;
    }
    setWalkInSubmitting(true);
    try {
      const checkInAtPayload =
        walkInModal.pricingMode === 'hour'
          ? `${walkInModal.checkIn}T${walkInModal.startTime || '14:00'}:00`
          : null;
      const computedOutDate =
        walkInModal.pricingMode === 'hour' && hourlyWindowInfo
          ? `${hourlyWindowInfo.endDt.getFullYear()}-${String(hourlyWindowInfo.endDt.getMonth() + 1).padStart(2, '0')}-${String(hourlyWindowInfo.endDt.getDate()).padStart(2, '0')}`
          : walkInModal.checkOut;

      if (walkInModal.entryMode === 'edit' && walkInModal.editingBookingId) {
        const res = await api.put<ApiResponse<Booking>>(`/admin/bookings/${walkInModal.editingBookingId}`, {
          roomId: walkInModal.roomId,
          pricingMode: walkInModal.pricingMode,
          checkIn: walkInModal.checkIn,
          checkOut: computedOutDate,
          durationHours: walkInModal.pricingMode === 'hour' ? walkInModal.durationHours : undefined,
          checkInAt: checkInAtPayload,
          adults: walkInModal.adults,
          children: walkInModal.children,
          contactName: walkInModal.contactName.trim(),
          contactPhone: walkInModal.contactPhone.trim(),
          note: walkInModal.note.trim() || null,
        });
        const updated = res.data.data;
        toast.success(`Đã cập nhật booking ${updated.bookingCode} (P.${updated.roomNumber}).`);
        setWalkInModal(null);
        loadBookings(page);
      } else {
        const res = await api.post<ApiResponse<Booking>>('/admin/bookings/walk-in', {
          roomId: walkInModal.roomId,
          pricingMode: walkInModal.pricingMode,
          checkIn: walkInModal.checkIn,
          checkOut: computedOutDate,
          durationHours: walkInModal.pricingMode === 'hour' ? walkInModal.durationHours : undefined,
          checkInAt: checkInAtPayload,
          adults: walkInModal.adults,
          children: walkInModal.children,
          contactName: walkInModal.contactName.trim(),
          contactPhone: walkInModal.contactPhone.trim(),
          identityNo: walkInModal.identityNo.trim() || null,
          contactEmail: walkInModal.contactEmail.trim() || null,
          address: walkInModal.address.trim() || null,
          paymentMethod: walkInModal.paymentMethod,
          depositAmount: walkInModal.depositAmount,
          checkInNow: walkInModal.checkInNow,
          note: walkInModal.note.trim() || null,
        });
        const created = res.data.data;
        toast.success(
          walkInModal.checkInNow
            ? `Đã nhận khách vãng lai & check-in phòng ${created.roomNumber} (${created.bookingCode}).`
            : `Đã tạo đặt phòng ${created.bookingCode}.`
        );
        setWalkInModal(null);
        loadBookings(0);
        setPage(0);
      }
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setWalkInSubmitting(false);
    }
  };

  return (
    <div className="space-y-5">
      <AdminHeaderBar>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#D9D1C5] bg-[#FAF8F5] text-xs font-semibold text-[#181615]">
          <span className="w-2 h-2 rounded-full bg-[#B8925A]" />
          Chờ Check-in (<span className="font-mono-num">{totalElements}</span>)
        </span>

        <button
          type="button"
          onClick={() => openBookingEntryModal('booking')}
          className="px-3.5 h-9 rounded-lg border border-[#181615] bg-white hover:bg-[#181615] hover:text-white text-[#181615] text-xs font-semibold cursor-pointer transition whitespace-nowrap"
        >
          + Nhận booking
        </button>
        <button
          type="button"
          onClick={() => openBookingEntryModal('walkin')}
          className="btn-primary px-4 h-9 rounded-lg text-xs cursor-pointer whitespace-nowrap"
        >
          + Nhận khách vãng lai
        </button>
      </AdminHeaderBar>

      {subView === 'bookings' ? (
        <div className="card-editorial rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#E6E0D6]">
            <div className="text-xs font-semibold text-[#5E5852]">
              Đang hiển thị <strong className="font-mono-num text-[#181615]">{totalElements}</strong> booking chờ check-in
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setPage(0);
                loadBookings(0);
              }}
              className="flex gap-2 items-center w-full sm:w-auto"
            >
              <input
                type="text"
                placeholder="Tìm mã BK-, SĐT, tên khách..."
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                className="h-9 rounded-lg border border-[#D9D1C5] bg-white px-3 text-xs flex-1 sm:w-64 focus:outline-none focus:border-[#181615]"
              />
              <button type="submit" className="btn-dark px-4 h-9 rounded-lg text-xs cursor-pointer">
                Tìm kiếm
              </button>
            </form>
          </div>
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
                        <div>
                          {b.checkIn} → {b.checkOut}
                        </div>
                        {b.pricingMode === 'hour' && b.checkInAt && b.expectedCheckOutAt && (
                          <div className="text-[11px] text-[#A63429] font-semibold mt-0.5">
                            Theo giờ: {b.checkInAt.slice(11, 16)} → {b.expectedCheckOutAt.slice(11, 16)}
                          </div>
                        )}
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
                        <div className="inline-flex items-center gap-1.5">
                          {b.status === 'booked' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleAction(`/admin/bookings/${b.id}/check-in`, 'Check-in thành công.')}
                                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                              >
                                Check-in
                              </button>
                              <button
                                type="button"
                                onClick={() => openEditBookingModal(b)}
                                className="px-2.5 py-1.5 rounded-lg border border-[#181615] bg-white hover:bg-[#181615] hover:text-white text-[#181615] text-xs font-semibold cursor-pointer transition"
                              >
                                Sửa
                              </button>
                              <button
                                type="button"
                                onClick={() => setCancelTarget(b)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#FBEFEE] hover:bg-[#F6DFDC] text-[#A63429] text-xs font-semibold cursor-pointer"
                              >
                                Hủy
                              </button>
                            </>
                          )}
                          {b.status !== 'cancelled' && (
                            <button
                              type="button"
                              onClick={() => openInvoice(b.id)}
                              className="px-2.5 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-[#181615] text-xs font-semibold cursor-pointer"
                            >
                              Hóa đơn
                            </button>
                          )}
                        </div>
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

      {/* Popup Nhận khách vãng lai */}
      {walkInModal && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={handleSubmitWalkIn}
            className="bg-white rounded-xl p-6 max-w-2xl w-full space-y-4 text-sm border border-[#E6E0D6] shadow-2xl max-h-[92vh] overflow-y-auto"
          >
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#E6E0D6]">
              <div>
                <h3 className="font-display font-semibold text-xl text-[#181615]">
                  {walkInModal.entryMode === 'edit'
                    ? `Sửa booking ${walkInModal.editingBookingCode || ''}`
                    : walkInModal.entryMode === 'booking'
                      ? 'Nhận đặt phòng mới (Booking)'
                      : 'Nhận khách vãng lai tại quầy'}
                </h3>
                <p className="text-xs text-[#5E5852] mt-0.5">
                  {walkInModal.entryMode === 'edit'
                    ? 'Cập nhật phòng, lịch nhận/trả đồng bộ theo lịch trống, số khách hoặc thông tin liên hệ trước khi check-in.'
                    : walkInModal.entryMode === 'booking'
                      ? 'Tạo đơn giữ phòng cho khách đặt trước qua điện thoại hoặc trực tiếp tại quầy (hỗ trợ đặt ngày tới).'
                      : 'Tạo hồ sơ khách, gán phòng trống đang sẵn sàng và check-in trực tiếp chỉ trong một bước.'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setWalkInModal(null)}
                className="px-3 py-1 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Chi nhánh *</label>
                <select
                  disabled={isBranchScopedStaff}
                  value={walkInModal.hotelId}
                  onChange={(e) => {
                    const nextHotel = e.target.value;
                    const isEligible = (r: Room) =>
                      walkInModal.checkInNow ? r.status === 'available' : r.status !== 'maintenance';
                    const firstInBranch = allRooms.find(
                      (r) => isEligible(r) && (!nextHotel || String(r.hotelId) === nextHotel)
                    );
                    setWalkInModal({
                      ...walkInModal,
                      hotelId: nextHotel,
                      roomId: firstInBranch?.id || 0,
                      depositAmount: firstInBranch ? Math.round(firstInBranch.pricePerNight * 0.5) : 0,
                    });
                  }}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 bg-white text-xs font-semibold"
                >
                  <option value="">Tất cả chi nhánh</option>
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.hotelName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">
                  {walkInModal.checkInNow ? 'Chọn phòng trống *' : 'Chọn phòng đặt *'}
                </label>
                <select
                  required
                  value={walkInModal.roomId}
                  onChange={(e) => {
                    const nextRoomId = Number(e.target.value);
                    const picked = allRooms.find((r) => r.id === nextRoomId);
                    setWalkInModal({
                      ...walkInModal,
                      roomId: nextRoomId,
                      depositAmount: picked
                        ? Math.round(
                            (walkInModal.pricingMode === 'hour' ? picked.hourlyRate : picked.pricePerNight) * 0.5
                          )
                        : 0,
                    });
                  }}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 bg-white text-xs font-semibold"
                >
                  {availableRoomsForWalkIn.length === 0 ? (
                    <option value={0}>Không có phòng phù hợp</option>
                  ) : (
                    availableRoomsForWalkIn.map((r) => (
                      <option key={r.id} value={r.id}>
                        P.{r.roomNumber} · {r.roomType} ({ROOM_STATUS_BADGE[r.status]?.label || r.status}) ·{' '}
                        {formatVnd(walkInModal.pricingMode === 'hour' ? r.hourlyRate : r.pricePerNight)}
                        {walkInModal.pricingMode === 'hour' ? '/giờ' : '/đêm'}
                      </option>
                    ))
                  )}
                </select>
              </div>
            </div>

            {/* Live Room Status & Existing Schedule Strip */}
            {walkInSelectedRoom && (
              <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#181615]">
                      Hiện trạng P.{walkInSelectedRoom.roomNumber}:
                    </span>
                    <span
                      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                        ROOM_STATUS_BADGE[walkInSelectedRoom.status]?.className || ''
                      }`}
                    >
                      {ROOM_STATUS_BADGE[walkInSelectedRoom.status]?.dot && (
                        <span className={`w-1.5 h-1.5 rounded-full ${ROOM_STATUS_BADGE[walkInSelectedRoom.status]?.dot}`} />
                      )}
                      {ROOM_STATUS_BADGE[walkInSelectedRoom.status]?.label || walkInSelectedRoom.status}
                    </span>
                  </div>
                  <span className="text-[#5E5852] font-mono-num">
                    {formatVnd(walkInSelectedRoom.pricePerNight)}/đêm · {formatVnd(walkInSelectedRoom.hourlyRate)}/giờ
                  </span>
                </div>
                {loadingSchedule ? (
                  <div className="text-[#8B847C]">Đang đồng bộ lịch đặt phòng...</div>
                ) : effectiveBookedRanges.length === 0 ? (
                  <div className="text-emerald-700 font-medium">
                    Lịch sắp tới: Phòng trống hoàn toàn, chưa có đơn đặt nào khác.
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
                    <span className="text-[#5E5852] font-semibold">Lịch đã đặt trên phòng:</span>
                    {effectiveBookedRanges.slice(0, 4).map((r, i) => (
                      <span
                        key={`${r.bookingCode || i}-${r.checkIn}`}
                        className="px-2 py-0.5 rounded bg-white border border-[#E6E0D6] font-mono-num text-[#181615]"
                      >
                        {r.bookingCode ? `${r.bookingCode}: ` : ''}
                        {formatViDate(r.checkIn)} → {formatViDate(r.checkOut)}
                        {r.pricingMode === 'hour' ? ' (Giờ)' : ''}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Pricing Mode + Synchronized Calendar OR Hourly Picker */}
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-start">
              <div className="sm:col-span-3">
                <label className="block text-xs text-[#5E5852] mb-1">Hình thức thuê</label>
                <select
                  value={walkInModal.pricingMode}
                  onChange={(e) => {
                    const mode = e.target.value as PricingMode;
                    const picked = walkInSelectedRoom;
                    const nextHrs = walkInModal.durationHours || 2;
                    const est = picked
                      ? mode === 'hour'
                        ? picked.hourlyRate * nextHrs
                        : picked.pricePerNight
                      : 0;
                    setWalkInModal({
                      ...walkInModal,
                      pricingMode: mode,
                      checkOut: mode === 'hour' ? walkInModal.checkIn : tomorrowStr(),
                      startTime: mode === 'hour' ? walkInModal.startTime || currentTimeStr() : walkInModal.startTime,
                      depositAmount: Math.round(est * 0.5),
                    });
                  }}
                  className="w-full h-10 rounded-lg border border-[#D9D1C5] px-2.5 bg-white text-xs font-semibold"
                >
                  <option value="night">Theo đêm</option>
                  <option value="hour">Theo giờ</option>
                </select>
              </div>

              {walkInModal.pricingMode === 'night' ? (
                <div className="sm:col-span-6">
                  <label className="block text-xs text-[#5E5852] mb-1">
                    Lịch trống phòng (Ngày nhận → Ngày trả) *
                  </label>
                  <DateRangeInput
                    checkIn={walkInModal.checkIn}
                    checkOut={walkInModal.checkOut}
                    disabledRanges={nightlyDisabledRanges}
                    onChange={(nextIn, nextOut) => {
                      const nights = Math.max(
                        1,
                        Math.round((new Date(nextOut).getTime() - new Date(nextIn).getTime()) / 86400000)
                      );
                      const est = walkInSelectedRoom ? walkInSelectedRoom.pricePerNight * nights : 0;
                      setWalkInModal({
                        ...walkInModal,
                        checkIn: nextIn,
                        checkOut: nextOut,
                        depositAmount: Math.round(est * 0.5),
                      });
                    }}
                  />
                  {nightlyHasOverlap && (
                    <p className="text-[11px] text-[#A63429] font-semibold mt-1">
                      Khoảng ngày đang chọn trùng với đơn đã đặt trước trên phòng này!
                    </p>
                  )}
                </div>
              ) : (
                <div className="sm:col-span-6 grid grid-cols-3 gap-2">
                  <div>
                    <label className="block text-xs text-[#5E5852] mb-1">Ngày nhận *</label>
                    <input
                      type="date"
                      required
                      min={todayStr()}
                      value={walkInModal.checkIn}
                      onChange={(e) => {
                        const nextDate = e.target.value;
                        setWalkInModal({
                          ...walkInModal,
                          checkIn: nextDate,
                          checkOut: nextDate,
                          startTime: nextDate === todayStr() ? currentTimeStr() : '14:00',
                        });
                      }}
                      className="w-full h-10 rounded-lg border border-[#D9D1C5] px-2 text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5E5852] mb-1">Giờ nhận *</label>
                    <input
                      type="time"
                      required
                      value={walkInModal.startTime}
                      onChange={(e) => setWalkInModal({ ...walkInModal, startTime: e.target.value })}
                      className="w-full h-10 rounded-lg border border-[#D9D1C5] px-2 text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5E5852] mb-1">Số giờ thuê *</label>
                    <input
                      type="number"
                      min={1}
                      max={24}
                      required
                      value={walkInModal.durationHours}
                      onChange={(e) => {
                        const hrs = Math.max(1, Math.min(24, Number(e.target.value) || 1));
                        const est = walkInSelectedRoom ? walkInSelectedRoom.hourlyRate * hrs : 0;
                        setWalkInModal({
                          ...walkInModal,
                          durationHours: hrs,
                          depositAmount: Math.round(est * 0.5),
                        });
                      }}
                      className="w-full h-10 rounded-lg border border-[#D9D1C5] px-2.5 text-xs font-mono-num font-bold"
                    />
                  </div>
                </div>
              )}

              <div className="sm:col-span-3 grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-[#5E5852] mb-1">Người lớn</label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={walkInModal.adults}
                    onChange={(e) => setWalkInModal({ ...walkInModal, adults: Number(e.target.value) })}
                    className="w-full h-10 rounded-lg border border-[#D9D1C5] px-2.5 text-xs font-mono-num"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#5E5852] mb-1">Trẻ em</label>
                  <input
                    type="number"
                    min={0}
                    max={10}
                    value={walkInModal.children}
                    onChange={(e) => setWalkInModal({ ...walkInModal, children: Number(e.target.value) })}
                    className="w-full h-10 rounded-lg border border-[#D9D1C5] px-2.5 text-xs font-mono-num"
                  />
                </div>
              </div>
            </div>

            {/* Hourly Availability Scanner & Turnover Alert */}
            {walkInModal.pricingMode === 'hour' && hourlyWindowInfo && (
              <div className="space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[#5E5852]">Chọn nhanh:</span>
                    {[2, 3, 4, 6, 12].map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => {
                          const est = walkInSelectedRoom ? walkInSelectedRoom.hourlyRate * h : 0;
                          setWalkInModal({
                            ...walkInModal,
                            durationHours: h,
                            depositAmount: Math.round(est * 0.5),
                          });
                        }}
                        className={`px-2.5 py-1 rounded-md border text-[11px] font-semibold cursor-pointer ${
                          walkInModal.durationHours === h
                            ? 'bg-[#181615] text-white border-[#181615]'
                            : 'bg-white text-[#5E5852] border-[#D9D1C5] hover:border-[#181615]'
                        }`}
                      >
                        {h} giờ
                      </button>
                    ))}
                  </div>
                  <div className="font-mono-num text-[#181615]">
                    Trả dự kiến: <strong>{formatDt(hourlyWindowInfo.endDt)}</strong>
                  </div>
                </div>

                {hourlyWindowInfo.activeOverlap ? (
                  <div className="p-3 rounded-xl bg-[#FBEFEE] border border-[#F0CFCB] text-xs text-[#9E2E23] font-medium">
                    Phòng hiện đang bận theo đơn{' '}
                    <strong className="font-mono-num">{hourlyWindowInfo.activeOverlap.bookingCode}</strong> (
                    {formatViDate(hourlyWindowInfo.activeOverlap.checkIn)} →{' '}
                    {formatViDate(hourlyWindowInfo.activeOverlap.checkOut)}). Không thể nhận vào khung giờ này.
                  </div>
                ) : hourlyWindowInfo.exceedsCutoff && hourlyWindowInfo.nextCutoff ? (
                  <div className="p-3 rounded-xl bg-[#FBEFEE] border border-[#F0CFCB] text-xs text-[#9E2E23] flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <strong>Cảnh báo vượt giờ trống trước đơn kế tiếp:</strong> Phòng chỉ trống đến{' '}
                      <strong className="font-mono-num">{formatDt(hourlyWindowInfo.nextCutoff)}</strong> (tối đa{' '}
                      <strong>{hourlyWindowInfo.maxHoursUntilCutoff} giờ</strong>) trước đơn{' '}
                      <strong className="font-mono-num">{hourlyWindowInfo.nextBooking?.bookingCode}</strong>. Vui lòng báo
                      trước khách trả trước 12:00 hoặc giảm số giờ!
                    </div>
                    {hourlyWindowInfo.maxHoursUntilCutoff !== null && hourlyWindowInfo.maxHoursUntilCutoff >= 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          const maxH = Math.max(1, hourlyWindowInfo.maxHoursUntilCutoff || 1);
                          const est = walkInSelectedRoom ? walkInSelectedRoom.hourlyRate * maxH : 0;
                          setWalkInModal({
                            ...walkInModal,
                            durationHours: maxH,
                            depositAmount: Math.round(est * 0.5),
                          });
                        }}
                        className="px-3 py-1 rounded-lg bg-[#A63429] text-white text-[11px] font-semibold cursor-pointer shrink-0"
                      >
                        Đặt tối đa {hourlyWindowInfo.maxHoursUntilCutoff} giờ
                      </button>
                    )}
                  </div>
                ) : hourlyWindowInfo.nextCutoff ? (
                  <div className="p-3 rounded-xl bg-[#FAF3E8] border border-[#E8D6BA] text-xs text-[#946421]">
                    <strong>Lưu ý lịch kế tiếp:</strong> Phòng trống đến{' '}
                    <strong className="font-mono-num">{formatDt(hourlyWindowInfo.nextCutoff)}</strong> (còn tối đa{' '}
                    <strong>{hourlyWindowInfo.maxHoursUntilCutoff} giờ</strong> trước đơn{' '}
                    <strong className="font-mono-num">{hourlyWindowInfo.nextBooking?.bookingCode}</strong>). Cần báo
                    trước khách trả đúng giờ để kịp dọn phòng.
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-[#EDF5F0] border border-[#CBE3D5] text-xs text-[#1E5F3E]">
                    Phòng trống liên tục sau khung giờ trả dự kiến — chưa có đơn đặt kế tiếp.
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[#E6E0D6]">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Họ và tên khách *</label>
                <input
                  required
                  placeholder="Nguyễn Văn B"
                  value={walkInModal.contactName}
                  onChange={(e) => setWalkInModal({ ...walkInModal, contactName: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Số điện thoại *</label>
                <input
                  required
                  placeholder="0901234567"
                  value={walkInModal.contactPhone}
                  onChange={(e) => setWalkInModal({ ...walkInModal, contactPhone: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs font-mono-num"
                />
              </div>
              {walkInModal.entryMode !== 'edit' && (
                <>
                  <div>
                    <label className="block text-xs text-[#5E5852] mb-1">CCCD / Hộ chiếu</label>
                    <input
                      placeholder="079xxxxxxxxx"
                      value={walkInModal.identityNo}
                      onChange={(e) => setWalkInModal({ ...walkInModal, identityNo: e.target.value })}
                      className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs font-mono-num"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-[#5E5852] mb-1">Email (nếu có)</label>
                    <input
                      type="email"
                      placeholder="guest@email.com"
                      value={walkInModal.contactEmail}
                      onChange={(e) => setWalkInModal({ ...walkInModal, contactEmail: e.target.value })}
                      className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs"
                    />
                  </div>
                </>
              )}
              <div className="sm:col-span-2">
                <label className="block text-xs text-[#5E5852] mb-1">Địa chỉ / Ghi chú lưu trú</label>
                <input
                  placeholder="Địa chỉ hoặc yêu cầu riêng của khách..."
                  value={walkInModal.note}
                  onChange={(e) => setWalkInModal({ ...walkInModal, note: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs"
                />
              </div>
            </div>

            {walkInModal.entryMode === 'edit' ? (
              <div className="p-3.5 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#5E5852]">
                  Tiền phòng dự kiến sau cập nhật:{' '}
                  <strong className="font-mono-num text-[#181615] text-sm">{formatVnd(walkInEstimatedTotal)}</strong>
                </span>
                <span className="text-[#8B847C]">
                  Tiền cọc / thanh toán quản lý tại mục <strong className="text-[#181615]">Hóa đơn</strong>.
                </span>
              </div>
            ) : (
              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <span className="text-[#5E5852]">
                  Tiền phòng dự kiến:{' '}
                  <strong className="font-mono-num text-[#181615] text-sm">{formatVnd(walkInEstimatedTotal)}</strong>
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setWalkInModal({ ...walkInModal, depositAmount: Math.round(walkInEstimatedTotal * 0.5) })
                    }
                    className="px-2.5 py-1 rounded bg-white border border-[#D9D1C5] text-[11px] font-semibold cursor-pointer hover:bg-[#F3EFE8]"
                  >
                    Cọc 50%
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInModal({ ...walkInModal, depositAmount: walkInEstimatedTotal })}
                    className="px-2.5 py-1 rounded bg-white border border-[#D9D1C5] text-[11px] font-semibold cursor-pointer hover:bg-[#F3EFE8]"
                  >
                    Thu đủ 100%
                  </button>
                  <button
                    type="button"
                    onClick={() => setWalkInModal({ ...walkInModal, depositAmount: 0 })}
                    className="px-2.5 py-1 rounded bg-white border border-[#D9D1C5] text-[11px] font-semibold cursor-pointer hover:bg-[#F3EFE8]"
                  >
                    0đ (Thu sau)
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-[#5E5852] mb-1">Số tiền thu tại quầy (VND)</label>
                  <input
                    type="number"
                    min={0}
                    step={10000}
                    value={walkInModal.depositAmount}
                    onChange={(e) => setWalkInModal({ ...walkInModal, depositAmount: Number(e.target.value) })}
                    className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs font-mono-num bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs text-[#5E5852] mb-1">Phương thức thanh toán</label>
                  <select
                    value={walkInModal.paymentMethod}
                    onChange={(e) => setWalkInModal({ ...walkInModal, paymentMethod: e.target.value })}
                    className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs bg-white"
                  >
                    <option value="Tien mat">Tiền mặt tại quầy</option>
                    <option value="Chuyen khoan VietQR">Chuyển khoản / VietQR</option>
                    <option value="The tin dung">Thẻ tín dụng / POS</option>
                  </select>
                </div>
              </div>

              <label className="inline-flex items-center gap-2 text-xs font-semibold text-[#181615] cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={walkInModal.checkInNow}
                  onChange={(e) => {
                    const checkInNow = e.target.checked;
                    const eligible = allRooms.filter(
                      (r) =>
                        (checkInNow ? r.status === 'available' : r.status !== 'maintenance') &&
                        (!walkInModal.hotelId || String(r.hotelId) === walkInModal.hotelId)
                    );
                    const stillValid = eligible.some((r) => r.id === walkInModal.roomId);
                    setWalkInModal({
                      ...walkInModal,
                      checkInNow,
                      roomId: stillValid ? walkInModal.roomId : eligible[0]?.id || 0,
                    });
                  }}
                  className="accent-emerald-700"
                />
                <span>Nhận phòng ngay (Check-in tại quầy &amp; chuyển phòng sang trạng thái Đang có khách)</span>
              </label>
            </div>
            )}

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setWalkInModal(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={
                  walkInSubmitting ||
                  availableRoomsForWalkIn.length === 0 ||
                  nightlyHasOverlap ||
                  Boolean(hourlyWindowInfo?.activeOverlap) ||
                  Boolean(hourlyWindowInfo?.exceedsCutoff)
                }
                className="btn-primary px-5 py-2 rounded-lg text-xs cursor-pointer disabled:opacity-50"
              >
                {walkInSubmitting
                  ? 'Đang xử lý...'
                  : walkInModal.entryMode === 'edit'
                    ? 'Cập nhật booking'
                    : walkInModal.checkInNow
                      ? 'Xác nhận nhận khách & Check-in'
                      : 'Tạo đơn giữ phòng'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

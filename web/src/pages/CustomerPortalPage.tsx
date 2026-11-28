import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../api/client';
import { ConfirmModal } from '../components/ConfirmModal';
import { InvoiceModal } from '../components/InvoiceModal';
import { useToast } from '../context/ToastContext';
import type { ApiResponse, Booking, CustomerProfile, InvoiceSummary } from '../types';
import { BOOKING_STATUS_BADGE, formatVnd } from '../utils/format';

function getSpendingTierProgress(totalSpent: number) {
  if (totalSpent >= 15000000) return { nextTier: 'Platinum (Tối đa)', remaining: 0, percent: 100 };
  if (totalSpent >= 5000000) {
    return {
      nextTier: 'Platinum (15.000.000₫)',
      remaining: 15000000 - totalSpent,
      percent: Math.round(((totalSpent - 5000000) / 10000000) * 100),
    };
  }
  if (totalSpent >= 1000000) {
    return {
      nextTier: 'Gold (5.000.000₫)',
      remaining: 5000000 - totalSpent,
      percent: Math.round(((totalSpent - 1000000) / 4000000) * 100),
    };
  }
  return {
    nextTier: 'Silver (1.000.000₫)',
    remaining: 1000000 - totalSpent,
    percent: Math.round((totalSpent / 1000000) * 100),
  };
}

const BookingJourneyBar: React.FC<{ status: Booking['status'] }> = ({ status }) => {
  if (status === 'cancelled') {
    return (
      <div className="text-xs font-semibold text-[#9E2E23] bg-[#FBEFEE] border border-[#F0CFCB] px-3.5 py-2 rounded-lg">
        Trạng thái: Đơn đặt phòng đã bị hủy
      </div>
    );
  }
  const steps = [
    { key: 'booked', label: '01. Đã đặt cọc' },
    { key: 'checked_in', label: '02. Đang lưu trú' },
    { key: 'checked_out', label: '03. Đã trả phòng' },
  ];
  const currentIdx = status === 'checked_out' ? 2 : status === 'checked_in' ? 1 : 0;

  return (
    <div className="grid grid-cols-3 gap-3 pt-2">
      {steps.map((s, idx) => {
        const passed = idx <= currentIdx;
        return (
          <div key={s.key} className="space-y-1.5">
            <div className={`h-1.5 rounded-full ${passed ? 'bg-emerald-600' : 'bg-[#E6E0D6]'}`} />
            <div className={`text-[11px] font-semibold ${passed ? 'text-[#1E5F3E]' : 'text-[#8B847C]'}`}>
              {s.label}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const CustomerPortalPage: React.FC = () => {
  const toast = useToast();
  const [tab, setTab] = useState<'bookings' | 'profile'>('bookings');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [identityNo, setIdentityNo] = useState('');
  const [address, setAddress] = useState('');

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const [editingBooking, setEditingBooking] = useState<Booking | null>(null);
  const [editCheckIn, setEditCheckIn] = useState('');
  const [editCheckOut, setEditCheckOut] = useState('');
  const [editAdults, setEditAdults] = useState(1);

  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);

  const [reviewBooking, setReviewBooking] = useState<Booking | null>(null);
  const [roomRating, setRoomRating] = useState(5);
  const [serviceRating, setServiceRating] = useState(5);
  const [comment, setComment] = useState('');

  const loadData = async () => {
    try {
      const [pRes, bRes] = await Promise.all([
        api.get<ApiResponse<CustomerProfile>>('/customers/me'),
        api.get<ApiResponse<Booking[]>>('/bookings/me'),
      ]);
      const p = pRes.data.data;
      setProfile(p);
      setFullName(p.fullName);
      setPhone(p.phone);
      setIdentityNo(p.identityNo || '');
      setAddress(p.address || '');
      setBookings(bRes.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.put<ApiResponse<CustomerProfile>>('/customers/me', {
        fullName,
        phone,
        identityNo,
        address,
      });
      setProfile(res.data.data);
      toast.success('Đã lưu thông tin hồ sơ.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.patch('/customers/me/password', { currentPassword, newPassword });
      setCurrentPassword('');
      setNewPassword('');
      toast.success('Đổi mật khẩu thành công.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmCancelBooking = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      await api.post(`/bookings/${cancelTarget.id}/cancel`);
      toast.success(`Đã hủy đơn ${cancelTarget.bookingCode}.`);
      setCancelTarget(null);
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  const handleViewInvoice = async (id: number) => {
    try {
      const res = await api.get<ApiResponse<InvoiceSummary>>(`/bookings/${id}/invoice`);
      setInvoice(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSaveBookingEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;
    try {
      await api.put(`/bookings/${editingBooking.id}/customer-edit`, {
        checkIn: editCheckIn,
        checkOut: editCheckOut,
        adults: editAdults,
        children: editingBooking.children,
      });
      setEditingBooking(null);
      toast.success('Đã cập nhật booking.');
      loadData();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewBooking) return;
    try {
      await api.post('/reviews', {
        bookingId: reviewBooking.id,
        roomRating,
        serviceRating,
        comment,
      });
      setReviewBooking(null);
      setComment('');
      toast.success('Cảm ơn bạn đã gửi đánh giá.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const totalPaid = bookings.reduce((sum, b) => sum + (b.totalPaid || 0), 0);
  const spentForTier = profile?.totalSpent ?? totalPaid;
  const activeCount = bookings.filter((b) => b.status === 'booked' || b.status === 'checked_in').length;
  const completedCount = bookings.filter((b) => b.status === 'checked_out').length;
  const filteredBookings = bookings.filter((b) => (statusFilter === 'all' ? true : b.status === statusFilter));
  const loyalty = profile ? getSpendingTierProgress(spentForTier) : null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-7">
      {/* Obsidian Member Card Header */}
      <section className="bg-[#141312] text-white rounded-2xl p-7 sm:p-9 grid grid-cols-1 lg:grid-cols-[1.2fr_.8fr] gap-7 items-center border border-[#292624]">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B8925A]">
            Spotki Member Portal
          </span>
          <h1 className="font-display text-3xl sm:text-4xl font-semibold mt-1.5">
            {profile?.fullName || 'Khách hàng'}
          </h1>
          <p className="text-xs text-[#A89F95] mt-1 font-mono-num">
            {profile?.email} · {profile?.phone}
          </p>

          <div className="grid grid-cols-3 gap-5 mt-7 pt-6 border-t border-[#292624] tabular-nums">
            <div>
              <div className="text-[11px] text-[#8B847C]">Tổng đã thanh toán</div>
              <div className="font-mono-num text-lg font-bold mt-1">{formatVnd(totalPaid)}</div>
            </div>
            <div>
              <div className="text-[11px] text-[#8B847C]">Đang đặt / Lưu trú</div>
              <div className="font-mono-num text-lg font-bold mt-1">{activeCount} đơn</div>
            </div>
            <div>
              <div className="text-[11px] text-[#8B847C]">Hoàn tất</div>
              <div className="font-mono-num text-lg font-bold mt-1">{completedCount} đơn</div>
            </div>
          </div>
        </div>

        {profile && loyalty && (
          <div className="bg-[#1E1C1A] border border-[#322E2A] rounded-xl p-6 space-y-3.5 tabular-nums">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#B8925A]">
                  Hạng {profile.membershipTier} {profile.isVip ? '· VIP' : ''}
                </div>
                <div className="font-mono-num text-2xl font-bold mt-1">
                  {formatVnd(spentForTier)}
                </div>
                <div className="text-xs text-[#A89F95] mt-0.5 font-mono-num">
                  Điểm khả dụng: {profile.loyaltyPoints.toLocaleString('vi-VN')} điểm
                </div>
              </div>
              <span className="font-mono-num text-xs font-bold text-[#B8925A]">{loyalty.percent}%</span>
            </div>
            <div className="h-2 rounded-full bg-[#2E2A26] overflow-hidden">
              <div
                className="h-full bg-[#B8925A] rounded-full transition-all"
                style={{ width: `${loyalty.percent}%` }}
              />
            </div>
            <p className="text-xs text-[#B8B0A6]">
              {loyalty.remaining > 0
                ? `Còn chi tiêu thêm ${formatVnd(loyalty.remaining)} để lên hạng ${loyalty.nextTier}.`
                : 'Bạn đang ở hạng thành viên cao nhất.'}
            </p>
          </div>
        )}
      </section>

      {/* Tabs & Status Filter */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl border border-[#D9D1C5] bg-white p-1 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setTab('bookings')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition ${
              tab === 'bookings' ? 'bg-[#181615] text-white' : 'text-[#5E5852]'
            }`}
          >
            Đơn đặt phòng ({bookings.length})
          </button>
          <button
            type="button"
            onClick={() => setTab('profile')}
            className={`px-4 py-2 rounded-lg cursor-pointer transition ${
              tab === 'profile' ? 'bg-[#181615] text-white' : 'text-[#5E5852]'
            }`}
          >
            Hồ sơ &amp; Bảo mật
          </button>
        </div>

        {tab === 'bookings' && (
          <div className="flex flex-wrap gap-1.5 text-xs font-semibold">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'booked', label: 'Đã đặt' },
              { id: 'checked_in', label: 'Đang lưu trú' },
              { id: 'checked_out', label: 'Đã trả phòng' },
              { id: 'cancelled', label: 'Đã hủy' },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setStatusFilter(item.id)}
                className={`px-3.5 py-1.5 rounded-full border cursor-pointer transition ${
                  statusFilter === item.id
                    ? 'bg-[#A63429] text-white border-[#A63429]'
                    : 'bg-white text-[#5E5852] border-[#D9D1C5] hover:border-[#181615]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {tab === 'bookings' ? (
        <div className="space-y-4">
          {filteredBookings.length === 0 ? (
            <div className="card-editorial rounded-xl p-12 text-center text-sm text-[#8B847C]">
              Chưa có đơn đặt phòng nào trong mục này.
            </div>
          ) : (
            filteredBookings.map((b) => {
              const badge = BOOKING_STATUS_BADGE[b.status] || {
                label: b.status,
                className: '',
                dot: 'bg-[#8B847C]',
              };
              const paidRatio =
                b.estimatedRoomTotal > 0 ? Math.min(100, Math.round((b.totalPaid / b.estimatedRoomTotal) * 100)) : 100;
              return (
                <div key={b.id} className="card-editorial rounded-xl p-6 space-y-4">
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2.5">
                        <span className="font-mono-num font-bold text-base text-[#181615]">{b.bookingCode}</span>
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-xs font-semibold border ${badge.className}`}
                        >
                          {badge.dot && <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />}
                          {badge.label}
                        </span>
                      </div>
                      <div className="font-display text-lg font-semibold text-[#181615] mt-1.5">
                        {b.hotelName} · {b.roomType} (P.{b.roomNumber})
                      </div>
                      <div className="text-xs text-[#5E5852] mt-0.5">
                        Lưu trú: <span className="font-mono-num">{b.checkIn} → {b.checkOut}</span> · {b.adults} người lớn,{' '}
                        {b.children} trẻ em
                      </div>
                    </div>

                    <div className="text-right tabular-nums min-w-[210px]">
                      <div className="text-xs text-[#8B847C]">Đã thanh toán / Dự kiến phòng</div>
                      <div className="text-sm font-bold text-[#181615] mt-0.5 font-mono-num">
                        <span className="text-emerald-700">{formatVnd(b.totalPaid)}</span> /{' '}
                        {formatVnd(b.estimatedRoomTotal)}
                      </div>
                      <div className="h-1.5 rounded-full bg-[#E6E0D6] mt-2 overflow-hidden">
                        <div className="h-full bg-emerald-600 rounded-full" style={{ width: `${paidRatio}%` }} />
                      </div>
                    </div>
                  </div>

                  <BookingJourneyBar status={b.status} />

                  <div className="pt-3.5 border-t border-[#F1ECE3] flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => handleViewInvoice(b.id)}
                      className="px-4 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold text-[#181615] cursor-pointer"
                    >
                      Xem hóa đơn VAT
                    </button>
                    {b.status === 'booked' && b.customerEditCount < 1 && (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBooking(b);
                          setEditCheckIn(b.checkIn);
                          setEditCheckOut(b.checkOut);
                          setEditAdults(b.adults);
                        }}
                        className="px-4 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold text-[#181615] cursor-pointer"
                      >
                        Sửa ngày (1 lần)
                      </button>
                    )}
                    {b.status === 'booked' && (
                      <button
                        type="button"
                        onClick={() => setCancelTarget(b)}
                        className="px-4 py-1.5 rounded-lg bg-[#FBEFEE] hover:bg-[#F6DFDC] text-[#A63429] text-xs font-semibold cursor-pointer"
                      >
                        Hủy đơn
                      </button>
                    )}
                    {b.status === 'checked_out' && (
                      <button
                        type="button"
                        onClick={() => setReviewBooking(b)}
                        className="btn-primary px-4 py-1.5 rounded-lg text-xs cursor-pointer"
                      >
                        Gửi đánh giá
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
          <form onSubmit={handleSaveProfile} className="card-editorial rounded-xl p-6 sm:p-7 space-y-4 text-sm">
            <h2 className="font-display text-xl font-semibold text-[#181615]">Thông tin cá nhân</h2>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                Họ và tên
              </label>
              <input
                required
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                Số điện thoại
              </label>
              <input
                required
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                CCCD / Hộ chiếu
              </label>
              <input
                value={identityNo}
                onChange={(e) => setIdentityNo(e.target.value)}
                className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                Địa chỉ
              </label>
              <input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <button type="submit" className="btn-primary px-6 py-2.5 rounded-lg text-xs cursor-pointer">
              Lưu thay đổi
            </button>
          </form>

          <form onSubmit={handleChangePassword} className="card-editorial rounded-xl p-6 sm:p-7 space-y-4 text-sm h-fit">
            <h2 className="font-display text-xl font-semibold text-[#181615]">Đổi mật khẩu</h2>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                Mật khẩu hiện tại
              </label>
              <input
                type="password"
                required
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                Mật khẩu mới (tối thiểu 10 ký tự)
              </label>
              <input
                type="password"
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <button type="submit" className="btn-dark px-6 py-2.5 rounded-lg text-xs cursor-pointer">
              Cập nhật mật khẩu
            </button>
          </form>
        </div>
      )}

      <InvoiceModal invoice={invoice} onClose={() => setInvoice(null)} />

      <ConfirmModal
        open={Boolean(cancelTarget)}
        title="Xác nhận hủy đơn đặt phòng?"
        description={`Bạn có chắc muốn hủy đơn ${cancelTarget?.bookingCode || ''}?`}
        confirmText="Xác nhận hủy"
        variant="danger"
        loading={cancelling}
        onConfirm={confirmCancelBooking}
        onCancel={() => setCancelTarget(null)}
      />

      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form onSubmit={handleSaveBookingEdit} className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 border border-[#E6E0D6] shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[#181615]">
              Sửa ngày đơn #{editingBooking.bookingCode}
            </h3>
            <div>
              <label className="block text-xs font-semibold text-[#5E5852] mb-1">Ngày nhận phòng</label>
              <input
                type="date"
                required
                value={editCheckIn}
                onChange={(e) => setEditCheckIn(e.target.value)}
                className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E5852] mb-1">Ngày trả phòng</label>
              <input
                type="date"
                required
                value={editCheckOut}
                onChange={(e) => setEditCheckOut(e.target.value)}
                className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-sm font-mono-num"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E5852] mb-1">Số người lớn</label>
              <input
                type="number"
                min={1}
                value={editAdults}
                onChange={(e) => setEditAdults(Number(e.target.value))}
                className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-sm font-mono-num"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Hủy
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {reviewBooking && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form onSubmit={handleSubmitReview} className="bg-white rounded-xl p-6 max-w-md w-full space-y-4 border border-[#E6E0D6] shadow-2xl">
            <h3 className="font-display font-bold text-lg text-[#181615]">
              Đánh giá phòng {reviewBooking.roomNumber}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-[#5E5852] mb-1">Điểm phòng (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={roomRating}
                  onChange={(e) => setRoomRating(Number(e.target.value))}
                  className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-sm font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#5E5852] mb-1">Điểm dịch vụ (1–5)</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  step={0.5}
                  value={serviceRating}
                  onChange={(e) => setServiceRating(Number(e.target.value))}
                  className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-sm font-mono-num"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#5E5852] mb-1">Nhận xét</label>
              <textarea
                rows={3}
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                className="w-full rounded-lg border border-[#D9D1C5] p-3 text-sm"
                placeholder="Chia sẻ trải nghiệm của bạn..."
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setReviewBooking(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                Gửi đánh giá
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

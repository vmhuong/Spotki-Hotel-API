import React, { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { ApiResponse, Booking, CustomerProfile, GatewayInitResponse, PricingMode, Room } from '../types';
import { FALLBACK_ROOM_IMG, formatVnd } from '../utils/format';

/** Pure typographic + CSS grid QR visual block (zero icon dependencies) */
const QrVisualBlock: React.FC<{ txCode: string }> = ({ txCode }) => {
  const bits = txCode.split('').map((ch) => ch.charCodeAt(0) % 2 === 1);
  return (
    <div className="w-28 h-28 bg-white border-2 border-[#181615] rounded-lg p-2 flex flex-col justify-between shrink-0">
      <div className="grid grid-cols-7 gap-0.5 flex-1">
        {Array.from({ length: 49 }).map((_, idx) => (
          <span
            key={idx}
            className={`rounded-[1px] ${
              idx < 9 || idx > 40 || bits[idx % bits.length] ? 'bg-[#181615]' : 'bg-[#E6E0D6]'
            }`}
          />
        ))}
      </div>
      <div className="text-[9px] font-bold text-center tracking-widest text-[#A63429] pt-1">VIETQR</div>
    </div>
  );
};

export const BookingPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { user, isCustomer } = useAuth();
  const toast = useToast();

  const roomId = searchParams.get('roomId') || '';
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);

  const checkIn = searchParams.get('checkIn') || today;
  const checkOut = searchParams.get('checkOut') || tomorrow;
  const pricingMode = (searchParams.get('pricingMode') as PricingMode) || 'night';
  const adults = Math.max(1, Number(searchParams.get('adults') || 2));
  const children = Math.max(0, Number(searchParams.get('children') || 0));

  const [room, setRoom] = useState<Room | null>(null);
  const [profile, setProfile] = useState<CustomerProfile | null>(null);
  const [loading, setLoading] = useState(true);

  const [contactName, setContactName] = useState(user?.fullName || '');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState(user?.username?.includes('@') ? user.username : '');
  const [identityNo, setIdentityNo] = useState('');
  const [address, setAddress] = useState('');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [depositConfirmed, setDepositConfirmed] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdBooking, setCreatedBooking] = useState<Booking | null>(null);
  const [gatewayTx, setGatewayTx] = useState<GatewayInitResponse | null>(null);
  const [gatewayPaid, setGatewayPaid] = useState(false);

  useEffect(() => {
    if (!roomId) {
      setLoading(false);
      setError('Thiếu thông tin phòng cần đặt.');
      return;
    }
    setLoading(true);
    const reqs: Promise<unknown>[] = [
      api.get<ApiResponse<Room>>(`/rooms/${roomId}`).then((r) => setRoom(r.data.data)),
    ];
    if (isCustomer) {
      reqs.push(
        api
          .get<ApiResponse<CustomerProfile>>('/customers/me')
          .then((p) => {
            const prof = p.data.data;
            setProfile(prof);
            setContactName(prof.fullName);
            setContactPhone(prof.phone);
            setContactEmail(prof.email);
            setIdentityNo(prof.identityNo || '');
            setAddress(prof.address || '');
          })
          .catch(() => {})
      );
    }
    Promise.all(reqs)
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [roomId, isCustomer]);

  const summary = useMemo(() => {
    if (!room) return { nights: 1, base: 0, extra: 0, total: 0, deposit: 0 };
    const start = new Date(checkIn).getTime();
    const end = new Date(checkOut).getTime();
    const nights = Math.max(1, Math.round((end - start) / 86400000) || 1);
    const base = pricingMode === 'hour' ? room.hourlyRate : room.pricePerNight * nights;
    const totalGuests = adults + children;
    const extraGuests = Math.max(0, totalGuests - room.capacity);
    const extra =
      extraGuests > 0
        ? Math.round(base * (room.extraGuestRatePercent / 100) * extraGuests)
        : 0;
    const total = base + extra;
    return { nights, base, extra, total, deposit: Math.round(total * 0.5) };
  }, [room, checkIn, checkOut, pricingMode, adults, children]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!room) return;
    setSubmitting(true);
    setError('');
    try {
      const res = await api.post<ApiResponse<Booking>>('/bookings', {
        roomId: room.id,
        checkIn,
        checkOut,
        pricingMode,
        adults,
        children,
        contactName,
        contactPhone,
        contactEmail: contactEmail || undefined,
        identityNo: identityNo || undefined,
        address: address || undefined,
        paymentMethod,
        note,
      });
      setCreatedBooking(res.data.data);
      toast.success(`Đã tạo booking ${res.data.data.bookingCode} và ghi nhận cọc 50%.`);
    } catch (err) {
      const msg = getErrorMessage(err);
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleInitiateGateway = async () => {
    if (!createdBooking) return;
    try {
      const remaining = Math.max(1000, createdBooking.estimatedRoomTotal - createdBooking.totalPaid);
      const res = await api.post<ApiResponse<GatewayInitResponse>>('/payments/gateway/initiate', {
        bookingId: createdBooking.id,
        amount: remaining,
        provider: 'VIETQR',
      });
      setGatewayTx(res.data.data);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const handleSimulateWebhook = async () => {
    if (!gatewayTx) return;
    try {
      await api.post('/payments/gateway/callback', {
        provider: gatewayTx.provider,
        appTransId: gatewayTx.appTransId,
        gatewayTransId: 'SANDBOX-' + Date.now(),
        amount: gatewayTx.amount,
        mac: gatewayTx.sampleHmacSignature,
      });
      setGatewayPaid(true);
      toast.success('Đã xác nhận thanh toán đủ 100% qua VietQR Webhook.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-14 text-sm text-[#5E5852]">Đang tải thông tin đặt phòng...</div>;
  }

  if (!room) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-14 space-y-3">
        <div className="p-4 rounded-xl bg-[#FBEFEE] text-[#A63429] text-sm font-semibold">
          {error || 'Không tìm thấy phòng.'}
        </div>
        <Link to="/rooms" className="text-sm font-semibold text-[#A63429]">
          ← Quay lại danh sách phòng
        </Link>
      </div>
    );
  }

  const currentStep = createdBooking ? 3 : 2;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-7">
      <div className="flex flex-wrap items-end justify-between gap-4 border-b border-[#E6E0D6] pb-6">
        <div>
          <Link
            to={`/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
            className="text-xs font-semibold text-[#5E5852] hover:text-[#181615]"
          >
            ← Quay lại chi tiết phòng
          </Link>
          <h1 className="font-display text-3xl font-semibold text-[#181615] mt-2">
            Đặt phòng &amp; Đặt cọc giữ chỗ
          </h1>
        </div>

        {/* 3-Step Numbered Stepper */}
        <div className="flex items-center gap-2 text-xs font-semibold">
          <span className="px-3.5 py-1.5 rounded-full bg-[#EDF5F0] text-[#1E5F3E] border border-[#CBE3D5]">
            <span className="font-mono-num mr-1">01.</span> Chọn phòng
          </span>
          <span className="w-4 h-[1px] bg-[#D9D1C5]" />
          <span
            className={`px-3.5 py-1.5 rounded-full border ${
              currentStep === 2
                ? 'bg-[#A63429] text-white border-[#A63429]'
                : 'bg-[#EDF5F0] text-[#1E5F3E] border-[#CBE3D5]'
            }`}
          >
            <span className="font-mono-num mr-1">02.</span> Thông tin &amp; Cọc 50%
          </span>
          <span className="w-4 h-[1px] bg-[#D9D1C5]" />
          <span
            className={`px-3.5 py-1.5 rounded-full border ${
              currentStep === 3
                ? 'bg-emerald-700 text-white border-emerald-700'
                : 'bg-white text-[#8B847C] border-[#E6E0D6]'
            }`}
          >
            <span className="font-mono-num mr-1">03.</span> Hoàn tất
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-[#FBEFEE] border border-[#F0CFCB] text-[#A63429] text-sm font-medium">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-7 items-start">
        <div className="lg:col-span-2 card-editorial rounded-xl p-6 sm:p-7">
          {createdBooking ? (
            <div className="space-y-6">
              <div className="p-6 rounded-xl bg-[#EDF5F0] border border-[#CBE3D5] text-[#1E5F3E]">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em]">Bước 03 / Hoàn tất</div>
                <h2 className="font-display text-2xl font-semibold mt-1 text-[#181615]">Đặt phòng thành công</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 text-sm tabular-nums">
                  <div className="bg-white rounded-xl p-4 border border-[#CBE3D5]">
                    <div className="text-xs text-[#8B847C]">Mã đặt phòng</div>
                    <div className="font-mono-num font-bold text-lg text-[#181615] mt-0.5">
                      {createdBooking.bookingCode}
                    </div>
                  </div>
                  <div className="bg-white rounded-xl p-4 border border-[#CBE3D5]">
                    <div className="text-xs text-[#8B847C]">Đã ghi nhận đặt cọc (50%)</div>
                    <div className="font-mono-num font-bold text-lg text-emerald-700 mt-0.5">
                      {formatVnd(createdBooking.depositAmount)}
                    </div>
                  </div>
                </div>
              </div>

              {user && !gatewayPaid && (
                <div className="p-5 rounded-xl bg-[#F7F4EF] border border-[#E6E0D6] space-y-3.5">
                  <div className="font-bold text-sm text-[#181615]">
                    Thanh toán phần còn lại trực tuyến (VietQR Sandbox)
                  </div>
                  {!gatewayTx ? (
                    <button
                      type="button"
                      onClick={handleInitiateGateway}
                      className="btn-dark px-5 py-2.5 rounded-lg text-xs cursor-pointer"
                    >
                      Khởi tạo mã QR thanh toán
                    </button>
                  ) : (
                    <div className="flex flex-col sm:flex-row items-center gap-5 bg-white p-5 rounded-xl border border-[#E6E0D6]">
                      <QrVisualBlock txCode={gatewayTx.appTransId} />
                      <div className="space-y-2 text-xs flex-1 tabular-nums">
                        <div>
                          Mã giao dịch:{' '}
                          <strong className="font-mono-num text-[#181615]">{gatewayTx.appTransId}</strong>
                        </div>
                        <div>
                          Số tiền cần thanh toán:{' '}
                          <strong className="font-mono-num text-base text-[#A63429]">
                            {formatVnd(gatewayTx.amount)}
                          </strong>
                        </div>
                        <div className="text-[#8B847C] break-all">
                          Chữ ký HMAC-SHA256: {gatewayTx.sampleHmacSignature}
                        </div>
                        <button
                          type="button"
                          onClick={handleSimulateWebhook}
                          className="mt-1 px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-semibold cursor-pointer"
                        >
                          Giả lập Callback xác nhận thanh toán
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {gatewayPaid && (
                <div className="p-4 rounded-xl bg-[#EDF5F0] border border-[#CBE3D5] text-[#1E5F3E] text-sm font-semibold">
                  Webhook HMAC-SHA256 đã xác nhận thanh toán đủ 100%.
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                {isCustomer ? (
                  <Link to="/portal" className="btn-primary px-6 py-2.5 rounded-lg text-xs">
                    Xem trong Tài khoản thành viên
                  </Link>
                ) : (
                  <Link to="/lookup" className="btn-primary px-6 py-2.5 rounded-lg text-xs">
                    Tra cứu đơn vừa đặt
                  </Link>
                )}
                <Link
                  to="/rooms"
                  className="px-5 py-2.5 rounded-lg border border-[#D9D1C5] text-xs font-semibold text-[#181615] hover:bg-[#F7F4EF]"
                >
                  Quay lại danh sách phòng
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <h2 className="font-display text-xl font-semibold text-[#181615]">
                Thông tin liên hệ &amp; nhận phòng
              </h2>

              {profile && (
                <div className="p-3.5 rounded-xl bg-[#F7F4EF] border border-[#E6E0D6] text-[#5E5852] text-xs">
                  Email, CCCD và địa chỉ được đồng bộ từ hồ sơ thành viên để tự động cộng điểm sau check-out.
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                    {profile ? 'Tên liên hệ *' : 'Họ tên *'}
                  </label>
                  <input
                    type="text"
                    required
                    value={contactName}
                    onChange={(e) => setContactName(e.target.value)}
                    className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 focus:outline-none focus:border-[#181615]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                    Số điện thoại *
                  </label>
                  <input
                    type="text"
                    required
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 font-mono-num focus:outline-none focus:border-[#181615]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                    Email
                  </label>
                  <input
                    type="email"
                    required={!profile}
                    disabled={Boolean(profile)}
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 disabled:bg-[#F7F4EF] focus:outline-none focus:border-[#181615]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                    CCCD / Hộ chiếu
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(profile)}
                    value={identityNo}
                    onChange={(e) => setIdentityNo(e.target.value)}
                    className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 font-mono-num disabled:bg-[#F7F4EF] focus:outline-none focus:border-[#181615]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                    Địa chỉ
                  </label>
                  <input
                    type="text"
                    disabled={Boolean(profile)}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 disabled:bg-[#F7F4EF] focus:outline-none focus:border-[#181615]"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                    Ghi chú cho lễ tân
                  </label>
                  <textarea
                    rows={3}
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="w-full rounded-lg border border-[#D9D1C5] p-3 text-sm focus:outline-none focus:border-[#181615]"
                  />
                </div>
              </div>

              <div className="border-l-4 border-l-[#A63429] border border-[#E6E0D6] bg-[#FAF7F3] rounded-xl p-4 tabular-nums">
                <div className="text-xs font-semibold text-[#5E5852]">Số tiền cần đặt cọc giữ phòng (50%)</div>
                <div className="font-mono-num text-2xl font-bold text-[#A63429] mt-0.5">
                  {formatVnd(summary.deposit)}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                  Phương thức đặt cọc *
                </label>
                <select
                  required
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-sm bg-white focus:outline-none focus:border-[#181615]"
                >
                  <option value="">Chọn phương thức</option>
                  <option value="Chuyen khoan ngan hang">Chuyển khoản ngân hàng / VietQR</option>
                  <option value="Vi dien tu">Ví điện tử</option>
                  <option value="The noi dia/quoc te">Thẻ nội địa / quốc tế</option>
                </select>
              </div>

              <label className="flex items-start gap-2.5 text-xs text-[#5E5852] cursor-pointer">
                <input
                  type="checkbox"
                  required
                  checked={depositConfirmed}
                  onChange={(e) => setDepositConfirmed(e.target.checked)}
                  className="mt-0.5 accent-[#A63429]"
                />
                <span>
                  Tôi xác nhận thanh toán cọc 50% để giữ phòng. Phần còn lại thanh toán khi nhận hoặc trả phòng.
                </span>
              </label>

              <button
                type="submit"
                disabled={submitting}
                className="btn-primary w-full h-11 rounded-lg text-xs uppercase tracking-[0.14em] cursor-pointer disabled:opacity-60"
              >
                {submitting ? 'Đang xử lý...' : 'Xác nhận đặt phòng & cọc 50%'}
              </button>
            </form>
          )}
        </div>

        {/* Summary Card */}
        <aside className="card-editorial rounded-xl overflow-hidden tabular-nums sticky top-24">
          <div className="aspect-[16/9] bg-[#EFECE6]">
            <img src={room.imageUrl || FALLBACK_ROOM_IMG} alt={room.roomType} className="w-full h-full object-cover" />
          </div>
          <div className="p-6 space-y-4">
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A63429]">Tóm tắt đơn</div>
              <h3 className="font-display text-lg font-semibold text-[#181615] mt-1">
                {room.roomType} — Phòng {room.roomNumber}
              </h3>
              <p className="text-xs text-[#8B847C] mt-0.5">{room.hotelName}</p>
            </div>
            <div className="border-t border-[#E6E0D6] pt-3.5 space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-[#5E5852]">Nhận phòng</span>
                <span className="font-mono-num font-semibold text-[#181615]">{checkIn}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5E5852]">Trả phòng</span>
                <span className="font-mono-num font-semibold text-[#181615]">{checkOut}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#5E5852]">Số khách</span>
                <span className="font-semibold text-[#181615]">
                  {adults} người lớn, {children} trẻ em
                </span>
              </div>
              <div className="flex justify-between border-t border-[#E6E0D6] pt-2.5">
                <span className="text-[#5E5852]">
                  {pricingMode === 'hour' ? 'Gói theo giờ' : `Tiền phòng (${summary.nights} đêm)`}
                </span>
                <span className="font-mono-num font-semibold text-[#181615]">{formatVnd(summary.base)}</span>
              </div>
              {summary.extra > 0 && (
                <div className="flex justify-between text-[#A63429]">
                  <span>Phụ thu thêm khách</span>
                  <span className="font-mono-num font-semibold">{formatVnd(summary.extra)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-[#E6E0D6] pt-2.5 font-bold text-[#181615]">
                <span>Tổng dự kiến</span>
                <span className="font-mono-num">{formatVnd(summary.total)}</span>
              </div>
              <div className="flex justify-between text-[#A63429] font-bold">
                <span>Đặt cọc 50%</span>
                <span className="font-mono-num">{formatVnd(summary.deposit)}</span>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};

import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { DateRangeInput, type BookedRange } from '../components/DateRangeInput';
import type { ApiResponse, PageResponse, PricingMode, Review, Room } from '../types';
import { FALLBACK_ROOM_IMG, formatVnd } from '../utils/format';

export const RoomDetailPage: React.FC = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [room, setRoom] = useState<Room | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [bookedRanges, setBookedRanges] = useState<BookedRange[]>([]);
  const [activePhoto, setActivePhoto] = useState('');
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const today = new Date().toISOString().slice(0, 10);
  const twoDaysLater = new Date(Date.now() + 2 * 86400000).toISOString().slice(0, 10);

  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || today);
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || twoDaysLater);
  const [pricingMode, setPricingMode] = useState<PricingMode>('night');
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);

  const [checkingAvail, setCheckingAvail] = useState(false);
  const [isAvailable, setIsAvailable] = useState(true);

  const checkAvailability = async (inDate = checkIn, outDate = checkOut, targetRoom = room) => {
    if (!targetRoom) return;
    if (targetRoom.status === 'maintenance') {
      setIsAvailable(false);
      return;
    }
    if (!inDate || !outDate || new Date(outDate) <= new Date(inDate)) {
      setIsAvailable(false);
      return;
    }
    setCheckingAvail(true);
    try {
      const params = new URLSearchParams({
        hotelId: String(targetRoom.hotelId),
        checkIn: inDate,
        checkOut: outDate,
        size: '100',
      });
      const res = await api.get<ApiResponse<PageResponse<Room>>>(`/rooms?${params.toString()}`);
      // Backend already excludes rooms with overlapping active bookings for [checkIn, checkOut).
      // A room occupied/cleaning today is still bookable for future non-overlapping dates.
      const found = (res.data.data?.content || []).some(
        (r) => r.id === targetRoom.id && r.status !== 'maintenance'
      );
      setIsAvailable(found);
    } catch {
      setIsAvailable(true);
    } finally {
      setCheckingAvail(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([
      api.get<ApiResponse<Room>>(`/rooms/${id}`),
      api.get<ApiResponse<PageResponse<Review>>>(`/rooms/${id}/reviews?size=20`),
      api.get<ApiResponse<BookedRange[]>>(`/rooms/${id}/booked-dates`).catch(() => null),
    ])
      .then(([rRes, revRes, bookedRes]) => {
        const rm = rRes.data.data;
        setRoom(rm);
        setActivePhoto(rm.imageUrl || FALLBACK_ROOM_IMG);
        setReviews(revRes.data.data?.content || []);
        setBookedRanges(bookedRes?.data?.data || []);
        checkAvailability(checkIn, checkOut, rm);
      })
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const gallery = useMemo(() => {
    if (!room) return [];
    const list = (room.galleryUrls || '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
    if (room.imageUrl && !list.includes(room.imageUrl)) list.unshift(room.imageUrl);
    return list.length > 0 ? list : [FALLBACK_ROOM_IMG];
  }, [room]);

  const activeIdx = Math.max(0, gallery.indexOf(activePhoto));

  const reviewStats = useMemo(() => {
    if (reviews.length === 0) return { avg: 0, avgRoom: 0, avgService: 0 };
    const sumRoom = reviews.reduce((a, r) => a + r.roomRating, 0);
    const sumSvc = reviews.reduce((a, r) => a + r.serviceRating, 0);
    return {
      avg: (sumRoom + sumSvc) / (reviews.length * 2),
      avgRoom: sumRoom / reviews.length,
      avgService: sumSvc / reviews.length,
    };
  }, [reviews]);

  const estimate = useMemo(() => {
    if (!room) return { nights: 1, base: 0, extra: 0, extraGuests: 0, total: 0, deposit: 0 };
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
    return { nights, base, extra, extraGuests, total, deposit: Math.round(total * 0.5) };
  }, [room, checkIn, checkOut, pricingMode, adults, children]);

  if (loading) {
    return <div className="max-w-7xl mx-auto px-4 py-14 text-sm text-[#5E5852]">Đang tải thông tin phòng...</div>;
  }
  if (!room) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-14 text-[#A63429] font-semibold">
        {error || 'Không tìm thấy phòng'}
      </div>
    );
  }

  const amenitiesList = (room.amenities || 'WiFi, Smart TV, Điều hòa')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const handleGoToBooking = () => {
    const params = new URLSearchParams({
      roomId: String(room.id),
      checkIn,
      checkOut,
      pricingMode,
      adults: String(adults),
      children: String(children),
    });
    navigate(`/booking?${params.toString()}`);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      <div>
        <Link to="/rooms" className="text-xs font-semibold text-[#5E5852] hover:text-[#181615]">
          ← Quay lại danh sách phòng
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        {/* Left: Photo Gallery first, then Room Name & Specs below image */}
        <div className="lg:col-span-2 space-y-7">
          <div className="card-editorial rounded-xl overflow-hidden">
            <div
              onClick={() => setLightboxOpen(true)}
              className="relative aspect-[16/10] bg-[#EFECE6] cursor-zoom-in overflow-hidden"
            >
              <img src={activePhoto} alt={room.roomType} className="w-full h-full object-cover" />
              <span className="absolute bottom-3.5 left-3.5 px-3 py-1 rounded-full bg-[#141312]/80 backdrop-blur-xs text-white text-[11px] font-medium font-mono-num">
                {activeIdx + 1} / {gallery.length} · Bấm để phóng to
              </span>
            </div>
            {gallery.length > 1 && (
              <div className="p-3 border-t border-[#E6E0D6] flex gap-2.5 overflow-x-auto bg-[#F7F4EF]">
                {gallery.map((url, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhoto(url)}
                    className={`w-24 h-16 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition ${
                      activePhoto === url ? 'border-[#A63429]' : 'border-transparent opacity-65 hover:opacity-100'
                    }`}
                  >
                    <img src={url} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Room Title & Specs Card Below Photo */}
          <div className="card-editorial rounded-xl p-6 sm:p-7 space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A63429]">{room.hotelName}</p>
                <h1 className="font-display text-3xl sm:text-4xl font-semibold text-[#181615] mt-1">
                  {room.roomType} — Phòng <span className="font-mono-num">{room.roomNumber}</span>
                </h1>
              </div>
              {room.packageName && (
                <span className="px-3.5 py-1 rounded-full bg-[#FAF3E8] border border-[#E8D6BA] text-[#946421] text-xs font-semibold">
                  Gói: {room.packageName}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 border-y border-[#E6E0D6] divide-y sm:divide-y-0 sm:divide-x divide-[#E6E0D6] text-sm">
              <div className="py-3.5 sm:pr-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C]">Sức chứa</div>
                <div className="font-bold text-[#181615] mt-1">{room.capacity} khách</div>
              </div>
              <div className="py-3.5 sm:px-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C]">Diện tích</div>
                <div className="font-bold text-[#181615] mt-1 font-mono-num">{room.roomSize || '35m2'}</div>
              </div>
              <div className="py-3.5 sm:px-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C]">Loại giường</div>
                <div className="font-bold text-[#181615] mt-1">{room.bedType || 'King Bed'}</div>
              </div>
              <div className="py-3.5 sm:pl-4">
                <div className="text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C]">Vị trí</div>
                <div className="font-bold text-[#181615] mt-1">Tầng {room.floorNo}</div>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#8B847C] mb-3">
                Tiện nghi trong phòng ({amenitiesList.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {amenitiesList.map((a) => (
                  <span
                    key={a}
                    className="px-3.5 py-1.5 rounded-full bg-[#F7F4EF] border border-[#E6E0D6] text-[#181615] text-xs font-medium"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          </div>

          {/* Visual Guest Reviews */}
          <div className="card-editorial rounded-xl p-6 sm:p-7 space-y-5">
            <h2 className="font-display text-xl font-semibold text-[#181615]">
              Đánh giá từ khách lưu trú ({reviews.length})
            </h2>
            {reviews.length === 0 ? (
              <p className="text-sm text-[#8B847C]">Chưa có đánh giá nào cho phòng này.</p>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-6 p-5 rounded-xl bg-[#F7F4EF] border border-[#E6E0D6] items-center">
                  <div>
                    <div className="font-mono-num text-4xl font-bold text-[#A63429] leading-none">
                      {reviewStats.avg.toFixed(1)}
                      <span className="text-base text-[#8B847C] font-normal"> / 5</span>
                    </div>
                    <div className="text-xs text-[#5E5852] mt-2">Dựa trên {reviews.length} đánh giá</div>
                  </div>
                  <div className="space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between font-semibold text-[#181615] mb-1">
                        <span>Chất lượng phòng</span>
                        <span className="font-mono-num">{reviewStats.avgRoom.toFixed(1)} / 5</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#E6E0D6] overflow-hidden">
                        <div
                          className="h-full bg-[#A63429] rounded-full"
                          style={{ width: `${(reviewStats.avgRoom / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between font-semibold text-[#181615] mb-1">
                        <span>Chất lượng dịch vụ</span>
                        <span className="font-mono-num">{reviewStats.avgService.toFixed(1)} / 5</span>
                      </div>
                      <div className="h-2 rounded-full bg-[#E6E0D6] overflow-hidden">
                        <div
                          className="h-full bg-[#181615] rounded-full"
                          style={{ width: `${(reviewStats.avgService / 5) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>

                <div className="divide-y divide-[#E6E0D6]">
                  {reviews.map((rev) => (
                    <div key={rev.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-center justify-between text-xs">
                        <strong className="text-[#181615] text-sm">{rev.guestName}</strong>
                        <span className="text-[#8B847C] font-mono-num">
                          {new Date(rev.createdAt).toLocaleDateString('vi-VN')}
                        </span>
                      </div>
                      <div className="text-xs font-semibold text-[#A63429] mt-1 font-mono-num">
                        Phòng: {rev.roomRating}/5 · Dịch vụ: {rev.serviceRating}/5
                      </div>
                      {rev.comment && <p className="text-sm text-[#5E5852] mt-1.5 leading-relaxed">{rev.comment}</p>}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Right: Sticky Reservation Card */}
        <div>
          <div className="sticky top-24 card-editorial rounded-xl p-6 space-y-5 shadow-lg">
            <div className="border-b border-[#E6E0D6] pb-4 tabular-nums">
              <div className="font-mono-num text-2xl font-bold text-[#A63429]">
                {formatVnd(room.pricePerNight)}{' '}
                <span className="font-sans text-xs font-normal text-[#8B847C]">/ đêm</span>
              </div>
              <div className="text-xs text-[#5E5852] mt-1 font-mono-num">
                Theo giờ: {formatVnd(room.hourlyRate)}
              </div>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                checkAvailability(checkIn, checkOut);
              }}
              className="space-y-3.5 text-sm"
            >
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                  Ngày vào - ngày ra
                </label>
                <DateRangeInput
                  checkIn={checkIn}
                  checkOut={checkOut}
                  disabledRanges={bookedRanges}
                  onChange={(nextIn, nextOut) => {
                    setCheckIn(nextIn);
                    setCheckOut(nextOut);
                    checkAvailability(nextIn, nextOut);
                  }}
                />
              </div>

              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1">
                    Hình thức
                  </label>
                  <select
                    value={pricingMode}
                    onChange={(e) => setPricingMode(e.target.value as PricingMode)}
                    className="w-full h-10 rounded-lg border border-[#D9D1C5] px-2 text-xs bg-white"
                  >
                    <option value="night">Theo đêm</option>
                    <option value="hour">Theo giờ</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1">
                    Người lớn
                  </label>
                  <select
                    value={adults}
                    onChange={(e) => setAdults(Number(e.target.value))}
                    className="w-full h-10 rounded-lg border border-[#D9D1C5] px-2 text-xs bg-white font-mono-num"
                  >
                    {Array.from({ length: room.capacity + 1 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1">
                    Trẻ em
                  </label>
                  <select
                    value={children}
                    onChange={(e) => setChildren(Number(e.target.value))}
                    className="w-full h-10 rounded-lg border border-[#D9D1C5] px-2 text-xs bg-white font-mono-num"
                  >
                    {[0, 1, 2].map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                disabled={checkingAvail}
                className="w-full h-9 rounded-lg border border-[#D9D1C5] bg-[#F7F4EF] hover:bg-[#EFECE6] text-[#181615] text-xs font-semibold cursor-pointer"
              >
                {checkingAvail ? 'Đang kiểm tra...' : 'Kiểm tra lịch trống'}
              </button>
            </form>

            <div
              className={`px-3.5 py-2.5 rounded-lg text-xs font-semibold border flex items-center gap-2 ${
                isAvailable
                  ? 'bg-[#EDF5F0] text-[#1E5F3E] border-[#CBE3D5]'
                  : 'bg-[#FBEFEE] text-[#9E2E23] border-[#F0CFCB]'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isAvailable ? 'bg-emerald-600' : 'bg-[#A63429]'}`} />
              <span>
                {isAvailable
                  ? 'Phòng còn trống trong khoảng ngày đã chọn.'
                  : 'Phòng đã kín lịch hoặc tạm ngưng trong ngày này.'}
              </span>
            </div>

            <div className="bg-[#F7F4EF] border border-[#E6E0D6] rounded-xl p-4 space-y-2 text-xs tabular-nums">
              <div className="flex justify-between text-[#5E5852]">
                <span>Tiền phòng ({pricingMode === 'hour' ? 'theo giờ' : `${estimate.nights} đêm`})</span>
                <span className="font-mono-num font-semibold text-[#181615]">{formatVnd(estimate.base)}</span>
              </div>
              {estimate.extra > 0 && (
                <div className="flex justify-between text-[#A63429]">
                  <span>
                    Phụ thu +{estimate.extraGuests} khách ({room.extraGuestRatePercent}%)
                  </span>
                  <span className="font-mono-num font-semibold">+{formatVnd(estimate.extra)}</span>
                </div>
              )}
              <div className="border-t border-[#E6E0D6] pt-2 flex justify-between font-bold text-[#181615]">
                <span>Tổng tiền phòng dự kiến</span>
                <span className="font-mono-num">{formatVnd(estimate.total)}</span>
              </div>
              <div className="flex justify-between text-[#A63429] font-bold">
                <span>Đặt cọc giữ phòng (50%)</span>
                <span className="font-mono-num">{formatVnd(estimate.deposit)}</span>
              </div>
              <div className="flex justify-between text-[#8B847C]">
                <span>Thanh toán phần còn lại sau</span>
                <span className="font-mono-num">{formatVnd(estimate.total - estimate.deposit)}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleGoToBooking}
              disabled={!isAvailable}
              className="btn-primary w-full h-11 rounded-lg text-xs uppercase tracking-[0.14em] cursor-pointer disabled:opacity-50"
            >
              Tiếp tục đặt phòng →
            </button>
          </div>
        </div>
      </div>

      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 bg-[#141312]/92 flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <div className="max-w-4xl w-full space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center text-white text-xs">
              <span className="font-mono-num">
                Ảnh {activeIdx + 1} / {gallery.length}
              </span>
              <div className="flex gap-2">
                {gallery.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => setActivePhoto(gallery[(activeIdx - 1 + gallery.length) % gallery.length])}
                      className="px-3.5 py-1.5 rounded-lg bg-white text-[#181615] font-semibold cursor-pointer"
                    >
                      Ảnh trước
                    </button>
                    <button
                      type="button"
                      onClick={() => setActivePhoto(gallery[(activeIdx + 1) % gallery.length])}
                      className="px-3.5 py-1.5 rounded-lg bg-white text-[#181615] font-semibold cursor-pointer"
                    >
                      Ảnh sau
                    </button>
                  </>
                )}
                <button
                  type="button"
                  onClick={() => setLightboxOpen(false)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#A63429] text-white font-semibold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
            <img src={activePhoto} alt={room.roomType} className="w-full max-h-[80vh] object-contain rounded-xl bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};

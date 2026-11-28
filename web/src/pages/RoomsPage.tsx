import React, { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { DateRangeInput } from '../components/DateRangeInput';
import { Pagination } from '../components/Pagination';
import type { ApiResponse, Hotel, PageResponse, Room } from '../types';
import { FALLBACK_HOTEL_IMG, FALLBACK_ROOM_IMG, formatVnd, ROOM_STATUS_BADGE } from '../utils/format';

const PRICE_PRESETS = [
  { label: 'Tất cả giá', value: '' },
  { label: 'Dưới 2 triệu', value: '2000000' },
  { label: 'Dưới 3 triệu', value: '3000000' },
  { label: 'Dưới 5 triệu', value: '5000000' },
];

export const RoomsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const roomsSectionRef = useRef<HTMLElement>(null);

  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  const [hotelId, setHotelId] = useState(searchParams.get('hotelId') || '');
  const [roomType, setRoomType] = useState(searchParams.get('roomType') || '');
  const [keyword, setKeyword] = useState(searchParams.get('keyword') || '');
  const [checkIn, setCheckIn] = useState(searchParams.get('checkIn') || '');
  const [checkOut, setCheckOut] = useState(searchParams.get('checkOut') || '');
  const [minCapacity, setMinCapacity] = useState(searchParams.get('minCapacity') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [sort, setSort] = useState('pricePerNight,asc');
  const [page, setPage] = useState(0);

  useEffect(() => {
    api
      .get<ApiResponse<Hotel[]>>('/hotels')
      .then((res) => setHotels(res.data.data || []))
      .catch(() => {});
  }, []);

  const fetchRooms = async (
    targetPage = page,
    overrides?: Partial<{
      hotelId: string;
      roomType: string;
      keyword: string;
      checkIn: string;
      checkOut: string;
      minCapacity: string;
      maxPrice: string;
    }>
  ) => {
    const f = {
      hotelId: overrides?.hotelId ?? hotelId,
      roomType: overrides?.roomType ?? roomType,
      keyword: overrides?.keyword ?? keyword,
      checkIn: overrides?.checkIn ?? checkIn,
      checkOut: overrides?.checkOut ?? checkOut,
      minCapacity: overrides?.minCapacity ?? minCapacity,
      maxPrice: overrides?.maxPrice ?? maxPrice,
    };

    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      if (f.hotelId) params.set('hotelId', f.hotelId);
      if (f.roomType) params.set('roomType', f.roomType);
      if (f.keyword) params.set('keyword', f.keyword);
      if (f.checkIn && f.checkOut) {
        params.set('checkIn', f.checkIn);
        params.set('checkOut', f.checkOut);
      }
      if (f.minCapacity) params.set('minCapacity', f.minCapacity);
      if (f.maxPrice) params.set('maxPrice', f.maxPrice);
      params.set('page', String(targetPage));
      params.set('size', '9');
      params.set('sort', sort);

      const res = await api.get<ApiResponse<PageResponse<Room>>>(`/rooms?${params.toString()}`);
      setRooms(res.data.data.content || []);
      setTotalPages(res.data.data.totalPages || 0);
      setTotalElements(res.data.data.totalElements || 0);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const paramHotel = searchParams.get('hotelId') || '';
    setHotelId(paramHotel);
  }, [searchParams]);

  useEffect(() => {
    fetchRooms(page);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, sort, hotelId]);

  const syncUrlAndFetch = (
    overrides?: Partial<{
      hotelId: string;
      roomType: string;
      keyword: string;
      checkIn: string;
      checkOut: string;
      minCapacity: string;
      maxPrice: string;
    }>
  ) => {
    const f = {
      hotelId: overrides?.hotelId ?? hotelId,
      roomType: overrides?.roomType ?? roomType,
      keyword: overrides?.keyword ?? keyword,
      checkIn: overrides?.checkIn ?? checkIn,
      checkOut: overrides?.checkOut ?? checkOut,
      minCapacity: overrides?.minCapacity ?? minCapacity,
      maxPrice: overrides?.maxPrice ?? maxPrice,
    };
    const nextParams = new URLSearchParams();
    if (f.hotelId) nextParams.set('hotelId', f.hotelId);
    if (f.roomType) nextParams.set('roomType', f.roomType);
    if (f.keyword) nextParams.set('keyword', f.keyword);
    if (f.checkIn) nextParams.set('checkIn', f.checkIn);
    if (f.checkOut) nextParams.set('checkOut', f.checkOut);
    if (f.minCapacity) nextParams.set('minCapacity', f.minCapacity);
    if (f.maxPrice) nextParams.set('maxPrice', f.maxPrice);
    setSearchParams(nextParams);
    setPage(0);
    fetchRooms(0, f);
  };

  const handleSelectBranch = (nextHotelId: string) => {
    setHotelId(nextHotelId);
    const nextParams = new URLSearchParams(searchParams);
    if (nextHotelId) {
      nextParams.set('hotelId', nextHotelId);
      nextParams.delete('all');
    } else {
      nextParams.delete('hotelId');
      nextParams.set('all', '1');
    }
    setSearchParams(nextParams);
    setPage(0);
    fetchRooms(0, { hotelId: nextHotelId });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBackToBranches = () => {
    setHotelId('');
    setRoomType('');
    setKeyword('');
    setCheckIn('');
    setCheckOut('');
    setMinCapacity('');
    setMaxPrice('');
    setSearchParams(new URLSearchParams());
    setPage(0);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    syncUrlAndFetch();
  };

  const handleResetAll = () => {
    setRoomType('');
    setKeyword('');
    setCheckIn('');
    setCheckOut('');
    setMinCapacity('');
    setMaxPrice('');
    syncUrlAndFetch({
      hotelId,
      roomType: '',
      keyword: '',
      checkIn: '',
      checkOut: '',
      minCapacity: '',
      maxPrice: '',
    });
  };

  const selectedHotel = hotels.find((h) => String(h.id) === hotelId);
  const showRoomsView = Boolean(
    hotelId ||
      searchParams.get('all') === '1' ||
      searchParams.get('checkIn') ||
      searchParams.get('checkOut') ||
      searchParams.get('roomType') ||
      searchParams.get('keyword') ||
      searchParams.get('maxPrice') ||
      searchParams.get('minCapacity')
  );

  return (
    <div>
      {/* Editorial Banner */}
      <section className="relative bg-[#141312] text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40 transition-all duration-500"
          style={{ backgroundImage: `url('${selectedHotel?.heroImage || '/images/hero-saigon.jpg'}')` }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(20,19,18,0.9), rgba(20,19,18,0.52))' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-14 sm:pt-32 sm:pb-16">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#B8925A]">
            <span className="w-5 h-[1px] bg-[#B8925A]" />
            <span>{selectedHotel?.city || 'Hệ thống khách sạn Spotki'}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold mt-2">
            {selectedHotel?.hotelName || 'Chi nhánh & Hạng phòng'}
          </h1>
          <p className="text-sm text-[#D8D1C7] mt-2 max-w-2xl">
            {selectedHotel?.description ||
              selectedHotel?.address ||
              'Khám phá các cơ sở Spotki tại Sài Gòn, Đà Nẵng và Hà Nội — chọn chi nhánh phù hợp trước khi lựa chọn hạng phòng.'}
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
        {!showRoomsView ? (
          /* View 1: Branch Introduction & Selection only */
          <section className="space-y-7">
            <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#E6E0D6]">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A63429]">
                  Điểm đến Spotki
                </p>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#181615] mt-1">
                  Chọn chi nhánh để xem danh sách phòng
                </h2>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-7">
              {hotels.map((h, idx) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => handleSelectBranch(String(h.id))}
                  className="text-left group card-editorial rounded-xl overflow-hidden hover:shadow-xl hover:border-[#C9C0B3] transition-all duration-300 flex flex-col cursor-pointer"
                >
                  <div className="relative aspect-[16/10] bg-[#EFECE6] overflow-hidden w-full">
                    <img
                      src={h.heroImage || FALLBACK_HOTEL_IMG}
                      alt={h.hotelName}
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                    />
                    <div
                      className="absolute inset-0"
                      style={{ background: 'linear-gradient(180deg, transparent 35%, rgba(20,19,18,0.82))' }}
                    />
                    <div className="absolute top-3.5 left-3.5 px-2.5 py-0.5 rounded bg-[#141312]/75 text-[11px] font-mono-num text-[#E5DFD5]">
                      0{idx + 1}
                    </div>
                    <div className="absolute bottom-3.5 left-4 right-4 flex items-center justify-between text-white">
                      <span className="text-[11px] font-bold uppercase tracking-[0.16em]">{h.city}</span>
                      <span className="px-2.5 py-0.5 rounded-full bg-[#B8925A]/90 text-white text-[10px] font-semibold">
                        {h.starRating} Sao
                      </span>
                    </div>
                  </div>

                  <div className="p-6 flex-1 flex flex-col justify-between w-full">
                    <div>
                      <h3 className="font-display text-xl font-semibold text-[#181615] group-hover:text-[#A63429] transition">
                        {h.hotelName}
                      </h3>
                      <p className="text-xs text-[#8B847C] mt-1">{h.address}</p>
                      {h.description && (
                        <p className="text-sm text-[#5E5852] mt-3 line-clamp-2 leading-relaxed">
                          {h.description}
                        </p>
                      )}
                    </div>
                    <div className="mt-5 pt-4 border-t border-[#F1ECE3] flex items-center justify-between text-xs font-bold text-[#A63429]">
                      <span>Xem danh sách phòng</span>
                      <span className="transition-transform group-hover:translate-x-1">→</span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        ) : (
          /* View 2: Selected Branch Rooms Only */
          <section ref={roomsSectionRef} id="rooms-section" className="space-y-6">
            <div className="flex flex-wrap items-end justify-between gap-4 pb-4 border-b border-[#E6E0D6]">
              <div>
                <button
                  type="button"
                  onClick={handleBackToBranches}
                  className="text-xs font-semibold text-[#5E5852] hover:text-[#181615] cursor-pointer mb-2 inline-block"
                >
                  ← Chọn chi nhánh khác
                </button>
                <h2 className="font-display text-2xl sm:text-3xl font-semibold text-[#181615]">
                  {selectedHotel ? `Phòng tại ${selectedHotel.hotelName}` : 'Tất cả phòng hiện có'}
                </h2>
              </div>

              <div className="flex items-center gap-3">
                <p className="text-xs text-[#5E5852]">
                  Tìm thấy <strong className="text-[#181615] font-mono-num">{totalElements}</strong> phòng
                </p>
                <div className="inline-flex rounded-lg border border-[#D9D1C5] bg-white p-0.5 text-xs font-semibold">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    className={`px-3 py-1 rounded-md cursor-pointer transition ${
                      viewMode === 'grid' ? 'bg-[#181615] text-white' : 'text-[#5E5852]'
                    }`}
                  >
                    Lưới
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('list')}
                    className={`px-3 py-1 rounded-md cursor-pointer transition ${
                      viewMode === 'list' ? 'bg-[#181615] text-white' : 'text-[#5E5852]'
                    }`}
                  >
                    Danh sách
                  </button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-[288px_minmax(0,1fr)] gap-7 items-start">
              {/* Sticky Left Vertical Filter Sidebar */}
              <aside className="lg:sticky lg:top-20">
                <form onSubmit={handleApplyFilters} className="card-editorial rounded-xl p-5 space-y-5">
                  <div className="pb-3 border-b border-[#E6E0D6] flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-[0.16em] text-[#181615]">
                      Bộ lọc phòng
                    </span>
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="text-[11px] font-semibold text-[#A63429] hover:underline cursor-pointer"
                    >
                      Đặt lại
                    </button>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C] mb-1.5">
                      Ngày vào - ngày ra
                    </label>
                    <DateRangeInput
                      checkIn={checkIn}
                      checkOut={checkOut}
                      allowClear
                      onChange={(nextIn, nextOut) => {
                        setCheckIn(nextIn);
                        setCheckOut(nextOut);
                        syncUrlAndFetch({ checkIn: nextIn, checkOut: nextOut });
                      }}
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C] mb-1.5">
                      Hạng phòng
                    </label>
                    <input
                      type="text"
                      placeholder="Deluxe, Suite, Standard..."
                      value={roomType}
                      onChange={(e) => setRoomType(e.target.value)}
                      className="w-full h-10 rounded-lg border border-[#D9D1C5] bg-[#F7F4EF]/50 px-3 text-sm focus:outline-none focus:border-[#181615]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C] mb-1.5">
                      Từ khóa tiện ích
                    </label>
                    <input
                      type="text"
                      placeholder="Ban công, Ocean, bồn tắm..."
                      value={keyword}
                      onChange={(e) => setKeyword(e.target.value)}
                      className="w-full h-10 rounded-lg border border-[#D9D1C5] bg-[#F7F4EF]/50 px-3 text-sm focus:outline-none focus:border-[#181615]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C] mb-2">
                      Mức giá
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {PRICE_PRESETS.map((preset) => (
                        <button
                          key={preset.label}
                          type="button"
                          onClick={() => {
                            setMaxPrice(preset.value);
                            syncUrlAndFetch({ maxPrice: preset.value });
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition ${
                            maxPrice === preset.value
                              ? 'bg-[#FBEFEE] text-[#A63429] border-[#E6B8B3]'
                              : 'bg-[#F7F4EF] text-[#5E5852] border-[#E6E0D6] hover:bg-[#EFECE6]'
                          }`}
                        >
                          {preset.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold uppercase tracking-[0.16em] text-[#8B847C] mb-1.5">
                      Sắp xếp
                    </label>
                    <select
                      value={sort}
                      onChange={(e) => setSort(e.target.value)}
                      className="w-full h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs font-semibold bg-white text-[#181615] focus:outline-none"
                    >
                      <option value="pricePerNight,asc">Giá: Thấp → Cao</option>
                      <option value="pricePerNight,desc">Giá: Cao → Thấp</option>
                      <option value="capacity,desc">Sức chứa lớn nhất</option>
                    </select>
                  </div>

                  <button type="submit" className="btn-primary w-full h-10 rounded-lg text-xs cursor-pointer">
                    Áp dụng lọc
                  </button>
                </form>
              </aside>

              {/* Right Room Results */}
              <div className="space-y-6 min-w-0">
                {error && (
                  <div className="p-4 rounded-xl bg-[#FBEFEE] border border-[#F0CFCB] text-[#A63429] text-sm">{error}</div>
                )}

                {loading ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className="h-80 rounded-xl bg-[#E9E3D9] animate-pulse" />
                    ))}
                  </div>
                ) : rooms.length === 0 ? (
                  <div className="card-editorial rounded-xl p-12 text-center text-[#5E5852] text-sm space-y-3">
                    <p>Không có phòng nào phù hợp với bộ lọc hiện tại.</p>
                    <button
                      type="button"
                      onClick={handleResetAll}
                      className="btn-primary px-5 py-2 rounded-lg text-xs cursor-pointer"
                    >
                      Hiển thị lại tất cả phòng
                    </button>
                  </div>
                ) : viewMode === 'grid' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {rooms.map((room) => {
                const badge = ROOM_STATUS_BADGE[room.status] || {
                  label: room.status,
                  className: 'bg-[#F3EFE8] text-[#5E5852]',
                  dot: 'bg-[#8B847C]',
                };
                const amenities = (room.amenities || '')
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .slice(0, 3);
                return (
                  <article
                    key={room.id}
                    className="group card-editorial rounded-xl overflow-hidden hover:shadow-xl hover:border-[#C9C0B3] transition-all duration-300 flex flex-col"
                  >
                    <Link
                      to={`/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
                      className="relative aspect-[16/10] bg-[#EFECE6] overflow-hidden block"
                    >
                      <img
                        src={room.imageUrl || FALLBACK_ROOM_IMG}
                        alt={room.roomType}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                      <span
                        className={`absolute top-3 right-3 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${badge.className}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                        {badge.label}
                      </span>
                    </Link>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="text-xs font-medium text-[#8B847C]">
                          {room.hotelName} · <span className="font-mono-num">P.{room.roomNumber}</span> · Tầng {room.floorNo}
                        </div>
                        <h3 className="font-display text-xl font-semibold text-[#181615] mt-1">{room.roomType}</h3>
                        <p className="text-xs text-[#5E5852] mt-1">
                          {room.capacity} khách · {room.roomSize || '35m2'} · {room.bedType || 'King Bed'}
                        </p>
                        {amenities.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3.5">
                            {amenities.map((a) => (
                              <span
                                key={a}
                                className="px-2.5 py-0.5 rounded-full bg-[#F7F4EF] border border-[#E6E0D6] text-[#5E5852] text-[11px] font-medium"
                              >
                                {a}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="mt-5 pt-4 border-t border-[#F1ECE3] flex items-center justify-between tabular-nums">
                        <div>
                          <div className="font-mono-num text-lg font-bold text-[#A63429]">
                            {formatVnd(room.pricePerNight)}{' '}
                            <span className="font-sans text-xs font-normal text-[#8B847C]">/ đêm</span>
                          </div>
                          <div className="text-[11px] text-[#8B847C] font-mono-num">
                            Theo giờ: {formatVnd(room.hourlyRate)}
                          </div>
                        </div>
                        <Link
                          to={`/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
                          className="btn-dark px-4 py-2 rounded-lg text-xs"
                        >
                          Chi tiết
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="space-y-4">
              {rooms.map((room) => {
                const badge = ROOM_STATUS_BADGE[room.status] || {
                  label: room.status,
                  className: 'bg-[#F3EFE8] text-[#5E5852]',
                  dot: 'bg-[#8B847C]',
                };
                return (
                  <article
                    key={room.id}
                    className="group card-editorial rounded-xl overflow-hidden hover:shadow-lg transition flex flex-col sm:flex-row"
                  >
                    <Link
                      to={`/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
                      className="sm:w-72 aspect-[16/10] sm:aspect-auto bg-[#EFECE6] overflow-hidden shrink-0"
                    >
                      <img
                        src={room.imageUrl || FALLBACK_ROOM_IMG}
                        alt={room.roomType}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                      />
                    </Link>
                    <div className="p-6 flex-1 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-medium text-[#8B847C]">
                            {room.hotelName} · <span className="font-mono-num">P.{room.roomNumber}</span> · Tầng {room.floorNo}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${badge.className}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                        </div>
                        <h3 className="font-display text-2xl font-semibold text-[#181615] mt-1">{room.roomType}</h3>
                        <p className="text-xs text-[#5E5852] mt-1.5">
                          {room.capacity} khách · {room.roomSize || '35m2'} · {room.bedType || 'King Bed'}
                        </p>
                        <p className="text-xs text-[#8B847C] mt-2">{room.amenities}</p>
                      </div>
                      <div className="mt-4 pt-3.5 border-t border-[#F1ECE3] flex items-center justify-between tabular-nums">
                        <div>
                          <span className="font-mono-num text-xl font-bold text-[#A63429]">
                            {formatVnd(room.pricePerNight)}
                          </span>
                          <span className="text-xs text-[#8B847C]">
                            {' '}
                            / đêm · Theo giờ: <span className="font-mono-num">{formatVnd(room.hourlyRate)}</span>
                          </span>
                        </div>
                        <Link
                          to={`/rooms/${room.id}?checkIn=${checkIn}&checkOut=${checkOut}`}
                          className="btn-primary px-5 py-2.5 rounded-lg text-xs"
                        >
                          Xem chi tiết &amp; đặt phòng
                        </Link>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!loading && rooms.length > 0 && (
            <div className="card-editorial rounded-xl px-6 py-4">
              <Pagination page={page} totalPages={totalPages} totalElements={totalElements} onPageChange={setPage} />
            </div>
          )}
              </div>
            </div>
        </section>
        )}
      </div>
    </div>
  );
};

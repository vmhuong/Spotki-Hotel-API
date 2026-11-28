import React, { useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { ConfirmModal } from '../ConfirmModal';
import { Pagination } from '../Pagination';
import { AdminHeaderBar } from './AdminHeaderBar';
import { useToast } from '../../context/ToastContext';
import type { ApiResponse, Hotel, HotelServiceItem, PageResponse, Review, Room, RoomStatus } from '../../types';
import { FALLBACK_HOTEL_IMG, FALLBACK_ROOM_IMG, formatVnd, ROOM_STATUS_BADGE } from '../../utils/format';

interface HotelFormState {
  id?: number;
  hotelName: string;
  brandName: string;
  starRating: number;
  address: string;
  city: string;
  phone: string;
  email: string;
  heroImage: string;
  description: string;
}

interface RoomFormState {
  id?: number;
  hotelId: number;
  roomNumber: string;
  roomType: string;
  floorNo: number;
  capacity: number;
  roomSize: string;
  bedType: string;
  pricePerNight: number;
  hourlyRate: number;
  extraGuestRatePercent: number;
  amenities: string;
  packageName: string;
  imageUrl: string;
  galleryUrls: string;
  status: RoomStatus;
}

interface ServiceFormState {
  id?: number;
  serviceName: string;
  unit: string;
  price: number;
}

const emptyHotelForm = (): HotelFormState => ({
  hotelName: '',
  brandName: 'Spotki Hotels',
  starRating: 5,
  address: '',
  city: '',
  phone: '',
  email: '',
  heroImage: '',
  description: '',
});

const emptyRoomForm = (hotelId: number): RoomFormState => ({
  hotelId,
  roomNumber: '',
  roomType: 'Deluxe King',
  floorNo: 1,
  capacity: 2,
  roomSize: '32m2',
  bedType: '1 Giường King',
  pricePerNight: 1800000,
  hourlyRate: 450000,
  extraGuestRatePercent: 25,
  amenities: 'Wi-Fi, Điều hòa, Bàn làm việc, Minibar',
  packageName: '',
  imageUrl: '',
  galleryUrls: '',
  status: 'available',
});

const emptyServiceForm = (): ServiceFormState => ({
  serviceName: '',
  unit: 'lần',
  price: 100000,
});

export const CatalogCrudTab: React.FC<{
  isGlobalAdmin: boolean;
  section?: 'all' | 'hotels' | 'rooms' | 'services' | 'reviews';
}> = ({ isGlobalAdmin, section = 'all' }) => {
  const toast = useToast();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [services, setServices] = useState<HotelServiceItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(0);
  const [reviewsTotalElements, setReviewsTotalElements] = useState(0);

  // Branch & room filtering
  const [branchFilterId, setBranchFilterId] = useState<string>('all');
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>('');
  const [roomKeyword, setRoomKeyword] = useState<string>('');

  // Popup modals for Create / Edit
  const [hotelModal, setHotelModal] = useState<{ mode: 'create' | 'edit'; data: HotelFormState } | null>(null);
  const [roomModal, setRoomModal] = useState<{ mode: 'create' | 'edit'; data: RoomFormState } | null>(null);
  const [serviceModal, setServiceModal] = useState<{ mode: 'create' | 'edit'; data: ServiceFormState } | null>(null);
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<Room | null>(null);

  const loadAll = async (revPage = reviewsPage) => {
    try {
      const [hRes, rRes, sRes, revRes] = await Promise.all([
        api.get<ApiResponse<Hotel[]>>('/admin/hotels'),
        api.get<ApiResponse<PageResponse<Room>>>('/rooms?page=0&size=200&sort=hotel.id,asc&sort=roomNumber,asc'),
        api.get<ApiResponse<HotelServiceItem[]>>('/admin/services'),
        api.get<ApiResponse<PageResponse<Review>>>(`/admin/reviews?page=${revPage}&size=8`),
      ]);
      setHotels(hRes.data.data || []);
      setRooms(rRes.data.data.content || []);
      setServices(sRes.data.data || []);
      setReviews(revRes.data.data.content || []);
      setReviewsTotalPages(revRes.data.data.totalPages || 0);
      setReviewsTotalElements(revRes.data.data.totalElements || 0);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadAll(reviewsPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reviewsPage]);

  const filteredRooms = useMemo(() => {
    const q = roomKeyword.trim().toLowerCase();
    return rooms.filter((r) => {
      if (branchFilterId !== 'all' && String(r.hotelId) !== branchFilterId) return false;
      if (roomStatusFilter && r.status !== roomStatusFilter) return false;
      if (!q) return true;
      return (
        r.roomNumber.toLowerCase().includes(q) ||
        r.roomType.toLowerCase().includes(q) ||
        r.hotelName.toLowerCase().includes(q)
      );
    });
  }, [rooms, branchFilterId, roomStatusFilter, roomKeyword]);

  const roomsByBranch = useMemo(() => {
    const branchesToShow =
      branchFilterId === 'all' ? hotels : hotels.filter((h) => String(h.id) === branchFilterId);

    const groups = branchesToShow.map((hotel) => ({
      hotel,
      items: filteredRooms.filter((r) => r.hotelId === hotel.id),
    }));

    // Fallback in case rooms reference a hotel not returned in hotels list
    const knownHotelIds = new Set(hotels.map((h) => h.id));
    const orphanRooms = filteredRooms.filter((r) => !knownHotelIds.has(r.hotelId));
    if (orphanRooms.length > 0 && branchFilterId === 'all') {
      groups.push({
        hotel: {
          id: 0,
          hotelName: orphanRooms[0].hotelName || 'Cơ sở khác',
          brandName: 'Spotki Hotels',
          starRating: 5,
          address: '',
          city: '',
          isActive: true,
        },
        items: orphanRooms,
      });
    }

    return groups;
  }, [hotels, filteredRooms, branchFilterId]);

  const roomCountByHotel = useMemo(() => {
    const map = new Map<number, number>();
    rooms.forEach((r) => {
      map.set(r.hotelId, (map.get(r.hotelId) || 0) + 1);
    });
    return map;
  }, [rooms]);

  const openCreateHotel = () => setHotelModal({ mode: 'create', data: emptyHotelForm() });

  const openEditHotel = (h: Hotel) =>
    setHotelModal({
      mode: 'edit',
      data: {
        id: h.id,
        hotelName: h.hotelName,
        brandName: h.brandName || 'Spotki Hotels',
        starRating: h.starRating || 5,
        address: h.address || '',
        city: h.city || '',
        phone: h.phone || '',
        email: h.email || '',
        heroImage: h.heroImage || '',
        description: h.description || '',
      },
    });

  const submitHotelModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hotelModal) return;
    const payload = {
      hotelName: hotelModal.data.hotelName.trim(),
      brandName: hotelModal.data.brandName.trim() || 'Spotki Hotels',
      starRating: hotelModal.data.starRating,
      address: hotelModal.data.address.trim(),
      city: hotelModal.data.city.trim(),
      phone: hotelModal.data.phone.trim() || null,
      email: hotelModal.data.email.trim() || null,
      heroImage: hotelModal.data.heroImage.trim() || null,
      description: hotelModal.data.description.trim() || null,
    };
    try {
      if (hotelModal.mode === 'create') {
        await api.post('/admin/hotels', payload);
        toast.success('Đã tạo chi nhánh mới.');
      } else {
        await api.put(`/admin/hotels/${hotelModal.data.id}`, payload);
        toast.success('Đã cập nhật thông tin chi nhánh.');
      }
      setHotelModal(null);
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openCreateRoom = (defaultHotelId?: number) => {
    const fallbackId =
      defaultHotelId ||
      (branchFilterId !== 'all' ? Number(branchFilterId) : hotels[0]?.id || 1);
    setRoomModal({ mode: 'create', data: emptyRoomForm(fallbackId) });
  };

  const openEditRoom = (r: Room) =>
    setRoomModal({
      mode: 'edit',
      data: {
        id: r.id,
        hotelId: r.hotelId,
        roomNumber: r.roomNumber,
        roomType: r.roomType,
        floorNo: r.floorNo || 1,
        capacity: r.capacity || 2,
        roomSize: r.roomSize || '',
        bedType: r.bedType || '',
        pricePerNight: r.pricePerNight,
        hourlyRate: r.hourlyRate,
        extraGuestRatePercent: r.extraGuestRatePercent ?? 25,
        amenities: r.amenities || '',
        packageName: r.packageName || '',
        imageUrl: r.imageUrl || '',
        galleryUrls: r.galleryUrls || '',
        status: r.status || 'available',
      },
    });

  const submitRoomModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomModal) return;
    const payload = {
      hotelId: roomModal.data.hotelId,
      roomNumber: roomModal.data.roomNumber.trim(),
      roomType: roomModal.data.roomType.trim(),
      floorNo: roomModal.data.floorNo,
      capacity: roomModal.data.capacity,
      roomSize: roomModal.data.roomSize.trim() || null,
      bedType: roomModal.data.bedType.trim() || null,
      pricePerNight: roomModal.data.pricePerNight,
      hourlyRate: roomModal.data.hourlyRate,
      extraGuestRatePercent: roomModal.data.extraGuestRatePercent,
      amenities: roomModal.data.amenities.trim() || null,
      packageName: roomModal.data.packageName.trim() || null,
      imageUrl: roomModal.data.imageUrl.trim() || null,
      galleryUrls: roomModal.data.galleryUrls.trim() || null,
      status: roomModal.data.status,
    };
    try {
      if (roomModal.mode === 'create') {
        await api.post('/admin/rooms', payload);
        toast.success('Đã tạo phòng mới.');
      } else {
        await api.put(`/admin/rooms/${roomModal.data.id}`, payload);
        toast.success('Đã cập nhật thông tin phòng.');
      }
      setRoomModal(null);
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const confirmDeleteRoom = async () => {
    if (!deleteRoomTarget) return;
    try {
      await api.delete(`/admin/rooms/${deleteRoomTarget.id}`);
      toast.success(`Đã xóa mềm phòng ${deleteRoomTarget.roomNumber}.`);
      setDeleteRoomTarget(null);
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openCreateService = () => setServiceModal({ mode: 'create', data: emptyServiceForm() });

  const openEditService = (s: HotelServiceItem) =>
    setServiceModal({
      mode: 'edit',
      data: {
        id: s.id,
        serviceName: s.serviceName,
        unit: s.unit,
        price: s.price,
      },
    });

  const submitServiceModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceModal) return;
    const payload = {
      serviceName: serviceModal.data.serviceName.trim(),
      unit: serviceModal.data.unit.trim(),
      price: serviceModal.data.price,
    };
    try {
      if (serviceModal.mode === 'create') {
        await api.post('/admin/services', payload);
        toast.success('Đã tạo dịch vụ mới.');
      } else {
        await api.put(`/admin/services/${serviceModal.data.id}`, payload);
        toast.success('Đã cập nhật dịch vụ.');
      }
      setServiceModal(null);
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {(section === 'all' || section === 'hotels') && (
        <div className="space-y-5">
          {isGlobalAdmin && section === 'hotels' && (
            <AdminHeaderBar>
              <button
                type="button"
                onClick={openCreateHotel}
                className="btn-primary px-4 h-9 rounded-lg text-xs cursor-pointer"
              >
                + Thêm chi nhánh
              </button>
            </AdminHeaderBar>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
            {hotels.map((h) => (
              <div key={h.id} className="rounded-xl border border-[#E6E0D6] overflow-hidden bg-white flex flex-col">
                <div className="aspect-video bg-[#EFECE6]">
                  <img src={h.heroImage || FALLBACK_HOTEL_IMG} alt={h.hotelName} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div>
                    <div className="font-display font-semibold text-[#181615]">{h.hotelName}</div>
                    <div className="text-xs text-[#8B847C] mt-0.5">
                      {h.city} · {h.isActive ? 'Đang hoạt động' : 'Tạm ngưng'} · {roomCountByHotel.get(h.id) || 0} phòng
                    </div>
                    {h.address && <div className="text-xs text-[#5E5852] mt-1">{h.address}</div>}
                  </div>
                  {isGlobalAdmin && (
                    <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#F1ECE3]">
                      <button
                        type="button"
                        onClick={() => openEditHotel(h)}
                        className="px-3 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold cursor-pointer"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          api
                            .patch(`/admin/hotels/${h.id}/status?active=${!h.isActive}`)
                            .then(() => {
                              toast.success('Đã đổi trạng thái chi nhánh.');
                              loadAll();
                            })
                            .catch((err) => toast.error(getErrorMessage(err)))
                        }
                        className="px-3 py-1.5 rounded-lg bg-[#F7F4EF] hover:bg-[#EFECE6] text-xs font-semibold cursor-pointer"
                      >
                        {h.isActive ? 'Tắt' : 'Bật'}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {(section === 'all' || section === 'rooms') && (
        <div className="space-y-5">
          <AdminHeaderBar>
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setBranchFilterId('all')}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition ${
                  branchFilterId === 'all'
                    ? 'bg-[#181615] text-white border-[#181615]'
                    : 'bg-white text-[#5E5852] border-[#D9D1C5] hover:border-[#181615]'
                }`}
              >
                Tất cả ({rooms.length})
              </button>
              {hotels.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => setBranchFilterId(String(h.id))}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold border cursor-pointer transition ${
                    branchFilterId === String(h.id)
                      ? 'bg-[#A63429] text-white border-[#A63429]'
                      : 'bg-white text-[#5E5852] border-[#D9D1C5] hover:border-[#181615]'
                  }`}
                >
                  {h.city || h.hotelName} ({roomCountByHotel.get(h.id) || 0})
                </button>
              ))}
            </div>

            <select
              value={roomStatusFilter}
              onChange={(e) => setRoomStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-[#D9D1C5] px-2.5 text-xs bg-white"
            >
              <option value="">Tất cả trạng thái</option>
              <option value="available">Sẵn sàng</option>
              <option value="occupied">Đang có khách</option>
              <option value="cleaning">Chờ / Đang dọn</option>
              <option value="maintenance">Bảo trì</option>
            </select>
            <input
              placeholder="Tìm số phòng, loại..."
              value={roomKeyword}
              onChange={(e) => setRoomKeyword(e.target.value)}
              className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs w-40 bg-white focus:outline-none focus:border-[#181615]"
            />
            <button
              type="button"
              onClick={() => openCreateRoom()}
              className="btn-primary px-4 h-9 rounded-lg text-xs cursor-pointer"
            >
              + Tạo phòng mới
            </button>
          </AdminHeaderBar>

          {/* Per-Branch Room Groups */}
          {roomsByBranch.map(({ hotel, items }) => (
              <div key={hotel.id || hotel.hotelName} className="card-editorial rounded-xl overflow-hidden">
                <div className="px-5 py-4 bg-[#FAF8F5] border-b border-[#E6E0D6] flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2.5">
                      <span className="w-2 h-2 rounded-full bg-[#A63429]" />
                      <h4 className="font-display text-lg font-semibold text-[#181615]">{hotel.hotelName}</h4>
                      {hotel.city && (
                        <span className="px-2.5 py-0.5 rounded-full bg-white border border-[#E6E0D6] text-[11px] font-semibold text-[#5E5852]">
                          {hotel.city}
                        </span>
                      )}
                    </div>
                    {hotel.address && <p className="text-xs text-[#8B847C] mt-0.5 pl-4">{hotel.address}</p>}
                  </div>
                </div>

                {items.length === 0 ? (
                  <div className="p-8 text-center text-xs text-[#8B847C]">
                    Không có phòng nào phù hợp bộ lọc tại chi nhánh này.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs sm:text-sm tabular-nums">
                      <thead className="bg-[#F3EFE8] text-[#5E5852] text-[11px] font-bold uppercase tracking-[0.12em] border-b border-[#E6E0D6]">
                        <tr>
                          <th className="text-left px-4 py-3">Số phòng</th>
                          <th className="text-left px-4 py-3">Loại phòng &amp; Chi tiết</th>
                          <th className="text-right px-4 py-3">Giá đêm / Giờ</th>
                          <th className="text-center px-4 py-3">Trạng thái</th>
                          <th className="text-right px-4 py-3">Thao tác</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#E6E0D6]">
                        {items.map((r) => {
                          const badge = ROOM_STATUS_BADGE[r.status];
                          return (
                            <tr key={r.id} className="hover:bg-[#F7F4EF]/60 transition-colors">
                              <td className="px-4 py-3 font-bold">
                                <div className="flex items-center gap-3">
                                  <img
                                    src={r.imageUrl || FALLBACK_ROOM_IMG}
                                    alt={r.roomNumber}
                                    className="w-12 h-9 rounded-lg object-cover bg-[#EFECE6] shrink-0"
                                  />
                                  <div>
                                    <div className="font-mono-num text-[#181615]">{r.roomNumber}</div>
                                    <div className="text-[11px] font-normal text-[#8B847C]">Tầng {r.floorNo}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="px-4 py-3">
                                <div className="font-medium text-[#181615]">{r.roomType}</div>
                                <div className="text-[11px] text-[#8B847C] mt-0.5">
                                  {r.capacity} khách {r.roomSize ? `· ${r.roomSize}` : ''} {r.bedType ? `· ${r.bedType}` : ''}
                                </div>
                              </td>
                              <td className="px-4 py-3 text-right font-mono-num">
                                <div className="font-semibold text-[#181615]">{formatVnd(r.pricePerNight)}</div>
                                <div className="text-[11px] text-[#8B847C]">{formatVnd(r.hourlyRate)} / giờ</div>
                              </td>
                              <td className="px-4 py-3 text-center">
                                <span
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${
                                    badge?.className || 'bg-[#F3EFE8] text-[#5E5852] border-[#E6E0D6]'
                                  }`}
                                >
                                  {badge?.dot && <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />}
                                  {badge?.label || r.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-right">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openEditRoom(r)}
                                    className="px-3 py-1 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold cursor-pointer"
                                  >
                                    Sửa
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setDeleteRoomTarget(r)}
                                    className="px-3 py-1 rounded-lg bg-[#FBEFEE] hover:bg-[#F6DFDC] text-[#A63429] text-xs font-semibold cursor-pointer"
                                  >
                                    Xóa
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
          ))}
        </div>
      )}

      {(section === 'all' || section === 'services' || section === 'reviews') && (
        <div className={section === 'reviews' ? 'space-y-6' : 'grid grid-cols-1 lg:grid-cols-2 gap-6'}>
          {section === 'services' && (
            <AdminHeaderBar>
              <button
                type="button"
                onClick={openCreateService}
                className="btn-primary px-4 h-9 rounded-lg text-xs cursor-pointer"
              >
                + Thêm dịch vụ
              </button>
            </AdminHeaderBar>
          )}
          {(section === 'all' || section === 'services') && (
          <div className="card-editorial p-6 rounded-xl space-y-4">
            <h3 className="font-display font-semibold text-xl text-[#181615]">Dịch vụ ({services.length})</h3>
            <div className="space-y-2 text-xs tabular-nums">
              {services.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F4EF] border border-[#E6E0D6] gap-2"
                >
                  <div>
                    <span className="font-semibold text-[#181615]">{s.serviceName}</span>{' '}
                    <span className="font-mono-num text-[#5E5852]">
                      ({formatVnd(s.price)} / {s.unit})
                    </span>
                    {!s.isActive && <span className="ml-2 text-[#A63429] font-semibold">[Đã tắt]</span>}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openEditService(s)}
                      className="px-2.5 py-1 rounded-lg border border-[#D9D1C5] bg-white font-semibold cursor-pointer"
                    >
                      Sửa
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        api.patch(`/admin/services/${s.id}/status?active=${!s.isActive}`).then(() => {
                          toast.success('Đã cập nhật trạng thái dịch vụ.');
                          loadAll();
                        })
                      }
                      className="px-2.5 py-1 rounded-lg border border-[#D9D1C5] bg-white font-semibold cursor-pointer"
                    >
                      {s.isActive ? 'Tắt' : 'Bật'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
          )}

          <div className="card-editorial p-6 rounded-xl space-y-4">
            <h3 className="font-display font-semibold text-xl text-[#181615]">
              Kiểm duyệt đánh giá ({reviewsTotalElements})
            </h3>
            {reviews.length === 0 ? (
              <p className="text-xs text-[#8B847C]">Chưa có đánh giá nào.</p>
            ) : (
              <>
                <div className="space-y-2.5 text-xs">
                  {reviews.map((rev) => (
                    <div
                      key={rev.id}
                      className="flex items-center justify-between p-3.5 rounded-xl bg-[#F7F4EF] border border-[#E6E0D6] gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#181615]">
                          {rev.guestName} · Phòng #{rev.roomId}{' '}
                          <span className="font-mono-num text-[#A63429]">({rev.roomRating}/5)</span>
                        </div>
                        <div className="text-[#5E5852] break-words mt-0.5">{rev.comment}</div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          api
                            .patch(
                              `/admin/reviews/${rev.id}/status?status=${rev.status === 'visible' ? 'hidden' : 'visible'}`
                            )
                            .then(() => {
                              toast.success('Đã cập nhật hiển thị đánh giá.');
                              loadAll();
                            })
                        }
                        className="px-3 py-1 rounded-lg border border-[#D9D1C5] bg-white font-semibold cursor-pointer shrink-0"
                      >
                        {rev.status === 'visible' ? 'Ẩn' : 'Hiện'}
                      </button>
                    </div>
                  ))}
                </div>
                <Pagination
                  page={reviewsPage}
                  totalPages={reviewsTotalPages}
                  totalElements={reviewsTotalElements}
                  onPageChange={setReviewsPage}
                />
              </>
            )}
          </div>
        </div>
      )}

      <ConfirmModal
        open={Boolean(deleteRoomTarget)}
        title="Xóa mềm phòng?"
        description={`Phòng ${deleteRoomTarget?.roomNumber || ''} sẽ bị ẩn khỏi danh sách đặt phòng mới.`}
        confirmText="Xác nhận xóa"
        variant="danger"
        onConfirm={confirmDeleteRoom}
        onCancel={() => setDeleteRoomTarget(null)}
      />

      {/* Popup Create / Edit Hotel */}
      {hotelModal && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={submitHotelModal}
            className="bg-white rounded-xl p-6 max-w-lg w-full space-y-3 text-sm max-h-[90vh] overflow-y-auto border border-[#E6E0D6] shadow-2xl"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">
              {hotelModal.mode === 'create'
                ? 'Thêm chi nhánh mới'
                : `Sửa chi nhánh: ${hotelModal.data.hotelName}`}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Tên chi nhánh *</label>
                <input
                  required
                  value={hotelModal.data.hotelName}
                  onChange={(e) =>
                    setHotelModal({ ...hotelModal, data: { ...hotelModal.data, hotelName: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Thành phố *</label>
                <input
                  required
                  value={hotelModal.data.city}
                  onChange={(e) =>
                    setHotelModal({ ...hotelModal, data: { ...hotelModal.data, city: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Địa chỉ *</label>
              <input
                required
                value={hotelModal.data.address}
                onChange={(e) =>
                  setHotelModal({ ...hotelModal, data: { ...hotelModal.data, address: e.target.value } })
                }
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Hotline</label>
                <input
                  value={hotelModal.data.phone}
                  onChange={(e) =>
                    setHotelModal({ ...hotelModal, data: { ...hotelModal.data, phone: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Email</label>
                <input
                  type="email"
                  value={hotelModal.data.email}
                  onChange={(e) =>
                    setHotelModal({ ...hotelModal, data: { ...hotelModal.data, email: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Hạng sao</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={hotelModal.data.starRating}
                  onChange={(e) =>
                    setHotelModal({
                      ...hotelModal,
                      data: { ...hotelModal.data, starRating: Number(e.target.value) },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Ảnh đại diện (URL)</label>
              <input
                placeholder="/images/hero-saigon.jpg"
                value={hotelModal.data.heroImage}
                onChange={(e) =>
                  setHotelModal({ ...hotelModal, data: { ...hotelModal.data, heroImage: e.target.value } })
                }
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Mô tả</label>
              <textarea
                rows={2}
                value={hotelModal.data.description}
                onChange={(e) =>
                  setHotelModal({ ...hotelModal, data: { ...hotelModal.data, description: e.target.value } })
                }
                className="w-full rounded-lg border border-[#D9D1C5] p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setHotelModal(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                {hotelModal.mode === 'create' ? 'Tạo chi nhánh' : 'Lưu chi nhánh'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Popup Create / Edit Room */}
      {roomModal && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={submitRoomModal}
            className="bg-white rounded-xl p-6 max-w-xl w-full space-y-3 text-sm max-h-[90vh] overflow-y-auto border border-[#E6E0D6] shadow-2xl"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">
              {roomModal.mode === 'create' ? 'Tạo phòng mới' : `Chỉnh sửa phòng ${roomModal.data.roomNumber}`}
            </h3>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Chi nhánh *</label>
                <select
                  disabled={roomModal.mode === 'edit'}
                  value={roomModal.data.hotelId}
                  onChange={(e) =>
                    setRoomModal({ ...roomModal, data: { ...roomModal.data, hotelId: Number(e.target.value) } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-2.5 bg-white disabled:bg-[#F7F4EF]"
                >
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.hotelName}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Số phòng *</label>
                <input
                  required
                  placeholder="VD: SG-301"
                  value={roomModal.data.roomNumber}
                  onChange={(e) =>
                    setRoomModal({ ...roomModal, data: { ...roomModal.data, roomNumber: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Loại phòng *</label>
                <input
                  required
                  placeholder="Deluxe King"
                  value={roomModal.data.roomType}
                  onChange={(e) =>
                    setRoomModal({ ...roomModal, data: { ...roomModal.data, roomType: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Giá đêm *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={roomModal.data.pricePerNight}
                  onChange={(e) =>
                    setRoomModal({
                      ...roomModal,
                      data: { ...roomModal.data, pricePerNight: Number(e.target.value) },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Giá giờ *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={roomModal.data.hourlyRate}
                  onChange={(e) =>
                    setRoomModal({
                      ...roomModal,
                      data: { ...roomModal.data, hourlyRate: Number(e.target.value) },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Tầng</label>
                <input
                  type="number"
                  min={1}
                  value={roomModal.data.floorNo}
                  onChange={(e) =>
                    setRoomModal({ ...roomModal, data: { ...roomModal.data, floorNo: Number(e.target.value) } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Sức chứa</label>
                <input
                  type="number"
                  min={1}
                  value={roomModal.data.capacity}
                  onChange={(e) =>
                    setRoomModal({ ...roomModal, data: { ...roomModal.data, capacity: Number(e.target.value) } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Diện tích</label>
                <input
                  value={roomModal.data.roomSize}
                  onChange={(e) =>
                    setRoomModal({ ...roomModal, data: { ...roomModal.data, roomSize: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Loại giường</label>
                <input
                  value={roomModal.data.bedType}
                  onChange={(e) =>
                    setRoomModal({ ...roomModal, data: { ...roomModal.data, bedType: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Phụ thu khách thêm (%)</label>
                <input
                  type="number"
                  min={0}
                  value={roomModal.data.extraGuestRatePercent}
                  onChange={(e) =>
                    setRoomModal({
                      ...roomModal,
                      data: { ...roomModal.data, extraGuestRatePercent: Number(e.target.value) },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Tiện nghi</label>
                <input
                  value={roomModal.data.amenities}
                  onChange={(e) =>
                    setRoomModal({ ...roomModal, data: { ...roomModal.data, amenities: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Trạng thái phòng &amp; Bảo trì</label>
                <select
                  value={roomModal.data.status}
                  onChange={(e) =>
                    setRoomModal({
                      ...roomModal,
                      data: { ...roomModal.data, status: e.target.value as RoomStatus },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 bg-white"
                >
                  <option value="available">Sẵn sàng đón khách</option>
                  <option value="maintenance">Đang bảo trì (tạm ngưng đặt)</option>
                  <option value="cleaning">Chờ / Đang dọn phòng</option>
                  <option value="occupied">Đang có khách</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Ảnh chính (URL)</label>
              <input
                value={roomModal.data.imageUrl}
                onChange={(e) =>
                  setRoomModal({ ...roomModal, data: { ...roomModal.data, imageUrl: e.target.value } })
                }
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Thư viện ảnh (URLs cách nhau dấu phẩy)</label>
              <textarea
                rows={2}
                value={roomModal.data.galleryUrls}
                onChange={(e) =>
                  setRoomModal({ ...roomModal, data: { ...roomModal.data, galleryUrls: e.target.value } })
                }
                className="w-full rounded-lg border border-[#D9D1C5] p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRoomModal(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                {roomModal.mode === 'create' ? 'Tạo phòng' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Popup Create / Edit Service */}
      {serviceModal && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={submitServiceModal}
            className="bg-white rounded-xl p-6 max-w-sm w-full space-y-3 text-sm border border-[#E6E0D6] shadow-2xl"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">
              {serviceModal.mode === 'create' ? 'Thêm dịch vụ mới' : 'Chỉnh sửa dịch vụ'}
            </h3>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Tên dịch vụ *</label>
              <input
                required
                value={serviceModal.data.serviceName}
                onChange={(e) =>
                  setServiceModal({
                    ...serviceModal,
                    data: { ...serviceModal.data, serviceName: e.target.value },
                  })
                }
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Đơn vị *</label>
                <input
                  required
                  value={serviceModal.data.unit}
                  onChange={(e) =>
                    setServiceModal({ ...serviceModal, data: { ...serviceModal.data, unit: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Giá (VND) *</label>
                <input
                  type="number"
                  required
                  min={0}
                  value={serviceModal.data.price}
                  onChange={(e) =>
                    setServiceModal({
                      ...serviceModal,
                      data: { ...serviceModal.data, price: Number(e.target.value) },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setServiceModal(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                {serviceModal.mode === 'create' ? 'Thêm dịch vụ' : 'Lưu dịch vụ'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { ConfirmModal } from '../ConfirmModal';
import { Pagination } from '../Pagination';
import { useToast } from '../../context/ToastContext';
import type { ApiResponse, Hotel, HotelServiceItem, PageResponse, Review, Room } from '../../types';
import { FALLBACK_HOTEL_IMG, FALLBACK_ROOM_IMG, formatVnd } from '../../utils/format';

export const CatalogCrudTab: React.FC<{
  isGlobalAdmin: boolean;
  section?: 'all' | 'hotels' | 'rooms' | 'services';
}> = ({ isGlobalAdmin, section = 'all' }) => {
  const toast = useToast();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [roomsPage, setRoomsPage] = useState(0);
  const [roomsTotalPages, setRoomsTotalPages] = useState(0);
  const [roomsTotalElements, setRoomsTotalElements] = useState(0);

  const [services, setServices] = useState<HotelServiceItem[]>([]);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsPage, setReviewsPage] = useState(0);
  const [reviewsTotalPages, setReviewsTotalPages] = useState(0);
  const [reviewsTotalElements, setReviewsTotalElements] = useState(0);

  const [hotelName, setHotelName] = useState('');
  const [city, setCity] = useState('');
  const [address, setAddress] = useState('');

  const [roomHotelId, setRoomHotelId] = useState(1);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState('');
  const [pricePerNight, setPricePerNight] = useState(1800000);
  const [hourlyRate, setHourlyRate] = useState(450000);

  const [serviceName, setServiceName] = useState('');
  const [serviceUnit, setServiceUnit] = useState('lan');
  const [servicePrice, setServicePrice] = useState(50000);

  const [editingHotel, setEditingHotel] = useState<Hotel | null>(null);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [editingService, setEditingService] = useState<HotelServiceItem | null>(null);
  const [deleteRoomTarget, setDeleteRoomTarget] = useState<Room | null>(null);

  const loadAll = async (rPage = roomsPage, revPage = reviewsPage) => {
    try {
      const [hRes, rRes, sRes, revRes] = await Promise.all([
        api.get<ApiResponse<Hotel[]>>('/admin/hotels'),
        api.get<ApiResponse<PageResponse<Room>>>(`/rooms?page=${rPage}&size=10`),
        api.get<ApiResponse<HotelServiceItem[]>>('/admin/services'),
        api.get<ApiResponse<PageResponse<Review>>>(`/admin/reviews?page=${revPage}&size=8`),
      ]);
      setHotels(hRes.data.data || []);
      setRooms(rRes.data.data.content || []);
      setRoomsTotalPages(rRes.data.data.totalPages || 0);
      setRoomsTotalElements(rRes.data.data.totalElements || 0);
      setServices(sRes.data.data || []);
      setReviews(revRes.data.data.content || []);
      setReviewsTotalPages(revRes.data.data.totalPages || 0);
      setReviewsTotalElements(revRes.data.data.totalElements || 0);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadAll(roomsPage, reviewsPage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomsPage, reviewsPage]);

  const createHotel = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/hotels', { hotelName, city, address, starRating: 5 });
      setHotelName('');
      setCity('');
      setAddress('');
      toast.success('Đã tạo chi nhánh mới.');
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveHotelEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingHotel) return;
    try {
      await api.put(`/admin/hotels/${editingHotel.id}`, {
        hotelName: editingHotel.hotelName,
        brandName: editingHotel.brandName,
        starRating: editingHotel.starRating,
        address: editingHotel.address,
        city: editingHotel.city,
        phone: editingHotel.phone,
        email: editingHotel.email,
        heroImage: editingHotel.heroImage,
        description: editingHotel.description,
      });
      setEditingHotel(null);
      toast.success('Đã cập nhật thông tin chi nhánh.');
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const createRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/rooms', { hotelId: roomHotelId, roomNumber, roomType, pricePerNight, hourlyRate });
      setRoomNumber('');
      setRoomType('');
      toast.success('Đã tạo phòng mới.');
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveRoomEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingRoom) return;
    try {
      await api.put(`/admin/rooms/${editingRoom.id}`, {
        hotelId: editingRoom.hotelId,
        roomNumber: editingRoom.roomNumber,
        roomType: editingRoom.roomType,
        floorNo: editingRoom.floorNo,
        capacity: editingRoom.capacity,
        roomSize: editingRoom.roomSize,
        bedType: editingRoom.bedType,
        pricePerNight: editingRoom.pricePerNight,
        hourlyRate: editingRoom.hourlyRate,
        extraGuestRatePercent: editingRoom.extraGuestRatePercent,
        amenities: editingRoom.amenities,
        packageName: editingRoom.packageName,
        imageUrl: editingRoom.imageUrl,
        galleryUrls: editingRoom.galleryUrls,
      });
      setEditingRoom(null);
      toast.success('Đã cập nhật thông tin phòng.');
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

  const createService = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/services', { serviceName, unit: serviceUnit, price: servicePrice });
      setServiceName('');
      toast.success('Đã tạo dịch vụ mới.');
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveServiceEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingService) return;
    try {
      await api.put(`/admin/services/${editingService.id}`, {
        serviceName: editingService.serviceName,
        unit: editingService.unit,
        price: editingService.price,
      });
      setEditingService(null);
      toast.success('Đã cập nhật dịch vụ.');
      loadAll();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6">
      {(section === 'all' || section === 'hotels') && (
        <div className="card-editorial p-6 rounded-xl space-y-5">
          <h3 className="font-display font-semibold text-xl text-[#181615]">
            Chi nhánh khách sạn ({hotels.length})
          </h3>
          {isGlobalAdmin && (
            <form onSubmit={createHotel} className="grid grid-cols-1 sm:grid-cols-4 gap-2.5">
              <input
                required
                placeholder="Tên khách sạn"
                value={hotelName}
                onChange={(e) => setHotelName(e.target.value)}
                className="h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs"
              />
              <input
                required
                placeholder="Thành phố"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                className="h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs"
              />
              <input
                required
                placeholder="Địa chỉ"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs"
              />
              <button type="submit" className="btn-primary h-10 rounded-lg text-xs cursor-pointer">
                + Thêm chi nhánh
              </button>
            </form>
          )}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 text-sm">
            {hotels.map((h) => (
              <div key={h.id} className="rounded-xl border border-[#E6E0D6] overflow-hidden bg-white">
                <div className="aspect-video bg-[#EFECE6]">
                  <img src={h.heroImage || FALLBACK_HOTEL_IMG} alt={h.hotelName} className="w-full h-full object-cover" />
                </div>
                <div className="p-4 flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-display font-semibold text-[#181615] truncate">{h.hotelName}</div>
                    <div className="text-xs text-[#8B847C] mt-0.5">
                      {h.city} · {h.isActive ? 'Đang hoạt động' : 'Tạm ngưng'}
                    </div>
                  </div>
                  {isGlobalAdmin && (
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() => setEditingHotel(h)}
                        className="px-3 py-1 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold cursor-pointer"
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
                        className="px-3 py-1 rounded-lg bg-[#F7F4EF] hover:bg-[#EFECE6] text-xs font-semibold cursor-pointer"
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
        <div className="card-editorial p-6 rounded-xl space-y-5">
          <h3 className="font-display font-semibold text-xl text-[#181615]">
            Danh sách phòng ({roomsTotalElements})
          </h3>
          <form onSubmit={createRoom} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
            <select
              value={roomHotelId}
              onChange={(e) => setRoomHotelId(Number(e.target.value))}
              className="h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs bg-white"
            >
              {hotels.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.hotelName}
                </option>
              ))}
            </select>
            <input
              required
              placeholder="Số phòng (SG-301)"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              className="h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs font-mono-num"
            />
            <input
              required
              placeholder="Loại phòng"
              value={roomType}
              onChange={(e) => setRoomType(e.target.value)}
              className="h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs"
            />
            <input
              type="number"
              required
              placeholder="Giá đêm"
              value={pricePerNight}
              onChange={(e) => setPricePerNight(Number(e.target.value))}
              className="h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs font-mono-num"
            />
            <input
              type="number"
              required
              placeholder="Giá giờ"
              value={hourlyRate}
              onChange={(e) => setHourlyRate(Number(e.target.value))}
              className="h-10 rounded-lg border border-[#D9D1C5] px-3 text-xs font-mono-num"
            />
            <button type="submit" className="btn-primary h-10 rounded-lg text-xs cursor-pointer">
              + Tạo phòng
            </button>
          </form>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm tabular-nums">
              <thead className="bg-[#F3EFE8] text-[#5E5852] text-[11px] font-bold uppercase tracking-[0.12em] border-b border-[#E6E0D6]">
                <tr>
                  <th className="text-left px-3.5 py-3">Số phòng</th>
                  <th className="text-left px-3.5 py-3">Chi nhánh</th>
                  <th className="text-left px-3.5 py-3">Loại phòng</th>
                  <th className="text-right px-3.5 py-3">Giá đêm</th>
                  <th className="text-center px-3.5 py-3">Trạng thái</th>
                  <th className="text-right px-3.5 py-3">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0D6]">
                {rooms.map((r) => (
                  <tr key={r.id} className="hover:bg-[#F7F4EF]/60 transition-colors">
                    <td className="px-3.5 py-3 font-bold">
                      <div className="flex items-center gap-3">
                        <img
                          src={r.imageUrl || FALLBACK_ROOM_IMG}
                          alt={r.roomNumber}
                          className="w-12 h-9 rounded-lg object-cover bg-[#EFECE6] shrink-0"
                        />
                        <span className="font-mono-num text-[#181615]">{r.roomNumber}</span>
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-[#5E5852]">{r.hotelName}</td>
                    <td className="px-3.5 py-3 font-medium text-[#181615]">{r.roomType}</td>
                    <td className="px-3.5 py-3 text-right font-mono-num font-semibold text-[#181615]">
                      {formatVnd(r.pricePerNight)}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <select
                        value={r.status}
                        onChange={(e) =>
                          api
                            .patch(`/admin/rooms/${r.id}/status?status=${e.target.value}`)
                            .then(() => {
                              toast.success(`Đã cập nhật trạng thái phòng ${r.roomNumber}.`);
                              loadAll();
                            })
                            .catch((err) => toast.error(getErrorMessage(err)))
                        }
                        className="rounded-lg border border-[#D9D1C5] px-2.5 py-1 text-xs bg-white"
                      >
                        <option value="available">available</option>
                        <option value="occupied">occupied</option>
                        <option value="cleaning">cleaning</option>
                        <option value="maintenance">maintenance</option>
                      </select>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setEditingRoom(r)}
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
                ))}
              </tbody>
            </table>
          </div>
          <Pagination
            page={roomsPage}
            totalPages={roomsTotalPages}
            totalElements={roomsTotalElements}
            onPageChange={setRoomsPage}
          />
        </div>
      )}

      {(section === 'all' || section === 'services') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-editorial p-6 rounded-xl space-y-4">
            <h3 className="font-display font-semibold text-xl text-[#181615]">Dịch vụ ({services.length})</h3>
            <form onSubmit={createService} className="grid grid-cols-5 gap-2">
              <input
                required
                placeholder="Tên DV"
                value={serviceName}
                onChange={(e) => setServiceName(e.target.value)}
                className="col-span-2 h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs"
              />
              <input
                required
                placeholder="Đơn vị"
                value={serviceUnit}
                onChange={(e) => setServiceUnit(e.target.value)}
                className="h-9 rounded-lg border border-[#D9D1C5] px-2 text-xs"
              />
              <input
                type="number"
                required
                placeholder="Giá"
                value={servicePrice}
                onChange={(e) => setServicePrice(Number(e.target.value))}
                className="h-9 rounded-lg border border-[#D9D1C5] px-2 text-xs font-mono-num"
              />
              <button type="submit" className="btn-primary h-9 rounded-lg text-xs cursor-pointer">
                + Thêm
              </button>
            </form>
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
                      onClick={() => setEditingService(s)}
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

      {editingHotel && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={saveHotelEdit}
            className="bg-white rounded-xl p-6 max-w-lg w-full space-y-3 text-sm max-h-[90vh] overflow-y-auto border border-[#E6E0D6] shadow-2xl"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">
              Sửa chi nhánh: {editingHotel.hotelName}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Tên chi nhánh</label>
                <input
                  required
                  value={editingHotel.hotelName}
                  onChange={(e) => setEditingHotel({ ...editingHotel, hotelName: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Thành phố</label>
                <input
                  required
                  value={editingHotel.city}
                  onChange={(e) => setEditingHotel({ ...editingHotel, city: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Địa chỉ</label>
              <input
                required
                value={editingHotel.address}
                onChange={(e) => setEditingHotel({ ...editingHotel, address: e.target.value })}
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Hotline</label>
                <input
                  value={editingHotel.phone || ''}
                  onChange={(e) => setEditingHotel({ ...editingHotel, phone: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Hạng sao</label>
                <input
                  type="number"
                  min={1}
                  max={5}
                  value={editingHotel.starRating}
                  onChange={(e) => setEditingHotel({ ...editingHotel, starRating: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Ảnh đại diện (URL)</label>
              <input
                value={editingHotel.heroImage || ''}
                onChange={(e) => setEditingHotel({ ...editingHotel, heroImage: e.target.value })}
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Mô tả</label>
              <textarea
                rows={2}
                value={editingHotel.description || ''}
                onChange={(e) => setEditingHotel({ ...editingHotel, description: e.target.value })}
                className="w-full rounded-lg border border-[#D9D1C5] p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingHotel(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                Lưu chi nhánh
              </button>
            </div>
          </form>
        </div>
      )}

      {editingRoom && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={saveRoomEdit}
            className="bg-white rounded-xl p-6 max-w-xl w-full space-y-3 text-sm max-h-[90vh] overflow-y-auto border border-[#E6E0D6] shadow-2xl"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">
              Chỉnh sửa phòng {editingRoom.roomNumber}
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Số phòng</label>
                <input
                  required
                  value={editingRoom.roomNumber}
                  onChange={(e) => setEditingRoom({ ...editingRoom, roomNumber: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Loại phòng</label>
                <input
                  required
                  value={editingRoom.roomType}
                  onChange={(e) => setEditingRoom({ ...editingRoom, roomType: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Giá đêm</label>
                <input
                  type="number"
                  required
                  value={editingRoom.pricePerNight}
                  onChange={(e) => setEditingRoom({ ...editingRoom, pricePerNight: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Giá giờ</label>
                <input
                  type="number"
                  required
                  value={editingRoom.hourlyRate}
                  onChange={(e) => setEditingRoom({ ...editingRoom, hourlyRate: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Sức chứa</label>
                <input
                  type="number"
                  min={1}
                  value={editingRoom.capacity}
                  onChange={(e) => setEditingRoom({ ...editingRoom, capacity: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Diện tích</label>
                <input
                  value={editingRoom.roomSize || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, roomSize: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Giường</label>
                <input
                  value={editingRoom.bedType || ''}
                  onChange={(e) => setEditingRoom({ ...editingRoom, bedType: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Tiện nghi</label>
              <input
                value={editingRoom.amenities || ''}
                onChange={(e) => setEditingRoom({ ...editingRoom, amenities: e.target.value })}
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Ảnh chính (URL)</label>
              <input
                value={editingRoom.imageUrl || ''}
                onChange={(e) => setEditingRoom({ ...editingRoom, imageUrl: e.target.value })}
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Thư viện ảnh (URLs cách nhau dấu phẩy)</label>
              <textarea
                rows={2}
                value={editingRoom.galleryUrls || ''}
                onChange={(e) => setEditingRoom({ ...editingRoom, galleryUrls: e.target.value })}
                className="w-full rounded-lg border border-[#D9D1C5] p-2.5"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingRoom(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                Lưu thay đổi
              </button>
            </div>
          </form>
        </div>
      )}

      {editingService && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={saveServiceEdit}
            className="bg-white rounded-xl p-6 max-w-sm w-full space-y-3 text-sm border border-[#E6E0D6] shadow-2xl"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">Chỉnh sửa dịch vụ</h3>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Tên dịch vụ</label>
              <input
                required
                value={editingService.serviceName}
                onChange={(e) => setEditingService({ ...editingService, serviceName: e.target.value })}
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Đơn vị</label>
                <input
                  required
                  value={editingService.unit}
                  onChange={(e) => setEditingService({ ...editingService, unit: e.target.value })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Giá (VND)</label>
                <input
                  type="number"
                  required
                  value={editingService.price}
                  onChange={(e) => setEditingService({ ...editingService, price: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingService(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                Lưu dịch vụ
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

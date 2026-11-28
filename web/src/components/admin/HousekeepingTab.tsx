import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import type { ApiResponse, Room } from '../../types';
import { ROOM_STATUS_BADGE } from '../../utils/format';
import { AdminHeaderBar } from './AdminHeaderBar';

export const HousekeepingTab: React.FC<{ canEdit?: boolean }> = ({ canEdit = true }) => {
  const toast = useToast();
  const [rooms, setRooms] = useState<Room[]>([]);
  const [filter, setFilter] = useState<'all' | 'cleaning' | 'maintenance'>('all');

  const loadQueue = async () => {
    try {
      const res = await api.get<ApiResponse<Room[]>>('/admin/housekeeping/rooms');
      setRooms(res.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadQueue();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateRoom = async (id: number, payload: Record<string, string>, successMsg: string) => {
    try {
      await api.patch(`/admin/housekeeping/rooms/${id}`, payload);
      toast.success(successMsg);
      loadQueue();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const filtered = rooms.filter((r) => (filter === 'all' ? true : r.status === filter));

  return (
    <div className="space-y-5">
      <AdminHeaderBar>
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          {(['all', 'cleaning', 'maintenance'] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setFilter(key)}
              className={`px-3.5 py-1.5 rounded-full border cursor-pointer transition ${
                filter === key
                  ? 'bg-[#181615] text-white border-[#181615]'
                  : 'bg-white text-[#5E5852] border-[#D9D1C5] hover:border-[#181615]'
              }`}
            >
              {key === 'all' ? `Tất cả (${rooms.length})` : key === 'cleaning' ? 'Chờ / Đang dọn' : 'Bảo trì'}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={loadQueue}
          className="px-4 h-9 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold cursor-pointer"
        >
          Làm mới
        </button>
      </AdminHeaderBar>

      {filtered.length === 0 ? (
        <div className="card-editorial rounded-xl p-12 text-center text-[#8B847C] text-sm">
          Hiện không có phòng nào cần dọn dẹp hoặc bảo trì.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filtered.map((r) => {
            const badge = ROOM_STATUS_BADGE[r.status] || {
              label: r.status,
              className: '',
              dot: 'bg-[#8B847C]',
            };
            return (
              <div key={r.id} className="card-editorial p-5 rounded-xl space-y-3.5">
                <div className="flex items-center justify-between">
                  <span className="font-mono-num font-bold text-xl text-[#181615]">P.{r.roomNumber}</span>
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold ${badge.className}`}
                  >
                    {badge.dot && <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />}
                    {badge.label}
                  </span>
                </div>
                <div className="text-xs text-[#5E5852]">
                  {r.hotelName} · Tầng {r.floorNo} · {r.roomType}
                </div>
                <div className="text-xs font-medium text-[#181615] bg-[#F7F4EF] px-3 py-2 rounded-lg border border-[#E6E0D6]">
                  Tiến độ: {r.housekeepingStatus || 'Chưa nhận dọn'}
                </div>
                {canEdit && (
                  <div className="flex gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => updateRoom(r.id, { housekeepingStatus: 'cleaning' }, `Phòng ${r.roomNumber}: Đã nhận dọn.`)}
                      className="flex-1 py-2 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-[#181615] text-xs font-semibold cursor-pointer"
                    >
                      Bắt đầu dọn
                    </button>
                    <button
                      type="button"
                      onClick={() => updateRoom(r.id, { roomStatus: 'available' }, `Phòng ${r.roomNumber}: Đã sẵn sàng đón khách.`)}
                      className="flex-1 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold cursor-pointer"
                    >
                      Hoàn tất
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

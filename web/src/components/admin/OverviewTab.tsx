import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import type { ApiResponse, Hotel, ReportSummary, RevenueReport, TopRoomReport } from '../../types';
import { formatVnd } from '../../utils/format';
import { HorizontalBarChart, RoomStatusDonutChart } from './Charts';
import { AdminHeaderBar } from './AdminHeaderBar';

export const OverviewTab: React.FC = () => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const isBranchScopedStaff = Boolean(currentUser?.hotelId && currentUser.role !== 'ROLE_ADMIN');
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [topRooms, setTopRooms] = useState<TopRoomReport[]>([]);
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [hotelId, setHotelId] = useState(() =>
    isBranchScopedStaff && currentUser?.hotelId ? String(currentUser.hotelId) : ''
  );
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');

  const loadReports = async () => {
    try {
      const effectiveHotelId = isBranchScopedStaff && currentUser?.hotelId ? String(currentUser.hotelId) : hotelId;
      const params = new URLSearchParams();
      if (effectiveHotelId) params.set('hotelId', effectiveHotelId);
      if (from) params.set('from', from);
      if (to) params.set('to', to);
      const summaryQuery = effectiveHotelId ? `?hotelId=${effectiveHotelId}` : '';
      const topQuery = effectiveHotelId ? `?limit=5&hotelId=${effectiveHotelId}` : '?limit=5';
      const [sRes, rRes, tRes, hRes] = await Promise.all([
        api.get<ApiResponse<ReportSummary>>(`/admin/reports/summary${summaryQuery}`),
        api.get<ApiResponse<RevenueReport>>(`/admin/reports/revenue?${params.toString()}`),
        api.get<ApiResponse<TopRoomReport[]>>(`/admin/reports/top-rooms${topQuery}`),
        api.get<ApiResponse<Hotel[]>>('/hotels'),
      ]);
      setSummary(sRes.data.data);
      setRevenue(rRes.data.data);
      setTopRooms(tRes.data.data || []);
      setHotels(hRes.data.data || []);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const occupancyPct = summary && summary.totalRooms > 0 ? Math.round((summary.occupiedRooms / summary.totalRooms) * 100) : 0;
  const availablePct = summary && summary.totalRooms > 0 ? Math.round((summary.availableRooms / summary.totalRooms) * 100) : 0;

  return (
    <div className="space-y-5 tabular-nums">
      <AdminHeaderBar>
        <select
          disabled={isBranchScopedStaff}
          value={isBranchScopedStaff && currentUser?.hotelId ? String(currentUser.hotelId) : hotelId}
          onChange={(e) => setHotelId(e.target.value)}
          className="h-9 rounded-lg border border-[#D9D1C5] px-2.5 text-xs bg-white disabled:bg-[#F3EFE8] disabled:text-[#5E5852]"
        >
          <option value="">Tất cả chi nhánh</option>
          {hotels.map((h) => (
            <option key={h.id} value={h.id}>
              {h.hotelName}
            </option>
          ))}
        </select>
        <input
          type="date"
          aria-label="Từ ngày"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="h-9 rounded-lg border border-[#D9D1C5] px-2.5 text-xs bg-white font-mono-num"
        />
        <input
          type="date"
          aria-label="Đến ngày"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="h-9 rounded-lg border border-[#D9D1C5] px-2.5 text-xs bg-white font-mono-num"
        />
        <button type="button" onClick={loadReports} className="btn-primary px-4 h-9 rounded-lg text-xs cursor-pointer">
          Xem báo cáo
        </button>
      </AdminHeaderBar>

      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <div className="card-editorial p-5 rounded-xl border-t-4 border-t-emerald-700">
            <div className="text-[10px] font-bold text-[#8B847C] uppercase tracking-[0.16em]">Tổng doanh thu</div>
            <div className="font-mono-num text-2xl font-bold text-[#181615] mt-2">{formatVnd(summary.totalRevenue)}</div>
            <div className="text-xs text-emerald-700 font-medium mt-2">Đã đối soát từ thanh toán hợp lệ</div>
          </div>

          <div className="card-editorial p-5 rounded-xl border-t-4 border-t-[#A63429]">
            <div className="flex justify-between text-[10px] font-bold text-[#8B847C] uppercase tracking-[0.16em]">
              <span>Công suất đang ở</span>
              <span className="font-mono-num text-[#A63429]">{occupancyPct}%</span>
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#181615] mt-2">
              {summary.occupiedRooms} / {summary.totalRooms} phòng
            </div>
            <div className="h-1.5 rounded-full bg-[#EFECE6] mt-3 overflow-hidden">
              <div className="h-full bg-[#A63429] rounded-full" style={{ width: `${occupancyPct}%` }} />
            </div>
          </div>

          <div className="card-editorial p-5 rounded-xl border-t-4 border-t-[#181615]">
            <div className="flex justify-between text-[10px] font-bold text-[#8B847C] uppercase tracking-[0.16em]">
              <span>Phòng sẵn sàng</span>
              <span className="font-mono-num text-emerald-700">{availablePct}%</span>
            </div>
            <div className="font-mono-num text-2xl font-bold text-[#181615] mt-2">
              {summary.availableRooms} phòng trống
            </div>
            <div className="h-1.5 rounded-full bg-[#EFECE6] mt-3 overflow-hidden">
              <div className="h-full bg-emerald-700 rounded-full" style={{ width: `${availablePct}%` }} />
            </div>
          </div>

          <div className="card-editorial p-5 rounded-xl border-t-4 border-t-[#B8925A]">
            <div className="text-[10px] font-bold text-[#8B847C] uppercase tracking-[0.16em]">Tổng đơn đặt phòng</div>
            <div className="font-mono-num text-2xl font-bold text-[#181615] mt-2">{summary.totalBookings}</div>
            <div className="text-xs text-[#5E5852] mt-2">
              Chờ nhận: <strong className="font-mono-num">{summary.activeBookedCount}</strong> · Hoàn tất:{' '}
              <strong className="font-mono-num">{summary.checkedOutCount}</strong>
            </div>
          </div>
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card-editorial p-6 rounded-xl">
            <h3 className="font-display font-semibold text-[#181615] text-lg mb-5">Cơ cấu tình trạng quỹ phòng</h3>
            <RoomStatusDonutChart
              total={summary.totalRooms}
              available={summary.availableRooms}
              occupied={summary.occupiedRooms}
              cleaning={summary.cleaningRooms}
            />
          </div>

          <div className="card-editorial p-6 rounded-xl">
            <h3 className="font-display font-semibold text-[#181615] text-lg mb-5">Phễu trạng thái đặt phòng</h3>
            <HorizontalBarChart
              unitLabel="đơn"
              items={[
                { label: 'Chờ nhận phòng (Booked)', value: summary.activeBookedCount, barClass: 'bg-[#B8925A]' },
                { label: 'Đang lưu trú (Checked-in)', value: summary.checkedInCount, barClass: 'bg-[#A63429]' },
                { label: 'Hoàn tất (Checked-out)', value: summary.checkedOutCount, barClass: 'bg-[#1E5F3E]' },
              ]}
            />
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-editorial p-6 rounded-xl space-y-4">
          <h3 className="font-display font-semibold text-[#181615] text-lg">
            Doanh thu theo bộ lọc hiện tại
          </h3>
          {revenue && (
            <div className="p-5 rounded-xl bg-[#F7F4EF] border border-[#E6E0D6] flex items-center justify-between">
              <div>
                <div className="text-xs text-[#5E5852]">Số giao dịch</div>
                <div className="font-mono-num text-2xl font-bold text-[#181615] mt-1">{revenue.transactionCount}</div>
              </div>
              <div className="text-right">
                <div className="text-xs text-[#5E5852]">Tổng doanh thu</div>
                <div className="font-mono-num text-2xl font-bold text-[#A63429] mt-1">
                  {formatVnd(revenue.totalRevenue)}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="card-editorial p-6 rounded-xl">
          <h3 className="font-display font-semibold text-[#181615] text-lg mb-5">Top phòng được đặt nhiều nhất</h3>
          {topRooms.length === 0 ? (
            <p className="text-xs text-[#8B847C]">Chưa có dữ liệu.</p>
          ) : (
            <HorizontalBarChart
              unitLabel="lượt"
              items={topRooms.map((r) => ({
                label: `${r.roomNumber} · ${r.roomType}`,
                sublabel: r.hotelName,
                value: r.bookingCount,
                barClass: 'bg-[#A63429]',
              }))}
            />
          )}
        </div>
      </div>
    </div>
  );
};

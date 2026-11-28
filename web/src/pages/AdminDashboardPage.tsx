import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { OverviewTab } from '../components/admin/OverviewTab';
import { FrontDeskTab } from '../components/admin/FrontDeskTab';
import { LiveRoomsTab } from '../components/admin/LiveRoomsTab';
import { HousekeepingTab } from '../components/admin/HousekeepingTab';
import { CatalogCrudTab } from '../components/admin/CatalogCrudTab';
import { PeopleAndAuditTab } from '../components/admin/PeopleAndAuditTab';

type AdminView =
  | 'dashboard'
  | 'hotels'
  | 'rooms'
  | 'bookings'
  | 'live_rooms'
  | 'housekeeping'
  | 'guests'
  | 'staff'
  | 'services'
  | 'reviews'
  | 'invoices'
  | 'reports';

const ROLE_LABELS: Record<string, string> = {
  ROLE_ADMIN: 'Quản trị viên',
  ROLE_MANAGER: 'Quản lý cơ sở',
  ROLE_RECEPTION: 'Lễ tân',
  ROLE_ACCOUNTING: 'Kế toán',
  ROLE_HOUSEKEEPING: 'Buồng phòng',
};

export const AdminDashboardPage: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const role = user?.role || '';
  const [clock, setClock] = useState(() => new Date().toLocaleString('vi-VN'));

  useEffect(() => {
    const id = window.setInterval(() => {
      setClock(new Date().toLocaleString('vi-VN'));
    }, 1000);
    return () => window.clearInterval(id);
  }, []);

  const menuItems = useMemo(() => {
    const items: Array<{ id: AdminView; label: string; group: string; heading: string; roles: string[] }> = [
      { id: 'dashboard', group: 'Vận hành', label: 'Tổng quan', heading: 'Tổng quan vận hành', roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_ACCOUNTING'] },
      { id: 'bookings', group: 'Vận hành', label: 'Đặt phòng', heading: 'Quản lý đặt phòng & Lễ tân', roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_RECEPTION'] },
      { id: 'live_rooms', group: 'Vận hành', label: 'Phòng đang sử dụng', heading: 'Phòng đang sử dụng', roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_RECEPTION', 'ROLE_HOUSEKEEPING'] },
      { id: 'housekeeping', group: 'Vận hành', label: 'Dọn phòng', heading: 'Hàng đợi dọn phòng & Bảo trì', roles: ['ROLE_ADMIN', 'ROLE_MANAGER', 'ROLE_HOUSEKEEPING'] },
      { id: 'reviews', group: 'Vận hành', label: 'Đánh giá cơ sở', heading: 'Đánh giá khách hàng tại cơ sở', roles: ['ROLE_MANAGER'] },
      { id: 'hotels', group: 'Danh mục', label: 'Chi nhánh', heading: 'Quản lý chi nhánh khách sạn', roles: ['ROLE_ADMIN'] },
      { id: 'rooms', group: 'Danh mục', label: 'Danh sách phòng', heading: 'Quản lý hạng phòng & Giá', roles: ['ROLE_ADMIN'] },
      { id: 'services', group: 'Danh mục', label: 'Dịch vụ & Đánh giá', heading: 'Dịch vụ tại phòng & Kiểm duyệt đánh giá', roles: ['ROLE_ADMIN'] },
      { id: 'guests', group: 'Tài chính & Hệ thống', label: 'Khách hàng', heading: 'Quản lý thông tin & Lịch sử khách hàng', roles: ['ROLE_ADMIN'] },
      { id: 'staff', group: 'Tài chính & Hệ thống', label: 'Nhân viên', heading: 'Quản lý nhân viên & Phân quyền', roles: ['ROLE_ADMIN'] },
      { id: 'invoices', group: 'Tài chính & Hệ thống', label: 'Giao dịch thanh toán', heading: 'Lịch sử thu tiền & Thanh toán', roles: ['ROLE_ADMIN', 'ROLE_ACCOUNTING'] },
      { id: 'reports', group: 'Tài chính & Hệ thống', label: 'Báo cáo & Audit', heading: 'Báo cáo doanh thu & Nhật ký bảo mật', roles: ['ROLE_ADMIN'] },
    ];
    return items.filter((item) => item.roles.includes(role));
  }, [role]);

  const [view, setView] = useState<AdminView>(() => menuItems[0]?.id || 'housekeeping');
  const activeItem = menuItems.find((i) => i.id === view) || menuItems[0];

  useEffect(() => {
    if (menuItems.length > 0 && !menuItems.some((m) => m.id === view)) {
      setView(menuItems[0].id);
    }
  }, [menuItems, view]);

  const groupedMenu = useMemo(() => {
    const groups: Record<string, typeof menuItems> = {};
    menuItems.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return Object.entries(groups);
  }, [menuItems]);

  const handleLogout = async () => {
    await logout();
    navigate('/auth?mode=admin');
  };

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[252px_minmax(0,1fr)] bg-[#F7F4EF] text-[#181615]">
      {/* Standalone Obsidian Sidebar */}
      <aside className="bg-[#141312] text-[#D2CCC4] p-5 lg:sticky lg:top-0 lg:h-screen lg:overflow-y-auto border-r border-[#292624] flex flex-col">
        <div className="pb-5 border-b border-[#292624]">
          <div className="flex items-center gap-2.5">
            <span className="w-1.5 h-5 bg-[#A63429] rounded-full" />
            <span className="font-display text-lg font-bold text-white tracking-tight">SPOTKI</span>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-[#B8925A]">PMS</span>
          </div>
          <div className="font-mono-num text-[11px] text-[#8B847C] mt-2">{clock}</div>
          <div className="mt-4 pt-3.5 border-t border-[#262320] text-xs">
            <div className="font-semibold text-white">{user?.fullName}</div>
            <div className="text-[#9C958D] mt-0.5">
              {ROLE_LABELS[role] || role} · {user?.hotelId ? `CN #${user.hotelId}` : 'Toàn chuỗi'}
            </div>
          </div>
        </div>

        <nav className="py-4 flex-1 space-y-5">
          {groupedMenu.map(([groupName, items]) => (
            <div key={groupName}>
              <div className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-[0.18em] text-[#7A736C]">
                {groupName}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-1 gap-1">
                {items.map((item) => {
                  const active = view === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setView(item.id)}
                      className={`px-3 py-2 rounded-lg text-xs font-medium text-left transition cursor-pointer flex items-center justify-between ${
                        active
                          ? 'bg-[#A63429] text-white font-semibold'
                          : 'text-[#C8C1B8] hover:bg-[#1F1D1B] hover:text-white'
                      }`}
                    >
                      <span>{item.label}</span>
                      {active && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="pt-4 border-t border-[#292624] flex flex-col gap-1 text-xs">
          <Link
            to="/"
            className="px-3 py-2 rounded-lg text-[#C8C1B8] hover:bg-[#1F1D1B] hover:text-white font-medium"
          >
            ← Về trang chủ
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="px-3 py-2 rounded-lg text-[#E4796E] hover:bg-[#1F1D1B] font-semibold text-left cursor-pointer"
          >
            Đăng xuất
          </button>
        </div>
      </aside>

      {/* Main Workspace */}
      <main className="p-4 sm:p-6 min-w-0 space-y-5">
        <div className="border-b border-[#E6E0D6] pb-3.5 flex flex-wrap items-center justify-between gap-3">
          <div className="shrink-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#A63429]">Vận hành khách sạn</p>
            <h1 className="font-display text-xl sm:text-2xl font-semibold text-[#181615] mt-0.5">
              {activeItem?.heading || 'Quản trị hệ thống'}
            </h1>
          </div>
          <div id="admin-header-controls" className="flex flex-wrap items-center justify-end gap-2 flex-1 min-w-[260px]" />
        </div>

        {(view === 'dashboard' || view === 'reports') && (
          <div className="space-y-7">
            <OverviewTab />
            {view === 'reports' && role === 'ROLE_ADMIN' && (
              <PeopleAndAuditTab role={role} section="audit" />
            )}
          </div>
        )}

        {view === 'hotels' && <CatalogCrudTab isGlobalAdmin={role === 'ROLE_ADMIN'} section="hotels" />}
        {view === 'rooms' && <CatalogCrudTab isGlobalAdmin={role === 'ROLE_ADMIN'} section="rooms" />}
        {view === 'services' && <CatalogCrudTab isGlobalAdmin={role === 'ROLE_ADMIN'} section="services" />}
        {view === 'reviews' && <CatalogCrudTab isGlobalAdmin={false} section="reviews" />}

        {view === 'bookings' && <FrontDeskTab key="fd-bookings" initialView="bookings" />}
        {view === 'live_rooms' && <LiveRoomsTab role={role} />}

        {view === 'housekeeping' && <HousekeepingTab canEdit={role !== 'ROLE_RECEPTION'} />}

        {view === 'guests' && <PeopleAndAuditTab role={role} section="guests" />}
        {view === 'staff' && <PeopleAndAuditTab role={role} section="staff" />}
        {view === 'invoices' && <PeopleAndAuditTab role={role} section="invoices" />}
      </main>
    </div>
  );
};

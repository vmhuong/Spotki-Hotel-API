import React, { useEffect, useMemo, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import { Pagination } from '../Pagination';
import { AdminHeaderBar } from './AdminHeaderBar';
import { useToast } from '../../context/ToastContext';
import type {
  ApiResponse,
  Booking,
  Guest,
  Hotel,
  PageResponse,
  PaymentRecord,
  SecurityLog,
  StaffRole,
  StaffUser,
} from '../../types';
import { BOOKING_STATUS_BADGE, formatDateTime, formatVnd } from '../../utils/format';

const STAFF_ROLE_LABELS: Record<StaffRole, string> = {
  admin: 'Quản trị viên (Toàn hệ thống)',
  manager: 'Quản lý cơ sở',
  reception: 'Lễ tân',
  accounting: 'Kế toán',
  housekeeping: 'Buồng phòng',
};

interface StaffFormState {
  id?: number;
  username: string;
  fullName: string;
  email: string;
  password: string;
  role: StaffRole;
  hotelId: number; // 0 = global / null
  isActive: boolean;
}

interface GuestFormState {
  id?: number;
  fullName: string;
  phone: string;
  email: string;
  identityNo: string;
  address: string;
  isVip: boolean;
  customerIsActive: boolean;
}

const emptyGuestForm = (): GuestFormState => ({
  fullName: '',
  phone: '',
  email: '',
  identityNo: '',
  address: '',
  isVip: false,
  customerIsActive: true,
});

export const PeopleAndAuditTab: React.FC<{
  role: string;
  section?: 'all' | 'guests' | 'staff' | 'invoices' | 'audit';
}> = ({ role, section = 'all' }) => {
  const toast = useToast();
  const { user: currentUser } = useAuth();
  const isAdmin = role === 'ROLE_ADMIN';
  const canManagePeople = isAdmin || role === 'ROLE_MANAGER' || role === 'ROLE_RECEPTION';
  const canManageStaff = isAdmin || role === 'ROLE_MANAGER';
  const canViewPayments = isAdmin || role === 'ROLE_MANAGER' || role === 'ROLE_ACCOUNTING';

  const [hotels, setHotels] = useState<Hotel[]>([]);

  // Guests state
  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestPage, setGuestPage] = useState(0);
  const [guestTotalPages, setGuestTotalPages] = useState(0);
  const [guestTotalElements, setGuestTotalElements] = useState(0);
  const [guestKeyword, setGuestKeyword] = useState('');
  const [guestVipFilter, setGuestVipFilter] = useState<'all' | 'vip' | 'regular'>('all');
  const [guestFormModal, setGuestFormModal] = useState<{ mode: 'create' | 'edit'; data: GuestFormState } | null>(null);
  const [guestHistoryModal, setGuestHistoryModal] = useState<{ guest: Guest; bookings: Booking[]; loading: boolean } | null>(
    null
  );

  // Staff state
  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffPage, setStaffPage] = useState(0);
  const [staffTotalPages, setStaffTotalPages] = useState(0);
  const [staffTotalElements, setStaffTotalElements] = useState(0);
  const [staffKeyword, setStaffKeyword] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('');
  const [staffHotelFilter, setStaffHotelFilter] = useState('');
  const [staffModal, setStaffModal] = useState<{ mode: 'create' | 'edit'; data: StaffFormState } | null>(null);

  // Payments & Audit logs state
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [paymentPage, setPaymentPage] = useState(0);
  const [paymentTotalPages, setPaymentTotalPages] = useState(0);
  const [paymentTotalElements, setPaymentTotalElements] = useState(0);

  const [logs, setLogs] = useState<SecurityLog[]>([]);
  const [logPage, setLogPage] = useState(0);
  const [logTotalPages, setLogTotalPages] = useState(0);
  const [logTotalElements, setLogTotalElements] = useState(0);
  const [logActionFilter, setLogActionFilter] = useState('');
  const [logActorType, setLogActorType] = useState('');
  const [logStatusFilter, setLogStatusFilter] = useState('');

  const hotelNameById = useMemo(() => {
    const map = new Map<number, string>();
    hotels.forEach((h) => map.set(h.id, h.hotelName));
    return map;
  }, [hotels]);

  const loadHotels = async () => {
    try {
      const endpoint = canManageStaff ? '/admin/hotels' : '/hotels';
      const res = await api.get<ApiResponse<Hotel[]>>(endpoint);
      setHotels(res.data.data || []);
    } catch {
      api
        .get<ApiResponse<Hotel[]>>('/hotels')
        .then((r) => setHotels(r.data.data || []))
        .catch(() => {});
    }
  };

  const loadGuests = async (p = guestPage, vipFilter = guestVipFilter) => {
    if (!canManagePeople) return;
    const params = new URLSearchParams({ page: String(p), size: '10' });
    if (guestKeyword.trim()) params.set('keyword', guestKeyword.trim());
    if (vipFilter === 'vip') params.set('isVip', 'true');
    if (vipFilter === 'regular') params.set('isVip', 'false');
    const gRes = await api.get<ApiResponse<PageResponse<Guest>>>(`/admin/guests?${params.toString()}`);
    setGuests(gRes.data.data.content || []);
    setGuestTotalPages(gRes.data.data.totalPages || 0);
    setGuestTotalElements(gRes.data.data.totalElements || 0);
  };

  const loadStaff = async (p = staffPage) => {
    if (!canManageStaff) return;
    const params = new URLSearchParams({ page: String(p), size: '9' });
    if (staffHotelFilter) params.set('hotelId', staffHotelFilter);
    if (staffRoleFilter) params.set('role', staffRoleFilter);
    if (staffKeyword.trim()) params.set('keyword', staffKeyword.trim());
    const sRes = await api.get<ApiResponse<PageResponse<StaffUser>>>(`/admin/staff?${params.toString()}`);
    setStaff(sRes.data.data.content || []);
    setStaffTotalPages(sRes.data.data.totalPages || 0);
    setStaffTotalElements(sRes.data.data.totalElements || 0);
  };

  const loadPayments = async (p = paymentPage) => {
    if (!canViewPayments) return;
    const pRes = await api.get<ApiResponse<PageResponse<PaymentRecord>>>(`/admin/payments?page=${p}&size=10`);
    setPayments(pRes.data.data.content || []);
    setPaymentTotalPages(pRes.data.data.totalPages || 0);
    setPaymentTotalElements(pRes.data.data.totalElements || 0);
  };

  const loadLogs = async (p = logPage) => {
    if (!isAdmin) return;
    const params = new URLSearchParams({ page: String(p), size: '12' });
    if (logActionFilter) params.set('action', logActionFilter);
    if (logActorType) params.set('actorType', logActorType);
    if (logStatusFilter) params.set('status', logStatusFilter);
    const lRes = await api.get<ApiResponse<PageResponse<SecurityLog>>>(`/admin/audit-logs?${params.toString()}`);
    setLogs(lRes.data.data.content || []);
    setLogTotalPages(lRes.data.data.totalPages || 0);
    setLogTotalElements(lRes.data.data.totalElements || 0);
  };

  useEffect(() => {
    loadHotels();
  }, []);

  useEffect(() => {
    loadGuests(guestPage, guestVipFilter).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestPage, guestVipFilter]);

  useEffect(() => {
    loadStaff(staffPage).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffPage, staffRoleFilter, staffHotelFilter]);

  useEffect(() => {
    loadPayments(paymentPage).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentPage]);

  useEffect(() => {
    loadLogs(logPage).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPage]);

  // Guest actions
  const openCreateGuest = () => setGuestFormModal({ mode: 'create', data: emptyGuestForm() });

  const openEditGuest = (g: Guest) =>
    setGuestFormModal({
      mode: 'edit',
      data: {
        id: g.id,
        fullName: g.fullName,
        phone: g.phone,
        email: g.email || '',
        identityNo: g.identityNo || '',
        address: g.address || '',
        isVip: Boolean(g.isVip),
        customerIsActive: g.customerIsActive !== false,
      },
    });

  const submitGuestForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestFormModal) return;
    const payload = {
      fullName: guestFormModal.data.fullName.trim(),
      phone: guestFormModal.data.phone.trim(),
      email: guestFormModal.data.email.trim() || null,
      identityNo: guestFormModal.data.identityNo.trim() || null,
      address: guestFormModal.data.address.trim() || null,
      isVip: guestFormModal.data.isVip,
      customerIsActive: guestFormModal.data.customerIsActive,
    };
    try {
      let updatedGuest: Guest;
      if (guestFormModal.mode === 'create') {
        const res = await api.post<ApiResponse<Guest>>('/admin/guests', payload);
        updatedGuest = res.data.data;
        toast.success('Đã lưu hồ sơ khách hàng mới.');
      } else {
        const res = await api.put<ApiResponse<Guest>>(`/admin/guests/${guestFormModal.data.id}`, payload);
        updatedGuest = res.data.data;
        toast.success('Đã cập nhật thông tin khách hàng.');
      }
      setGuestFormModal(null);
      if (guestHistoryModal && guestHistoryModal.guest.id === updatedGuest.id) {
        setGuestHistoryModal({ ...guestHistoryModal, guest: updatedGuest });
      }
      loadGuests();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const openGuestHistory = async (g: Guest) => {
    setGuestHistoryModal({ guest: g, bookings: [], loading: true });
    try {
      const res = await api.get<ApiResponse<Booking[]>>(`/admin/guests/${g.id}/bookings`);
      setGuestHistoryModal({ guest: g, bookings: res.data.data || [], loading: false });
    } catch (err) {
      toast.error(getErrorMessage(err));
      setGuestHistoryModal({ guest: g, bookings: [], loading: false });
    }
  };

  // Staff actions
  const openCreateStaff = () => {
    const defaultHotel = isAdmin ? hotels[0]?.id || 1 : currentUser?.hotelId || 1;
    setStaffModal({
      mode: 'create',
      data: {
        username: '',
        fullName: '',
        email: '',
        password: '',
        role: 'reception',
        hotelId: defaultHotel,
        isActive: true,
      },
    });
  };

  const openEditStaff = (st: StaffUser) =>
    setStaffModal({
      mode: 'edit',
      data: {
        id: st.id,
        username: st.username,
        fullName: st.fullName,
        email: st.email || '',
        password: '',
        role: st.role,
        hotelId: st.hotelId ?? 0,
        isActive: st.isActive,
      },
    });

  const submitStaffModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffModal) return;

    const { mode, data } = staffModal;
    try {
      if (mode === 'create') {
        if (data.password.length < 10) {
          toast.error('Mật khẩu phải có ít nhất 10 ký tự.');
          return;
        }
        await api.post('/admin/staff', {
          username: data.username.trim(),
          password: data.password,
          fullName: data.fullName.trim(),
          email: data.email.trim() || null,
          role: data.role,
          hotelId: data.hotelId > 0 ? data.hotelId : null,
        });
        toast.success('Đã tạo tài khoản nhân viên mới.');
      } else {
        if (data.password.trim() && data.password.trim().length < 10) {
          toast.error('Mật khẩu mới phải có ít nhất 10 ký tự.');
          return;
        }
        await api.patch(`/admin/staff/${data.id}`, {
          username: data.username.trim(),
          fullName: data.fullName.trim(),
          email: data.email.trim() || null,
          role: data.role,
          hotelId: isAdmin ? (data.hotelId > 0 ? data.hotelId : 0) : undefined,
          clearHotel: isAdmin && data.hotelId === 0,
          isActive: data.isActive,
          newPassword: data.password.trim() ? data.password.trim() : null,
        });
        toast.success('Đã cập nhật đầy đủ thông tin nhân viên.');
      }
      setStaffModal(null);
      loadStaff();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const guestHistoryStats = useMemo(() => {
    if (!guestHistoryModal) return { total: 0, completed: 0, spent: 0 };
    const list = guestHistoryModal.bookings;
    return {
      total: list.length,
      completed: list.filter((b) => b.status === 'checked_out' || b.status === 'checked_in').length,
      spent: list.reduce((sum, b) => sum + (b.totalPaid || 0), 0),
    };
  }, [guestHistoryModal]);

  return (
    <div className="space-y-6 tabular-nums">
      {canManagePeople && (section === 'all' || section === 'guests') && (
        <div className="card-editorial p-5 rounded-xl space-y-4">
          <AdminHeaderBar>
            <div className="flex flex-wrap items-center gap-1.5 text-xs font-semibold">
              {[
                { id: 'all', label: `Tất cả (${guestTotalElements})` },
                { id: 'vip', label: 'VIP' },
                { id: 'regular', label: 'Thường' },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setGuestVipFilter(item.id as 'all' | 'vip' | 'regular');
                    setGuestPage(0);
                  }}
                  className={`px-3 py-1.5 rounded-full border cursor-pointer transition ${
                    guestVipFilter === item.id
                      ? 'bg-[#181615] text-white border-[#181615]'
                      : 'bg-white text-[#5E5852] border-[#D9D1C5] hover:border-[#181615]'
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                setGuestPage(0);
                loadGuests(0, guestVipFilter);
              }}
              className="flex gap-1.5"
            >
              <input
                placeholder="Tìm tên, SĐT, email, CCCD..."
                value={guestKeyword}
                onChange={(e) => setGuestKeyword(e.target.value)}
                className="h-9 rounded-lg border border-[#D9D1C5] bg-white px-3 text-xs w-48 focus:outline-none focus:border-[#181615]"
              />
              <button type="submit" className="btn-dark px-3.5 h-9 rounded-lg text-xs cursor-pointer">
                Tìm
              </button>
            </form>
            <button
              type="button"
              onClick={openCreateGuest}
              className="btn-primary px-4 h-9 rounded-lg text-xs cursor-pointer"
            >
              + Thêm khách hàng
            </button>
          </AdminHeaderBar>

          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-[#F3EFE8] text-[#5E5852] text-[11px] font-bold uppercase tracking-[0.12em] border-b border-[#E6E0D6]">
                <tr>
                  <th className="text-left px-3.5 py-3">Khách hàng</th>
                  <th className="text-left px-3.5 py-3">Liên hệ</th>
                  <th className="text-left px-3.5 py-3">CCCD / Địa chỉ</th>
                  <th className="text-center px-3.5 py-3">Chi tiêu / Điểm</th>
                  <th className="text-center px-3.5 py-3">Hạng thành viên</th>
                  <th className="text-right px-3.5 py-3">Quản lý</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0D6]">
                {guests.map((g) => {
                  const tier = g.membershipTier || 'Bronze';
                  const tierBadgeClass =
                    tier === 'Platinum'
                      ? 'bg-[#181615] text-[#F3C88B] border-[#322E2A]'
                      : tier === 'Gold'
                        ? 'bg-[#FAF3E8] text-[#946421] border-[#E8D6BA]'
                        : tier === 'Silver'
                          ? 'bg-[#F3EFE8] text-[#4A4641] border-[#D9D1C5]'
                          : 'bg-[#FDFBF7] text-[#7A736C] border-[#E6E0D6]';
                  return (
                  <tr key={g.id} className="hover:bg-[#F7F4EF]/60">
                    <td className="px-3.5 py-3">
                      <div className="font-semibold text-[#181615] flex items-center gap-2">
                        <span>{g.fullName}</span>
                        {g.isVip && (
                          <span className="px-2 py-0.5 rounded-full bg-[#FAF3E8] text-[#946421] border border-[#E8D6BA] text-[10px] font-bold">
                            VIP
                          </span>
                        )}
                        {!g.customerIsActive && (
                          <span className="px-2 py-0.5 rounded bg-[#FBEFEE] text-[#A63429] text-[10px] font-bold">
                            Đã khóa
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-[#8B847C] font-mono-num mt-0.5">
                        Lưu từ {formatDateTime(g.createdAt)}
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-xs text-[#5E5852]">
                      <div className="font-mono-num font-semibold text-[#181615]">{g.phone}</div>
                      <div className="text-[#8B847C]">{g.email || 'Chưa có email'}</div>
                    </td>
                    <td className="px-3.5 py-3 text-xs text-[#5E5852] max-w-[220px]">
                      <div className="font-mono-num text-[#181615]">{g.identityNo || 'Chưa cập nhật CCCD'}</div>
                      <div className="text-[#8B847C] truncate">{g.address || 'Chưa cập nhật địa chỉ'}</div>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <div className="font-mono-num font-bold text-[#181615]">
                        {formatVnd(g.totalSpent ?? 0)}
                      </div>
                      <div className="text-[11px] text-[#5E5852] mt-0.5 font-mono-num">
                        {g.loyaltyPoints} điểm
                      </div>
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <span
                        className={`inline-block px-3 py-1 rounded-full text-xs font-semibold border ${tierBadgeClass}`}
                      >
                        Hạng {tier}
                      </span>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <div className="inline-flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => openGuestHistory(g)}
                          className="px-3 py-1 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold cursor-pointer"
                        >
                          Hồ sơ &amp; Lịch sử
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditGuest(g)}
                          className="px-3 py-1 rounded-lg bg-[#181615] text-white hover:bg-[#312D2B] text-xs font-semibold cursor-pointer"
                        >
                          Sửa
                        </button>
                      </div>
                    </td>
                  </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <Pagination
            page={guestPage}
            totalPages={guestTotalPages}
            totalElements={guestTotalElements}
            onPageChange={setGuestPage}
          />
        </div>
      )}

      {canManageStaff && (section === 'all' || section === 'staff') && (
        <div className="space-y-4">
          <AdminHeaderBar>
            {isAdmin && (
              <select
                value={staffHotelFilter}
                onChange={(e) => {
                  setStaffHotelFilter(e.target.value);
                  setStaffPage(0);
                }}
                className="h-9 rounded-lg border border-[#D9D1C5] px-2.5 text-xs bg-white"
              >
                <option value="">Tất cả chi nhánh</option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.hotelName}
                  </option>
                ))}
              </select>
            )}
            <select
              value={staffRoleFilter}
              onChange={(e) => {
                setStaffRoleFilter(e.target.value);
                setStaffPage(0);
              }}
              className="h-9 rounded-lg border border-[#D9D1C5] px-2.5 text-xs bg-white"
            >
              <option value="">Tất cả vai trò</option>
              <option value="reception">Lễ tân</option>
              <option value="housekeeping">Buồng phòng</option>
              <option value="accounting">Kế toán</option>
              <option value="manager">Quản lý cơ sở</option>
              {isAdmin && <option value="admin">Quản trị viên</option>}
            </select>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setStaffPage(0);
                loadStaff(0);
              }}
              className="flex gap-1.5 text-xs"
            >
              <input
                placeholder="Tìm tên, username, email..."
                value={staffKeyword}
                onChange={(e) => setStaffKeyword(e.target.value)}
                className="h-9 rounded-lg border border-[#D9D1C5] bg-white px-3 w-44 focus:outline-none focus:border-[#181615]"
              />
              <button type="submit" className="btn-dark px-3.5 h-9 rounded-lg font-semibold cursor-pointer">
                Tìm
              </button>
            </form>
            <button
              type="button"
              onClick={openCreateStaff}
              className="btn-primary px-4 h-9 rounded-lg text-xs cursor-pointer"
            >
              + Thêm nhân viên
            </button>
          </AdminHeaderBar>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {staff.map((st) => {
              const isSelf = currentUser?.userId === st.id;
              const branchLabel =
                st.hotelId && st.hotelId > 0
                  ? hotelNameById.get(st.hotelId) || `Chi nhánh #${st.hotelId}`
                  : 'Toàn chuỗi';
              return (
                <div
                  key={st.id}
                  className="p-4 rounded-xl border border-[#E6E0D6] bg-[#F7F4EF]/50 flex flex-col justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="font-bold text-[#181615] text-sm truncate">
                        {st.fullName}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                          st.isActive ? 'bg-[#EDF5F0] text-[#1E5F3E]' : 'bg-[#FBEFEE] text-[#A63429]'
                        }`}
                      >
                        {st.isActive ? 'Hoạt động' : 'Đã khóa'}
                      </span>
                    </div>
                    <div className="font-mono-num text-[#8B847C]">
                      @{st.username} {st.email ? `· ${st.email}` : ''}
                    </div>
                    <div className="text-[#5E5852]">
                      <span className="font-semibold text-[#181615]">{STAFF_ROLE_LABELS[st.role] || st.role}</span> ·{' '}
                      {branchLabel}
                    </div>
                  </div>
                  <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-[#E6E0D6]">
                    <button
                      type="button"
                      onClick={() => openEditStaff(st)}
                      className="px-3 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] font-semibold cursor-pointer"
                    >
                      Sửa &amp; Phân quyền
                    </button>
                    <button
                      type="button"
                      disabled={isSelf}
                      title={isSelf ? 'Không thể tự khóa tài khoản đang đăng nhập' : undefined}
                      onClick={() =>
                        api
                          .patch(`/admin/staff/${st.id}`, { isActive: !st.isActive })
                          .then(() => {
                            toast.success('Đã cập nhật trạng thái nhân viên.');
                            loadStaff();
                          })
                          .catch((err) => toast.error(getErrorMessage(err)))
                      }
                      className={`px-3 py-1.5 rounded-lg font-semibold ${
                        isSelf
                          ? 'bg-[#EFECE6] text-[#8B847C] cursor-not-allowed'
                          : st.isActive
                            ? 'bg-[#FBEFEE] text-[#A63429] cursor-pointer hover:bg-[#F6DFDC]'
                            : 'bg-[#EDF5F0] text-[#1E5F3E] cursor-pointer'
                      }`}
                    >
                      {st.isActive ? 'Khóa' : 'Mở khóa'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <Pagination
            page={staffPage}
            totalPages={staffTotalPages}
            totalElements={staffTotalElements}
            onPageChange={setStaffPage}
          />
        </div>
      )}

      {(section === 'all' || section === 'invoices' || section === 'audit') && (
        <div className={`grid grid-cols-1 ${section === 'all' ? 'lg:grid-cols-2' : ''} gap-6`}>
          {canViewPayments && (section === 'all' || section === 'invoices') && (
            <div className="card-editorial p-6 rounded-xl space-y-4">
              <h3 className="font-display font-semibold text-xl text-[#181615]">
                Giao dịch thanh toán ({paymentTotalElements})
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-[#F3EFE8] text-[#5E5852] text-[11px] font-bold uppercase tracking-[0.12em] border-b border-[#E6E0D6]">
                    <tr>
                      <th className="text-left px-3.5 py-3">Mã đơn</th>
                      <th className="text-left px-3.5 py-3">Phương thức</th>
                      <th className="text-left px-3.5 py-3">Thời gian</th>
                      <th className="text-right px-3.5 py-3">Số tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E6E0D6]">
                    {payments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F7F4EF]/60">
                        <td className="px-3.5 py-3 font-mono-num font-bold text-[#181615]">{p.bookingCode}</td>
                        <td className="px-3.5 py-3 text-[#5E5852]">{p.method}</td>
                        <td className="px-3.5 py-3 text-[#8B847C] font-mono-num">{formatDateTime(p.paidAt)}</td>
                        <td className="px-3.5 py-3 text-right font-mono-num font-bold text-emerald-700">
                          {formatVnd(p.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <Pagination
                page={paymentPage}
                totalPages={paymentTotalPages}
                totalElements={paymentTotalElements}
                onPageChange={setPaymentPage}
              />
            </div>
          )}

          {isAdmin && (section === 'all' || section === 'audit') && (
            <div className="card-editorial p-6 rounded-xl space-y-4">
              <h3 className="font-display font-semibold text-xl text-[#181615]">
                Nhật ký bảo mật ({logTotalElements})
              </h3>
              <div className="flex flex-wrap gap-2 text-xs">
                <select
                  value={logActorType}
                  onChange={(e) => setLogActorType(e.target.value)}
                  className="h-9 rounded-lg border border-[#D9D1C5] px-2.5 bg-white"
                >
                  <option value="">Tất cả actor</option>
                  <option value="staff">staff</option>
                  <option value="customer">customer</option>
                </select>
                <select
                  value={logStatusFilter}
                  onChange={(e) => setLogStatusFilter(e.target.value)}
                  className="h-9 rounded-lg border border-[#D9D1C5] px-2.5 bg-white"
                >
                  <option value="">Tất cả trạng thái</option>
                  <option value="success">success</option>
                  <option value="failed">failed</option>
                  <option value="blocked">blocked</option>
                </select>
                <input
                  placeholder="Hành động (LOGIN, RATE_LIMIT...)"
                  value={logActionFilter}
                  onChange={(e) => setLogActionFilter(e.target.value)}
                  className="h-9 rounded-lg border border-[#D9D1C5] px-3 flex-1 min-w-[140px]"
                />
                <button
                  type="button"
                  onClick={() => {
                    setLogPage(0);
                    loadLogs(0);
                  }}
                  className="btn-dark px-4 h-9 rounded-lg font-semibold cursor-pointer"
                >
                  Lọc
                </button>
              </div>
              <div className="space-y-2 text-xs max-h-96 overflow-y-auto">
                {logs.map((l) => (
                  <div key={l.id} className="p-3.5 rounded-xl bg-[#F7F4EF] border border-[#E6E0D6]">
                    <div className="flex justify-between font-semibold">
                      <span className="font-mono-num text-[#181615]">
                        {l.action} ({l.actorType})
                      </span>
                      <span
                        className={
                          l.status === 'blocked' || l.status === 'failed' ? 'text-[#A63429]' : 'text-emerald-700'
                        }
                      >
                        {l.status}
                      </span>
                    </div>
                    <div className="text-[#5E5852] mt-1 break-words">{l.message}</div>
                    <div className="text-[#8B847C] mt-1 font-mono-num">{formatDateTime(l.createdAt)}</div>
                  </div>
                ))}
              </div>
              <Pagination
                page={logPage}
                totalPages={logTotalPages}
                totalElements={logTotalElements}
                onPageChange={setLogPage}
              />
            </div>
          )}
        </div>
      )}

      {/* Popup Create / Edit Staff */}
      {staffModal && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={submitStaffModal}
            className="bg-white rounded-xl p-6 max-w-lg w-full space-y-3.5 text-sm border border-[#E6E0D6] shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">
              {staffModal.mode === 'create'
                ? 'Thêm nhân viên mới'
                : `Chỉnh sửa nhân viên: @${staffModal.data.username}`}
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Tên đăng nhập (Username) *</label>
                <input
                  required
                  placeholder="vd: reception_dn"
                  value={staffModal.data.username}
                  onChange={(e) =>
                    setStaffModal({ ...staffModal, data: { ...staffModal.data, username: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Họ và tên *</label>
                <input
                  required
                  placeholder="Nguyễn Văn B"
                  value={staffModal.data.fullName}
                  onChange={(e) =>
                    setStaffModal({ ...staffModal, data: { ...staffModal.data, fullName: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Email</label>
                <input
                  type="email"
                  placeholder="staff@spotkihotel.vn"
                  value={staffModal.data.email}
                  onChange={(e) =>
                    setStaffModal({ ...staffModal, data: { ...staffModal.data, email: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">
                  {staffModal.mode === 'create'
                    ? 'Mật khẩu (>= 10 ký tự) *'
                    : 'Đặt lại mật khẩu mới (tuỳ chọn)'}
                </label>
                <input
                  required={staffModal.mode === 'create'}
                  type="password"
                  placeholder={staffModal.mode === 'create' ? 'Tối thiểu 10 ký tự' : 'Để trống nếu giữ nguyên'}
                  value={staffModal.data.password}
                  onChange={(e) =>
                    setStaffModal({ ...staffModal, data: { ...staffModal.data, password: e.target.value } })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Vai trò phân quyền *</label>
                <select
                  value={staffModal.data.role}
                  onChange={(e) =>
                    setStaffModal({
                      ...staffModal,
                      data: { ...staffModal.data, role: e.target.value as StaffRole },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 bg-white"
                >
                  <option value="reception">Lễ tân (reception)</option>
                  <option value="housekeeping">Buồng phòng (housekeeping)</option>
                  <option value="accounting">Kế toán (accounting)</option>
                  <option value="manager">Quản lý cơ sở (manager)</option>
                  {isAdmin && <option value="admin">Quản trị viên (admin)</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Chi nhánh trực thuộc</label>
                <select
                  disabled={!isAdmin}
                  value={staffModal.data.hotelId}
                  onChange={(e) =>
                    setStaffModal({
                      ...staffModal,
                      data: { ...staffModal.data, hotelId: Number(e.target.value) },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 bg-white disabled:bg-[#F7F4EF]"
                >
                  {isAdmin && <option value={0}>Toàn chuỗi (Global Admin)</option>}
                  {hotels.map((h) => (
                    <option key={h.id} value={h.id}>
                      {h.hotelName}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {staffModal.mode === 'edit' && (
              <div className="p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6] flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-[#181615]">Trạng thái tài khoản</div>
                  <div className="text-[11px] text-[#8B847C]">
                    Khóa tài khoản sẽ thu hồi quyền đăng nhập vào hệ thống quản trị.
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    disabled={currentUser?.userId === staffModal.data.id}
                    checked={staffModal.data.isActive}
                    onChange={(e) =>
                      setStaffModal({
                        ...staffModal,
                        data: { ...staffModal.data, isActive: e.target.checked },
                      })
                    }
                    className="accent-[#A63429]"
                  />
                  <span>{staffModal.data.isActive ? 'Đang hoạt động' : 'Đang khóa'}</span>
                </label>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setStaffModal(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                {staffModal.mode === 'create' ? 'Tạo nhân viên' : 'Lưu thay đổi'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Popup Create / Edit Guest Profile */}
      {guestFormModal && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={submitGuestForm}
            className="bg-white rounded-xl p-6 max-w-lg w-full space-y-3.5 text-sm border border-[#E6E0D6] shadow-2xl max-h-[90vh] overflow-y-auto"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">
              {guestFormModal.mode === 'create'
                ? 'Thêm & Lưu hồ sơ khách hàng mới'
                : `Cập nhật hồ sơ khách hàng: ${guestFormModal.data.fullName}`}
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Họ và tên *</label>
                <input
                  required
                  value={guestFormModal.data.fullName}
                  onChange={(e) =>
                    setGuestFormModal({
                      ...guestFormModal,
                      data: { ...guestFormModal.data, fullName: e.target.value },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Số điện thoại *</label>
                <input
                  required
                  value={guestFormModal.data.phone}
                  onChange={(e) =>
                    setGuestFormModal({
                      ...guestFormModal,
                      data: { ...guestFormModal.data, phone: e.target.value },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Email</label>
                <input
                  type="email"
                  value={guestFormModal.data.email}
                  onChange={(e) =>
                    setGuestFormModal({
                      ...guestFormModal,
                      data: { ...guestFormModal.data, email: e.target.value },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
                />
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">CCCD / Hộ chiếu</label>
                <input
                  value={guestFormModal.data.identityNo}
                  onChange={(e) =>
                    setGuestFormModal({
                      ...guestFormModal,
                      data: { ...guestFormModal.data, identityNo: e.target.value },
                    })
                  }
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Địa chỉ</label>
              <input
                value={guestFormModal.data.address}
                onChange={(e) =>
                  setGuestFormModal({
                    ...guestFormModal,
                    data: { ...guestFormModal.data, address: e.target.value },
                  })
                }
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-3 p-3 rounded-lg bg-[#FAF8F5] border border-[#E6E0D6]">
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={guestFormModal.data.isVip}
                  onChange={(e) =>
                    setGuestFormModal({
                      ...guestFormModal,
                      data: { ...guestFormModal.data, isVip: e.target.checked },
                    })
                  }
                  className="accent-[#A63429]"
                />
                <span>Đánh dấu Khách hàng VIP</span>
              </label>
              <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={guestFormModal.data.customerIsActive}
                  onChange={(e) =>
                    setGuestFormModal({
                      ...guestFormModal,
                      data: { ...guestFormModal.data, customerIsActive: e.target.checked },
                    })
                  }
                  className="accent-[#1E5F3E]"
                />
                <span>Tài khoản đang hoạt động</span>
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setGuestFormModal(null)}
                className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
              <button type="submit" className="btn-primary px-4 py-2 rounded-lg text-xs cursor-pointer">
                {guestFormModal.mode === 'create' ? 'Lưu khách hàng' : 'Cập nhật hồ sơ'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Popup Full Guest Profile & Booking History */}
      {guestHistoryModal && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-3xl w-full space-y-5 max-h-[88vh] overflow-y-auto border border-[#E6E0D6] shadow-2xl">
            <div className="flex flex-wrap justify-between items-start gap-3 pb-4 border-b border-[#E6E0D6]">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold text-xl text-[#181615]">
                    {guestHistoryModal.guest.fullName}
                  </h3>
                  {guestHistoryModal.guest.isVip && (
                    <span className="px-2.5 py-0.5 rounded-full bg-[#FAF3E8] text-[#946421] border border-[#E8D6BA] text-[11px] font-bold">
                      VIP
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#8B847C] mt-0.5">
                  Hồ sơ lưu trữ &amp; toàn bộ lịch sử đặt phòng / lưu trú tại hệ thống
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => openEditGuest(guestHistoryModal.guest)}
                  className="px-3.5 py-1.5 rounded-lg bg-[#181615] text-white text-xs font-semibold cursor-pointer"
                >
                  Chỉnh sửa thông tin
                </button>
                <button
                  type="button"
                  onClick={() => setGuestHistoryModal(null)}
                  className="px-3 py-1.5 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>

            {/* Stored Customer Info */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-xs">
              <div>
                <div className="text-[#8B847C]">Số điện thoại</div>
                <div className="font-mono-num font-semibold text-[#181615] mt-0.5">
                  {guestHistoryModal.guest.phone}
                </div>
              </div>
              <div>
                <div className="text-[#8B847C]">Email</div>
                <div className="font-medium text-[#181615] mt-0.5 break-all">
                  {guestHistoryModal.guest.email || '—'}
                </div>
              </div>
              <div>
                <div className="text-[#8B847C]">CCCD / Hộ chiếu</div>
                <div className="font-mono-num font-semibold text-[#181615] mt-0.5">
                  {guestHistoryModal.guest.identityNo || '—'}
                </div>
              </div>
              <div>
                <div className="text-[#8B847C]">Hạng &amp; Điểm thưởng</div>
                <div className="font-mono-num font-bold text-[#A63429] mt-0.5">
                  Hạng {guestHistoryModal.guest.membershipTier || 'Bronze'} · {guestHistoryModal.guest.loyaltyPoints} điểm
                </div>
              </div>
              <div className="col-span-2 sm:col-span-3">
                <div className="text-[#8B847C]">Địa chỉ lưu trú / liên hệ</div>
                <div className="text-[#181615] mt-0.5">{guestHistoryModal.guest.address || 'Chưa cập nhật'}</div>
              </div>
              <div>
                <div className="text-[#8B847C]">Trạng thái tài khoản</div>
                <div className="font-semibold text-[#181615] mt-0.5">
                  {guestHistoryModal.guest.customerIsActive ? 'Đang hoạt động' : 'Đang khóa'}
                </div>
              </div>
            </div>

            {/* History Summary */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="p-3.5 rounded-xl border border-[#E6E0D6]">
                <div className="text-[#8B847C]">Tổng lượt đặt phòng</div>
                <div className="font-mono-num text-xl font-bold text-[#181615] mt-1">
                  {guestHistoryStats.total}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E6E0D6]">
                <div className="text-[#8B847C]">Đã lưu trú / Đang ở</div>
                <div className="font-mono-num text-xl font-bold text-[#181615] mt-1">
                  {guestHistoryStats.completed}
                </div>
              </div>
              <div className="p-3.5 rounded-xl border border-[#E6E0D6]">
                <div className="text-[#8B847C]">Tổng đã thanh toán</div>
                <div className="font-mono-num text-xl font-bold text-emerald-700 mt-1">
                  {formatVnd(guestHistoryStats.spent)}
                </div>
              </div>
            </div>

            {/* Booking History Table */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm text-[#181615]">Lịch sử đặt phòng chi tiết</h4>
              {guestHistoryModal.loading ? (
                <p className="text-xs text-[#8B847C] py-4">Đang tải lịch sử...</p>
              ) : guestHistoryModal.bookings.length === 0 ? (
                <p className="text-xs text-[#8B847C] py-4">Khách hàng chưa có đơn đặt phòng nào.</p>
              ) : (
                <div className="overflow-x-auto border border-[#E6E0D6] rounded-xl">
                  <table className="w-full text-xs">
                    <thead className="bg-[#F3EFE8] text-[#5E5852] uppercase text-[10px] font-bold tracking-[0.1em]">
                      <tr>
                        <th className="text-left px-3 py-2.5">Mã đơn</th>
                        <th className="text-left px-3 py-2.5">Chi nhánh &amp; Phòng</th>
                        <th className="text-left px-3 py-2.5">Nhận — Trả</th>
                        <th className="text-center px-3 py-2.5">Trạng thái</th>
                        <th className="text-right px-3 py-2.5">Đã thanh toán</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#E6E0D6]">
                      {guestHistoryModal.bookings.map((b) => {
                        const badge = BOOKING_STATUS_BADGE[b.status];
                        return (
                          <tr key={b.id}>
                            <td className="px-3 py-2.5 font-mono-num font-bold text-[#181615]">{b.bookingCode}</td>
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-[#181615]">{b.hotelName}</div>
                              <div className="text-[#5E5852]">
                                P.{b.roomNumber} · {b.roomType}
                              </div>
                            </td>
                            <td className="px-3 py-2.5 font-mono-num text-[#5E5852]">
                              {b.checkIn} → {b.checkOut}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${badge?.className || ''}`}>
                                {badge?.label || b.status}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono-num">
                              <div className="font-bold text-emerald-700">{formatVnd(b.totalPaid)}</div>
                              <div className="text-[10px] text-[#8B847C]">/ {formatVnd(b.estimatedRoomTotal)}</div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { Pagination } from '../Pagination';
import { useToast } from '../../context/ToastContext';
import type {
  ApiResponse,
  Booking,
  Guest,
  PageResponse,
  PaymentRecord,
  SecurityLog,
  StaffRole,
  StaffUser,
} from '../../types';
import { formatDateTime, formatVnd } from '../../utils/format';

export const PeopleAndAuditTab: React.FC<{
  role: string;
  section?: 'all' | 'guests' | 'staff' | 'invoices' | 'audit';
}> = ({ role, section = 'all' }) => {
  const toast = useToast();
  const isAdmin = role === 'ROLE_ADMIN';
  const canManagePeople = isAdmin || role === 'ROLE_MANAGER' || role === 'ROLE_RECEPTION';
  const canManageStaff = isAdmin || role === 'ROLE_MANAGER';
  const canViewPayments = isAdmin || role === 'ROLE_MANAGER' || role === 'ROLE_ACCOUNTING';

  const [guests, setGuests] = useState<Guest[]>([]);
  const [guestPage, setGuestPage] = useState(0);
  const [guestTotalPages, setGuestTotalPages] = useState(0);
  const [guestTotalElements, setGuestTotalElements] = useState(0);
  const [guestKeyword, setGuestKeyword] = useState('');
  const [guestBookings, setGuestBookings] = useState<Booking[] | null>(null);

  const [staff, setStaff] = useState<StaffUser[]>([]);
  const [staffPage, setStaffPage] = useState(0);
  const [staffTotalPages, setStaffTotalPages] = useState(0);
  const [staffTotalElements, setStaffTotalElements] = useState(0);
  const [editingStaff, setEditingStaff] = useState<StaffUser | null>(null);

  const [newUser, setNewUser] = useState('');
  const [newPass, setNewPass] = useState('Staff@12345');
  const [newFull, setNewFull] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('reception');
  const [newHotelId, setNewHotelId] = useState(1);

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

  const loadGuests = async (p = guestPage) => {
    if (!canManagePeople) return;
    const gRes = await api.get<ApiResponse<PageResponse<Guest>>>(
      `/admin/guests?keyword=${encodeURIComponent(guestKeyword)}&page=${p}&size=10`
    );
    setGuests(gRes.data.data.content || []);
    setGuestTotalPages(gRes.data.data.totalPages || 0);
    setGuestTotalElements(gRes.data.data.totalElements || 0);
  };

  const loadStaff = async (p = staffPage) => {
    if (!canManageStaff) return;
    const sRes = await api.get<ApiResponse<PageResponse<StaffUser>>>(`/admin/staff?page=${p}&size=9`);
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

  const loadAll = async () => {
    try {
      await Promise.all([loadGuests(), loadStaff(), loadPayments(), loadLogs()]);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  useEffect(() => {
    loadGuests(guestPage).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guestPage]);

  useEffect(() => {
    loadStaff(staffPage).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffPage]);

  useEffect(() => {
    loadPayments(paymentPage).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentPage]);

  useEffect(() => {
    loadLogs(logPage).catch((err) => toast.error(getErrorMessage(err)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [logPage]);

  const createStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.post('/admin/staff', {
        username: newUser,
        password: newPass,
        fullName: newFull,
        role: newRole,
        hotelId: newHotelId,
      });
      setNewUser('');
      setNewFull('');
      toast.success('Đã tạo nhân viên mới.');
      loadStaff(0);
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  const saveStaffEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStaff) return;
    try {
      await api.patch(`/admin/staff/${editingStaff.id}`, {
        fullName: editingStaff.fullName,
        email: editingStaff.email,
        role: editingStaff.role,
        hotelId: editingStaff.hotelId ?? 0,
        isActive: editingStaff.isActive,
      });
      setEditingStaff(null);
      toast.success('Đã cập nhật thông tin nhân viên.');
      loadStaff();
    } catch (err) {
      toast.error(getErrorMessage(err));
    }
  };

  return (
    <div className="space-y-6 tabular-nums">
      {canManagePeople && (section === 'all' || section === 'guests') && (
        <div className="card-editorial p-6 rounded-xl space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display font-semibold text-xl text-[#181615]">
              Khách hàng ({guestTotalElements})
            </h3>
            <div className="flex gap-2">
              <input
                placeholder="Tìm tên, SĐT, email..."
                value={guestKeyword}
                onChange={(e) => setGuestKeyword(e.target.value)}
                className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs focus:outline-none focus:border-[#181615]"
              />
              <button
                type="button"
                onClick={() => {
                  setGuestPage(0);
                  loadGuests(0);
                }}
                className="btn-dark px-4 h-9 rounded-lg text-xs cursor-pointer"
              >
                Tìm
              </button>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs sm:text-sm">
              <thead className="bg-[#F3EFE8] text-[#5E5852] text-[11px] font-bold uppercase tracking-[0.12em] border-b border-[#E6E0D6]">
                <tr>
                  <th className="text-left px-3.5 py-3">Khách hàng</th>
                  <th className="text-left px-3.5 py-3">SĐT / Email</th>
                  <th className="text-center px-3.5 py-3">Điểm</th>
                  <th className="text-center px-3.5 py-3">Hạng VIP</th>
                  <th className="text-right px-3.5 py-3">Lịch sử</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E0D6]">
                {guests.map((g) => (
                  <tr key={g.id} className="hover:bg-[#F7F4EF]/60">
                    <td className="px-3.5 py-3 font-semibold text-[#181615]">{g.fullName}</td>
                    <td className="px-3.5 py-3 text-xs text-[#5E5852]">
                      <span className="font-mono-num">{g.phone}</span> · {g.email || '—'}
                    </td>
                    <td className="px-3.5 py-3 text-center font-mono-num font-bold text-[#181615]">
                      {g.loyaltyPoints}
                    </td>
                    <td className="px-3.5 py-3 text-center">
                      <button
                        type="button"
                        onClick={() =>
                          api.patch(`/admin/guests/${g.id}/vip?isVip=${!g.isVip}`).then(() => {
                            toast.success('Đã cập nhật trạng thái VIP.');
                            loadGuests();
                          })
                        }
                        className={`px-3 py-0.5 rounded-full text-xs font-semibold cursor-pointer ${
                          g.isVip
                            ? 'bg-[#FAF3E8] text-[#946421] border border-[#E8D6BA]'
                            : 'bg-[#F3EFE8] text-[#5E5852]'
                        }`}
                      >
                        {g.isVip ? 'VIP' : 'Thường'}
                      </button>
                    </td>
                    <td className="px-3.5 py-3 text-right">
                      <button
                        type="button"
                        onClick={() =>
                          api
                            .get<ApiResponse<Booking[]>>(`/admin/guests/${g.id}/bookings`)
                            .then((r) => setGuestBookings(r.data.data))
                        }
                        className="px-3 py-1 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold cursor-pointer"
                      >
                        Xem đơn
                      </button>
                    </td>
                  </tr>
                ))}
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
        <div className="card-editorial p-6 rounded-xl space-y-5">
          <h3 className="font-display font-semibold text-xl text-[#181615]">
            Nhân viên ({staffTotalElements})
          </h3>
          <form onSubmit={createStaff} className="grid grid-cols-1 sm:grid-cols-6 gap-2.5">
            <input
              required
              placeholder="Username"
              value={newUser}
              onChange={(e) => setNewUser(e.target.value)}
              className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs font-mono-num"
            />
            <input
              required
              placeholder="Họ tên"
              value={newFull}
              onChange={(e) => setNewFull(e.target.value)}
              className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs"
            />
            <input
              required
              type="password"
              placeholder="Mật khẩu (>=10)"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs"
            />
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as StaffRole)}
              className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs bg-white"
            >
              <option value="reception">reception</option>
              <option value="housekeeping">housekeeping</option>
              <option value="accounting">accounting</option>
              <option value="manager">manager</option>
              {isAdmin && <option value="admin">admin</option>}
            </select>
            <input
              type="number"
              min={0}
              placeholder="Hotel ID"
              value={newHotelId}
              onChange={(e) => setNewHotelId(Number(e.target.value))}
              className="h-9 rounded-lg border border-[#D9D1C5] px-3 text-xs font-mono-num"
            />
            <button type="submit" className="btn-primary h-9 rounded-lg text-xs cursor-pointer">
              + Tạo NV
            </button>
          </form>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 text-xs">
            {staff.map((st) => (
              <div
                key={st.id}
                className="p-4 rounded-xl border border-[#E6E0D6] bg-[#F7F4EF]/50 flex items-center justify-between gap-2"
              >
                <div className="min-w-0">
                  <div className="font-bold text-[#181615] truncate">
                    {st.fullName} <span className="font-mono-num text-[#8B847C]">({st.username})</span>
                  </div>
                  <div className="text-[#5E5852] mt-0.5">
                    Role: {st.role} · Hotel #{st.hotelId ?? 0}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setEditingStaff(st)}
                    className="px-2.5 py-1 rounded-lg border border-[#D9D1C5] bg-white font-semibold cursor-pointer"
                  >
                    Sửa
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      api
                        .patch(`/admin/staff/${st.id}`, { isActive: !st.isActive })
                        .then(() => {
                          toast.success('Đã cập nhật trạng thái nhân viên.');
                          loadAll();
                        })
                        .catch((err) => toast.error(getErrorMessage(err)))
                    }
                    className={`px-2.5 py-1 rounded-lg font-semibold cursor-pointer ${
                      st.isActive ? 'bg-[#EDF5F0] text-[#1E5F3E]' : 'bg-[#FBEFEE] text-[#A63429]'
                    }`}
                  >
                    {st.isActive ? 'Active' : 'Locked'}
                  </button>
                </div>
              </div>
            ))}
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

      {editingStaff && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <form
            onSubmit={saveStaffEdit}
            className="bg-white rounded-xl p-6 max-w-md w-full space-y-3.5 text-sm border border-[#E6E0D6] shadow-2xl"
          >
            <h3 className="font-display font-semibold text-lg text-[#181615]">
              Phân quyền nhân viên: {editingStaff.username}
            </h3>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Họ và tên</label>
              <input
                required
                value={editingStaff.fullName}
                onChange={(e) => setEditingStaff({ ...editingStaff, fullName: e.target.value })}
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div>
              <label className="block text-xs text-[#5E5852] mb-1">Email</label>
              <input
                type="email"
                value={editingStaff.email || ''}
                onChange={(e) => setEditingStaff({ ...editingStaff, email: e.target.value })}
                className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Vai trò</label>
                <select
                  value={editingStaff.role}
                  onChange={(e) => setEditingStaff({ ...editingStaff, role: e.target.value as StaffRole })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 bg-white"
                >
                  <option value="reception">reception</option>
                  <option value="housekeeping">housekeeping</option>
                  <option value="accounting">accounting</option>
                  <option value="manager">manager</option>
                  {isAdmin && <option value="admin">admin</option>}
                </select>
              </div>
              <div>
                <label className="block text-xs text-[#5E5852] mb-1">Chi nhánh (Hotel ID)</label>
                <input
                  type="number"
                  min={0}
                  value={editingStaff.hotelId ?? 0}
                  onChange={(e) => setEditingStaff({ ...editingStaff, hotelId: Number(e.target.value) })}
                  className="w-full h-9 rounded-lg border border-[#D9D1C5] px-3 font-mono-num"
                />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
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

      {guestBookings && (
        <div className="fixed inset-0 z-50 bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
          <div className="bg-white rounded-xl p-6 max-w-lg w-full space-y-3.5 max-h-[80vh] overflow-y-auto border border-[#E6E0D6] shadow-2xl">
            <div className="flex justify-between items-center">
              <h3 className="font-display font-semibold text-lg text-[#181615]">Lịch sử booking của khách</h3>
              <button
                type="button"
                onClick={() => setGuestBookings(null)}
                className="px-3 py-1 rounded-lg border border-[#D9D1C5] text-xs font-semibold cursor-pointer"
              >
                Đóng
              </button>
            </div>
            {guestBookings.length === 0 ? (
              <p className="text-sm text-[#8B847C]">Không có booking nào.</p>
            ) : (
              guestBookings.map((b) => (
                <div
                  key={b.id}
                  className="p-3.5 rounded-xl bg-[#F7F4EF] border border-[#E6E0D6] text-xs flex justify-between"
                >
                  <div>
                    <div className="font-mono-num font-bold text-[#181615]">
                      {b.bookingCode} · {b.roomNumber}
                    </div>
                    <div className="text-[#5E5852] mt-0.5 font-mono-num">
                      {b.checkIn} → {b.checkOut} ({b.status})
                    </div>
                  </div>
                  <div className="font-mono-num font-bold text-emerald-700">{formatVnd(b.totalPaid)}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

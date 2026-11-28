import React, { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { api, getErrorMessage } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { ApiResponse, AuthResponse } from '../types';

type TabMode = 'customer-login' | 'customer-register' | 'admin';

export const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginSession } = useAuth();

  const initialMode = (searchParams.get('mode') as TabMode) || 'customer-login';
  const [mode, setMode] = useState<TabMode>(
    ['customer-login', 'customer-register', 'admin'].includes(initialMode)
      ? initialMode
      : 'customer-login'
  );

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [username, setUsername] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (mode === 'customer-login') {
        const res = await api.post<ApiResponse<AuthResponse>>('/auth/customer/login', { email, password });
        loginSession(res.data.data);
        navigate('/portal');
      } else if (mode === 'customer-register') {
        if (password !== confirmPassword) {
          throw new Error('Mật khẩu xác nhận không khớp.');
        }
        const res = await api.post<ApiResponse<AuthResponse>>('/auth/customer/register', {
          fullName,
          phone,
          email,
          password,
        });
        loginSession(res.data.data);
        navigate('/portal');
      } else {
        const res = await api.post<ApiResponse<AuthResponse>>('/auth/admin/login', { username, password });
        loginSession(res.data.data);
        navigate('/admin');
      }
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const quickFillStaff = (u: string, p: string) => {
    setMode('admin');
    setUsername(u);
    setPassword(p);
  };

  return (
    <main className="min-h-screen bg-[#141312] grid grid-cols-1 lg:grid-cols-2">
      {/* Left Full-Height Atmospheric Brand Panel */}
      <section
        className="relative p-8 sm:p-12 lg:p-14 text-white flex flex-col justify-between bg-cover bg-center min-h-[280px]"
        style={{
          backgroundImage:
            "linear-gradient(180deg, rgba(20,19,18,0.45) 0%, rgba(20,19,18,0.92) 100%), url('/images/2.webp')",
        }}
      >
        <Link to="/" className="inline-flex items-center gap-2.5 w-fit">
          <span className="w-1.5 h-6 bg-[#A63429] rounded-full" />
          <span className="font-display text-xl font-bold tracking-tight text-white">SPOTKI</span>
          <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#B8925A]">Hotel</span>
        </Link>

        <div className="space-y-5 max-w-lg my-8">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#B8925A]">
            <span className="w-5 h-[1px] bg-[#B8925A]" />
            <span>{mode === 'admin' ? 'Internal Operations' : 'Member Experience'}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold leading-tight">
            {mode === 'admin'
              ? 'Cổng vận hành khách sạn nội bộ'
              : 'Tài khoản thành viên Spotki'}
          </h1>
          <p className="text-sm text-[#D8D1C7] leading-relaxed">
            {mode === 'admin'
              ? 'Quản lý đặt phòng, sơ đồ phòng theo tầng, buồng phòng, hóa đơn VAT và nhật ký bảo mật trên một giao diện tập trung.'
              : 'Theo dõi hành trình đặt phòng, xuất hóa đơn VAT điện tử và tích lũy điểm nâng hạng thành viên VIP.'}
          </p>
        </div>

        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-white/15 text-xs max-w-lg">
          <div>
            <div className="font-mono-num font-bold text-white text-sm">24/7</div>
            <div className="text-[#A89F95] mt-0.5">Hỗ trợ lễ tân</div>
          </div>
          <div>
            <div className="font-bold text-white text-sm">Loyalty</div>
            <div className="text-[#A89F95] mt-0.5">Tích điểm ưu đãi</div>
          </div>
          <div>
            <div className="font-mono-num font-bold text-white text-sm">VAT 8%</div>
            <div className="text-[#A89F95] mt-0.5">Hóa đơn minh bạch</div>
          </div>
        </div>
      </section>

      {/* Right Clean Editorial Form */}
      <section className="bg-[#F7F4EF] p-6 sm:p-12 lg:p-16 flex flex-col justify-center">
        <div className="w-full max-w-md mx-auto">
          <div className="grid grid-cols-3 border border-[#E6E0D6] rounded-xl p-1 bg-white mb-8 text-xs font-semibold">
            <button
              type="button"
              onClick={() => {
                setMode('customer-login');
                setError('');
              }}
              className={`py-2.5 rounded-lg cursor-pointer transition ${
                mode === 'customer-login' ? 'bg-[#181615] text-white' : 'text-[#5E5852] hover:text-[#181615]'
              }`}
            >
              Khách hàng
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('customer-register');
                setError('');
              }}
              className={`py-2.5 rounded-lg cursor-pointer transition ${
                mode === 'customer-register' ? 'bg-[#181615] text-white' : 'text-[#5E5852] hover:text-[#181615]'
              }`}
            >
              Đăng ký
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('admin');
                setError('');
              }}
              className={`py-2.5 rounded-lg cursor-pointer transition ${
                mode === 'admin' ? 'bg-[#A63429] text-white' : 'text-[#5E5852] hover:text-[#181615]'
              }`}
            >
              Quản trị
            </button>
          </div>

          <h2 className="font-display text-3xl font-semibold text-[#181615]">
            {mode === 'admin'
              ? 'Đăng nhập nhân sự'
              : mode === 'customer-register'
              ? 'Tạo tài khoản mới'
              : 'Chào mừng trở lại'}
          </h2>
          <p className="text-xs text-[#5E5852] mt-1.5 mb-6">
            {mode === 'admin'
              ? 'Sử dụng tài khoản nội bộ được phân quyền theo vai trò.'
              : 'Nhập thông tin tài khoản thành viên Spotki của bạn.'}
          </p>

          {error && (
            <div className="mb-5 p-3.5 rounded-xl bg-[#FBEFEE] border border-[#F0CFCB] text-[#A63429] text-xs font-semibold">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-sm">
            {mode === 'customer-register' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                    Họ và tên
                  </label>
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Nguyễn Văn A"
                    className="w-full h-11 rounded-lg border border-[#D9D1C5] bg-white px-3.5 focus:outline-none focus:border-[#181615]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                    Số điện thoại
                  </label>
                  <input
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0901234567"
                    className="w-full h-11 rounded-lg border border-[#D9D1C5] bg-white px-3.5 font-mono-num focus:outline-none focus:border-[#181615]"
                  />
                </div>
              </div>
            )}

            {mode === 'admin' ? (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                  Username nhân viên
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="admin"
                  className="w-full h-11 rounded-lg border border-[#D9D1C5] bg-white px-3.5 font-mono-num focus:outline-none focus:border-[#181615]"
                />
              </div>
            ) : (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="guest@spotkihotel.vn"
                  className="w-full h-11 rounded-lg border border-[#D9D1C5] bg-white px-3.5 focus:outline-none focus:border-[#181615]"
                />
              </div>
            )}

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C]">
                  Mật khẩu {mode === 'customer-register' && '(tối thiểu 10 ký tự)'}
                </label>
                <button
                  type="button"
                  onClick={() => setShowPass((v) => !v)}
                  className="text-xs font-semibold text-[#5E5852] hover:text-[#181615] cursor-pointer"
                >
                  {showPass ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                </button>
              </div>
              <input
                type={showPass ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full h-11 rounded-lg border border-[#D9D1C5] bg-white px-3.5 focus:outline-none focus:border-[#181615]"
              />
            </div>

            {mode === 'customer-register' && (
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-1.5">
                  Xác nhận mật khẩu
                </label>
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Nhập lại mật khẩu"
                  className="w-full h-11 rounded-lg border border-[#D9D1C5] bg-white px-3.5 focus:outline-none focus:border-[#181615]"
                />
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full h-11 rounded-lg text-xs uppercase tracking-[0.14em] cursor-pointer disabled:opacity-60 mt-2"
            >
              {loading ? 'Đang xử lý...' : mode === 'customer-register' ? 'Tạo tài khoản' : 'Đăng nhập'}
            </button>
          </form>

          <div className="mt-7 pt-5 border-t border-[#E6E0D6]">
            <div className="text-[10px] font-bold uppercase tracking-[0.14em] text-[#8B847C] mb-2.5">
              Điền nhanh tài khoản demo
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setMode('customer-login');
                  setEmail('guest@spotkihotel.vn');
                  setPassword('Customer@12345');
                }}
                className="px-3 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#EFECE6] text-[11px] font-semibold text-[#181615] cursor-pointer"
              >
                Khách hàng
              </button>
              <button
                type="button"
                onClick={() => quickFillStaff('admin', 'Admin@12345')}
                className="px-3 py-1.5 rounded-lg border border-[#F0CFCB] bg-[#FBEFEE] hover:bg-[#F6DFDC] text-[#A63429] text-[11px] font-semibold cursor-pointer"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => quickFillStaff('manager_sg', 'Manager@12345')}
                className="px-3 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#EFECE6] text-[11px] font-medium text-[#5E5852] cursor-pointer"
              >
                Manager
              </button>
              <button
                type="button"
                onClick={() => quickFillStaff('reception_sg', 'Reception@12345')}
                className="px-3 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#EFECE6] text-[11px] font-medium text-[#5E5852] cursor-pointer"
              >
                Lễ tân
              </button>
              <button
                type="button"
                onClick={() => quickFillStaff('accounting_sg', 'Accounting@12345')}
                className="px-3 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#EFECE6] text-[11px] font-medium text-[#5E5852] cursor-pointer"
              >
                Kế toán
              </button>
              <button
                type="button"
                onClick={() => quickFillStaff('housekeeping_sg', 'Housekeeping@12345')}
                className="px-3 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#EFECE6] text-[11px] font-medium text-[#5E5852] cursor-pointer"
              >
                Buồng phòng
              </button>
            </div>
          </div>

          <div className="mt-6">
            <Link to="/" className="text-xs font-semibold text-[#5E5852] hover:text-[#181615]">
              ← Quay lại trang chủ
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
};

import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const Navbar: React.FC = () => {
  const { user, isStaff, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const hasDarkHero = ['/', '/rooms', '/services'].includes(location.pathname);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 36);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const handleLogout = async () => {
    setMobileOpen(false);
    await logout();
    navigate('/');
  };

  const isRouteActive = (path: string) =>
    location.pathname === path ||
    (path === '/rooms' && (location.pathname.startsWith('/rooms/') || location.pathname === '/booking'));

  // At top on dark-hero pages: pure transparent + white text (no border, no background).
  // On scroll (or on light pages): crisp solid white + dark text + subtle shadow for high contrast.
  const isTransparent = !scrolled && hasDarkHero;

  const headerClasses = isTransparent
    ? 'bg-transparent text-white shadow-none'
    : 'bg-white/98 backdrop-blur-md border-b border-[#E6E0D6] shadow-md text-[#181615]';

  const linkClass = (path: string) => {
    const active = isRouteActive(path);
    if (isTransparent) {
      return `relative py-2.5 text-sm font-semibold tracking-wide transition-colors drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)] ${
        active ? 'text-[#F3C88B]' : 'text-white/90 hover:text-white'
      }`;
    }
    return `relative py-2.5 text-sm font-semibold tracking-wide transition-colors ${
      active ? 'text-[#A63429]' : 'text-[#5E5852] hover:text-[#181615]'
    }`;
  };

  const navLinks = [
    { to: '/', label: 'Trang chủ' },
    { to: '/rooms', label: 'Phòng & Chi nhánh' },
    { to: '/services', label: 'Dịch vụ' },
    { to: '/lookup', label: 'Tra cứu đơn' },
  ];

  return (
    <header
      className={`no-print fixed top-0 left-0 right-0 z-40 transition-all duration-300 ${headerClasses}`}
    >
      <div
        className={`max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-6 transition-all duration-300 ${
          scrolled ? 'h-16' : 'h-20'
        }`}
      >
        <Link
          to="/"
          onClick={() => setMobileOpen(false)}
          className={`flex items-center gap-3 group ${
            isTransparent ? 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]' : ''
          }`}
        >
          <span className="w-1.5 h-7 bg-[#A63429] rounded-full transition-transform group-hover:scale-y-110" />
          <div className="flex items-baseline gap-2">
            <span
              className={`font-display text-2xl font-bold tracking-tight transition-colors ${
                isTransparent ? 'text-white' : 'text-[#181615]'
              }`}
            >
              SPOTKI
            </span>
            <span
              className={`text-[11px] font-bold uppercase tracking-[0.26em] transition-colors ${
                isTransparent ? 'text-[#E3B878]' : 'text-[#8B847C]'
              }`}
            >
              Hotel
            </span>
          </div>
        </Link>

        <nav className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => {
            const active = isRouteActive(item.to);
            return (
              <Link key={item.to} to={item.to} className={linkClass(item.to)}>
                {item.label}
                {active && (
                  <span
                    className={`absolute left-0 right-0 -bottom-[1px] h-[2px] ${
                      isTransparent ? 'bg-[#E3B878]' : 'bg-[#A63429]'
                    }`}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3.5">
          {user ? (
            <>
              <Link
                to={isStaff ? '/admin' : '/portal'}
                className={`hidden sm:inline-flex items-center gap-2 px-4 py-2 rounded-full border text-[13px] font-semibold transition ${
                  isTransparent
                    ? 'border-white/35 bg-black/25 text-white hover:bg-black/40'
                    : 'border-[#D9D1C5] bg-[#F7F4EF] text-[#181615] hover:border-[#181615]'
                }`}
              >
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>{isStaff ? 'Quản trị hệ thống' : user.fullName}</span>
              </Link>
              <button
                type="button"
                onClick={handleLogout}
                className={`hidden sm:inline-block px-2.5 py-2 text-[13px] font-semibold hover:underline cursor-pointer ${
                  isTransparent ? 'text-[#F3C88B] drop-shadow-[0_1px_2px_rgba(0,0,0,0.65)]' : 'text-[#A63429]'
                }`}
              >
                Đăng xuất
              </button>
            </>
          ) : (
            <Link
              to="/auth"
              className="hidden sm:inline-block btn-primary px-5 py-2.5 rounded-lg text-[13px] tracking-wide"
            >
              Đăng nhập
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((v) => !v)}
            className={`md:hidden px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer ${
              isTransparent
                ? 'border-white/35 bg-black/25 text-white'
                : 'border-[#D9D1C5] bg-white text-[#181615]'
            }`}
          >
            {mobileOpen ? 'Đóng' : 'Menu'}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="md:hidden border-t border-[#E6E0D6] bg-white text-[#181615] px-4 py-4 space-y-1.5 shadow-xl">
          {navLinks.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={() => setMobileOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-semibold ${
                isRouteActive(item.to)
                  ? 'bg-[#FBEFEE] text-[#A63429]'
                  : 'text-[#5E5852] hover:bg-[#F7F4EF]'
              }`}
            >
              {item.label}
            </Link>
          ))}
          <div className="pt-3 mt-2 border-t border-[#E6E0D6] flex items-center justify-between gap-2">
            {user ? (
              <>
                <Link
                  to={isStaff ? '/admin' : '/portal'}
                  onClick={() => setMobileOpen(false)}
                  className="px-3 py-2 rounded-lg bg-[#181615] text-white text-xs font-semibold"
                >
                  {isStaff ? 'Bảng điều khiển' : user.fullName}
                </Link>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="px-3 py-2 text-xs font-semibold text-[#A63429] cursor-pointer"
                >
                  Đăng xuất
                </button>
              </>
            ) : (
              <Link
                to="/auth"
                onClick={() => setMobileOpen(false)}
                className="w-full text-center btn-primary px-4 py-2.5 rounded-lg text-xs"
              >
                Đăng nhập / Đăng ký
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

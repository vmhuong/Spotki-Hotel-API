import React from 'react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-[#141312] text-[#D2CCC4] border-t border-[#292624] mt-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-3">
            <div className="flex items-baseline gap-2">
              <span className="font-display text-xl font-bold text-white tracking-tight">
                SPOTKI
              </span>
              <span className="text-[10px] font-bold uppercase tracking-[0.26em] text-[#B8925A]">
                Hospitality
              </span>
            </div>
            <p className="text-xs text-[#9C958D] leading-relaxed max-w-sm">
              Chuỗi lưu trú boutique chú trọng sự tĩnh lặng, tinh tế trong từng chi tiết nội thất và quy trình nhận phòng minh bạch tại các đô thị lớn.
            </p>
          </div>

          <div className="lg:col-span-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B8925A] mb-4">
              Khám phá
            </div>
            <ul className="space-y-2.5 text-xs">
              <li><Link to="/" className="hover:text-white transition">Trang chủ</Link></li>
              <li><Link to="/rooms" className="hover:text-white transition">Phòng &amp; Chi nhánh</Link></li>
              <li><Link to="/services" className="hover:text-white transition">Dịch vụ &amp; Tiện ích</Link></li>
              <li><Link to="/lookup" className="hover:text-white transition">Tra cứu mã đặt phòng</Link></li>
            </ul>
          </div>

          <div className="lg:col-span-3">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B8925A] mb-4">
              Liên hệ trực tiếp
            </div>
            <ul className="space-y-2.5 text-xs text-[#9C958D]">
              <li>123 Phan Chu Trinh, Quận 1, TP.HCM</li>
              <li>
                Hotline 24/7:{' '}
                <a href="tel:0389833822" className="text-white hover:text-[#B8925A] font-mono-num">
                  0389 833 822
                </a>
              </li>
              <li>
                Email:{' '}
                <a href="mailto:contact@spotki.vn" className="text-white hover:text-[#B8925A]">
                  contact@spotki.vn
                </a>
              </li>
            </ul>
          </div>

          <div className="lg:col-span-2">
            <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#B8925A] mb-4">
              Nội bộ
            </div>
            <p className="text-xs text-[#9C958D] leading-relaxed mb-3">
              Hỗ trợ xuất hóa đơn VAT 8% và quản lý vận hành trực tuyến.
            </p>
            <Link
              to="/auth?mode=admin"
              className="inline-block text-xs font-semibold text-white border-b border-[#B8925A] pb-0.5 hover:text-[#B8925A] transition"
            >
              Cổng nhân sự
            </Link>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t border-[#262320] flex flex-wrap justify-between gap-3 text-[11px] text-[#7A736C]">
          <span>&copy; {new Date().getFullYear()} Spotki Hotel. Bảo lưu mọi quyền.</span>
          <span>Đặt phòng trực tiếp · Hóa đơn VAT điện tử · Thanh toán linh hoạt</span>
        </div>
      </div>
    </footer>
  );
};

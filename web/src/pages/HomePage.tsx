import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { DateRangeInput } from '../components/DateRangeInput';
import type { ApiResponse, Hotel } from '../types';

interface HotelArticle {
  code: string;
  category: 'Thông tin khách sạn' | 'Tin tức sự kiện' | 'Ẩm thực & Tiện ích' | 'Cẩm nang lưu trú';
  date: string;
  readTime: string;
  title: string;
  summary: string;
  image: string;
  paragraphs: string[];
  highlights: string[];
  ctaLabel: string;
  ctaLink: string;
}

const FEATURED_ARTICLE: HotelArticle = {
  code: '00',
  category: 'Thông tin khách sạn',
  date: '26/11/2026',
  readTime: '4 phút đọc',
  title: 'Kiến trúc tinh giản & chuẩn mực lưu trú đồng bộ tại hệ thống Spotki Hotel',
  summary:
    'Tọa lạc tại các trục kết nối trọng điểm của TP. Hồ Chí Minh, Đà Nẵng và Hà Nội, Spotki Hotel mang đến không gian nghỉ ngơi tĩnh tại với quy trình đặt phòng, thanh toán và chăm sóc khách hàng minh bạch trên toàn hệ thống.',
  image: '/images/5.webp',
  paragraphs: [
    'Spotki Hotel được phát triển theo mô hình khách sạn đô thị hiện đại, chú trọng cân bằng giữa công năng làm việc của khách công tác và sự thư thái cho kỳ nghỉ gia đình. Mỗi hạng phòng Standard, Deluxe đến Suite đều sử dụng vật liệu cách âm tiêu chuẩn, ánh sáng tự nhiên dịu mắt và nội thất gỗ ấm.',
    'Toàn bộ hệ thống vận hành trực tuyến cho phép khách hàng kiểm tra khoảng ngày còn trống thực tế của từng phòng trước khi giữ chỗ, đặt cọc trực tuyến 50% và theo dõi trạng thái đơn ngay trên cổng tra cứu.',
  ],
  highlights: [
    'Đồng bộ chất lượng buồng phòng tại TP.HCM, Đà Nẵng và Hà Nội',
    'Kiểm tra lịch trống theo từng ngày & chặn trùng lịch tự động',
    'Hỗ trợ xuất hóa đơn điện tử VAT 8% cho khách hàng cá nhân & doanh nghiệp',
  ],
  ctaLabel: 'Khám phá phòng theo chi nhánh',
  ctaLink: '/rooms',
};

const HOTEL_ARTICLES: HotelArticle[] = [
  {
    code: '01',
    category: 'Thông tin khách sạn',
    date: '24/11/2026',
    readTime: '4 phút đọc',
    title: 'Nâng cấp không gian cách âm và bàn làm việc tiêu chuẩn tại toàn bộ phòng Deluxe & Suite',
    summary:
      'Các phòng hạng trung và cao cấp tại cả 3 cơ sở vừa được bổ sung đèn đọc sách chống chói, ổ cắm đa năng tại bàn làm việc và đường truyền mạng riêng ổn định cho họp trực tuyến.',
    image: '/images/9.webp',
    paragraphs: [
      'Nhằm đáp ứng nhu cầu lưu trú kết hợp làm việc từ xa và công tác ngắn ngày, Spotki Hotel đã hoàn tất rà soát và nâng cấp trang thiết bị trong phòng tại Sài Gòn, Đà Nẵng và Hà Nội.',
      'Khu vực bàn làm việc được bố trí tách biệt khỏi khu vực giường ngủ, kết hợp rèm hai lớp cản sáng hoàn toàn giúp khách lưu trú đảm bảo giấc ngủ sâu sau ngày làm việc.',
    ],
    highlights: [
      'Cửa kính 2 lớp giảm tiếng ồn đô thị',
      'Bàn làm việc rộng kèm đường truyền tốc độ cao ổn định',
      'Miễn phí nước suối, trà và cà phê bổ sung mỗi ngày',
    ],
    ctaLabel: 'Xem danh sách phòng',
    ctaLink: '/rooms',
  },
  {
    code: '02',
    category: 'Ẩm thực & Tiện ích',
    date: '18/11/2026',
    readTime: '3 phút đọc',
    title: 'Ra mắt thực đơn sáng Á – Âu theo mùa và khu vực Business Lounge tại tầng sảnh',
    summary:
      'Nhà hàng tầng sảnh mở cửa phục vụ buffet sáng từ 06:30 đến 10:00 mỗi ngày, đồng thời duy trì không gian Lounge yên tĩnh phục vụ trà chiều và tiếp khách đối tác đến 23:00.',
    image: '/images/4.webp',
    paragraphs: [
      'Thực đơn bữa sáng tại Spotki được thiết kế cân bằng dinh dưỡng với các món nóng địa phương đặc trưng từng vùng miền bên cạnh quầy bánh tươi, trái cây theo mùa và cà phê pha máy.',
      'Từ 10:00 đến 23:00, khu vực Lounge tầng sảnh mở cửa phục vụ đồ uống, set trà chiều và món nhẹ phù hợp cho các buổi trao đổi công việc ngắn gọn ngay tại khách sạn.',
    ],
    highlights: [
      'Buffet sáng phục vụ 06:30 – 10:00 hằng ngày',
      'Không gian tiếp khách yên tĩnh tại tầng sảnh',
      'Hỗ trợ phục vụ món ăn tận phòng theo yêu cầu 24/7',
    ],
    ctaLabel: 'Xem tiện ích & ẩm thực',
    ctaLink: '/services',
  },
  {
    code: '03',
    category: 'Tin tức sự kiện',
    date: '12/11/2026',
    readTime: '3 phút đọc',
    title: 'Áp dụng quy trình xác nhận đặt phòng tức thì & thanh toán VietQR minh bạch',
    summary:
      'Khách hàng có thể kiểm tra trực tiếp các ngày phòng đã có khách đặt trên lịch chọn ngày, giữ phòng bằng mức cọc 50% và nhận mã đặt phòng tra cứu trực tuyến ngay lập tức.',
    image: '/images/3.webp',
    paragraphs: [
      'Để hạn chế tối đa tình trạng trùng lịch hoặc chờ xác nhận thủ công, hệ thống đặt phòng Spotki hiển thị rõ các ngày phòng đang bận ngay trong bảng chọn ngày của từng hạng phòng.',
      'Sau khi hoàn tất bước đặt cọc 50% trực tuyến, mã đặt phòng được kích hoạt tự động để khách hàng dễ dàng theo dõi trạng thái nhận phòng, thanh toán phần còn lại và lịch sử hóa đơn.',
    ],
    highlights: [
      'Hiển thị chính xác ngày phòng trống theo thời gian thực',
      'Đặt cọc 50% an toàn, thanh toán linh hoạt phần còn lại',
      'Tra cứu trạng thái đơn mọi lúc tại mục Tra cứu đơn',
    ],
    ctaLabel: 'Tra cứu mã đặt phòng',
    ctaLink: '/lookup',
  },
  {
    code: '04',
    category: 'Ẩm thực & Tiện ích',
    date: '05/11/2026',
    readTime: '4 phút đọc',
    title: 'Hệ sinh thái thư giãn nội khu: Hồ bơi bốn mùa, Gym & Yoga và Spotki Spa trị liệu',
    summary:
      'Khách lưu trú được sử dụng miễn phí hồ bơi kiểm soát nhiệt độ quanh năm cùng phòng tập Gym & Yoga tiêu chuẩn, hoặc đặt lịch trị liệu thảo mộc riêng tư tại quầy lễ tân.',
    image: '/images/8.webp',
    paragraphs: [
      'Bên cạnh không gian phòng nghỉ, Spotki chú trọng trải nghiệm phục hồi thể chất cho khách hàng ngay trong khuôn viên khách sạn với hồ bơi bốn mùa hoạt động từ 07:00 – 19:00 và phòng tập mở cửa từ 06:00 – 22:00.',
      'Khu vực Spotki Spa cung cấp các gói trị liệu tinh dầu thiên nhiên và xông hơi thảo mộc vào khung giờ 10:00 – 22:00 hằng ngày.',
    ],
    highlights: [
      'Miễn phí hồ bơi bốn mùa và Gym & Yoga cho khách lưu trú',
      'Khăn tắm, tủ đồ và nước uống chuẩn bị sẵn tại khu tiện ích',
      'Đặt lịch Spotki Spa trước tại lễ tân để ưu tiên phòng riêng',
    ],
    ctaLabel: 'Khám phá hệ thống tiện ích',
    ctaLink: '/services',
  },
  {
    code: '05',
    category: 'Cẩm nang lưu trú',
    date: '28/10/2026',
    readTime: '5 phút đọc',
    title: 'Những thông tin cần biết trước khi nhận phòng tại Spotki Hotel (Giờ check-in, giấy tờ & VAT)',
    summary:
      'Tổng hợp đầy đủ quy định nhận phòng từ 14:00, trả phòng trước 12:00, hỗ trợ nhận phòng sớm/trả phòng muộn theo tình trạng phòng trống và hướng dẫn xuất hóa đơn GTGT 8%.',
    image: '/images/7.webp',
    paragraphs: [
      'Giờ nhận phòng tiêu chuẩn trên toàn hệ thống Spotki Hotel là từ 14:00 và giờ trả phòng trước 12:00 trưa hôm sau. Quý khách vui lòng mang theo CCCD/Hộ chiếu bản chính hoặc VNeID định danh mức 2 khi làm thủ tục tại quầy lễ tân.',
      'Trường hợp có nhu cầu nhận phòng sớm, trả phòng muộn hoặc giữ hành lý trước giờ bay, bộ phận lễ tân 24/7 luôn sẵn sàng hỗ trợ sắp xếp theo tình trạng thực tế của chi nhánh.',
    ],
    highlights: [
      'Nhận phòng từ 14:00 · Trả phòng trước 12:00',
      'Hỗ trợ giữ hành lý miễn phí tại quầy lễ tân 24/7',
      'Xuất hóa đơn GTGT điện tử (VAT 8%) khi làm thủ tục trả phòng',
    ],
    ctaLabel: 'Chọn chi nhánh lưu trú',
    ctaLink: '/rooms',
  },
  {
    code: '06',
    category: 'Thông tin khách sạn',
    date: '15/10/2026',
    readTime: '3 phút đọc',
    title: 'Chương trình thành viên Spotki Loyalty: Tích điểm tự động và quy đổi trực tiếp vào tiền phòng',
    summary:
      'Tài khoản khách hàng đã đăng nhập được tự động tích lũy điểm thưởng sau khi hoàn tất thanh toán kỳ lưu trú và có thể quy đổi giảm trừ trực tiếp cho các lần đặt phòng tiếp theo.',
    image: '/images/2.webp',
    paragraphs: [
      'Mọi đơn đặt phòng hoàn tất thanh toán bởi tài khoản thành viên đều được hệ thống ghi nhận điểm thưởng minh bạch trong mục Hồ sơ cá nhân mà không cần giữ thẻ cứng.',
      'Điểm tích lũy có thể sử dụng linh hoạt để giảm trừ chi phí ở các kỳ nghỉ hoặc chuyến công tác kế tiếp trên cả 3 chi nhánh TP. Hồ Chí Minh, Đà Nẵng và Hà Nội.',
    ],
    highlights: [
      'Tích lũy điểm tự động trên từng đơn hoàn tất thanh toán',
      'Áp dụng thống nhất tại mọi cơ sở của Spotki Hotel',
      'Theo dõi lịch sử cộng và quy đổi điểm trực tiếp trong tài khoản',
    ],
    ctaLabel: 'Đặt phòng & tích điểm ngay',
    ctaLink: '/rooms',
  },
];

const HOTEL_INFO_FACTS = [
  {
    code: '01',
    label: 'Giờ nhận & trả phòng',
    value: '14:00 – 12:00',
    note: 'Hỗ trợ giữ hành lý miễn phí 24/7 tại sảnh lễ tân',
  },
  {
    code: '02',
    label: 'Cơ sở đang vận hành',
    value: '3 Đô thị lớn',
    note: 'TP. Hồ Chí Minh · Đà Nẵng · Hà Nội',
  },
  {
    code: '03',
    label: 'Chính sách giữ phòng',
    value: 'Đặt cọc 50%',
    note: 'Kiểm tra ngày trống thực tế & thanh toán linh hoạt',
  },
  {
    code: '04',
    label: 'Chứng từ & hỗ trợ',
    value: 'VAT 8% · 24/7',
    note: 'Hotline lễ tân hệ thống: 0389 833 822',
  },
];

const ARTICLE_CATEGORIES = [
  'Tất cả',
  'Thông tin khách sạn',
  'Tin tức sự kiện',
  'Ẩm thực & Tiện ích',
  'Cẩm nang lưu trú',
] as const;

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const [hotels, setHotels] = useState<Hotel[]>([]);
  const [activeSlide, setActiveSlide] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string>('Tất cả');
  const [activeArticle, setActiveArticle] = useState<HotelArticle | null>(null);

  const [hotelId, setHotelId] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [minCapacity, setMinCapacity] = useState('2');

  useEffect(() => {
    api
      .get<ApiResponse<Hotel[]>>('/hotels')
      .then((hRes) => {
        setHotels(hRes.data.data || []);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (hotels.length <= 1) return;
    const id = window.setInterval(() => {
      setActiveSlide((s) => (s + 1) % hotels.length);
    }, 6000);
    return () => window.clearInterval(id);
  }, [hotels.length]);

  const activeHotel = hotels[activeSlide] || hotels[0];

  const filteredArticles = useMemo(() => {
    if (selectedCategory === 'Tất cả') return HOTEL_ARTICLES;
    return HOTEL_ARTICLES.filter((a) => a.category === selectedCategory);
  }, [selectedCategory]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (hotelId) params.set('hotelId', hotelId);
    if (checkIn) params.set('checkIn', checkIn);
    if (checkOut) params.set('checkOut', checkOut);
    if (minCapacity) params.set('minCapacity', minCapacity);
    navigate(`/rooms?${params.toString()}`);
  };

  return (
    <div className="space-y-24 pb-8">
      {/* Full-Viewport Hero + Search Bar */}
      <section className="relative min-h-screen bg-[#141312] text-white flex flex-col justify-end">
        <div className="absolute inset-0 overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-center transition-all duration-1000 scale-[1.03]"
            style={{
              backgroundImage: `url('${activeHotel?.heroImage || '/images/hero-saigon.jpg'}')`,
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(180deg, rgba(20,19,18,0.48) 0%, rgba(20,19,18,0.55) 45%, rgba(20,19,18,0.92) 100%)',
            }}
          />
        </div>

        <div className="relative w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-12 lg:pb-16">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.25em] text-[#E3B878] mb-5">
              <span className="w-6 h-[1px] bg-[#E3B878]" />
              <span>
                {activeHotel ? `${activeHotel.city} · Hạng ${activeHotel.starRating} Sao` : 'Spotki Hotel Group'}
              </span>
            </div>

            <h1 className="font-display text-4xl sm:text-6xl lg:text-[66px] font-semibold leading-[1.04] tracking-tight text-white">
              {activeHotel?.hotelName || 'Không gian nghỉ dưỡng chuẩn mực tại trung tâm đô thị'}
            </h1>

            <p className="mt-5 text-[#E5DFD5] text-base sm:text-lg max-w-2xl leading-relaxed font-normal">
              {activeHotel?.description ||
                'Hệ thống khách sạn Spotki tại TP. Hồ Chí Minh, Đà Nẵng và Hà Nội — nơi giao thoa giữa kiến trúc tinh giản, tiện ích đồng bộ và dịch vụ tận tâm 24/7.'}
            </p>

            {activeHotel && (
              <p className="mt-3 text-xs text-[#BFB6AA] tracking-wide">
                {activeHotel.address}, {activeHotel.city}
              </p>
            )}

            {hotels.length > 1 && (
              <div className="mt-8 flex flex-wrap items-center gap-2">
                {hotels.map((h, idx) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => setActiveSlide(idx)}
                    className={`px-4 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                      idx === activeSlide
                        ? 'bg-white text-[#181615] border-white'
                        : 'bg-white/10 text-white/85 border-white/25 hover:bg-white/20'
                    }`}
                  >
                    <span className="font-mono-num mr-1.5 opacity-60">0{idx + 1}</span>
                    {h.city}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Compact Single-Line Architectural Search Bar */}
          <form
            onSubmit={handleSearch}
            className="mt-10 bg-white text-[#181615] rounded-xl p-1.5 shadow-2xl border border-[#E6E0D6] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-[1.2fr_1.5fr_0.9fr_auto] items-center"
          >
            <div className="px-4 py-1 lg:border-r border-[#E6E0D6]">
              <select
                aria-label="Chi nhánh"
                required
                value={hotelId}
                onChange={(e) => setHotelId(e.target.value)}
                className={`w-full h-10 text-sm font-semibold bg-transparent focus:outline-none cursor-pointer ${
                  hotelId ? 'text-[#181615]' : 'text-[#5E5852]'
                }`}
              >
                <option value="" disabled>
                  Chọn điểm đến *
                </option>
                {hotels.map((h) => (
                  <option key={h.id} value={h.id} className="text-[#181615]">
                    {h.hotelName}
                  </option>
                ))}
              </select>
            </div>

            <div className="px-4 py-1 border-t sm:border-t-0 lg:border-r border-[#E6E0D6]">
              <DateRangeInput
                checkIn={checkIn}
                checkOut={checkOut}
                allowClear
                variant="bare"
                onChange={(nextIn, nextOut) => {
                  setCheckIn(nextIn);
                  setCheckOut(nextOut);
                }}
              />
            </div>

            <div className="px-4 py-1 border-t lg:border-t-0 border-[#E6E0D6] flex items-center justify-between gap-2">
              <label
                htmlFor="home-capacity"
                className="text-xs font-semibold text-[#5E5852] whitespace-nowrap"
              >
                Số khách:
              </label>
              <input
                id="home-capacity"
                type="number"
                min={1}
                max={10}
                value={minCapacity}
                onChange={(e) => setMinCapacity(e.target.value)}
                className="w-16 h-10 text-sm font-semibold text-[#181615] text-right bg-transparent focus:outline-none font-mono-num"
              />
            </div>

            <div className="p-0.5 flex items-stretch">
              <button
                type="submit"
                className="btn-primary w-full lg:w-auto px-6 h-10 rounded-lg text-xs uppercase tracking-[0.14em] cursor-pointer whitespace-nowrap"
              >
                Tìm phòng trống
              </button>
            </div>
          </form>
        </div>
      </section>

      {/* Hotel Information Directory Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="card-editorial rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E6E0D6]">
          {HOTEL_INFO_FACTS.map((fact) => (
            <div key={fact.code} className="p-6 sm:p-7">
              <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B847C]">
                <span className="font-mono-num text-[#A63429]">{fact.code}</span>
                <span>{fact.label}</span>
              </div>
              <div className="font-display text-2xl font-semibold text-[#181615] mt-2">{fact.value}</div>
              <p className="text-xs text-[#5E5852] mt-1.5 leading-relaxed">{fact.note}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured Editorial Article */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-5 border-b border-[#E6E0D6] mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A63429]">
              Thông tin nổi bật
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#181615] mt-1">
              Giới thiệu &amp; Điểm nhấn Spotki Hotel
            </h2>
          </div>
          <span className="text-xs text-[#8B847C]">
            Cập nhật chính thức từ ban điều hành Spotki
          </span>
        </div>

        <article className="card-editorial rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-6 min-h-[300px] bg-[#EFECE6] overflow-hidden relative">
            <img
              src={FEATURED_ARTICLE.image}
              alt={FEATURED_ARTICLE.title}
              className="w-full h-full object-cover hover:scale-105 transition duration-700"
            />
            <span className="absolute top-4 left-4 px-3 py-1 rounded-full bg-white/95 text-[#A63429] text-[11px] font-bold">
              {FEATURED_ARTICLE.category}
            </span>
          </div>
          <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-between gap-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-xs text-[#8B847C] font-mono-num">
                <span>{FEATURED_ARTICLE.date}</span>
                <span>·</span>
                <span>{FEATURED_ARTICLE.readTime}</span>
              </div>
              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#181615] leading-tight">
                {FEATURED_ARTICLE.title}
              </h3>
              <p className="text-sm text-[#5E5852] leading-relaxed">{FEATURED_ARTICLE.summary}</p>
              <div className="pt-2 space-y-2 border-t border-[#E6E0D6]">
                {FEATURED_ARTICLE.highlights.map((item) => (
                  <div key={item} className="text-xs text-[#181615] font-medium flex items-start gap-2">
                    <span className="text-[#A63429] font-bold">—</span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveArticle(FEATURED_ARTICLE)}
                className="btn-primary px-5 py-2.5 rounded-lg text-xs cursor-pointer"
              >
                Đọc bài viết đầy đủ →
              </button>
              <Link
                to={FEATURED_ARTICLE.ctaLink}
                className="px-5 py-2.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] text-xs font-semibold text-[#181615]"
              >
                {FEATURED_ARTICLE.ctaLabel}
              </Link>
            </div>
          </div>
        </article>
      </section>

      {/* Hotel News & Articles Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#E6E0D6] mb-8">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A63429]">
              Spotki Journal
            </p>
            <h2 className="font-display text-3xl sm:text-4xl font-semibold text-[#181615] mt-1">
              Tin tức &amp; Bài viết về khách sạn
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {ARTICLE_CATEGORIES.map((category) => (
              <button
                key={category}
                type="button"
                onClick={() => setSelectedCategory(category)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition cursor-pointer border ${
                  selectedCategory === category
                    ? 'bg-[#181615] text-white border-[#181615]'
                    : 'bg-white text-[#5E5852] border-[#E6E0D6] hover:border-[#A63429] hover:text-[#181615]'
                }`}
              >
                {category}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {filteredArticles.map((article) => (
            <article
              key={article.code}
              className="group card-editorial rounded-xl overflow-hidden hover:shadow-xl hover:border-[#C9C0B3] transition-all duration-300 flex flex-col"
            >
              <div className="relative aspect-[16/10] bg-[#EFECE6] overflow-hidden">
                <img
                  src={article.image}
                  alt={article.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded bg-[#141312]/80 text-[#E5DFD5] text-[11px] font-mono-num">
                  {article.code}
                </span>
                <span className="absolute bottom-3.5 left-3.5 px-3 py-1 rounded-full bg-white/95 text-[#A63429] text-[11px] font-bold">
                  {article.category}
                </span>
              </div>

              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-2 text-[11px] text-[#8B847C] font-mono-num">
                    <span>{article.date}</span>
                    <span>·</span>
                    <span>{article.readTime}</span>
                  </div>
                  <h3 className="font-display text-xl font-semibold text-[#181615] leading-snug mt-2">
                    {article.title}
                  </h3>
                  <p className="text-sm text-[#5E5852] mt-2.5 leading-relaxed">{article.summary}</p>
                </div>

                <div className="mt-5 pt-4 border-t border-[#F1ECE3] flex items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => setActiveArticle(article)}
                    className="inline-flex items-center justify-between w-full text-xs font-bold text-[#A63429] hover:underline cursor-pointer"
                  >
                    <span>Đọc chi tiết bài viết</span>
                    <span className="transition-transform group-hover:translate-x-1">→</span>
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Dark Obsidian Hotel Information & Quick Booking Band */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#141312] text-white rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 border border-[#292624]">
          <div className="lg:col-span-6 p-8 sm:p-12 flex flex-col justify-between gap-8">
            <div>
              <div className="inline-flex items-center gap-2.5 text-[11px] font-bold uppercase tracking-[0.22em] text-[#B8925A]">
                <span className="w-6 h-[1px] bg-[#B8925A]" />
                <span>Thông tin đặt phòng trực tiếp</span>
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-semibold mt-3 leading-tight text-white">
                Sẵn sàng chào đón quý khách tại 3 miền Bắc – Trung – Nam
              </h2>
              <p className="text-[#B8B0A6] text-sm leading-relaxed mt-4">
                Chọn chi nhánh phù hợp với lịch trình của bạn để xem phòng trống theo ngày thực tế, nhận tư vấn từ bộ phận lễ tân 24/7 và hưởng quyền lợi thành viên Spotki.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-6 border-t border-[#2A2724] pt-6">
              <div>
                <div className="font-mono-num text-[11px] text-[#B8925A] mb-1">01</div>
                <div className="font-mono-num font-bold text-white text-sm">14:00 – 12:00</div>
                <div className="text-xs text-[#9C958D] mt-0.5">Nhận / trả phòng</div>
              </div>
              <div>
                <div className="font-mono-num text-[11px] text-[#B8925A] mb-1">02</div>
                <div className="font-mono-num font-bold text-white text-sm">VAT 8%</div>
                <div className="text-xs text-[#9C958D] mt-0.5">Hóa đơn minh bạch</div>
              </div>
              <div>
                <div className="font-mono-num text-[11px] text-[#B8925A] mb-1">03</div>
                <div className="font-bold text-white text-sm">0389 833 822</div>
                <div className="text-xs text-[#9C958D] mt-0.5">Hotline lễ tân 24/7</div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Link
                to="/rooms"
                className="inline-block px-6 py-3 rounded-lg bg-white text-[#181615] text-xs font-bold uppercase tracking-[0.14em] hover:bg-[#F1ECE3] transition"
              >
                Chọn chi nhánh &amp; đặt phòng →
              </Link>
              <Link
                to="/services"
                className="inline-block px-6 py-3 rounded-lg border border-[#3B3632] text-white text-xs font-bold uppercase tracking-[0.14em] hover:bg-[#24211E] transition"
              >
                Dịch vụ &amp; Tiện ích
              </Link>
            </div>
          </div>

          <div className="lg:col-span-6 grid grid-cols-2 gap-1 bg-[#262320] min-h-[340px]">
            <img src="/images/3.webp" alt="Bể bơi khách sạn" className="w-full h-full object-cover" />
            <div className="grid grid-rows-2 gap-1">
              <img src="/images/8.webp" alt="Spa và phòng Suite" className="w-full h-full object-cover" />
              <img src="/images/2.webp" alt="Kiến trúc nghỉ dưỡng" className="w-full h-full object-cover" />
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Article Reader Modal */}
      {activeArticle && (
        <div
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setActiveArticle(null)}
        >
          <div
            className="bg-white rounded-2xl border border-[#E6E0D6] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="relative aspect-[16/9] bg-[#EFECE6]">
              <img
                src={activeArticle.image}
                alt={activeArticle.title}
                className="w-full h-full object-cover"
              />
              <button
                type="button"
                onClick={() => setActiveArticle(null)}
                className="absolute top-4 right-4 px-3 py-1.5 rounded-lg bg-white/95 text-[#181615] text-xs font-bold shadow cursor-pointer hover:bg-white"
              >
                Đóng
              </button>
              <span className="absolute bottom-4 left-4 px-3 py-1 rounded-full bg-white/95 text-[#A63429] text-[11px] font-bold">
                {activeArticle.category}
              </span>
            </div>

            <div className="p-6 sm:p-8 space-y-5">
              <div className="flex items-center gap-3 text-xs text-[#8B847C] font-mono-num">
                <span>{activeArticle.date}</span>
                <span>·</span>
                <span>{activeArticle.readTime}</span>
              </div>

              <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#181615] leading-snug">
                {activeArticle.title}
              </h3>

              <div className="space-y-3 text-sm text-[#5E5852] leading-relaxed">
                {activeArticle.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>

              <div className="p-4 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] space-y-2">
                <div className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#A63429]">
                  Điểm chính từ thông tin
                </div>
                {activeArticle.highlights.map((h) => (
                  <div key={h} className="text-xs text-[#181615] font-medium flex items-start gap-2">
                    <span className="text-[#A63429] font-bold">—</span>
                    <span>{h}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-[#E6E0D6]">
                <Link
                  to={activeArticle.ctaLink}
                  onClick={() => setActiveArticle(null)}
                  className="btn-primary px-5 py-2.5 rounded-lg text-xs"
                >
                  {activeArticle.ctaLabel} →
                </Link>
                <button
                  type="button"
                  onClick={() => setActiveArticle(null)}
                  className="px-4 py-2 rounded-lg border border-[#D9D1C5] text-xs font-semibold text-[#5E5852] hover:text-[#181615] cursor-pointer"
                >
                  Đóng bài viết
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

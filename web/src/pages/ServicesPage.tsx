import React from 'react';
import { Link } from 'react-router-dom';

const FLAGSHIP_SPACES = [
  {
    tag: 'Wellness & Thư giãn',
    title: 'Hồ bơi bốn mùa & Spotki Spa',
    desc: 'Không gian tách biệt hoàn toàn khỏi nhịp phố thị với hồ bơi kiểm soát nhiệt độ quanh năm và hệ thống phòng trị liệu thảo mộc chuyên sâu.',
    meta: [
      { label: 'Hồ bơi bốn mùa', value: '07:00 – 19:00' },
      { label: 'Spotki Spa', value: '10:00 – 22:00' },
      { label: 'Đặc quyền', value: 'Miễn phí hồ bơi cho khách lưu trú' },
    ],
    image: '/images/3.webp',
  },
  {
    tag: 'Ẩm thực & Tiếp khách',
    title: 'Nhà hàng tầng sảnh & Business Lounge',
    desc: 'Phục vụ buffet sáng tiêu chuẩn quốc tế, set trà chiều và thực đơn Á – Âu dành cho các buổi tiếp khách đối tác hoặc dùng bữa riêng tư tại phòng.',
    meta: [
      { label: 'Buffet sáng', value: '06:30 – 10:00' },
      { label: 'Lounge & Ẩm thực', value: '10:00 – 23:00' },
      { label: 'Phục vụ tại phòng', value: '24/7 theo yêu cầu' },
    ],
    image: '/images/5.webp',
  },
];

const CORE_FACILITIES = [
  {
    code: '01',
    title: 'Bể bơi bốn mùa',
    image: '/images/3.webp',
    hours: '07:00 – 19:00 hằng ngày',
    desc: 'Hồ bơi kiểm soát nhiệt độ ổn định quanh năm, khăn tắm và khu vực thư giãn ven hồ phục vụ miễn phí cho khách lưu trú.',
  },
  {
    code: '02',
    title: 'Gym & Yoga Studio',
    image: '/images/7.webp',
    hours: '06:00 – 22:00 hằng ngày',
    desc: 'Phòng tập trang bị máy cardio hiện đại, tạ tự do và khu vực tập yoga riêng biệt, yên tĩnh cho lịch trình rèn luyện mỗi ngày.',
  },
  {
    code: '03',
    title: 'Nhà hàng & Lounge',
    image: '/images/5.webp',
    hours: '06:30 – 23:00 hằng ngày',
    desc: 'Thực đơn Á – Âu tinh chọn, phục vụ buffet sáng, trà chiều doanh nhân và giao món trực tiếp tận phòng.',
  },
  {
    code: '04',
    title: 'Spa trị liệu',
    image: '/images/8.webp',
    hours: '10:00 – 22:00 hằng ngày',
    desc: 'Liệu trình massage toàn thân, xông hơi thảo mộc và chăm sóc phục hồi chuyên sâu theo lịch đặt trước tại lễ tân.',
  },
  {
    code: '05',
    title: 'Khu vui chơi trẻ em',
    image: '/images/6.webp',
    hours: '08:00 – 20:00 hằng ngày',
    desc: 'Không gian trong nhà an toàn với vật liệu thân thiện, góc đọc sách và nhân sự hỗ trợ giúp gia đình an tâm nghỉ dưỡng.',
  },
  {
    code: '06',
    title: 'Sân Pickleball',
    image: '/images/2.webp',
    hours: '06:00 – 21:00 hằng ngày',
    desc: 'Sân tiêu chuẩn ngoài trời thoáng đãng, hỗ trợ đặt khung giờ tập luyện và mượn dụng cụ ngay tại quầy lễ tân.',
  },
];

const CONCIERGE_SERVICES = [
  {
    code: '01',
    title: 'Đưa đón sân bay riêng',
    desc: 'Sắp xếp xe đưa đón đúng giờ theo mã chuyến bay tại Tân Sơn Nhất, Đà Nẵng và Nội Bài.',
  },
  {
    code: '02',
    title: 'Giặt ủi & Chăm sóc trang phục',
    desc: 'Dịch vụ giặt hấp, là ủi trong ngày phục vụ nhu cầu công tác và hội nghị của khách hàng.',
  },
  {
    code: '03',
    title: 'Hỗ trợ đoàn & Công ty',
    desc: 'Thiết lập đặt phòng theo đoàn, giữ phòng liền kề và đầu mối liên hệ riêng cho doanh nghiệp.',
  },
  {
    code: '04',
    title: 'Hóa đơn GTGT điện tử (VAT 8%)',
    desc: 'Tổng hợp minh bạch mọi khoản lưu trú và dịch vụ phát sinh trên một hóa đơn thống nhất.',
  },
];

export const ServicesPage: React.FC = () => {
  return (
    <div className="space-y-20 pb-8">
      {/* Editorial Banner */}
      <section className="relative bg-[#141312] text-white overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-40"
          style={{ backgroundImage: "url('/images/5.webp')" }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'linear-gradient(90deg, rgba(20,19,18,0.9), rgba(20,19,18,0.5))' }}
        />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-16">
          <div className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.22em] text-[#B8925A]">
            <span className="w-5 h-[1px] bg-[#B8925A]" />
            <span>Spotki Amenities &amp; Concierge</span>
          </div>
          <h1 className="font-display text-3xl sm:text-5xl font-semibold mt-2">
            Dịch vụ &amp; Hệ thống tiện ích
          </h1>
          <p className="text-sm sm:text-base text-[#D8D1C7] mt-2.5 max-w-2xl leading-relaxed">
            Không gian thư giãn, ẩm thực và dịch vụ lễ tân 24/7 được thiết kế đồng bộ nhằm phục vụ trọn vẹn nhu cầu công tác và nghỉ dưỡng tại các cơ sở Spotki.
          </p>
        </div>
      </section>

      {/* Flagship Spaces 50/50 Editorial Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-wrap items-end justify-between gap-4 pb-5 border-b border-[#E6E0D6]">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A63429]">
              Không gian tiêu biểu
            </p>
            <h2 className="font-display text-3xl font-semibold text-[#181615] mt-1">
              Trải nghiệm tinh hoa tại khách sạn
            </h2>
          </div>
          <Link to="/rooms" className="btn-primary px-5 py-2.5 rounded-lg text-xs">
            Chọn chi nhánh &amp; đặt phòng
          </Link>
        </div>

        <div className="space-y-8">
          {FLAGSHIP_SPACES.map((space, idx) => (
            <article
              key={space.title}
              className="card-editorial rounded-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12 items-stretch"
            >
              <div
                className={`lg:col-span-6 min-h-[280px] bg-[#EFECE6] overflow-hidden ${
                  idx % 2 === 1 ? 'lg:order-2' : ''
                }`}
              >
                <img
                  src={space.image}
                  alt={space.title}
                  className="w-full h-full object-cover hover:scale-105 transition duration-700"
                />
              </div>
              <div className="lg:col-span-6 p-7 sm:p-10 flex flex-col justify-center space-y-5">
                <div className="text-[11px] font-bold uppercase tracking-[0.2em] text-[#A63429]">
                  {space.tag}
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-semibold text-[#181615] leading-tight">
                  {space.title}
                </h3>
                <p className="text-sm text-[#5E5852] leading-relaxed">{space.desc}</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-4 border-t border-[#E6E0D6] text-xs">
                  {space.meta.map((m) => (
                    <div key={m.label}>
                      <div className="text-[#8B847C]">{m.label}</div>
                      <div className="font-semibold text-[#181615] mt-0.5">{m.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Core Facilities Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-5 border-b border-[#E6E0D6] mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A63429]">
            Tiện ích nội khu
          </p>
          <h2 className="font-display text-3xl font-semibold text-[#181615] mt-1">
            Toàn bộ tiện ích dành cho khách lưu trú
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
          {CORE_FACILITIES.map((item) => (
            <article key={item.title} className="group card-editorial rounded-xl overflow-hidden flex flex-col">
              <div className="relative aspect-[16/10] bg-[#EFECE6] overflow-hidden">
                <img
                  src={item.image}
                  alt={item.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                />
                <span className="absolute top-3.5 left-3.5 px-2.5 py-1 rounded bg-[#141312]/75 text-[#E5DFD5] text-[11px] font-mono-num">
                  {item.code}
                </span>
              </div>
              <div className="p-6 flex-1 flex flex-col justify-between">
                <div>
                  <span className="inline-block px-2.5 py-0.5 rounded-full bg-[#FAF3E8] border border-[#E8D6BA] text-[#946421] text-[11px] font-semibold">
                    {item.hours}
                  </span>
                  <h3 className="font-display text-xl font-semibold text-[#181615] mt-2.5">{item.title}</h3>
                  <p className="text-sm text-[#5E5852] mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Corporate & Concierge Support Strip */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="pb-5 border-b border-[#E6E0D6] mb-8">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#A63429]">
            Hỗ trợ 24/7
          </p>
          <h2 className="font-display text-3xl font-semibold text-[#181615] mt-1">
            Dịch vụ lễ tân &amp; Doanh nghiệp
          </h2>
        </div>

        <div className="card-editorial rounded-2xl grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y sm:divide-y-0 sm:divide-x divide-[#E6E0D6]">
          {CONCIERGE_SERVICES.map((srv) => (
            <div key={srv.code} className="p-6 space-y-2">
              <div className="font-mono-num text-xs font-bold text-[#A63429]">{srv.code}</div>
              <h3 className="font-display text-lg font-semibold text-[#181615]">{srv.title}</h3>
              <p className="text-xs text-[#5E5852] leading-relaxed">{srv.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-[#141312] text-white rounded-2xl p-8 sm:p-12 flex flex-wrap items-center justify-between gap-6 border border-[#292624]">
          <div className="max-w-2xl">
            <div className="text-[11px] font-bold uppercase tracking-[0.22em] text-[#B8925A]">
              Đặt phòng trực tiếp
            </div>
            <h2 className="font-display text-2xl sm:text-3xl font-semibold mt-2">
              Yêu cầu đặt dịch vụ trước hoặc tư vấn lưu trú theo đoàn
            </h2>
            <p className="text-sm text-[#B8B0A6] mt-2">
              Liên hệ bộ phận lễ tân qua hotline <span className="font-mono-num text-white">0389 833 822</span> hoặc chọn chi nhánh để giữ phòng ngay trên hệ thống.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              to="/rooms"
              className="px-6 py-3 rounded-lg bg-white text-[#181615] text-xs font-bold uppercase tracking-[0.14em] hover:bg-[#F1ECE3] transition"
            >
              Chọn chi nhánh →
            </Link>
            <Link
              to="/lookup"
              className="px-6 py-3 rounded-lg border border-[#3B3632] text-white text-xs font-bold uppercase tracking-[0.14em] hover:bg-[#24211E] transition"
            >
              Tra cứu đơn
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

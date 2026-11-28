import React from 'react';

interface DonutSegment {
  label: string;
  value: number;
  color: string;
  dotClass: string;
}

export const RoomStatusDonutChart: React.FC<{
  total: number;
  available: number;
  occupied: number;
  cleaning: number;
}> = ({ total, available, occupied, cleaning }) => {
  const maintenance = Math.max(0, total - available - occupied - cleaning);
  const segments: DonutSegment[] = [
    { label: 'Sẵn sàng', value: available, color: '#1E5F3E', dotClass: 'bg-[#1E5F3E]' },
    { label: 'Đang có khách', value: occupied, color: '#A63429', dotClass: 'bg-[#A63429]' },
    { label: 'Đang dọn', value: cleaning, color: '#B8925A', dotClass: 'bg-[#B8925A]' },
    { label: 'Bảo trì', value: maintenance, color: '#8B847C', dotClass: 'bg-[#8B847C]' },
  ];

  const safeTotal = Math.max(1, total);
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  let accumulatedOffset = 0;

  return (
    <div className="flex flex-col sm:flex-row items-center gap-7">
      <div className="relative w-36 h-36 shrink-0">
        <svg viewBox="0 0 140 140" className="w-full h-full -rotate-90">
          <circle
            cx="70"
            cy="70"
            r={radius}
            fill="none"
            stroke="#EFECE6"
            strokeWidth="16"
          />
          {segments.map((seg) => {
            const pct = seg.value / safeTotal;
            const dash = pct * circumference;
            const offset = -accumulatedOffset;
            accumulatedOffset += dash;
            if (seg.value <= 0) return null;
            return (
              <circle
                key={seg.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={seg.color}
                strokeWidth="16"
                strokeDasharray={`${dash} ${circumference}`}
                strokeDashoffset={offset}
                strokeLinecap="butt"
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="font-mono-num text-2xl font-bold text-[#181615]">{total}</span>
          <span className="text-[10px] uppercase tracking-[0.14em] font-semibold text-[#8B847C]">
            Tổng phòng
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-3 text-xs">
        {segments.map((seg) => {
          const pct = Math.round((seg.value / safeTotal) * 100);
          return (
            <div key={seg.label} className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className={`w-2.5 h-2.5 rounded-full ${seg.dotClass}`} />
                <span className="font-medium text-[#5E5852]">{seg.label}</span>
              </div>
              <div className="font-mono-num font-bold text-[#181615]">
                {seg.value} <span className="text-[#8B847C] font-normal">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export interface BarDatum {
  label: string;
  sublabel?: string;
  value: number;
  barClass?: string;
}

export const HorizontalBarChart: React.FC<{
  items: BarDatum[];
  unitLabel?: string;
}> = ({ items, unitLabel = 'lượt' }) => {
  const maxVal = Math.max(1, ...items.map((i) => i.value));

  return (
    <div className="space-y-3.5">
      {items.map((item, idx) => {
        const pct = Math.max(4, Math.round((item.value / maxVal) * 100));
        return (
          <div key={idx} className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <div className="truncate pr-2">
                <span className="font-semibold text-[#181615]">{item.label}</span>
                {item.sublabel && <span className="ml-1.5 text-[#8B847C]">{item.sublabel}</span>}
              </div>
              <span className="font-mono-num font-bold text-[#181615] shrink-0">
                {item.value} {unitLabel}
              </span>
            </div>
            <div className="h-2 rounded-full bg-[#EFECE6] overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${item.barClass || 'bg-[#B8925A]'}`}
                style={{ width: `${pct}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
};

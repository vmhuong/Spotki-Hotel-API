import React, { useEffect, useMemo, useRef, useState } from 'react';

export interface BookedRange {
  checkIn: string;
  checkOut: string;
}

interface DateRangeInputProps {
  checkIn: string;
  checkOut: string;
  onChange: (nextIn: string, nextOut: string) => void;
  placeholder?: string;
  className?: string;
  allowClear?: boolean;
  variant?: 'boxed' | 'bare';
  disabledRanges?: BookedRange[];
}

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function formatViDate(iso: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

export const DateRangeInput: React.FC<DateRangeInputProps> = ({
  checkIn,
  checkOut,
  onChange,
  placeholder = 'Chọn ngày vào - ngày ra',
  className = '',
  allowClear = false,
  variant = 'boxed',
  disabledRanges = [],
}) => {
  const [open, setOpen] = useState(false);
  const [draftStart, setDraftStart] = useState<string>(checkIn);
  const [pickingEnd, setPickingEnd] = useState(false);

  const todayIso = useMemo(() => toIsoDate(new Date()), []);

  const initialMonth = useMemo(() => {
    const base = checkIn ? new Date(`${checkIn}T00:00:00`) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  }, [checkIn]);

  const [viewMonth, setViewMonth] = useState<Date>(initialMonth);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setDraftStart(checkIn);
  }, [checkIn]);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setPickingEnd(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [open]);

  const calendarDays = useMemo(() => {
    const year = viewMonth.getFullYear();
    const month = viewMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const startWeekday = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const cells: Array<{ iso: string; day: number } | null> = [];
    for (let i = 0; i < startWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) {
      const iso = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ iso, day: d });
    }
    return cells;
  }, [viewMonth]);

  const isDateBooked = (iso: string) =>
    disabledRanges.some((r) => iso >= r.checkIn && iso < r.checkOut);

  const rangeOverlapsBooked = (startIso: string, endIso: string) =>
    disabledRanges.some((r) => r.checkIn < endIso && r.checkOut > startIso);

  const handleDayClick = (iso: string) => {
    if (iso < todayIso) return;
    if (!pickingEnd) {
      if (isDateBooked(iso)) return;
      setDraftStart(iso);
      setPickingEnd(true);
    } else {
      if (iso <= draftStart) {
        if (isDateBooked(iso)) return;
        setDraftStart(iso);
        setPickingEnd(true);
      } else if (!rangeOverlapsBooked(draftStart, iso)) {
        onChange(draftStart, iso);
        setPickingEnd(false);
        setOpen(false);
      }
    }
  };

  const displayLabel =
    checkIn && checkOut
      ? `${formatViDate(checkIn)}  →  ${formatViDate(checkOut)}`
      : checkIn
      ? `${formatViDate(checkIn)}  →  ...`
      : placeholder;

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => {
          setOpen((v) => !v);
          setPickingEnd(false);
        }}
        className={`w-full h-10 text-left text-sm font-mono-num font-semibold text-[#181615] flex items-center justify-between gap-2 transition cursor-pointer ${
          variant === 'bare'
            ? 'bg-transparent px-0 focus:outline-none'
            : 'rounded-lg border border-[#D9D1C5] bg-white px-3 hover:border-[#181615]'
        }`}
      >
        <span className={checkIn ? 'text-[#181615] truncate' : 'text-[#5E5852] font-sans font-semibold truncate'}>
          {displayLabel}
        </span>
        <span className="text-[10px] uppercase tracking-[0.14em] text-[#8B847C] font-sans font-bold shrink-0">
          Lịch
        </span>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-3 z-[60] w-[308px] bg-white border border-[#E6E0D6] rounded-xl shadow-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
              className="w-7 h-7 rounded-lg border border-[#E6E0D6] hover:bg-[#F7F4EF] text-xs font-bold cursor-pointer text-[#181615]"
            >
              ‹
            </button>
            <div className="text-xs font-bold text-[#181615] capitalize">
              Tháng {viewMonth.getMonth() + 1} / {viewMonth.getFullYear()}
            </div>
            <button
              type="button"
              onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
              className="w-7 h-7 rounded-lg border border-[#E6E0D6] hover:bg-[#F7F4EF] text-xs font-bold cursor-pointer text-[#181615]"
            >
              ›
            </button>
          </div>

          <div className="text-[11px] text-[#8B847C] mb-2 text-center">
            {pickingEnd ? 'Chọn ngày trả phòng' : 'Chọn ngày nhận phòng'}
          </div>

          <div className="grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-[#8B847C] mb-1.5">
            <span>T2</span>
            <span>T3</span>
            <span>T4</span>
            <span>T5</span>
            <span>T6</span>
            <span>T7</span>
            <span>CN</span>
          </div>

          <div className="grid grid-cols-7 gap-1 text-xs font-mono-num">
            {calendarDays.map((cell, idx) => {
              if (!cell) return <span key={idx} />;
              const isPast = cell.iso < todayIso;
              const booked = isDateBooked(cell.iso);
              const blocksEnd = pickingEnd && cell.iso > draftStart && rangeOverlapsBooked(draftStart, cell.iso);
              const disabled = isPast || (!pickingEnd ? booked : cell.iso <= draftStart ? booked : blocksEnd);

              const activeStart = pickingEnd ? draftStart : checkIn;
              const activeEnd = pickingEnd ? '' : checkOut;
              const isEdge = cell.iso === activeStart || cell.iso === activeEnd;
              const inRange = activeStart && activeEnd && cell.iso > activeStart && cell.iso < activeEnd;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={disabled}
                  title={booked ? 'Đã có khách đặt' : undefined}
                  onClick={() => handleDayClick(cell.iso)}
                  className={`h-8 rounded-lg transition text-center ${
                    booked
                      ? 'bg-[#FBEFEE] text-[#B87D77] line-through cursor-not-allowed'
                      : disabled
                      ? 'text-[#C9C0B3] cursor-not-allowed'
                      : isEdge
                      ? 'bg-[#A63429] text-white font-bold cursor-pointer'
                      : inRange
                      ? 'bg-[#FBEFEE] text-[#A63429] font-semibold cursor-pointer'
                      : 'text-[#181615] hover:bg-[#F7F4EF] cursor-pointer'
                  }`}
                >
                  {cell.day}
                </button>
              );
            })}
          </div>

          {(disabledRanges.length > 0 || (allowClear && (checkIn || checkOut))) && (
            <div className="mt-3 pt-2.5 border-t border-[#E6E0D6] flex items-center justify-between gap-2 text-[11px]">
              {disabledRanges.length > 0 ? (
                <span className="text-[#9E2E23] font-medium">Gạch ngang: Đã có khách</span>
              ) : (
                <span />
              )}
              {allowClear && (checkIn || checkOut) && (
                <button
                  type="button"
                  onClick={() => {
                    onChange('', '');
                    setPickingEnd(false);
                    setOpen(false);
                  }}
                  className="font-semibold text-[#A63429] hover:underline cursor-pointer"
                >
                  Xóa ngày
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

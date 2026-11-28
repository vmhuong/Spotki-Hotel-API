export function formatVnd(value?: number | null): string {
  if (value == null) return '0 ₫';
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDateTime(value?: string | null): string {
  if (!value) return '—';
  return new Date(value).toLocaleString('vi-VN');
}

export const BOOKING_STATUS_BADGE: Record<string, { label: string; className: string; dot: string }> = {
  booked: {
    label: 'Đã đặt',
    className: 'bg-[#FAF3E8] text-[#946421] border-[#E8D6BA]',
    dot: 'bg-[#B8925A]',
  },
  checked_in: {
    label: 'Đang lưu trú',
    className: 'bg-[#EDF5F0] text-[#1E5F3E] border-[#CBE3D5]',
    dot: 'bg-emerald-600',
  },
  checked_out: {
    label: 'Đã trả phòng',
    className: 'bg-[#F3EFE8] text-[#5E5852] border-[#E2DBD0]',
    dot: 'bg-[#8B847C]',
  },
  cancelled: {
    label: 'Đã hủy',
    className: 'bg-[#FBEFEE] text-[#9E2E23] border-[#F0CFCB]',
    dot: 'bg-[#A63429]',
  },
};

export const ROOM_STATUS_BADGE: Record<string, { label: string; className: string; dot: string }> = {
  available: {
    label: 'Sẵn sàng',
    className: 'bg-[#EDF5F0] text-[#1E5F3E] border border-[#CBE3D5]',
    dot: 'bg-emerald-600',
  },
  occupied: {
    label: 'Đang có khách',
    className: 'bg-[#EEF1F8] text-[#2B4478] border border-[#D3DCF0]',
    dot: 'bg-indigo-600',
  },
  cleaning: {
    label: 'Đang dọn phòng',
    className: 'bg-[#FAF3E8] text-[#946421] border border-[#E8D6BA]',
    dot: 'bg-[#B8925A]',
  },
  maintenance: {
    label: 'Bảo trì',
    className: 'bg-[#FBEFEE] text-[#9E2E23] border border-[#F0CFCB]',
    dot: 'bg-[#A63429]',
  },
};

export const FALLBACK_HOTEL_IMG =
  'https://images.unsplash.com/photo-1566073771259-6a8506099945?auto=format&fit=crop&w=1200&q=80';
export const FALLBACK_ROOM_IMG =
  'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=80';

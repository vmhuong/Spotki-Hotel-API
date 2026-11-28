import React from 'react';

interface ConfirmModalProps {
  open: boolean;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'danger' | 'warning' | 'primary';
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  open,
  title,
  description,
  confirmText = 'Xác nhận',
  cancelText = 'Hủy bỏ',
  variant = 'primary',
  loading = false,
  onConfirm,
  onCancel,
}) => {
  if (!open) return null;

  const confirmBtnClass =
    variant === 'danger'
      ? 'bg-[#A63429] hover:bg-[#8A281E] text-white'
      : variant === 'warning'
      ? 'bg-[#B8925A] hover:bg-[#9D7946] text-white'
      : 'bg-[#181615] hover:bg-[#2F2B28] text-white';

  return (
    <div className="no-print fixed inset-0 z-[90] bg-[#141312]/60 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full border border-[#E6E0D6] overflow-hidden animate-toast-in">
        <div className="p-6">
          <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-[#8B847C] mb-1.5">
            Xác nhận thao tác
          </div>
          <h3 className="font-display font-bold text-[#181615] text-lg">{title}</h3>
          <p className="text-sm text-[#5E5852] mt-2 leading-relaxed">{description}</p>
        </div>
        <div className="px-6 py-4 bg-[#F7F4EF] border-t border-[#E6E0D6] flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-4 py-2 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F1ECE3] text-[#181615] text-xs font-semibold cursor-pointer disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-xs font-semibold transition cursor-pointer disabled:opacity-50 ${confirmBtnClass}`}
          >
            {loading ? 'Đang xử lý...' : confirmText}
          </button>
        </div>
      </div>
    </div>
  );
};

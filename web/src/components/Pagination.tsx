import React from 'react';

interface PaginationProps {
  page: number;
  totalPages: number;
  totalElements: number;
  onPageChange: (nextPage: number) => void;
}

export const Pagination: React.FC<PaginationProps> = ({
  page,
  totalPages,
  totalElements,
  onPageChange,
}) => {
  if (totalPages <= 1) {
    return (
      <div className="text-xs text-[#8B847C] pt-2">
        Hiển thị {totalElements} bản ghi
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-[#E6E0D6] text-xs text-[#5E5852]">
      <span>
        Trang <strong className="text-[#181615] font-mono-num">{page + 1}</strong> /{' '}
        <span className="font-mono-num">{totalPages}</span> ({totalElements} bản ghi)
      </span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(0, page - 1))}
          disabled={page === 0}
          className="px-3.5 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-semibold text-[#181615] transition"
        >
          Trang trước
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.min(totalPages - 1, page + 1))}
          disabled={page + 1 >= totalPages}
          className="px-3.5 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F7F4EF] disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed font-semibold text-[#181615] transition"
        >
          Trang sau
        </button>
      </div>
    </div>
  );
};

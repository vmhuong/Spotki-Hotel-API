import React from 'react';
import type { InvoiceSummary } from '../types';
import { formatDateTime, formatVnd } from '../utils/format';

interface InvoiceModalProps {
  invoice: InvoiceSummary | null;
  onClose: () => void;
}

export const InvoiceModal: React.FC<InvoiceModalProps> = ({ invoice, onClose }) => {
  if (!invoice) return null;

  const isSettled = invoice.remainingBalance <= 0;
  const printedAt = new Date().toLocaleString('vi-VN');

  const lineItems: Array<{ name: string; qty: number; unitPrice: number; total: number }> = [
    {
      name: 'Tiền phòng lưu trú',
      qty: 1,
      unitPrice: invoice.roomCharge,
      total: invoice.roomCharge,
    },
  ];

  if (invoice.extraGuestSurcharge > 0) {
    lineItems.push({
      name: 'Phụ thu thêm khách',
      qty: 1,
      unitPrice: invoice.extraGuestSurcharge,
      total: invoice.extraGuestSurcharge,
    });
  }

  invoice.services?.forEach((s) => {
    lineItems.push({
      name: s.serviceName,
      qty: s.quantity,
      unitPrice: s.unitPrice,
      total: s.lineTotal,
    });
  });

  return (
    <div className="fixed inset-0 z-50 bg-[#141312]/65 backdrop-blur-[2px] flex items-center justify-center p-4">
      <div
        id="printable-invoice"
        className="bg-white rounded-lg shadow-2xl max-w-xl w-full max-h-[92vh] overflow-y-auto border border-[#D9D1C5]"
      >
        {/* Screen-only toolbar */}
        <div className="no-print flex items-center justify-between px-5 py-3 border-b border-[#E6E0D6] bg-[#F7F4EF]">
          <span className="text-xs font-semibold text-[#5E5852]">
            Bản xem trước bill in giấy
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-1.5 rounded-lg btn-dark text-xs cursor-pointer"
            >
              In bill
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#F1ECE3] text-[#181615] text-xs font-semibold cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>

        {/* Classic Paper Bill Sheet */}
        <div className="p-6 sm:p-8 text-[#181615] text-xs leading-relaxed">
          {/* Centered Paper Header */}
          <div className="text-center pb-4 border-b border-dashed border-[#181615]">
            <div className="font-display text-xl font-bold tracking-wide uppercase">
              SPOTKI HOTEL
            </div>
            <div className="text-[11px] text-[#5E5852] mt-0.5">
              123 Phan Chu Trinh, Q.1, TP.HCM · Hotline: 0389 833 822
            </div>
            <div className="text-[11px] text-[#5E5852]">
              MST: 0318992201 · Email: contact@spotki.vn
            </div>

            <div className="mt-4 pt-3 border-t border-dashed border-[#8B847C]">
              <h2 className="font-sans text-base font-extrabold uppercase tracking-[0.14em]">
                HÓA ĐƠN THANH TOÁN
              </h2>
              <div className="text-[11px] text-[#5E5852]">
                (Kiêm phiếu thu dịch vụ &amp; lưu trú · VAT 8%)
              </div>
            </div>
          </div>

          {/* Bill Metadata */}
          <div className="py-3.5 border-b border-dashed border-[#181615] grid grid-cols-2 gap-x-4 gap-y-1.5 font-mono-num text-[11px]">
            <div>
              <span className="font-sans text-[#5E5852]">Số hóa đơn: </span>
              <strong>HD-{invoice.bookingCode}</strong>
            </div>
            <div className="text-right">
              <span className="font-sans text-[#5E5852]">Ngày in: </span>
              <span>{printedAt}</span>
            </div>
            <div>
              <span className="font-sans text-[#5E5852]">Mã đặt phòng: </span>
              <strong>{invoice.bookingCode}</strong>
            </div>
            <div className="text-right">
              <span className="font-sans text-[#5E5852]">Trạng thái: </span>
              <strong>{isSettled ? 'ĐÃ TẤT TOÁN' : 'CHƯA TẤT TOÁN'}</strong>
            </div>
          </div>

          {/* Itemized Paper Receipt Table */}
          <div className="py-3 border-b border-dashed border-[#181615]">
            <table className="w-full text-xs tabular-nums">
              <thead>
                <tr className="border-b border-[#181615] text-[11px] uppercase">
                  <th className="text-left py-2 pr-2 font-bold w-8">STT</th>
                  <th className="text-left py-2 pr-2 font-bold">Nội dung</th>
                  <th className="text-center py-2 px-1 font-bold w-10">SL</th>
                  <th className="text-right py-2 px-2 font-bold">Đơn giá</th>
                  <th className="text-right py-2 pl-2 font-bold">Thành tiền</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dotted divide-[#C9C0B3]">
                {lineItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="py-2 pr-2 font-mono-num text-[#5E5852]">{idx + 1}</td>
                    <td className="py-2 pr-2 font-medium">{item.name}</td>
                    <td className="py-2 px-1 text-center font-mono-num">{item.qty}</td>
                    <td className="py-2 px-2 text-right font-mono-num text-[#5E5852]">
                      {formatVnd(item.unitPrice)}
                    </td>
                    <td className="py-2 pl-2 text-right font-mono-num font-semibold">
                      {formatVnd(item.total)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals Block */}
          <div className="py-3.5 border-b border-dashed border-[#181615] space-y-1.5 tabular-nums">
            <div className="flex justify-between">
              <span className="text-[#5E5852]">Cộng tiền hàng (trước thuế):</span>
              <span className="font-mono-num font-medium">{formatVnd(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5E5852]">Thuế giá trị gia tăng (VAT 8%):</span>
              <span className="font-mono-num font-medium">{formatVnd(invoice.vatAmount)}</span>
            </div>
            <div className="border-t border-dotted border-[#8B847C] pt-2 mt-2 flex justify-between text-sm font-extrabold">
              <span>TỔNG CỘNG THANH TOÁN:</span>
              <span className="font-mono-num">{formatVnd(invoice.grandTotal)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5E5852]">Đã thanh toán:</span>
              <span className="font-mono-num font-semibold">{formatVnd(invoice.totalPaid)}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>CÒN LẠI PHẢI THU:</span>
              <span className="font-mono-num">{formatVnd(invoice.remainingBalance)}</span>
            </div>
            {invoice.loyaltyPointsEarned > 0 && (
              <div className="pt-1.5 text-[11px] font-semibold">
                * Điểm thưởng tích lũy kỳ này: +{invoice.loyaltyPointsEarned} điểm
              </div>
            )}
          </div>

          {/* Payment History */}
          {invoice.payments && invoice.payments.length > 0 && (
            <div className="py-3 border-b border-dashed border-[#181615]">
              <div className="text-[11px] font-bold uppercase mb-1.5">Chi tiết thanh toán</div>
              <div className="space-y-1 font-mono-num text-[11px]">
                {invoice.payments.map((p) => (
                  <div key={p.id} className="flex justify-between gap-2">
                    <span className="text-[#5E5852]">
                      {formatDateTime(p.paidAt)} · {p.method}
                    </span>
                    <span className="font-semibold">{formatVnd(p.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Paper Signatures & Closing Note */}
          <div className="pt-5 grid grid-cols-2 gap-6 text-center text-[11px]">
            <div>
              <div className="font-bold uppercase">Khách hàng</div>
              <div className="text-[#8B847C] italic">(Ký, ghi rõ họ tên)</div>
              <div className="h-12" />
            </div>
            <div>
              <div className="font-bold uppercase">Thu ngân / Lễ tân</div>
              <div className="text-[#8B847C] italic">(Ký, ghi rõ họ tên)</div>
              <div className="h-12" />
            </div>
          </div>

          <div className="mt-2 pt-3 border-t border-dashed border-[#8B847C] text-center text-[11px] text-[#5E5852]">
            Cảm ơn quý khách đã lưu trú tại Spotki Hotel · Hẹn gặp lại quý khách!
          </div>
        </div>
      </div>
    </div>
  );
};

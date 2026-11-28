import React, { useEffect, useState } from 'react';
import { api, getErrorMessage } from '../../api/client';
import { useToast } from '../../context/ToastContext';
import type {
  ApiResponse,
  GatewayInitResponse,
  Guest,
  HotelServiceItem,
  InvoiceSummary,
} from '../../types';
import { formatVnd } from '../../utils/format';

interface PaymentBillModalProps {
  bookingId: number | null;
  services: HotelServiceItem[];
  onClose: () => void;
  onChanged: () => void;
}

type ActiveSubModal =
  | null
  | { kind: 'service' }
  | { kind: 'cash'; amount: number }
  | { kind: 'card'; amount: number }
  | { kind: 'vietqr'; step: 'amount' | 'qr'; amount: number; gateway?: GatewayInitResponse }
  | { kind: 'points'; identifier: string; verifiedMember?: Guest | null; amount: number; attachToBill: boolean };

const VND_PER_POINT = 1000;

const formatShortDt = (isoDt?: string, isoDate?: string) => {
  if (isoDt) {
    const d = new Date(isoDt);
    if (!Number.isNaN(d.getTime())) {
      const hh = String(d.getHours()).padStart(2, '0');
      const mm = String(d.getMinutes()).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const mo = String(d.getMonth() + 1).padStart(2, '0');
      return `${hh}:${mm} ${dd}/${mo}`;
    }
  }
  if (isoDate) {
    const [, m, d] = isoDate.split('-');
    return m && d ? `${d}/${m}` : isoDate;
  }
  return '—';
};

const cleanDisplayNote = (note?: string) => {
  if (!note) return '';
  return note.replace(/\s*\[#MID:\d+\|#PTS:\d+\]\s*/g, '').trim();
};

export const PaymentBillModal: React.FC<PaymentBillModalProps> = ({
  bookingId,
  services,
  onClose,
  onChanged,
}) => {
  const toast = useToast();
  const [invoice, setInvoice] = useState<InvoiceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [subModal, setSubModal] = useState<ActiveSubModal>(null);
  const [memberIdentifier, setMemberIdentifier] = useState('');
  const [lookingUp, setLookingUp] = useState(false);
  const [serviceId, setServiceId] = useState<number>(services[0]?.id || 1);
  const [serviceQty, setServiceQty] = useState<number>(1);
  const [printTarget, setPrintTarget] = useState<'bill' | 'qr'>('bill');

  const fetchInvoice = async (targetId: number) => {
    const res = await api.get<ApiResponse<InvoiceSummary>>(`/bookings/${targetId}/invoice`);
    setInvoice(res.data.data);
    return res.data.data;
  };

  useEffect(() => {
    if (!bookingId) return;
    let cancelled = false;
    setLoading(true);
    setMemberIdentifier('');
    fetchInvoice(bookingId)
      .catch((err) => {
        if (!cancelled) toast.error(getErrorMessage(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId]);

  useEffect(() => {
    if (services.length > 0 && !services.some((s) => s.id === serviceId)) {
      setServiceId(services[0].id);
    }
  }, [services, serviceId]);

  // Auto-poll VietQR webhook confirmation
  const activeQrAppTransId =
    subModal?.kind === 'vietqr' && subModal.step === 'qr' ? subModal.gateway?.appTransId : undefined;

  useEffect(() => {
    if (!bookingId || !activeQrAppTransId) return;
    let stopped = false;
    const pollId = window.setInterval(async () => {
      try {
        const res = await api.get<ApiResponse<{ status: string }>>(
          `/payments/gateway/status/${encodeURIComponent(activeQrAppTransId)}`
        );
        if (!stopped && res.data.data?.status === 'paid') {
          window.clearInterval(pollId);
          await fetchInvoice(bookingId);
          onChanged();
          setSubModal(null);
          toast.success('Webhook đã xác nhận chuyển khoản VietQR! Bill đã cập nhật.');
        }
      } catch {
        // Ignore transient poll errors while waiting for webhook
      }
    }, 2500);
    return () => {
      stopped = true;
      window.clearInterval(pollId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookingId, activeQrAppTransId]);

  if (!bookingId) return null;

  const isFinalized = invoice?.bookingStatus === 'checked_out' || invoice?.bookingStatus === 'cancelled';
  const defaultPayAmount = Math.max(0, invoice?.remainingBalance || 0);
  const paymentMethodsSummary =
    invoice?.payments && invoice.payments.length > 0
      ? Array.from(new Set(invoice.payments.map((p) => p.method))).join(', ')
      : 'Chưa thu';

  const handlePrint = (target: 'bill' | 'qr') => {
    setPrintTarget(target);
    window.setTimeout(() => {
      const cleanup = () => {
        setPrintTarget('bill');
        window.removeEventListener('afterprint', cleanup);
      };
      window.addEventListener('afterprint', cleanup);
      window.print();
    }, 60);
  };

  const handleAttachMemberByIdentifier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice || isFinalized) return;
    const clean = memberIdentifier.trim();
    if (!clean) {
      toast.error('Nhập SĐT hoặc số CCCD của thành viên.');
      return;
    }
    setLookingUp(true);
    try {
      const res = await api.post<ApiResponse<InvoiceSummary>>(
        `/admin/bookings/${invoice.bookingId}/member`,
        { identifier: clean }
      );
      setInvoice(res.data.data);
      onChanged();
      toast.success(`Đã nhận tài khoản thành viên: ${res.data.data.guestName}.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLookingUp(false);
    }
  };

  const handleAddService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;
    setSubmitting(true);
    try {
      await api.post(`/admin/bookings/${invoice.bookingId}/services`, {
        serviceId,
        quantity: Math.max(1, serviceQty),
      });
      await fetchInvoice(invoice.bookingId);
      onChanged();
      setSubModal(null);
      setServiceQty(1);
      toast.success('Đã thêm đồ / dịch vụ lên bill.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemoveService = async (itemId: number) => {
    if (!invoice || isFinalized) return;
    setSubmitting(true);
    try {
      const res = await api.delete<ApiResponse<InvoiceSummary>>(
        `/admin/bookings/${invoice.bookingId}/services/${itemId}`
      );
      setInvoice(res.data.data);
      onChanged();
      toast.success('Đã xóa dịch vụ khỏi bill.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRemovePayment = async (paymentId: number) => {
    if (!invoice || isFinalized) return;
    setSubmitting(true);
    try {
      const res = await api.delete<ApiResponse<InvoiceSummary>>(
        `/admin/bookings/${invoice.bookingId}/payments/${paymentId}`
      );
      setInvoice(res.data.data);
      onChanged();
      toast.success('Đã xóa khoản thanh toán khỏi bill.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleRecordStandardPayment = async (e: React.FormEvent, method: string, amount: number) => {
    e.preventDefault();
    if (!invoice || amount < 1000) {
      toast.error('Số tiền thanh toán tối thiểu là 1.000đ.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post(`/admin/bookings/${invoice.bookingId}/payments`, {
        amount,
        method,
      });
      await fetchInvoice(invoice.bookingId);
      onChanged();
      setSubModal(null);
      toast.success(`Đã cập nhật ${method}: ${formatVnd(amount)} lên bill.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateVietQr = async (e: React.FormEvent, amount: number) => {
    e.preventDefault();
    if (!invoice || amount < 1000) {
      toast.error('Số tiền chuyển khoản tối thiểu là 1.000đ.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await api.post<ApiResponse<GatewayInitResponse>>('/payments/gateway/initiate', {
        bookingId: invoice.bookingId,
        amount,
        provider: 'VIETQR',
      });
      setSubModal({
        kind: 'vietqr',
        step: 'qr',
        amount,
        gateway: res.data.data,
      });
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleSimulateWebhook = async () => {
    if (subModal?.kind !== 'vietqr' || !subModal.gateway || !invoice) return;
    setSubmitting(true);
    try {
      await api.post('/payments/gateway/callback', {
        provider: subModal.gateway.provider,
        appTransId: subModal.gateway.appTransId,
        gatewayTransId: 'BANK-' + Date.now(),
        amount: subModal.gateway.amount,
        mac: subModal.gateway.sampleHmacSignature,
      });
      await fetchInvoice(invoice.bookingId);
      onChanged();
      setSubModal(null);
      toast.success('Webhook đã ghi nhận chuyển khoản VietQR lên bill.');
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleLookupPointsMember = async (identifier: string) => {
    const clean = identifier.trim();
    if (!clean) {
      toast.error('Vui lòng nhập SĐT hoặc số CCCD của thành viên.');
      return;
    }
    setLookingUp(true);
    try {
      const res = await api.get<ApiResponse<Guest>>(
        `/admin/guests/lookup?identifier=${encodeURIComponent(clean)}`
      );
      const member = res.data.data;
      const maxPtsVnd = (member.loyaltyPoints || 0) * VND_PER_POINT;
      const suggested = Math.min(defaultPayAmount, maxPtsVnd);
      if (subModal?.kind === 'points') {
        setSubModal({
          ...subModal,
          verifiedMember: member,
          amount: suggested >= 1000 ? suggested : 0,
        });
      }
      toast.success(`Đã xác thực thành viên: ${member.fullName}.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setLookingUp(false);
    }
  };

  const handleRedeemMemberPoints = async (e: React.FormEvent) => {
    e.preventDefault();
    if (subModal?.kind !== 'points' || !subModal.verifiedMember || !invoice) return;
    const member = subModal.verifiedMember;
    const maxVnd = (member.loyaltyPoints || 0) * VND_PER_POINT;
    if (subModal.amount < 1000) {
      toast.error('Số tiền quy đổi tối thiểu là 1.000đ.');
      return;
    }
    if (subModal.amount > maxVnd) {
      toast.error(`Tài khoản chỉ đủ tối đa ${formatVnd(maxVnd)} (${member.loyaltyPoints} điểm).`);
      return;
    }
    setSubmitting(true);
    try {
      if (subModal.attachToBill && invoice.guestId !== member.id) {
        await api.post(`/admin/bookings/${invoice.bookingId}/member`, {
          guestId: member.id,
        });
      }
      const ptsUsed = Math.ceil(subModal.amount / VND_PER_POINT);
      await api.post(`/admin/bookings/${invoice.bookingId}/payments`, {
        amount: subModal.amount,
        method: 'Diem thuong',
        memberGuestId: member.id,
        verifiedIdentifier: subModal.identifier.trim(),
        note: `Quy đổi ${ptsUsed} điểm · TK: ${member.fullName}`,
      });
      await fetchInvoice(invoice.bookingId);
      onChanged();
      setSubModal(null);
      toast.success(`Đã trừ ${ptsUsed} điểm (${formatVnd(subModal.amount)}) vào bill.`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinalizeCheckout = async () => {
    if (!invoice || isFinalized) return;
    setSubmitting(true);
    try {
      const res = await api.post<ApiResponse<InvoiceSummary>>(
        `/admin/bookings/${invoice.bookingId}/check-out`
      );
      setInvoice(res.data.data);
      onChanged();
      toast.success(`Đã kết bill Phòng ${invoice.roomNumber}. Sẵn sàng in bill!`);
    } catch (err) {
      toast.error(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const lineItems: Array<{ id?: number; name: string; sub?: string; qty: number; unitPrice: number; total: number; removable?: boolean }> =
    invoice
      ? [
          {
            name: `Tiền phòng ${invoice.roomNumber || ''} · ${invoice.roomType || ''}`,
            sub: `${invoice.packageName || 'Tiêu chuẩn'} · ${invoice.pricingMode === 'hour' ? 'Theo giờ' : 'Theo đêm'}`,
            qty: 1,
            unitPrice: invoice.roomCharge,
            total: invoice.roomCharge,
          },
          ...(invoice.extraGuestSurcharge > 0
            ? [
                {
                  name: 'Phụ thu thêm khách',
                  qty: 1,
                  unitPrice: invoice.extraGuestSurcharge,
                  total: invoice.extraGuestSurcharge,
                },
              ]
            : []),
          ...(invoice.services || []).map((s) => ({
            id: s.id,
            name: s.serviceName,
            qty: s.quantity,
            unitPrice: s.unitPrice,
            total: s.lineTotal,
            removable: true,
          })),
        ]
      : [];

  return (
    <div
      className="fixed inset-0 z-50 bg-[#141312]/65 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      <div
        id={printTarget === 'bill' ? 'printable-invoice' : undefined}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl max-w-[540px] w-full max-h-[94vh] flex flex-col border border-[#E6E0D6] shadow-2xl text-[#181615] overflow-hidden"
      >
        {/* Clean Dialog Header */}
        <div className="no-print px-5 pt-4 pb-3 flex items-center justify-between gap-3 border-b border-[#F1ECE3]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#FBEFEE] border border-[#F0CFCB] flex items-center justify-center shrink-0 text-[#A63429] font-extrabold text-sm">
              ₫
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-sans text-[15px] font-bold text-[#181615] truncate">
                  Hóa Đơn Thanh Toán - Phòng {invoice?.roomNumber || '...'}
                </h3>
                {isFinalized && (
                  <span className="px-2 py-0.5 rounded-full bg-[#EDF5F0] text-[#1E5F3E] text-[10px] font-bold">
                    Đã kết bill
                  </span>
                )}
              </div>
              <p className="text-xs text-[#8B847C]">
                {invoice?.hotelName || 'Spotki Hotel'} · Cập nhật khoản thu &amp; in bill
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="w-8 h-8 rounded-lg hover:bg-[#F7F4EF] text-[#8B847C] hover:text-[#181615] flex items-center justify-center text-lg leading-none cursor-pointer"
          >
            ×
          </button>
        </div>

        {loading || !invoice ? (
          <div className="p-10 text-center text-sm text-[#8B847C]">Đang tải hóa đơn...</div>
        ) : (
          <>
            {/* Compact Top Member Verification Bar (Voucher-bar style from reference) */}
            {!isFinalized && (
              <div className="no-print px-5 pt-3">
                <form
                  onSubmit={handleAttachMemberByIdentifier}
                  className="p-1.5 rounded-2xl border border-[#E6E0D6] bg-white flex items-center gap-2 shadow-xs"
                >
                  <span className="w-9 h-9 rounded-xl bg-[#F7F4EF] flex items-center justify-center text-[11px] font-bold text-[#5E5852] shrink-0">
                    TV
                  </span>
                  <input
                    type="text"
                    placeholder="NHẬP SĐT HOẶC CCCD THÀNH VIÊN..."
                    value={memberIdentifier}
                    onChange={(e) => setMemberIdentifier(e.target.value)}
                    className="flex-1 min-w-0 h-9 px-2 text-xs font-mono-num bg-transparent focus:outline-none placeholder:text-[#8B847C]"
                  />
                  <button
                    type="submit"
                    disabled={lookingUp}
                    className="h-9 px-4 rounded-xl bg-[#D9A72A] hover:bg-[#C4921D] text-[#181615] text-xs font-bold cursor-pointer transition shrink-0 disabled:opacity-50"
                  >
                    {lookingUp ? 'Đang tìm...' : 'Áp dụng'}
                  </button>
                </form>
              </div>
            )}

            {/* Compact Scrollable Cream Paper Receipt Sheet */}
            <div className="px-5 pt-3 flex-1 overflow-y-auto">
              <div className="rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] p-4 sm:p-5 text-xs tabular-nums space-y-3">
                {/* Print-only Official Header */}
                <div className="hidden print:block text-center pb-2.5 border-b border-dashed border-[#8B847C]">
                  <div className="font-display text-lg font-bold uppercase">{invoice.hotelName || 'SPOTKI HOTEL'}</div>
                  <div className="text-[11px] text-[#5E5852]">
                    {invoice.hotelAddress || ''}
                    {invoice.hotelPhone ? ` · Hotline: ${invoice.hotelPhone}` : ''}
                  </div>
                  <div className="font-bold text-sm uppercase mt-1.5 tracking-wider">HÓA ĐƠN THANH TOÁN</div>
                </div>

                {/* Receipt Top Metadata (2 clean columns matching reference) */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px] leading-snug">
                  <div className="truncate">
                    <span className="text-[#8B847C]">Mã HĐ: </span>
                    <strong className="font-mono-num text-[#181615]">#{invoice.bookingCode}</strong>
                  </div>
                  <div className="text-right font-mono-num text-[#5E5852]">
                    Vào: <strong className="text-[#181615]">{formatShortDt(invoice.checkInAt, invoice.checkIn)}</strong>{' '}
                    | Ra:{' '}
                    <strong className="text-[#181615]">
                      {formatShortDt(invoice.checkedOutAt || invoice.expectedCheckOutAt, invoice.checkOut)}
                    </strong>
                  </div>

                  <div className="truncate">
                    <span className="text-[#8B847C]">Thành viên: </span>
                    <strong className="text-[#181615]">
                      {invoice.guestName || 'Khách lẻ'}
                    </strong>{' '}
                    <span className="text-[#946421] font-semibold">
                      ({invoice.guestMembershipTier || 'Thành viên'} · {invoice.guestLoyaltyPoints ?? 0}đ)
                    </span>
                  </div>
                  <div className="text-right truncate">
                    <span className="text-[#8B847C]">Hình thức: </span>
                    <span className="font-medium text-[#181615]">{paymentMethodsSummary}</span>
                  </div>
                </div>

                <div className="border-t border-dashed border-[#C9C0B3]" />

                {/* Clean 4-column Receipt Table */}
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-[11px] text-[#8B847C] border-b border-[#E6E0D6]">
                      <th className="text-left pb-2 pr-2 font-medium">Món / Dịch vụ</th>
                      <th className="text-center pb-2 px-1 font-medium w-8">SL</th>
                      <th className="text-right pb-2 px-2 font-medium">Đ.Giá</th>
                      <th className="text-right pb-2 pl-2 font-medium">T.Tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dotted divide-[#E6E0D6]">
                    {lineItems.map((item, idx) => (
                      <tr key={item.id ? `svc-${item.id}` : `base-${idx}`}>
                        <td className="py-2 pr-2 align-top">
                          <div className="font-medium text-[#181615] leading-snug flex items-start gap-1.5">
                            <span>{item.name}</span>
                            {!isFinalized && item.removable && item.id && (
                              <button
                                type="button"
                                disabled={submitting}
                                title="Xóa món này"
                                onClick={() => handleRemoveService(item.id!)}
                                className="no-print text-[11px] leading-none px-1.5 py-0.5 rounded bg-[#FBEFEE] text-[#A63429] hover:bg-[#F6DFDC] font-bold cursor-pointer shrink-0"
                              >
                                ×
                              </button>
                            )}
                          </div>
                          {item.sub && (
                            <div className="text-[10px] text-[#8B847C] mt-0.5">↳ {item.sub}</div>
                          )}
                        </td>
                        <td className="py-2 px-1 text-center font-mono-num align-top">{item.qty}</td>
                        <td className="py-2 px-2 text-right font-mono-num text-[#5E5852] align-top">
                          {formatVnd(item.unitPrice)}
                        </td>
                        <td className="py-2 pl-2 text-right font-mono-num font-bold text-[#181615] align-top">
                          {formatVnd(item.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-dashed border-[#C9C0B3]" />

                {/* Totals Block matching reference */}
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-[#5E5852]">
                    <span>Tiền phòng &amp; dịch vụ:</span>
                    <span className="font-mono-num font-semibold text-[#181615]">{formatVnd(invoice.subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-[#5E5852]">
                    <span>Thuế GTGT (8%):</span>
                    <span className="font-mono-num font-semibold text-[#181615]">{formatVnd(invoice.vatAmount)}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 text-sm font-extrabold">
                    <span>TỔNG CỘNG:</span>
                    <span className="font-mono-num text-[#B58118] text-base">{formatVnd(invoice.grandTotal)}</span>
                  </div>
                </div>

                {/* Compact Payment Breakdown + Delete Controls */}
                <div className="border-t border-dashed border-[#C9C0B3] pt-2.5 space-y-1.5">
                  {invoice.payments && invoice.payments.length > 0 && (
                    <div className="space-y-1 pb-1">
                      {invoice.payments.map((p) => {
                        const cleanNote = cleanDisplayNote(p.note);
                        return (
                          <div key={p.id} className="flex items-center justify-between gap-2 text-[11px]">
                            <div className="min-w-0 truncate text-[#5E5852]">
                              <span className="font-semibold text-[#181615]">{p.method}</span>
                              {cleanNote ? ` · ${cleanNote}` : ''}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="font-mono-num font-semibold text-emerald-700">
                                -{formatVnd(p.amount)}
                              </span>
                              {!isFinalized && (
                                <span className="no-print">
                                  {p.bankTransfer ? (
                                    <span
                                      title="Chuyển khoản không thể xóa do không hoàn tiền tự động"
                                      className="text-[10px] px-1.5 py-0.5 rounded bg-[#EFECE6] text-[#8B847C] font-semibold"
                                    >
                                      CK khóa
                                    </span>
                                  ) : (
                                    <button
                                      type="button"
                                      disabled={submitting}
                                      title="Xóa khoản thanh toán này"
                                      onClick={() => handleRemovePayment(p.id)}
                                      className="text-[11px] leading-none px-1.5 py-0.5 rounded bg-[#FBEFEE] text-[#A63429] hover:bg-[#F6DFDC] font-bold cursor-pointer"
                                    >
                                      ×
                                    </button>
                                  )}
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex justify-between text-xs font-semibold text-emerald-700">
                    <span>Đã thanh toán:</span>
                    <span className="font-mono-num">{formatVnd(invoice.totalPaid)}</span>
                  </div>
                  <div className="flex justify-between text-xs font-extrabold text-[#A63429]">
                    <span>CÒN LẠI PHẢI THU:</span>
                    <span className="font-mono-num">{formatVnd(invoice.remainingBalance)}</span>
                  </div>
                  {invoice.loyaltyPointsEarned > 0 && (
                    <div className="text-[11px] font-semibold text-[#1E5F3E]">
                      * Tích lũy thêm sau khi kết bill: +{invoice.loyaltyPointsEarned} điểm
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Compact Single-Line Update Action Pills + Reference Footer */}
            <div className="no-print px-5 py-3.5 space-y-2.5 border-t border-[#F1ECE3] bg-white">
              {!isFinalized && (
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setSubModal({ kind: 'service' })}
                    className="px-2.5 py-1.5 rounded-lg border border-[#D9D1C5] bg-[#FAF8F5] hover:bg-[#EFECE6] text-[11px] font-semibold text-[#181615] cursor-pointer transition"
                  >
                    + Đồ thêm
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubModal({ kind: 'cash', amount: defaultPayAmount })}
                    className="px-2.5 py-1.5 rounded-lg border border-[#CBE3D5] bg-[#EDF5F0] hover:bg-emerald-700 hover:text-white text-[11px] font-semibold text-[#1E5F3E] cursor-pointer transition"
                  >
                    Tiền mặt
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubModal({ kind: 'card', amount: defaultPayAmount })}
                    className="px-2.5 py-1.5 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#181615] hover:text-white text-[11px] font-semibold text-[#181615] cursor-pointer transition"
                  >
                    Thẻ / POS
                  </button>
                  <button
                    type="button"
                    onClick={() => setSubModal({ kind: 'vietqr', step: 'amount', amount: defaultPayAmount })}
                    className="px-2.5 py-1.5 rounded-lg border border-[#E7D4B5] bg-[#FAF3E8] hover:bg-[#B8925A] hover:text-white text-[11px] font-semibold text-[#946421] cursor-pointer transition"
                  >
                    Chuyển khoản (VietQR)
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setSubModal({
                        kind: 'points',
                        identifier: invoice.guestPhone || invoice.guestIdentityNo || '',
                        verifiedMember: null,
                        amount: 0,
                        attachToBill: false,
                      })
                    }
                    className="px-2.5 py-1.5 rounded-lg border border-[#F0CFCB] bg-[#FBEFEE] hover:bg-[#A63429] hover:text-white text-[11px] font-semibold text-[#A63429] cursor-pointer transition"
                  >
                    Điểm TV
                  </button>
                </div>
              )}

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handlePrint('bill')}
                  className="flex-1 h-10 rounded-xl btn-primary text-xs font-bold cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <span>In bill</span>
                </button>
                {!isFinalized && (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleFinalizeCheckout}
                    className="h-10 px-4 rounded-xl border border-[#D9D1C5] bg-white hover:bg-[#FAF8F5] text-xs font-semibold text-[#181615] cursor-pointer disabled:opacity-50 whitespace-nowrap"
                  >
                    ✓ Kết phòng
                  </button>
                )}
                <button
                  type="button"
                  onClick={onClose}
                  className="h-10 px-4 rounded-xl border border-[#E6E0D6] bg-[#FAF8F5] hover:bg-[#EFECE6] text-xs font-semibold text-[#5E5852] cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Nested Action Sub-Modals */}
      {subModal && invoice && (
        <div
          className="fixed inset-0 z-[60] bg-[#141312]/70 backdrop-blur-[2px] flex items-center justify-center p-4"
          onClick={() => setSubModal(null)}
        >
          <div
            id={printTarget === 'qr' ? 'printable-invoice' : undefined}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl max-w-md w-full p-5 border border-[#E6E0D6] shadow-2xl space-y-4 text-xs"
          >
            {/* 1. Add Service Popup */}
            {subModal.kind === 'service' && (
              <form onSubmit={handleAddService} className="space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E0D6]">
                  <h4 className="font-sans text-base font-bold">Thêm đồ dùng / Dịch vụ</h4>
                  <button
                    type="button"
                    onClick={() => setSubModal(null)}
                    className="text-[#8B847C] hover:text-[#181615] text-base leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>
                <div>
                  <label className="block text-[#5E5852] mb-1">Chọn món / dịch vụ</label>
                  <select
                    value={serviceId}
                    onChange={(e) => setServiceId(Number(e.target.value))}
                    className="w-full h-10 rounded-xl border border-[#D9D1C5] px-3 bg-white font-medium"
                  >
                    {services.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.serviceName} ({formatVnd(s.price)} / {s.unit})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[#5E5852] mb-1">Số lượng</label>
                  <input
                    type="number"
                    min={1}
                    max={99}
                    required
                    value={serviceQty}
                    onChange={(e) => setServiceQty(Math.max(1, Number(e.target.value)))}
                    className="w-full h-10 rounded-xl border border-[#D9D1C5] px-3 font-mono-num"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSubModal(null)}
                    className="px-4 py-2 rounded-xl border border-[#D9D1C5] font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary px-5 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Cập nhật vào bill
                  </button>
                </div>
              </form>
            )}

            {/* 2. Cash or Card Amount Popup */}
            {(subModal.kind === 'cash' || subModal.kind === 'card') && (
              <form
                onSubmit={(e) =>
                  handleRecordStandardPayment(
                    e,
                    subModal.kind === 'cash' ? 'Tien mat' : 'The tin dung',
                    subModal.amount
                  )
                }
                className="space-y-4"
              >
                <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E0D6]">
                  <h4 className="font-sans text-base font-bold">
                    {subModal.kind === 'cash' ? 'Thu tiền mặt' : 'Thanh toán Thẻ / POS'}
                  </h4>
                  <button
                    type="button"
                    onClick={() => setSubModal(null)}
                    className="text-[#8B847C] hover:text-[#181615] text-base leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>
                <div className="flex justify-between text-[#5E5852] bg-[#FAF8F5] px-3 py-2 rounded-xl border border-[#E6E0D6]">
                  <span>Còn lại phải thu:</span>
                  <strong className="font-mono-num text-[#A63429]">{formatVnd(defaultPayAmount)}</strong>
                </div>
                <div>
                  <label className="block text-[#5E5852] mb-1">Số tiền thu (VND) *</label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={subModal.amount}
                    onChange={(e) => setSubModal({ ...subModal, amount: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-[#D9D1C5] px-3 font-mono-num text-sm font-bold"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[
                      { label: 'Còn lại', val: defaultPayAmount },
                      { label: '50%', val: Math.round(defaultPayAmount * 0.5) },
                      { label: '500.000đ', val: 500000 },
                    ].map(
                      (q) =>
                        q.val >= 1000 && (
                          <button
                            key={q.label}
                            type="button"
                            onClick={() => setSubModal({ ...subModal, amount: q.val })}
                            className="px-2.5 py-1 rounded-lg border border-[#D9D1C5] bg-white hover:bg-[#FAF8F5] text-[11px] font-semibold cursor-pointer"
                          >
                            {q.label} ({formatVnd(q.val)})
                          </button>
                        )
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSubModal(null)}
                    className="px-4 py-2 rounded-xl border border-[#D9D1C5] font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || subModal.amount < 1000}
                    className="btn-primary px-5 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Cập nhật lên bill
                  </button>
                </div>
              </form>
            )}

            {/* 3. Bank Transfer / VietQR Popup + Live Webhook Wait */}
            {subModal.kind === 'vietqr' && subModal.step === 'amount' && (
              <form onSubmit={(e) => handleGenerateVietQr(e, subModal.amount)} className="space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E0D6]">
                  <h4 className="font-sans text-base font-bold">Chuyển khoản VietQR</h4>
                  <button
                    type="button"
                    onClick={() => setSubModal(null)}
                    className="text-[#8B847C] hover:text-[#181615] text-base leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>
                <div className="p-2.5 rounded-xl bg-[#FAF3E8] border border-[#E7D4B5] text-[11px] text-[#946421]">
                  Giao dịch chuyển khoản sau khi webhook xác nhận sẽ <strong>không thể xóa</strong> khỏi bill.
                </div>
                <div>
                  <label className="block text-[#5E5852] mb-1">Số tiền chuyển khoản (VND) *</label>
                  <input
                    type="number"
                    min={1000}
                    step={1000}
                    required
                    value={subModal.amount}
                    onChange={(e) => setSubModal({ ...subModal, amount: Number(e.target.value) })}
                    className="w-full h-10 rounded-xl border border-[#D9D1C5] px-3 font-mono-num text-sm font-bold"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSubModal(null)}
                    className="px-4 py-2 rounded-xl border border-[#D9D1C5] font-semibold cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    disabled={submitting || subModal.amount < 1000}
                    className="btn-primary px-5 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    {submitting ? 'Đang tạo mã...' : 'Tạo & In VietQR'}
                  </button>
                </div>
              </form>
            )}

            {subModal.kind === 'vietqr' && subModal.step === 'qr' && subModal.gateway && (
              <div className="space-y-3 text-center">
                <div className="no-print flex items-center justify-between pb-2 border-b border-[#E6E0D6]">
                  <h4 className="font-sans text-base font-bold">Quét mã VietQR thanh toán</h4>
                  <button
                    type="button"
                    onClick={() => setSubModal(null)}
                    className="text-[#8B847C] hover:text-[#181615] text-base leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>
                <div className="text-[11px] text-[#5E5852]">
                  {invoice.hotelName || 'Spotki Hotel'} · Phòng {invoice.roomNumber} ·{' '}
                  <strong className="font-mono-num">{invoice.bookingCode}</strong>
                </div>
                {subModal.gateway.qrImageUrl && (
                  <div className="bg-white p-2 rounded-xl border border-[#E6E0D6] inline-block mx-auto">
                    <img
                      src={subModal.gateway.qrImageUrl}
                      alt="Mã VietQR"
                      className="w-52 h-auto mx-auto rounded-lg"
                    />
                  </div>
                )}
                <div className="p-3 rounded-xl bg-[#FAF8F5] border border-[#E6E0D6] text-left space-y-1 text-[11px]">
                  <div className="flex justify-between">
                    <span className="text-[#5E5852]">Ngân hàng / STK:</span>
                    <strong className="font-mono-num">
                      {subModal.gateway.bankId} · {subModal.gateway.accountNo}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5E5852]">Số tiền:</span>
                    <strong className="font-mono-num text-[#A63429]">
                      {formatVnd(subModal.gateway.amount)}
                    </strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#5E5852]">Nội dung CK:</span>
                    <strong className="font-mono-num">{subModal.gateway.transferContent}</strong>
                  </div>
                </div>
                <div className="no-print flex items-center justify-center gap-2 text-[11px] font-semibold text-[#946421]">
                  <span className="w-2 h-2 rounded-full bg-[#B8925A] animate-pulse" />
                  Đang chờ webhook ngân hàng cập nhật vào bill...
                </div>
                <div className="no-print flex justify-between gap-2 pt-2 border-t border-[#E6E0D6]">
                  <button
                    type="button"
                    onClick={() => handlePrint('qr')}
                    className="px-3.5 py-2 rounded-xl border border-[#D9D1C5] bg-white hover:bg-[#FAF8F5] font-semibold cursor-pointer"
                  >
                    In mã VietQR
                  </button>
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={handleSimulateWebhook}
                    className="btn-primary px-4 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                  >
                    Test Webhook nhận tiền
                  </button>
                </div>
              </div>
            )}

            {/* 4. Member Points Redemption (Verify by Phone or CCCD) */}
            {subModal.kind === 'points' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-2.5 border-b border-[#E6E0D6]">
                  <h4 className="font-sans text-base font-bold">Dùng điểm thành viên</h4>
                  <button
                    type="button"
                    onClick={() => setSubModal(null)}
                    className="text-[#8B847C] hover:text-[#181615] text-base leading-none cursor-pointer"
                  >
                    ×
                  </button>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Nhập SĐT hoặc số CCCD thành viên..."
                    value={subModal.identifier}
                    onChange={(e) => setSubModal({ ...subModal, identifier: e.target.value })}
                    className="flex-1 h-10 rounded-xl border border-[#D9D1C5] px-3 font-mono-num text-xs"
                  />
                  <button
                    type="button"
                    disabled={lookingUp}
                    onClick={() => handleLookupPointsMember(subModal.identifier)}
                    className="btn-dark px-4 h-10 rounded-xl text-xs cursor-pointer disabled:opacity-50"
                  >
                    {lookingUp ? 'Đang tra...' : 'Xác thực'}
                  </button>
                </div>

                {subModal.verifiedMember && (
                  <>
                    <div className="p-3 rounded-xl bg-[#EDF5F0] border border-[#CBE3D5] space-y-1 text-xs">
                      <div className="flex items-center justify-between">
                        <strong className="text-[#1E5F3E]">{subModal.verifiedMember.fullName}</strong>
                        <span className="px-2 py-0.5 rounded-full bg-white border border-[#CBE3D5] text-[#946421] font-bold text-[10px]">
                          {subModal.verifiedMember.membershipTier || 'Thành viên'}
                        </span>
                      </div>
                      <div className="text-[#5E5852] font-mono-num text-[11px]">
                        SĐT: {subModal.verifiedMember.phone || '—'} · CCCD: {subModal.verifiedMember.identityNo || '—'}
                      </div>
                      <div className="text-[#1E5F3E] font-semibold">
                        Điểm hiện có:{' '}
                        <span className="font-mono-num">{subModal.verifiedMember.loyaltyPoints} điểm</span> (≈{' '}
                        <span className="font-mono-num">
                          {formatVnd((subModal.verifiedMember.loyaltyPoints || 0) * VND_PER_POINT)}
                        </span>
                        )
                      </div>
                    </div>

                    <form onSubmit={handleRedeemMemberPoints} className="space-y-3">
                      <div>
                        <label className="block text-[#5E5852] mb-1">Số tiền quy đổi từ điểm (VND) *</label>
                        <input
                          type="number"
                          min={1000}
                          step={1000}
                          max={(subModal.verifiedMember.loyaltyPoints || 0) * VND_PER_POINT}
                          required
                          value={subModal.amount}
                          onChange={(e) => setSubModal({ ...subModal, amount: Number(e.target.value) })}
                          className="w-full h-10 rounded-xl border border-[#D9D1C5] px-3 font-mono-num text-sm font-bold"
                        />
                        <div className="flex justify-between items-center mt-1.5 text-[11px] text-[#5E5852]">
                          <span>
                            Trừ:{' '}
                            <strong className="font-mono-num text-[#181615]">
                              {Math.ceil((subModal.amount || 0) / VND_PER_POINT)} điểm
                            </strong>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setSubModal({
                                ...subModal,
                                amount: Math.min(
                                  defaultPayAmount,
                                  (subModal.verifiedMember?.loyaltyPoints || 0) * VND_PER_POINT
                                ),
                              })
                            }
                            className="text-[#A63429] font-semibold hover:underline cursor-pointer"
                          >
                            Dùng tối đa khả dụng
                          </button>
                        </div>
                      </div>

                      {invoice.guestId !== subModal.verifiedMember.id && (
                        <label className="inline-flex items-center gap-2 text-xs text-[#181615] cursor-pointer">
                          <input
                            type="checkbox"
                            checked={subModal.attachToBill}
                            onChange={(e) => setSubModal({ ...subModal, attachToBill: e.target.checked })}
                            className="accent-emerald-700"
                          />
                          <span>Gắn tài khoản thành viên này vào bill</span>
                        </label>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => setSubModal(null)}
                          className="px-4 py-2 rounded-xl border border-[#D9D1C5] font-semibold cursor-pointer"
                        >
                          Hủy
                        </button>
                        <button
                          type="submit"
                          disabled={submitting || subModal.amount < 1000}
                          className="btn-primary px-5 py-2 rounded-xl cursor-pointer disabled:opacity-50"
                        >
                          Cập nhật điểm lên bill
                        </button>
                      </div>
                    </form>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

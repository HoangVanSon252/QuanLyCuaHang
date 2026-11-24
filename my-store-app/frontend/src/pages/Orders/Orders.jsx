import { useCallback, useEffect, useState } from 'react';
import { Receipt, Search, X, Printer, Ban, Loader2 } from 'lucide-react';
import Header from '../../components/Navbar';
import Pagination from '../../components/Pagination';
import { orderApi } from '../../services/api';
import { errorMessage } from '../../services/axiosClient';
import { formatCurrency, formatDateTime, PAYMENT_LABELS, todayISO } from '../../utils/format';
import { getUser, ROLES } from '../../utils/auth';

const LIMIT = 15;

const StatusBadge = ({ status }) =>
  status === 'cancelled' ? (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-500">Đã huỷ</span>
  ) : (
    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-600">Hoàn thành</span>
  );

const Orders = () => {
  const canCancel = getUser()?.role === ROLES.STORE_ADMIN;
  const [filters, setFilters] = useState({ from: '', to: '', status: '', q: '' });
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [cancelError, setCancelError] = useState('');
  const [cancelling, setCancelling] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: LIMIT };
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      setResult(await orderApi.list(params));
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách hoá đơn.'));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => { load(); }, [load]);

  const updateFilter = (key, value) => {
    setPage(1);
    setFilters((f) => ({ ...f, [key]: value }));
  };

  // Gõ tìm mã hoá đơn: chờ 400ms sau phím cuối mới gọi API
  const [qInput, setQInput] = useState('');
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === qInput.trim() ? f : { ...f, q: qInput.trim() }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const openDetail = async (id) => {
    setDetail({ id });
    setDetailLoading(true);
    setCancelReason('');
    setCancelError('');
    try {
      setDetail(await orderApi.get(id));
    } catch (err) {
      setDetail(null);
      setError(errorMessage(err, 'Không tải được chi tiết hoá đơn.'));
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCancel = async () => {
    if (cancelReason.trim().length < 3) {
      setCancelError('Vui lòng nhập lý do huỷ (ít nhất 3 ký tự).');
      return;
    }
    setCancelling(true);
    try {
      await orderApi.cancel(detail.id, cancelReason.trim());
      await openDetail(detail.id);
      load();
    } catch (err) {
      setCancelError(errorMessage(err, 'Không huỷ được hoá đơn.'));
    } finally {
      setCancelling(false);
    }
  };

  // In hoá đơn: CSS @media print chỉ hiện vùng #receipt
  const handlePrint = () => {
    document.body.classList.add('printing-receipt');
    window.print();
    setTimeout(() => document.body.classList.remove('printing-receipt'), 500);
  };

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-12">
      <Header />
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Receipt className="text-brand-700" /> Hoá đơn bán hàng
            </h1>
            <p className="text-sm text-gray-500 mt-1">Tra cứu, xem chi tiết, in lại và huỷ hoá đơn</p>
          </div>
        </div>

        {/* Bộ lọc */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4 grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="col-span-2 md:col-span-2 flex items-center bg-gray-50 rounded-xl px-3">
            <Search size={16} className="text-gray-400" />
            <input
              aria-label="Tìm mã hoá đơn"
              placeholder="Tìm mã hoá đơn..."
              maxLength={40}
              value={qInput}
              onChange={(e) => setQInput(e.target.value)}
              className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none"
            />
          </div>
          <input type="date" aria-label="Từ ngày" max={todayISO()} value={filters.from} onChange={(e) => updateFilter('from', e.target.value)} className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none" />
          <input type="date" aria-label="Đến ngày" max={todayISO()} value={filters.to} onChange={(e) => updateFilter('to', e.target.value)} className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none" />
          <select aria-label="Trạng thái" value={filters.status} onChange={(e) => updateFilter('status', e.target.value)} className="bg-gray-50 rounded-xl px-3 py-2.5 text-sm outline-none">
            <option value="">Tất cả trạng thái</option>
            <option value="completed">Hoàn thành</option>
            <option value="cancelled">Đã huỷ</option>
          </select>
        </div>

        {error && <div role="alert" className="mb-4 p-4 text-sm text-red-600 bg-red-50 border border-red-100 rounded-xl">{error}</div>}

        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead>
                <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider text-left">
                  <th className="px-4 py-3">Mã hoá đơn</th>
                  <th className="px-4 py-3">Thời gian</th>
                  <th className="px-4 py-3">Thu ngân</th>
                  <th className="px-4 py-3 text-center">SL</th>
                  <th className="px-4 py-3">Thanh toán</th>
                  <th className="px-4 py-3 text-right">Tổng tiền</th>
                  <th className="px-4 py-3">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {loading ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400"><Loader2 className="inline animate-spin mr-2" size={18} />Đang tải...</td></tr>
                ) : result.data.length === 0 ? (
                  <tr><td colSpan={7} className="py-12 text-center text-gray-400">Chưa có hoá đơn nào phù hợp.</td></tr>
                ) : (
                  result.data.map((o) => (
                    <tr key={o.id} onClick={() => openDetail(o.id)} className="hover:bg-brand-50/40 cursor-pointer">
                      <td className="px-4 py-3 font-mono font-semibold text-brand-700">{o.order_code}</td>
                      <td className="px-4 py-3 text-gray-600">{formatDateTime(o.created_at)}</td>
                      <td className="px-4 py-3 text-gray-600">{o.cashier_name || o.cashier_username}</td>
                      <td className="px-4 py-3 text-center">{o.item_count}</td>
                      <td className="px-4 py-3 text-gray-600">{PAYMENT_LABELS[o.payment_method] || o.payment_method}</td>
                      <td className={`px-4 py-3 text-right font-bold ${o.status === 'cancelled' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>{formatCurrency(o.total_amount)}</td>
                      <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={page} limit={LIMIT} total={result.total} onChange={setPage} />
        </div>
      </div>

      {/* Chi tiết hoá đơn */}
      {detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Chi tiết hoá đơn">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl">
            <div className="flex justify-between items-center p-5 border-b border-gray-100 no-print">
              <h2 className="font-bold text-lg text-gray-800">Chi tiết hoá đơn</h2>
              <button aria-label="Đóng" onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>

            {detailLoading || !detail.items ? (
              <div className="p-10 text-center text-gray-400"><Loader2 className="inline animate-spin" /></div>
            ) : (
              <>
                <div id="receipt" className="p-5 text-sm">
                  <div className="text-center mb-4">
                    <div className="font-bold text-lg">{detail.store_name}</div>
                    {detail.store_address && <div className="text-gray-500 text-xs">{detail.store_address}</div>}
                    <div className="mt-2 font-bold">HOÁ ĐƠN BÁN HÀNG</div>
                    <div className="font-mono text-xs">{detail.order_code}</div>
                    <div className="text-xs text-gray-500">{formatDateTime(detail.created_at)} • Thu ngân: {detail.cashier_name}</div>
                  </div>
                  <table className="w-full text-xs mb-3">
                    <thead>
                      <tr className="border-b border-dashed border-gray-300 text-gray-500">
                        <th className="text-left py-1">Sản phẩm</th>
                        <th className="text-center py-1">SL</th>
                        <th className="text-right py-1">Đơn giá</th>
                        <th className="text-right py-1">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detail.items.map((it) => (
                        <tr key={it.id} className="border-b border-gray-50">
                          <td className="py-1.5">{it.product_name}</td>
                          <td className="text-center">{it.quantity}</td>
                          <td className="text-right">{formatCurrency(it.price)}</td>
                          <td className="text-right font-semibold">{formatCurrency(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="flex justify-between font-bold text-base border-t border-dashed border-gray-300 pt-2">
                    <span>TỔNG CỘNG</span>
                    <span>{formatCurrency(detail.total_amount)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 mt-1">
                    <span>Thanh toán</span>
                    <span>{PAYMENT_LABELS[detail.payment_method]}</span>
                  </div>
                  {detail.status === 'cancelled' && (
                    <div className="mt-3 p-3 rounded-xl bg-gray-100 text-gray-600 text-xs">
                      <strong>ĐÃ HUỶ</strong> lúc {formatDateTime(detail.cancelled_at)} bởi {detail.cancelled_by_name}. Lý do: {detail.cancel_reason}
                    </div>
                  )}
                  <div className="text-center text-xs text-gray-400 mt-4">Cảm ơn quý khách!</div>
                </div>

                <div className="p-5 border-t border-gray-100 space-y-3 no-print">
                  <button onClick={handlePrint} className="w-full py-2.5 rounded-xl border border-gray-200 font-semibold text-gray-700 hover:bg-gray-50 flex items-center justify-center gap-2">
                    <Printer size={16} /> In hoá đơn
                  </button>
                  {canCancel && detail.status === 'completed' && (
                    <div className="space-y-2">
                      <input
                        aria-label="Lý do huỷ"
                        placeholder="Lý do huỷ (bắt buộc) — tồn kho sẽ được hoàn lại"
                        maxLength={255}
                        value={cancelReason}
                        onChange={(e) => setCancelReason(e.target.value)}
                        className="w-full px-3 py-2.5 bg-gray-50 rounded-xl text-sm outline-none focus:ring-2 focus:ring-red-200"
                      />
                      {cancelError && <div role="alert" className="text-xs text-red-600">{cancelError}</div>}
                      <button disabled={cancelling} onClick={handleCancel} className="w-full py-2.5 rounded-xl bg-red-50 text-red-600 font-semibold hover:bg-red-100 flex items-center justify-center gap-2 disabled:opacity-50">
                        <Ban size={16} /> {cancelling ? 'Đang huỷ...' : 'Huỷ hoá đơn'}
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Orders;

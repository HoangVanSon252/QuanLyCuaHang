import { useCallback, useEffect, useMemo, useState } from 'react';
import { Truck, Plus, Trash2, Search, X, Loader2, CheckCircle } from 'lucide-react';
import Header from '../../components/Navbar';
import Pagination from '../../components/Pagination';
import { importApi, productApi } from '../../services/api';
import { errorMessage } from '../../services/axiosClient';
import { formatCurrency, formatDateTime } from '../../utils/format';

const LIMIT = 10;

const Imports = () => {
  // ----- Danh sách sản phẩm để chọn -----
  const [products, setProducts] = useState([]);
  const [search, setSearch] = useState('');

  // ----- Phiếu nhập đang tạo -----
  const [lines, setLines] = useState([]); // { product_id, name, quantity, price }
  const [supplier, setSupplier] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // ----- Lịch sử -----
  const [page, setPage] = useState(1);
  const [history, setHistory] = useState({ data: [], total: 0 });
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [detail, setDetail] = useState(null);

  const loadProducts = useCallback(async () => {
    try {
      setProducts((await productApi.getProducts()).data || []);
    } catch (err) {
      setFormError(errorMessage(err, 'Không tải được danh sách sản phẩm.'));
    }
  }, []);

  const loadHistory = useCallback(async () => {
    setLoadingHistory(true);
    try {
      setHistory(await importApi.list({ page, limit: LIMIT }));
    } catch (err) {
      setFormError(errorMessage(err, 'Không tải được lịch sử nhập hàng.'));
    } finally {
      setLoadingHistory(false);
    }
  }, [page]);

  useEffect(() => { loadProducts(); }, [loadProducts]);
  useEffect(() => { loadHistory(); }, [loadHistory]);

  const suggestions = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || (p.barcode && p.barcode.includes(q)))
      .slice(0, 8);
  }, [search, products]);

  const addLine = (p) => {
    setLines((prev) =>
      prev.some((l) => l.product_id === p.id)
        ? prev.map((l) => (l.product_id === p.id ? { ...l, quantity: String(Number(l.quantity || 0) + 1) } : l))
        : [...prev, { product_id: p.id, name: p.name, stock: p.stock_quantity, quantity: '1', price: String(Number(p.cost_price) || 0) }]
    );
    setSearch('');
  };

  const updateLine = (id, field, value) =>
    setLines((prev) => prev.map((l) => (l.product_id === id ? { ...l, [field]: value } : l)));

  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.price) || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    setSuccess('');
    if (lines.length === 0) return setFormError('Hãy chọn ít nhất một sản phẩm.');
    for (const l of lines) {
      if (!/^\d+$/.test(l.quantity) || Number(l.quantity) < 1) return setFormError(`Số lượng của "${l.name}" phải là số nguyên ≥ 1.`);
      if (!/^\d+(\.\d{1,2})?$/.test(l.price)) return setFormError(`Giá nhập của "${l.name}" không hợp lệ.`);
    }
    setSubmitting(true);
    try {
      const res = await importApi.create({
        supplier_name: supplier.trim() || undefined,
        note: note.trim() || undefined,
        items: lines.map((l) => ({ product_id: l.product_id, quantity: Number(l.quantity), price: Number(l.price) })),
      });
      setSuccess(`Đã nhập kho phiếu ${res.orderCode} — tổng ${formatCurrency(res.total_amount)}.`);
      setLines([]);
      setSupplier('');
      setNote('');
      setPage(1);
      loadHistory();
      loadProducts();
    } catch (err) {
      setFormError(errorMessage(err, 'Không tạo được phiếu nhập.'));
    } finally {
      setSubmitting(false);
    }
  };

  const openDetail = async (id) => {
    try {
      setDetail(await importApi.get(id));
    } catch (err) {
      setFormError(errorMessage(err, 'Không tải được chi tiết phiếu nhập.'));
    }
  };

  const inputCls = 'w-full px-3 py-2 bg-gray-50 rounded-lg text-sm outline-none focus:ring-2 focus:ring-brand-700/30';

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-12">
      <Header />
      <div className="max-w-[1400px] mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Truck className="text-brand-700" /> Nhập hàng
          </h1>
          <p className="text-sm text-gray-500 mt-1">Tạo phiếu nhập để cộng tồn kho. Giá vốn được cập nhật theo bình quân gia quyền.</p>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
          {/* ----- Tạo phiếu nhập ----- */}
          <form onSubmit={handleSubmit} className="xl:col-span-3 bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
            <h2 className="font-bold text-gray-800">Phiếu nhập mới</h2>

            <div className="relative">
              <div className="flex items-center bg-gray-50 rounded-xl px-3">
                <Search size={16} className="text-gray-400" />
                <input
                  aria-label="Tìm sản phẩm để nhập"
                  placeholder="Tìm sản phẩm theo tên hoặc mã vạch..."
                  value={search}
                  maxLength={100}
                  onChange={(e) => setSearch(e.target.value)}
                  className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none"
                />
              </div>
              {suggestions.length > 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-xl max-h-72 overflow-y-auto">
                  {suggestions.map((p) => (
                    <button
                      type="button"
                      key={p.id}
                      onClick={() => addLine(p)}
                      className="w-full flex justify-between items-center px-4 py-2.5 hover:bg-brand-50 text-left text-sm"
                    >
                      <span className="font-medium text-gray-800">{p.name}</span>
                      <span className="text-xs text-gray-400">Tồn: {p.stock_quantity} • Giá vốn: {formatCurrency(p.cost_price)}</span>
                    </button>
                  ))}
                </div>
              )}
              {search.trim() && suggestions.length === 0 && (
                <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow p-3 text-sm text-gray-400">
                  Không tìm thấy sản phẩm. Thêm sản phẩm mới ở trang Kho hàng.
                </div>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[520px]">
                <thead>
                  <tr className="text-xs uppercase text-gray-400 text-left">
                    <th className="py-2">Sản phẩm</th>
                    <th className="py-2 w-24">Số lượng</th>
                    <th className="py-2 w-36">Giá nhập (₫)</th>
                    <th className="py-2 text-right w-32">Thành tiền</th>
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {lines.length === 0 ? (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">Chưa có sản phẩm nào trong phiếu.</td></tr>
                  ) : (
                    lines.map((l) => (
                      <tr key={l.product_id} className="border-t border-gray-50">
                        <td className="py-2 pr-2">
                          <div className="font-medium text-gray-800">{l.name}</div>
                          <div className="text-xs text-gray-400">Tồn hiện tại: {l.stock}</div>
                        </td>
                        <td className="py-2 pr-2">
                          <input aria-label={`Số lượng ${l.name}`} inputMode="numeric" value={l.quantity} onChange={(e) => updateLine(l.product_id, 'quantity', e.target.value)} className={inputCls} />
                        </td>
                        <td className="py-2 pr-2">
                          <input aria-label={`Giá nhập ${l.name}`} inputMode="decimal" value={l.price} onChange={(e) => updateLine(l.product_id, 'price', e.target.value)} className={inputCls} />
                        </td>
                        <td className="py-2 text-right font-semibold">{formatCurrency((Number(l.quantity) || 0) * (Number(l.price) || 0))}</td>
                        <td className="py-2 text-right">
                          <button type="button" aria-label={`Bỏ ${l.name}`} onClick={() => setLines((prev) => prev.filter((x) => x.product_id !== l.product_id))} className="p-1.5 text-gray-400 hover:text-red-500">
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <input aria-label="Nhà cung cấp" placeholder="Nhà cung cấp (không bắt buộc)" maxLength={150} value={supplier} onChange={(e) => setSupplier(e.target.value)} className={inputCls} />
              <input aria-label="Ghi chú" placeholder="Ghi chú (không bắt buộc)" maxLength={255} value={note} onChange={(e) => setNote(e.target.value)} className={inputCls} />
            </div>

            {formError && <div role="alert" className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">{formError}</div>}
            {success && <div role="status" className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-xl flex items-center gap-2"><CheckCircle size={16} />{success}</div>}

            <div className="flex items-center justify-between pt-2">
              <div className="text-gray-500 text-sm">
                Tổng tiền nhập: <span className="text-xl font-black text-brand-700">{formatCurrency(total)}</span>
              </div>
              <button type="submit" disabled={submitting || lines.length === 0} className="px-6 py-2.5 rounded-xl text-white font-bold bg-gradient-to-r from-brand-700 to-brand-500 shadow-md disabled:opacity-50 flex items-center gap-2">
                <Plus size={16} /> {submitting ? 'Đang lưu...' : 'Lưu phiếu nhập'}
              </button>
            </div>
          </form>

          {/* ----- Lịch sử nhập ----- */}
          <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <h2 className="font-bold text-gray-800 p-5 pb-3">Lịch sử nhập hàng</h2>
            <div className="divide-y divide-gray-50">
              {loadingHistory ? (
                <div className="p-8 text-center text-gray-400"><Loader2 className="inline animate-spin" /></div>
              ) : history.data.length === 0 ? (
                <div className="p-8 text-center text-gray-400 text-sm">Chưa có phiếu nhập nào.</div>
              ) : (
                history.data.map((h) => (
                  <button type="button" key={h.id} onClick={() => openDetail(h.id)} className="w-full text-left px-5 py-3 hover:bg-brand-50/40 flex justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-mono text-sm font-semibold text-brand-700">{h.order_code}</div>
                      <div className="text-xs text-gray-400 truncate">
                        {formatDateTime(h.created_at)} • {h.importer_name}{h.supplier_name ? ` • ${h.supplier_name}` : ''}
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-bold text-gray-800 text-sm">{formatCurrency(h.total_amount)}</div>
                      <div className="text-xs text-gray-400">{h.item_count} sản phẩm</div>
                    </div>
                  </button>
                ))
              )}
            </div>
            <Pagination page={page} limit={LIMIT} total={history.total} onChange={setPage} />
          </div>
        </div>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-label="Chi tiết phiếu nhập">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-2xl p-5">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="font-bold text-lg text-gray-800">Phiếu nhập {detail.order_code}</h2>
                <p className="text-xs text-gray-500">{formatDateTime(detail.created_at)} • {detail.importer_name}</p>
                {detail.supplier_name && <p className="text-xs text-gray-500">Nhà cung cấp: {detail.supplier_name}</p>}
                {detail.note && <p className="text-xs text-gray-500">Ghi chú: {detail.note}</p>}
              </div>
              <button aria-label="Đóng" onClick={() => setDetail(null)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={18} /></button>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 text-left border-b border-gray-100">
                  <th className="py-1">Sản phẩm</th><th className="text-center">SL</th><th className="text-right">Giá nhập</th><th className="text-right">Thành tiền</th>
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
            <div className="flex justify-between font-bold mt-3">
              <span>Tổng cộng</span>
              <span>{formatCurrency(detail.total_amount)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Imports;

import { useCallback, useEffect, useState } from 'react';
import { Store, History, Search, Plus, Pencil, KeyRound, Lock, Unlock, X, Loader2 } from 'lucide-react';
import Header from '../../components/Navbar';
import Pagination from '../../components/Pagination';
import { adminApi } from '../../services/api';
import { errorMessage } from '../../services/axiosClient';
import { formatDateTime, formatNumber } from '../../utils/format';

const LIMIT = 15;

const ACTION_LABELS = {
  store_created: 'Tạo cửa hàng',
  store_updated: 'Sửa thông tin cửa hàng',
  store_locked: 'Khoá cửa hàng',
  store_unlocked: 'Mở khoá cửa hàng',
  password_reset: 'Đặt lại mật khẩu',
  password_changed: 'Đổi mật khẩu',
  login_success: 'Đăng nhập',
  login_failed: 'Đăng nhập sai',
  login_blocked_locked: 'Đăng nhập khi đang bị khoá',
  logout: 'Đăng xuất',
  refresh_token_reuse_detected: 'Phát hiện dùng lại phiên cũ',
  product_created: 'Thêm sản phẩm',
  product_updated: 'Sửa sản phẩm',
  product_deleted: 'Xoá sản phẩm',
  category_created: 'Thêm danh mục',
  order_created: 'Bán hàng',
  order_cancelled: 'Huỷ hoá đơn',
  import_created: 'Nhập hàng',
};
const DANGER_ACTIONS = /failed|reuse|blocked|locked$|deleted|cancelled/;

const EMPTY_CREATE = { storeName: '', address: '', phone: '', userName: '', password: '', fullName: '' };
const passwordOk = (p) => p.length >= 8 && /[A-Za-z]/.test(p) && /\d/.test(p);

const inputCls = 'w-full px-4 py-2.5 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500';
const labelCls = 'block text-xs font-bold text-gray-600 uppercase tracking-wider mb-1.5';

// Khung hộp thoại dùng chung
const Dialog = ({ title, onClose, children, label }) => (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-label={label || title}>
    <div className="bg-white rounded-2xl w-full max-w-lg max-h-[92vh] overflow-y-auto shadow-2xl">
      <div className="flex justify-between items-center px-6 py-4 border-b border-gray-100">
        <h2 className="text-lg font-bold text-gray-800">{title}</h2>
        <button type="button" aria-label="Đóng" onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600">
          <X size={18} />
        </button>
      </div>
      <div className="p-6">{children}</div>
    </div>
  </div>
);

const StatusBadge = ({ active }) =>
  active ? (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-green-50 text-green-700 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-green-600" /> Hoạt động
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-red-50 text-red-700 whitespace-nowrap">
      <span className="w-1.5 h-1.5 rounded-full bg-red-600" /> Đang khoá
    </span>
  );

const StoreManagement = () => {
  const [tab, setTab] = useState('stores');
  const [filters, setFilters] = useState({ q: '', status: '' });
  const [qInput, setQInput] = useState('');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState({ data: [], total: 0, summary: { total: 0, active: 0, locked: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  // Hộp thoại: { type: 'create' | 'edit' | 'reset' | 'status', store?, form }
  const [dialog, setDialog] = useState(null);
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [logs, setLogs] = useState({ data: [], total: 0 });
  const [logPage, setLogPage] = useState(1);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: LIMIT };
      if (filters.q) params.q = filters.q;
      if (filters.status) params.status = filters.status;
      setResult(await adminApi.listStores(params));
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách cửa hàng.'));
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const loadLogs = useCallback(async () => {
    try {
      setLogs(await adminApi.getAuditLogs({ page: logPage, limit: 20 }));
    } catch (err) {
      setError(errorMessage(err, 'Không tải được nhật ký.'));
    }
  }, [logPage]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === 'logs') loadLogs(); }, [tab, loadLogs]);

  // Tìm kiếm: chờ 400ms sau phím cuối mới gọi API
  useEffect(() => {
    const t = setTimeout(() => {
      setFilters((f) => (f.q === qInput.trim() ? f : { ...f, q: qInput.trim() }));
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [qInput]);

  const flash = (msg) => {
    setNotice(msg);
    setTimeout(() => setNotice(''), 5000);
  };

  const open = (type, store = null) => {
    setFormError('');
    const form =
      type === 'create' ? { ...EMPTY_CREATE }
      : type === 'edit' ? { storeName: store.store_name || '', address: store.address || '', phone: store.phone || '' }
      : type === 'reset' ? { newPassword: '', confirm: '' }
      : {};
    setDialog({ type, store, form });
  };
  const close = () => setDialog(null);
  const setField = (e) => setDialog((d) => ({ ...d, form: { ...d.form, [e.target.name]: e.target.value } }));

  const submit = async (e) => {
    e?.preventDefault();
    const { type, store, form } = dialog;
    setFormError('');

    if (type === 'create' || type === 'edit') {
      if (!form.storeName.trim()) return setFormError('Vui lòng nhập tên cửa hàng.');
      if (form.phone && !/^[0-9+\s.-]{6,20}$/.test(form.phone)) return setFormError('Số điện thoại không hợp lệ.');
    }
    if (type === 'create') {
      if (!/^[a-zA-Z0-9_.]{3,50}$/.test(form.userName))
        return setFormError('Tên đăng nhập 3–50 ký tự: chữ không dấu, số, dấu chấm hoặc gạch dưới.');
      if (!passwordOk(form.password)) return setFormError('Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số.');
    }
    if (type === 'reset') {
      if (!passwordOk(form.newPassword)) return setFormError('Mật khẩu phải có ít nhất 8 ký tự, gồm cả chữ và số.');
      if (form.newPassword !== form.confirm) return setFormError('Xác nhận mật khẩu không khớp.');
    }

    setSaving(true);
    try {
      const info = { storeName: form.storeName?.trim(), address: form.address?.trim() || undefined, phone: form.phone?.trim() || undefined };
      if (type === 'create') {
        await adminApi.createStore({ ...info, userName: form.userName.trim(), password: form.password, fullName: form.fullName.trim() || undefined });
        flash(`Đã tạo cửa hàng "${info.storeName}" với tài khoản "${form.userName.trim()}".`);
        setPage(1);
      } else if (type === 'edit') {
        await adminApi.updateStore(store.id, info);
        flash(`Đã cập nhật thông tin "${info.storeName}".`);
      } else if (type === 'reset') {
        await adminApi.resetStorePassword(store.id, form.newPassword);
        flash(`Đã đặt lại mật khẩu cho "${store.store_name}". Hãy gửi mật khẩu mới cho chủ cửa hàng qua kênh an toàn.`);
      } else if (type === 'status') {
        const next = store.is_active !== 1;
        await adminApi.setStoreStatus(store.id, next);
        flash(next ? `Đã mở khoá "${store.store_name}".` : `Đã khoá "${store.store_name}". Tài khoản cửa hàng đã bị đăng xuất.`);
      }
      close();
      load();
    } catch (err) {
      setFormError(errorMessage(err, 'Thao tác thất bại.'));
    } finally {
      setSaving(false);
    }
  };

  const { summary } = result;

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-12">
      <Header />
      <div className="max-w-[1400px] mx-auto">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
              <Store className="text-brand-600" /> Quản lý cửa hàng
            </h1>
            <p className="text-sm text-gray-500 mt-1">Mỗi cửa hàng có một tài khoản duy nhất. Cửa hàng tự quản lý sản phẩm và bán hàng của mình.</p>
          </div>
          <button
            type="button"
            onClick={() => open('create')}
            className="self-start md:self-auto flex items-center gap-2 px-5 py-2.5 rounded-xl text-white text-sm font-bold bg-gradient-to-r from-brand-700 to-brand-500 shadow-md hover:opacity-90"
          >
            <Plus size={16} /> Tạo cửa hàng
          </button>
        </div>

        {/* Thống kê nhanh — bấm để lọc */}
        <div className="grid grid-cols-3 gap-3 md:gap-5 mb-6">
          {[
            ['', 'Tổng cửa hàng', summary.total, 'text-gray-800'],
            ['active', 'Đang hoạt động', summary.active, 'text-green-700'],
            ['locked', 'Đang khoá', summary.locked, 'text-red-700'],
          ].map(([key, label, value, color]) => (
            <button
              key={label}
              type="button"
              aria-pressed={filters.status === key}
              onClick={() => { setPage(1); setFilters((f) => ({ ...f, status: key })); }}
              className={`text-left bg-white rounded-2xl p-4 md:p-5 border transition ${filters.status === key ? 'border-brand-500 ring-2 ring-brand-500/20' : 'border-gray-100 hover:border-gray-200'}`}
            >
              <div className="text-[11px] md:text-xs font-bold uppercase tracking-wider text-gray-500">{label}</div>
              <div className={`text-2xl md:text-3xl font-black mt-1 ${color}`}>{formatNumber(value)}</div>
            </button>
          ))}
        </div>

        <div className="flex gap-2 mb-4" role="tablist">
          {[['stores', 'Cửa hàng', Store], ['logs', 'Nhật ký thao tác', History]].map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 ${tab === key ? 'bg-white text-brand-700 shadow-sm' : 'text-gray-500 hover:bg-white/60'}`}
            >
              <Icon size={16} /> {label}
            </button>
          ))}
        </div>

        {error && <div role="alert" className="mb-4 p-4 text-sm text-red-700 bg-red-50 border border-red-100 rounded-xl">{error}</div>}
        {notice && <div role="status" className="mb-4 p-4 text-sm text-green-800 bg-green-50 border border-green-100 rounded-xl">{notice}</div>}

        {tab === 'stores' ? (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center bg-gray-50/50">
              <div className="flex items-center bg-white border border-gray-200 rounded-xl px-3 w-full md:w-96">
                <Search size={16} className="text-gray-400" />
                <input
                  aria-label="Tìm cửa hàng"
                  placeholder="Tìm tên cửa hàng, mã, tài khoản, SĐT..."
                  maxLength={100}
                  value={qInput}
                  onChange={(e) => setQInput(e.target.value)}
                  className="flex-1 bg-transparent px-2 py-2.5 text-sm outline-none"
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[980px]">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider text-left whitespace-nowrap">
                    <th className="px-5 py-3">Cửa hàng</th>
                    <th className="px-5 py-3">Tài khoản</th>
                    <th className="px-5 py-3">Liên hệ</th>
                    <th className="px-5 py-3 text-right">Sản phẩm</th>
                    <th className="px-5 py-3 text-right">Hoá đơn</th>
                    <th className="px-5 py-3">Đăng nhập gần nhất</th>
                    <th className="px-5 py-3">Trạng thái</th>
                    <th className="px-5 py-3 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {loading ? (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400"><Loader2 className="inline animate-spin mr-2" size={18} />Đang tải...</td></tr>
                  ) : result.data.length === 0 ? (
                    <tr><td colSpan={8} className="py-12 text-center text-gray-400">Không có cửa hàng nào phù hợp.</td></tr>
                  ) : (
                    result.data.map((s) => (
                      <tr key={s.id} className={s.is_active === 1 ? 'hover:bg-gray-50/60' : 'bg-red-50/30'}>
                        <td className="px-5 py-3.5">
                          <div className="font-bold text-gray-800">{s.store_name}</div>
                          <div className="text-xs text-gray-500 font-mono">{s.store_code}</div>
                        </td>
                        <td className="px-5 py-3.5">
                          <div className="font-medium text-gray-800">{s.username || '—'}</div>
                          <div className="text-xs text-gray-500">{s.full_name || ''}</div>
                        </td>
                        <td className="px-5 py-3.5 text-gray-600">
                          <div>{s.phone || '—'}</div>
                          <div className="text-xs text-gray-500 max-w-[220px] truncate" title={s.address || ''}>{s.address || ''}</div>
                        </td>
                        <td className="px-5 py-3.5 text-right font-semibold">{formatNumber(s.product_count)}</td>
                        <td className="px-5 py-3.5 text-right font-semibold">{formatNumber(s.order_count)}</td>
                        <td className="px-5 py-3.5 text-gray-500 text-xs">{formatDateTime(s.last_login_at)}</td>
                        <td className="px-5 py-3.5"><StatusBadge active={s.is_active === 1} /></td>
                        <td className="px-5 py-3.5">
                          <div className="flex justify-end gap-1">
                            <button type="button" title="Sửa thông tin" aria-label={`Sửa ${s.store_name}`} onClick={() => open('edit', s)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-700">
                              <Pencil size={16} />
                            </button>
                            <button type="button" title="Đặt lại mật khẩu" aria-label={`Đặt lại mật khẩu ${s.store_name}`} onClick={() => open('reset', s)} className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 hover:text-brand-700">
                              <KeyRound size={16} />
                            </button>
                            <button
                              type="button"
                              title={s.is_active === 1 ? 'Khoá cửa hàng' : 'Mở khoá cửa hàng'}
                              aria-label={s.is_active === 1 ? `Khoá ${s.store_name}` : `Mở khoá ${s.store_name}`}
                              onClick={() => open('status', s)}
                              className={`p-2 rounded-lg ${s.is_active === 1 ? 'text-gray-500 hover:bg-red-50 hover:text-red-600' : 'text-red-600 hover:bg-green-50 hover:text-green-700'}`}
                            >
                              {s.is_active === 1 ? <Lock size={16} /> : <Unlock size={16} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={page} limit={LIMIT} total={result.total} onChange={setPage} />
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm min-w-[720px]">
                <thead>
                  <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wider text-left">
                    <th className="px-4 py-3">Thời gian</th>
                    <th className="px-4 py-3">Cửa hàng</th>
                    <th className="px-4 py-3">Tài khoản</th>
                    <th className="px-4 py-3">Thao tác</th>
                    <th className="px-4 py-3">IP</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {logs.data.map((l) => (
                    <tr key={l.id}>
                      <td className="px-4 py-2.5 text-gray-500 text-xs whitespace-nowrap">{formatDateTime(l.created_at)}</td>
                      <td className="px-4 py-2.5 text-gray-700">{l.store_name || 'Hệ thống'}</td>
                      <td className="px-4 py-2.5 font-medium text-gray-700">{l.username || '—'}</td>
                      <td className={`px-4 py-2.5 ${DANGER_ACTIONS.test(l.action) ? 'text-red-700' : 'text-gray-700'}`}>{ACTION_LABELS[l.action] || l.action}</td>
                      <td className="px-4 py-2.5 text-gray-500 text-xs font-mono">{l.ip || '—'}</td>
                    </tr>
                  ))}
                  {logs.data.length === 0 && (
                    <tr><td colSpan={5} className="py-8 text-center text-gray-400">Chưa có nhật ký.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
            <Pagination page={logPage} limit={20} total={logs.total} onChange={setLogPage} />
          </div>
        )}
      </div>

      {/* ---------- Hộp thoại ---------- */}
      {dialog?.type === 'create' && (
        <Dialog title="Tạo cửa hàng mới" onClose={close}>
          <form onSubmit={submit} className="space-y-5">
            <fieldset className="space-y-3">
              <legend className="text-sm font-bold text-gray-800 mb-1">Thông tin cửa hàng</legend>
              <div><label htmlFor="storeName" className={labelCls}>Tên cửa hàng *</label><input id="storeName" name="storeName" maxLength={150} value={dialog.form.storeName} onChange={setField} className={inputCls} placeholder="VD: Tạp hoá Minh An" /></div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label htmlFor="phone" className={labelCls}>Số điện thoại</label><input id="phone" name="phone" inputMode="tel" maxLength={20} value={dialog.form.phone} onChange={setField} className={inputCls} placeholder="0901 234 567" /></div>
                <div><label htmlFor="fullName" className={labelCls}>Tên chủ cửa hàng</label><input id="fullName" name="fullName" maxLength={100} value={dialog.form.fullName} onChange={setField} className={inputCls} placeholder="Nguyễn Văn A" /></div>
              </div>
              <div><label htmlFor="address" className={labelCls}>Địa chỉ</label><input id="address" name="address" maxLength={255} value={dialog.form.address} onChange={setField} className={inputCls} placeholder="Số nhà, đường, quận/huyện, tỉnh" /></div>
            </fieldset>
            <fieldset className="space-y-3 p-4 bg-brand-50 rounded-xl border border-brand-100">
              <legend className="text-sm font-bold text-gray-800 px-1">Tài khoản đăng nhập của cửa hàng</legend>
              <p className="text-xs text-gray-600">Cửa hàng dùng chung tài khoản này để bán hàng và quản lý sản phẩm.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div><label htmlFor="userName" className={labelCls}>Tên đăng nhập *</label><input id="userName" name="userName" autoComplete="off" maxLength={50} value={dialog.form.userName} onChange={setField} className={inputCls} placeholder="minhan" /></div>
                <div><label htmlFor="password" className={labelCls}>Mật khẩu *</label><input id="password" name="password" type="password" autoComplete="new-password" maxLength={72} value={dialog.form.password} onChange={setField} className={inputCls} placeholder="≥ 8 ký tự, có chữ và số" /></div>
              </div>
            </fieldset>
            {formError && <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 rounded-xl">{formError}</div>}
            <div className="flex gap-3">
              <button type="button" onClick={close} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">Huỷ</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-brand-700 to-brand-500 text-white rounded-xl font-bold shadow-md disabled:opacity-60">{saving ? 'Đang tạo...' : 'Tạo cửa hàng'}</button>
            </div>
          </form>
        </Dialog>
      )}

      {dialog?.type === 'edit' && (
        <Dialog title={`Sửa thông tin cửa hàng`} onClose={close}>
          <form onSubmit={submit} className="space-y-3">
            <p className="text-xs text-gray-500">Mã cửa hàng <span className="font-mono">{dialog.store.store_code}</span> · tài khoản <strong>{dialog.store.username}</strong></p>
            <div><label htmlFor="e-storeName" className={labelCls}>Tên cửa hàng *</label><input id="e-storeName" name="storeName" maxLength={150} value={dialog.form.storeName} onChange={setField} className={inputCls} /></div>
            <div><label htmlFor="e-phone" className={labelCls}>Số điện thoại</label><input id="e-phone" name="phone" inputMode="tel" maxLength={20} value={dialog.form.phone} onChange={setField} className={inputCls} /></div>
            <div><label htmlFor="e-address" className={labelCls}>Địa chỉ</label><input id="e-address" name="address" maxLength={255} value={dialog.form.address} onChange={setField} className={inputCls} /></div>
            {formError && <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 rounded-xl">{formError}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={close} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">Huỷ</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-brand-700 to-brand-500 text-white rounded-xl font-bold shadow-md disabled:opacity-60">{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</button>
            </div>
          </form>
        </Dialog>
      )}

      {dialog?.type === 'reset' && (
        <Dialog title="Đặt lại mật khẩu" onClose={close}>
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-gray-600">Cửa hàng <strong>{dialog.store.store_name}</strong> · tài khoản <strong>{dialog.store.username}</strong>. Mọi thiết bị đang đăng nhập sẽ bị đăng xuất.</p>
            <input type="text" name="username" autoComplete="username" value={dialog.store.username || ''} readOnly hidden />
            <div><label htmlFor="newPassword" className={labelCls}>Mật khẩu mới</label><input id="newPassword" name="newPassword" type="password" autoComplete="new-password" maxLength={72} value={dialog.form.newPassword} onChange={setField} className={inputCls} placeholder="≥ 8 ký tự, có chữ và số" /></div>
            <div><label htmlFor="confirm" className={labelCls}>Nhập lại mật khẩu mới</label><input id="confirm" name="confirm" type="password" autoComplete="new-password" maxLength={72} value={dialog.form.confirm} onChange={setField} className={inputCls} /></div>
            {formError && <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 rounded-xl">{formError}</div>}
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={close} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">Huỷ</button>
              <button type="submit" disabled={saving} className="flex-1 py-2.5 bg-gradient-to-r from-brand-700 to-brand-500 text-white rounded-xl font-bold shadow-md disabled:opacity-60">{saving ? 'Đang lưu...' : 'Đặt lại mật khẩu'}</button>
            </div>
          </form>
        </Dialog>
      )}

      {dialog?.type === 'status' && (
        <Dialog title={dialog.store.is_active === 1 ? 'Khoá cửa hàng?' : 'Mở khoá cửa hàng?'} onClose={close}>
          <div className="space-y-4">
            {dialog.store.is_active === 1 ? (
              <p className="text-sm text-gray-700 leading-relaxed">
                Cửa hàng <strong>{dialog.store.store_name}</strong> sẽ <strong>không đăng nhập và sử dụng được</strong> cho đến khi được mở khoá.
                Thiết bị đang đăng nhập sẽ bị đăng xuất ngay. Dữ liệu của cửa hàng được giữ nguyên.
              </p>
            ) : (
              <p className="text-sm text-gray-700">Cửa hàng <strong>{dialog.store.store_name}</strong> sẽ đăng nhập và sử dụng lại bình thường.</p>
            )}
            {formError && <div role="alert" className="p-3 text-sm text-red-700 bg-red-50 rounded-xl">{formError}</div>}
            <div className="flex gap-3">
              <button type="button" onClick={close} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200">Huỷ</button>
              <button
                type="button"
                disabled={saving}
                onClick={submit}
                className={`flex-1 py-2.5 text-white rounded-xl font-bold shadow-md disabled:opacity-60 ${dialog.store.is_active === 1 ? 'bg-red-600 hover:bg-red-700' : 'bg-green-700 hover:bg-green-800'}`}
              >
                {saving ? 'Đang xử lý...' : dialog.store.is_active === 1 ? 'Khoá cửa hàng' : 'Mở khoá'}
              </button>
            </div>
          </div>
        </Dialog>
      )}
    </div>
  );
};

export default StoreManagement;

import { useState } from 'react';
import { KeyRound, ShieldCheck } from 'lucide-react';
import Header from '../../components/Navbar';
import { authApi } from '../../services/api';
import { errorMessage } from '../../services/axiosClient';
import { getUser, ROLE_LABELS, setToken } from '../../utils/auth';

const Account = () => {
  const user = getUser() || {};
  const [form, setForm] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const onChange = (e) => setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const { currentPassword, newPassword, confirm } = form;
    if (newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword))
      return setError('Mật khẩu mới phải có ít nhất 8 ký tự, gồm cả chữ và số.');
    if (newPassword !== confirm) return setError('Xác nhận mật khẩu không khớp.');

    setSubmitting(true);
    try {
      const res = await authApi.changePassword(currentPassword, newPassword);
      setToken(res.token); // phiên hiện tại tiếp tục, các thiết bị khác bị đăng xuất
      setSuccess('Đổi mật khẩu thành công. Các thiết bị khác đã được đăng xuất.');
      setForm({ currentPassword: '', newPassword: '', confirm: '' });
    } catch (err) {
      setError(errorMessage(err, 'Không đổi được mật khẩu.'));
    } finally {
      setSubmitting(false);
    }
  };

  const inputCls = 'w-full px-4 py-2.5 bg-[#f4f5f7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-700/30';

  return (
    <div className="min-h-screen bg-[#F5F6F8] pb-12">
      <Header />
      <div className="max-w-3xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <h2 className="font-bold text-gray-800 flex items-center gap-2 mb-4"><ShieldCheck className="text-brand-700" size={20} /> Thông tin tài khoản</h2>
          <dl className="space-y-3 text-sm">
            <div><dt className="text-gray-400 text-xs uppercase">Tên đăng nhập</dt><dd className="font-semibold text-gray-800">{user.userName}</dd></div>
            <div><dt className="text-gray-400 text-xs uppercase">Họ tên</dt><dd className="font-semibold text-gray-800">{user.fullName || '—'}</dd></div>
            <div><dt className="text-gray-400 text-xs uppercase">Vai trò</dt><dd className="font-semibold text-gray-800">{ROLE_LABELS[user.role] || user.role}</dd></div>
            {user.storeName && <div><dt className="text-gray-400 text-xs uppercase">Cửa hàng</dt><dd className="font-semibold text-gray-800">{user.storeName}</dd></div>}
          </dl>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-4">
          <h2 className="font-bold text-gray-800 flex items-center gap-2"><KeyRound className="text-brand-700" size={20} /> Đổi mật khẩu</h2>
          <input type="text" name="username" autoComplete="username" value={user.userName || ''} readOnly hidden />
          <div>
            <label htmlFor="currentPassword" className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Mật khẩu hiện tại</label>
            <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" required maxLength={72} value={form.currentPassword} onChange={onChange} className={inputCls} />
          </div>
          <div>
            <label htmlFor="newPassword" className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Mật khẩu mới</label>
            <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" required maxLength={72} value={form.newPassword} onChange={onChange} className={inputCls} />
            <p className="text-xs text-gray-400 mt-1">Ít nhất 8 ký tự, gồm cả chữ và số.</p>
          </div>
          <div>
            <label htmlFor="confirm" className="block text-xs font-bold text-gray-500 uppercase mb-1.5">Nhập lại mật khẩu mới</label>
            <input id="confirm" name="confirm" type="password" autoComplete="new-password" required maxLength={72} value={form.confirm} onChange={onChange} className={inputCls} />
          </div>
          {error && <div role="alert" className="p-3 text-sm text-red-600 bg-red-50 rounded-lg">{error}</div>}
          {success && <div role="status" className="p-3 text-sm text-emerald-700 bg-emerald-50 rounded-lg">{success}</div>}
          <button type="submit" disabled={submitting} className="w-full py-2.5 rounded-xl text-white font-bold bg-gradient-to-r from-brand-700 to-brand-500 shadow-md disabled:opacity-60">
            {submitting ? 'Đang lưu...' : 'Cập nhật mật khẩu'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Account;

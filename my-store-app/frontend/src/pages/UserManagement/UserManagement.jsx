import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [errorMsg, setErrorMsg] = useState('');
    const [successMsg, setSuccessMsg] = useState('');

    const [formData, setFormData] = useState({
        userName: '',
        password: '',
        fullName: '',
        store_id: ''
    });

    const navigate = useNavigate();

    // Fetch danh sách users khi load trang
    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/users`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });
            const data = await res.json();
            if (res.ok) {
                setUsers(data);
            } else {
                setErrorMsg(data.message || 'Không thể lấy danh sách người dùng');
                if (res.status === 401 || res.status === 403) {
                    navigate('/login');
                }
            }
        } catch (error) {
            setErrorMsg('Lỗi kết nối đến server');
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleInputChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleCreateUser = async (e) => {
        e.preventDefault();
        setErrorMsg('');
        setSuccessMsg('');

        try {
            const token = localStorage.getItem('token');
            const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8080/api'}/users/create-store-admin`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();

            if (res.ok) {
                setSuccessMsg('Tạo tài khoản thành công!');
                setIsModalOpen(false);
                setFormData({ userName: '', password: '', fullName: '', store_id: '' });
                fetchUsers(); // Tải lại danh sách
            } else {
                setErrorMsg(data.message || 'Lỗi khi tạo tài khoản');
            }
        } catch (error) {
            setErrorMsg('Lỗi kết nối đến server');
        }
    };

    return (
        <div className="w-full">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 font-serif">Quản lý tài khoản</h1>
                    <p className="text-sm text-gray-500">Xem và thêm mới tài khoản cửa hàng</p>
                </div>
                <button 
                    onClick={() => setIsModalOpen(true)}
                    className="bg-gradient-to-r from-[#9D2753] to-[#ef6292] text-white px-5 py-2.5 rounded-xl font-medium shadow-sm hover:opacity-90 transition-opacity flex items-center space-x-2"
                >
                    <span>+ Thêm tài khoản</span>
                </button>
            </div>

            {errorMsg && (
                <div className="p-4 mb-6 text-sm text-red-600 bg-red-100 rounded-lg">
                    {errorMsg}
                </div>
            )}

            {successMsg && (
                <div className="p-4 mb-6 text-sm text-green-600 bg-green-100 rounded-lg">
                    {successMsg}
                </div>
            )}

            {/* BẢNG DANH SÁCH TÀI KHOẢN */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-gray-50 border-b border-gray-100 text-sm text-gray-500 uppercase tracking-wider">
                            <th className="px-6 py-4 font-medium">Tên đăng nhập</th>
                            <th className="px-6 py-4 font-medium">Họ và Tên</th>
                            <th className="px-6 py-4 font-medium">Quyền</th>
                            <th className="px-6 py-4 font-medium">Mã Cửa hàng</th>
                            <th className="px-6 py-4 font-medium text-right">Hành động</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {users.map((user) => (
                            <tr key={user.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-6 py-4 font-medium text-gray-800">{user.username}</td>
                                <td className="px-6 py-4 text-gray-600">{user.full_name || '—'}</td>
                                <td className="px-6 py-4">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${user.role === 'super_admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                                        {user.role}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-gray-600">{user.store_id || '—'}</td>
                                <td className="px-6 py-4 text-right">
                                    <button className="text-gray-400 hover:text-[#9D2753] transition-colors">Sửa</button>
                                </td>
                            </tr>
                        ))}
                        {users.length === 0 && (
                            <tr>
                                <td colSpan="5" className="px-6 py-8 text-center text-gray-500">Chưa có tài khoản nào.</td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* MODAL THÊM TÀI KHOẢN MỚI */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl w-full max-w-md p-6 shadow-2xl relative">
                        <button 
                            onClick={() => setIsModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-xl"
                        >
                            ×
                        </button>
                        
                        <h2 className="text-xl font-bold font-serif text-gray-800 mb-6">Tạo tài khoản mới</h2>
                        
                        <form onSubmit={handleCreateUser} className="space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Tên đăng nhập *</label>
                                <input 
                                    type="text" name="userName" required
                                    value={formData.userName} onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-[#f4f5f7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30"
                                    placeholder="Ví dụ: cuahang01"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mật khẩu *</label>
                                <input 
                                    type="password" name="password" required
                                    value={formData.password} onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-[#f4f5f7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30"
                                    placeholder="Nhập mật khẩu"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Họ và Tên chủ cửa hàng</label>
                                <input 
                                    type="text" name="fullName"
                                    value={formData.fullName} onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-[#f4f5f7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30"
                                    placeholder="Ví dụ: Nguyễn Văn A"
                                />
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Mã cửa hàng (Store ID)</label>
                                <input 
                                    type="number" name="store_id"
                                    value={formData.store_id} onChange={handleInputChange}
                                    className="w-full px-4 py-2.5 bg-[#f4f5f7] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#9D2753]/30"
                                    placeholder="Ví dụ: 1"
                                />
                            </div>

                            <div className="pt-4 flex space-x-3">
                                <button 
                                    type="button" onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium hover:bg-gray-200 transition-colors"
                                >
                                    Hủy
                                </button>
                                <button 
                                    type="submit"
                                    className="flex-1 px-4 py-2.5 bg-gradient-to-r from-[#9D2753] to-[#ef6292] text-white rounded-xl font-medium hover:opacity-90 transition-opacity shadow-md"
                                >
                                    Tạo tài khoản
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;

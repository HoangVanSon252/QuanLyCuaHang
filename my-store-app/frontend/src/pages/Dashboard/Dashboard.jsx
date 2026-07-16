import React, { useState, useEffect } from "react";
import Header from "../../components/Navbar";
import axiosClient from '../../services/axiosClient';
import { 
  Banknote, 
  Package, 
  AlertTriangle,
  ShoppingCart,
  Truck,
  Box,
  ChevronDown
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const [overview, setOverview] = useState({ total_orders: 0, total_revenue: 0, total_profit: 0 });
  const [lowStock, setLowStock] = useState([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setLoading(true);
        // Chạy song song các requests để tối ưu tốc độ
        const [overviewRes, lowStockRes, weeklyRes, activityRes] = await Promise.all([
          axiosClient.get('/dashboard/overview'),
          axiosClient.get('/dashboard/low-stock'),
          axiosClient.get('/dashboard/weekly-revenue'),
          axiosClient.get('/dashboard/recent-activity')
        ]);

        setOverview(overviewRes.data.data);
        setLowStock(lowStockRes.data.data);
        
        // Format dữ liệu weekly revenue cho recharts
        // Cần map date (2024-05-20T00:00:00.000Z) thành Thứ mấy / Ngày mấy
        const formattedWeekly = weeklyRes.data.data.map(item => {
          const d = new Date(item.date);
          const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
          return {
            name: days[d.getDay()],
            revenue: Number(item.revenue),
            fullDate: d.toLocaleDateString('vi-VN')
          };
        });
        
        // Nếu API trả về mảng rỗng (không có doanh thu tuần này), tạo dữ liệu rỗng
        setWeeklyRevenue(formattedWeekly.length > 0 ? formattedWeekly : [
          { name: 'T2', revenue: 0 }, { name: 'T3', revenue: 0 }, { name: 'T4', revenue: 0 },
          { name: 'T5', revenue: 0 }, { name: 'T6', revenue: 0 }, { name: 'T7', revenue: 0 }, { name: 'CN', revenue: 0 }
        ]);

        setRecentActivity(activityRes.data.data);
      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Dashboard:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const formatTime = (dateString) => {
    const d = new Date(dateString);
    return d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="min-h-screen bg-slate-50">
        <Header />
        
        <div className="p-6 max-w-7xl mx-auto">
          
          {/* Top Section */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            
            {/* Left Column: Metrics & Alerts */}
            <div className="space-y-6">
              {/* Tổng Doanh Thu */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden transition hover:shadow-md">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-pink-50 rounded-full opacity-50 pointer-events-none"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-pink-100 text-pink-600 rounded-lg">
                    <Banknote size={24} />
                  </div>
                </div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">TỔNG DOANH THU</h3>
                <div className="text-2xl font-bold text-gray-800">
                  {loading ? '...' : formatCurrency(overview.total_revenue)}
                </div>
                <div className="mt-2 text-xs text-gray-400">Lợi nhuận: <span className="font-semibold text-green-600">{formatCurrency(overview.total_profit)}</span></div>
              </div>

              {/* Số Lượng Hàng (Tổng đơn hàng trong mockup này) */}
              <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 relative overflow-hidden transition hover:shadow-md">
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-sky-50 rounded-full opacity-50 pointer-events-none"></div>
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-sky-100 text-sky-600 rounded-lg">
                    <Package size={24} />
                  </div>
                </div>
                <h3 className="text-gray-500 text-sm font-medium mb-1">TỔNG ĐƠN HÀNG ĐÃ BÁN</h3>
                <div className="text-2xl font-bold text-gray-800">
                  {loading ? '...' : `${overview.total_orders} Đơn`}
                </div>
              </div>

              {/* Cảnh Báo Tồn Kho */}
              <div className="bg-red-50 p-5 rounded-2xl shadow-sm border border-red-100">
                <div className="flex items-center space-x-2 text-red-600 mb-5">
                  <AlertTriangle size={20} />
                  <h3 className="font-bold text-sm tracking-wide">CẢNH BÁO TỒN KHO ({lowStock.length})</h3>
                </div>
                
                <div className="space-y-4 text-sm max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                  {loading ? (
                    <div className="text-gray-500">Đang tải...</div>
                  ) : lowStock.length === 0 ? (
                    <div className="text-green-600 font-medium">Tất cả sản phẩm đều đủ hàng.</div>
                  ) : (
                    lowStock.map(product => (
                      <div key={product.id}>
                        <div className="flex justify-between mb-1.5">
                          <span className="text-gray-700 font-medium truncate pr-2">{product.name}</span>
                          <span className="text-red-600 font-bold shrink-0">Chỉ còn {product.stock_quantity}</span>
                        </div>
                        <div className="w-full bg-red-100 rounded-full h-1.5">
                          {/* Trực quan hóa mức độ khẩn cấp: dưới 5 thì 10%, dưới 20 thì 25% */}
                          <div className="bg-red-600 h-1.5 rounded-full" style={{ width: product.stock_quantity < 5 ? '10%' : '25%' }}></div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

            </div>

            {/* Right Column: Chart Section */}
            <div className="xl:col-span-2">
              <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 h-full flex flex-col overflow-hidden min-w-0">
                
                {/* Header Chart */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-8 gap-4">
                  <div>
                    <h2 className="text-xl font-bold text-gray-800">Doanh thu 7 ngày gần nhất</h2>
                    <p className="text-sm text-gray-500 mt-1">Biểu đồ thể hiện tổng doanh thu bán ra</p>
                  </div>
                </div>
                
                {/* Recharts Area */}
                <div className="flex-1 w-full min-h-[250px] mt-2">
                  {loading ? (
                    <div className="w-full h-full flex items-center justify-center text-gray-400">Đang tải biểu đồ...</div>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={weeklyRevenue} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis 
                          dataKey="name" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fill: '#94a3b8', fontSize: 12 }}
                          tickFormatter={(value) => value === 0 ? '0' : `${(value / 1000000).toFixed(1)}M`}
                        />
                        <Tooltip 
                          cursor={{ fill: '#f8fafc' }}
                          contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                          formatter={(value) => [formatCurrency(value), 'Doanh thu']}
                          labelFormatter={(label, payload) => {
                            if(payload && payload.length > 0 && payload[0].payload.fullDate) {
                              return `${label} (${payload[0].payload.fullDate})`;
                            }
                            return label;
                          }}
                        />
                        <Bar 
                          dataKey="revenue" 
                          fill="#be123c" 
                          radius={[6, 6, 0, 0]} 
                          barSize={40}
                          animationDuration={1500}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* Bottom Section*/}
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 mt-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold text-gray-800">Hoạt động gần đây</h2>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="text-xs font-semibold tracking-wider text-gray-500 uppercase border-b border-gray-100">
                    <th className="pb-3 px-4">LOẠI HOẠT ĐỘNG</th>
                    <th className="pb-3 px-4 text-center">MÃ ĐƠN</th>
                    <th className="pb-3 px-4 text-center">TRẠNG THÁI</th>
                    <th className="pb-3 px-4">THỜI GIAN</th>
                    <th className="pb-3 px-4 text-right">GIÁ TRỊ</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  
                  {loading ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">Đang tải dữ liệu...</td>
                    </tr>
                  ) : recentActivity.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500">Chưa có hoạt động nào gần đây.</td>
                    </tr>
                  ) : (
                    recentActivity.map((activity, index) => (
                      <tr key={`${activity.type}-${activity.id}-${index}`} className="border-b border-gray-50 hover:bg-slate-50 transition-colors">
                        <td className="py-4 px-4 flex items-center space-x-3">
                          {activity.type === 'order' ? (
                            <div className="p-2.5 bg-pink-50 text-pink-500 rounded-lg">
                              <ShoppingCart size={18} />
                            </div>
                          ) : (
                            <div className="p-2.5 bg-sky-50 text-sky-500 rounded-lg">
                              <Truck size={18} />
                            </div>
                          )}
                          <span className="font-semibold text-gray-700">
                            {activity.type === 'order' ? 'Đơn Bán Hàng' : 'Đơn Nhập Kho'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-center text-gray-500 font-medium">
                          #{activity.id}
                        </td>
                        <td className="py-4 px-4 text-center">
                          {activity.type === 'order' ? (
                            <span className="inline-block px-3 py-1 bg-green-50 text-green-600 text-xs font-bold rounded-full">Bán ra</span>
                          ) : (
                            <span className="inline-block px-3 py-1 bg-sky-50 text-sky-600 text-xs font-bold rounded-full">Nhập kho</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-gray-400">
                          {formatTime(activity.created_at)} - {new Date(activity.created_at).toLocaleDateString('vi-VN')}
                        </td>
                        <td className="py-4 px-4 font-bold text-gray-800 text-right">
                          {formatCurrency(activity.amount)}
                        </td>
                      </tr>
                    ))
                  )}

                </tbody>
              </table>
            </div>

          </div>
        </div>
    </div>
  );
};

export default Dashboard;
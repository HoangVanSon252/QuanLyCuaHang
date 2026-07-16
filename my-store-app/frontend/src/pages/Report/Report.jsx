import React, { useState, useEffect } from "react";
import Header from "../../components/Navbar";
import { useNavigate } from "react-router-dom";
import axiosClient from "../../services/axiosClient";
import {
  TrendingUp,
  FileText
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const Report = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [overview, setOverview] = useState({ total_orders: 0, total_revenue: 0, total_profit: 0 });
  const [topProducts, setTopProducts] = useState([]);
  const [weeklyRevenue, setWeeklyRevenue] = useState([]);
  const [monthlyRevenue, setMonthlyRevenue] = useState([]);
  const [chartType, setChartType] = useState('TUẦN'); // 'TUẦN' hoặc 'THÁNG'

  useEffect(() => {
    const fetchReportData = async () => {
      try {
        setLoading(true);
        const [overviewRes, topProdRes, weeklyRes, monthlyRes] = await Promise.all([
          axiosClient.get('/dashboard/overview'),
          axiosClient.get('/dashboard/top-products'),
          axiosClient.get('/dashboard/weekly-revenue'),
          axiosClient.get('/dashboard/monthly-revenue')
        ]);

        setOverview(overviewRes.data.data);
        setTopProducts(topProdRes.data.data);

        // Format weekly data
        const formattedWeekly = weeklyRes.data.data.map(item => {
          const d = new Date(item.date);
          const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
          return {
            name: days[d.getDay()],
            revenue: Number(item.revenue),
            fullDate: d.toLocaleDateString('vi-VN')
          };
        });
        setWeeklyRevenue(formattedWeekly.length > 0 ? formattedWeekly : [
          { name: 'T2', revenue: 0 }, { name: 'T3', revenue: 0 }, { name: 'T4', revenue: 0 },
          { name: 'T5', revenue: 0 }, { name: 'T6', revenue: 0 }, { name: 'T7', revenue: 0 }, { name: 'CN', revenue: 0 }
        ]);

        // Format monthly data
        const formattedMonthly = monthlyRes.data.data.map(item => {
          return {
            name: `Th ${item.month}`,
            revenue: Number(item.revenue),
            fullDate: `Tháng ${item.month}`
          };
        });
        // Create full 12 months if backend doesn't return all
        const fullMonths = Array.from({ length: 12 }, (_, i) => {
          const monthData = formattedMonthly.find(m => m.name === `Th ${i + 1}`);
          return monthData || { name: `Th ${i + 1}`, revenue: 0, fullDate: `Tháng ${i + 1}` };
        });
        setMonthlyRevenue(fullMonths);

      } catch (error) {
        console.error("Lỗi khi tải dữ liệu Report:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchReportData();
  }, []);

  const handleDownloadPDF = () => {
    const reportElement = document.getElementById("report-content");
    if (!reportElement) return;

    html2canvas(reportElement, { scale: 2 }).then((canvas) => {
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      pdf.addImage(imgData, "PNG", 0, 0, pdfWidth, pdfHeight);
      pdf.save(`Bao_Cao_Doanh_Thu_${new Date().toLocaleDateString('vi-VN').replace(/\//g, '-')}.pdf`);
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(amount || 0);
  };

  const getAvatarInitials = (name) => {
    if (!name) return "SP";
    const words = name.split(" ");
    if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
    return name.substring(0, 2).toUpperCase();
  };

  const getBgColors = (index) => {
    const colors = [
      { bg: 'bg-teal-50', text: 'text-teal-700', badge: 'bg-teal-500' },
      { bg: 'bg-sky-50', text: 'text-sky-700', badge: 'bg-sky-500' },
      { bg: 'bg-orange-50', text: 'text-orange-700', badge: 'bg-orange-500' },
      { bg: 'bg-purple-50', text: 'text-purple-700', badge: 'bg-purple-500' },
      { bg: 'bg-pink-50', text: 'text-pink-700', badge: 'bg-pink-500' },
    ];
    return colors[index % colors.length];
  };

  const chartData = chartType === 'TUẦN' ? weeklyRevenue : monthlyRevenue;

  return (
    <div className="min-h-screen bg-slate-50 pb-20 md:pb-10" id="report-content">
      <Header />

      <div className="p-4 md:p-6 max-w-[1400px] mx-auto">

        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">Báo cáo doanh thu</h1>
          <p className="text-sm text-gray-500 mt-1">Dữ liệu được lấy trực tiếp từ hệ thống theo thời gian thực.</p>
        </div>

        {/* Metrics Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6">

          {/* Tổng doanh thu */}
          <div className="col-span-2 md:col-span-4 xl:col-span-2 bg-gradient-to-br from-rose-500 to-pink-500 rounded-3xl p-5 md:p-6 text-white shadow-lg shadow-pink-500/20 relative overflow-hidden">
            <div className="absolute -right-8 -top-8 w-40 h-40 bg-white opacity-10 rounded-full mix-blend-overlay"></div>
            <p className="text-rose-100 text-xs font-bold uppercase tracking-wide mb-2 opacity-90">TỔNG DOANH THU ĐÃ BÁN</p>
            <h3 className="text-3xl lg:text-4xl xl:text-5xl font-black tracking-tight mb-4 truncate block w-full whitespace-nowrap">
              {loading ? '...' : formatCurrency(overview.total_revenue)}
            </h3>
            <div className="inline-flex items-center px-3 py-1.5 rounded-full bg-white/20 backdrop-blur-sm text-[11px] md:text-xs font-bold max-w-full">
              <TrendingUp size={14} className="mr-1.5 flex-shrink-0" />
              <span className="truncate">Lợi nhuận gộp: {formatCurrency(overview.total_profit)}</span>
            </div>
          </div>

          {/* Đơn hàng */}
          <div className="col-span-1 md:col-span-2 xl:col-span-1 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-center overflow-hidden">
            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2">TỔNG SỐ ĐƠN HÀNG</p>
            <div className="flex justify-between items-end">
              <h3 className="text-2xl font-black text-gray-800">{loading ? '...' : overview.total_orders}</h3>
            </div>
          </div>

          {/* Tỉ lệ chuyển đổi / Sản phẩm bán ra */}
          <div className="col-span-1 md:col-span-2 xl:col-span-1 bg-white rounded-3xl p-5 border border-gray-100 shadow-sm flex flex-col justify-center overflow-hidden">
            <p className="text-gray-400 text-[11px] font-bold uppercase tracking-wider mb-2">SẢN PHẨM TRONG KHO</p>
            <div className="flex justify-between items-end">
              <h3 className="text-2xl font-black text-gray-800">Ổn định</h3>
              <span className="text-pink-600 text-xs font-black" onClick={() => navigate('/inventory')} style={{ cursor: 'pointer' }}>Xem kho &rarr;</span>
            </div>
          </div>

        </div>

        {/* Middle Row */}
        <div className="flex flex-col xl:flex-row gap-6 mb-6">

          {/* Chart Area */}
          <div className="flex-1 min-w-0 bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-10 gap-4">
              <h2 className="text-base md:text-lg font-bold text-gray-800 break-words line-clamp-2">Biểu đồ doanh thu</h2>
              <div className="flex bg-gray-100 p-1 rounded-xl shrink-0">
                <button
                  onClick={() => setChartType('TUẦN')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${chartType === 'TUẦN' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  TUẦN
                </button>
                <button
                  onClick={() => setChartType('THÁNG')}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-colors ${chartType === 'THÁNG' ? 'bg-white shadow-sm text-gray-800' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  THÁNG
                </button>
              </div>
            </div>

            {/* Recharts Area */}
            <div className="flex-1 w-full min-h-[250px]">
              {loading ? (
                <div className="w-full h-full flex items-center justify-center text-gray-400">Đang tải biểu đồ...</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis
                      dataKey="name"
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: '#94a3b8', fontSize: 11 }}
                      dy={10}
                    />
                    <Tooltip
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                      formatter={(value) => [formatCurrency(value), 'Doanh thu']}
                      labelFormatter={(label, payload) => {
                        if (payload && payload.length > 0 && payload[0].payload.fullDate) {
                          return `${payload[0].payload.fullDate}`;
                        }
                        return label;
                      }}
                    />
                    <Bar
                      dataKey="revenue"
                      fill="#ff6b9e"
                      radius={[6, 6, 0, 0]}
                      barSize={chartType === 'TUẦN' ? 40 : 25}
                      animationDuration={1000}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/*Products Area */}
          <div className="w-full xl:w-[400px] shrink-0 bg-white p-5 md:p-6 rounded-3xl shadow-sm border border-gray-100 flex flex-col overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-base md:text-lg font-bold text-gray-800">Top 5 sản phẩm mẹ & bé</h2>
              <button onClick={() => navigate('/inventory')} className="text-rose-600 text-xs font-bold hover:underline cursor-pointer bg-transparent border-none">
                Xem tất cả
              </button>
            </div>

            <div className="space-y-5 flex-1 overflow-y-auto">
              {loading ? (
                <div className="text-center py-10 text-gray-400">Đang tải...</div>
              ) : topProducts.length === 0 ? (
                <div className="text-center py-10 text-gray-400">Chưa có dữ liệu bán hàng.</div>
              ) : (
                topProducts.map((product, index) => {
                  const colors = getBgColors(index);
                  // Tính tỉ lệ thanh bar so với sản phẩm bán nhiều nhất
                  const maxSold = topProducts[0].total_sold || 1;
                  const percentage = Math.min(100, Math.max(10, (product.total_sold / maxSold) * 100));

                  return (
                    <div key={product.id} className="flex items-center">
                      <div className={`w-14 h-14 ${colors.bg} rounded-xl mr-4 relative flex-shrink-0 flex items-center justify-center`}>
                        <span className={`text-lg font-black ${colors.text}`}>{getAvatarInitials(product.name)}</span>
                        <span className={`absolute -top-1.5 -left-1.5 w-4 h-4 md:w-5 md:h-5 ${colors.badge} border border-white text-white text-[9px] md:text-[10px] font-bold rounded-md flex items-center justify-center`}>
                          {index + 1}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0 pr-4">
                        <h3 className="text-sm font-bold text-gray-800 truncate" title={product.name}>{product.name}</h3>
                        <p className="text-[10px] text-gray-500 mt-1">{product.barcode || 'SP'} • {product.total_sold} đã bán</p>
                        <div className="w-full bg-gray-100 h-1 mt-2.5 rounded-full overflow-hidden">
                          <div className={`${colors.badge} h-full rounded-full transition-all duration-1000`} style={{ width: `${percentage}%` }}></div>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-black text-rose-700 pb-1">
                          {/* Rút gọn doanh thu nếu quá lớn (ví dụ: 12.5tr) */}
                          {product.total_revenue > 1000000
                            ? `${(product.total_revenue / 1000000).toFixed(1)}tr`
                            : formatCurrency(product.total_revenue)}
                        </p>
                        <p className="text-[9px] font-medium text-gray-400">Doanh thu</p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Download Button */}
            <button
              onClick={handleDownloadPDF}
              className="w-full mt-8 py-3.5 bg-gray-100/80 hover:bg-gray-200 transition-colors rounded-xl flex items-center justify-center text-sm font-bold text-gray-600 cursor-pointer"
            >
              <FileText size={18} className="mr-2 text-gray-500" />
              Tải báo cáo chi tiết (.pdf)
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Report;
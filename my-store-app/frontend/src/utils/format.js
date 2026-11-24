// Định dạng dùng chung cho toàn ứng dụng (tiền Việt Nam, ngày giờ múi giờ Việt Nam)
const vnd = new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 0 });

export const formatCurrency = (value) => `${vnd.format(Number(value) || 0)} ₫`;

export const formatNumber = (value) => vnd.format(Number(value) || 0);

export const formatDateTime = (value) =>
  value
    ? new Date(value).toLocaleString('vi-VN', {
        timeZone: 'Asia/Ho_Chi_Minh',
        hour: '2-digit',
        minute: '2-digit',
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
    : '—';

// Ngày hôm nay theo giờ Việt Nam dạng YYYY-MM-DD (dùng cho bộ lọc)
export const todayISO = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });

export const PAYMENT_LABELS = { cash: 'Tiền mặt', transfer: 'Chuyển khoản', card: 'Thẻ' };

// Chống "CSV injection": ô bắt đầu bằng = + - @ có thể bị Excel chạy như công thức
export const csvCell = (value) => {
  let s = value === null || value === undefined ? '' : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
};

export const downloadCSV = (filename, headers, rows) => {
  const content = '﻿' + [headers, ...rows].map((r) => r.map(csvCell).join(',')).join('\r\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Đủ 7 ngày gần nhất (kể cả ngày không có doanh thu) theo giờ Việt Nam, dùng cho biểu đồ
export const buildLast7Days = (rows = []) => {
  const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
  const byDate = new Map(rows.map((r) => [String(r.date).slice(0, 10), Number(r.revenue) || 0]));
  return Array.from({ length: 7 }, (_, i) => {
    const key = new Date(Date.now() - (6 - i) * 86400000).toLocaleDateString('en-CA', { timeZone: 'Asia/Ho_Chi_Minh' });
    const local = new Date(`${key}T00:00:00`);
    return { name: days[local.getDay()], revenue: byDate.get(key) || 0, fullDate: local.toLocaleDateString('vi-VN') };
  });
};

// Lời chào theo giờ trong ngày
export const greeting = (date = new Date()) => {
  const h = Number(date.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Ho_Chi_Minh' }));
  if (h < 11) return 'Chào buổi sáng';
  if (h < 14) return 'Chào buổi trưa';
  if (h < 18) return 'Chào buổi chiều';
  return 'Chào buổi tối';
};

// Rút gọn số tiền cho trục biểu đồ: 950.000 → "950k", 1.250.000 → "1,3tr", 2.000.000.000 → "2 tỷ"
export const formatCompact = (value) => {
  const n = Number(value) || 0;
  const fmt = (x) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 1 }).format(x);
  if (n === 0) return '0';
  if (Math.abs(n) >= 1e9) return `${fmt(n / 1e9)} tỷ`;
  if (Math.abs(n) >= 1e6) return `${fmt(n / 1e6)}tr`;
  if (Math.abs(n) >= 1e3) return `${fmt(n / 1e3)}k`;
  return fmt(n);
};

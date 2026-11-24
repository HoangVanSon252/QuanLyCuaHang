import { ChevronLeft, ChevronRight } from 'lucide-react';

// Phân trang dùng chung cho các danh sách lấy từ server
const Pagination = ({ page, limit, total, onChange }) => {
  const totalPages = Math.max(1, Math.ceil((total || 0) / limit));
  const from = total === 0 ? 0 : (page - 1) * limit + 1;
  const to = Math.min(page * limit, total || 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 text-sm text-gray-500 border-t border-gray-100">
      <span>{total === 0 ? 'Không có dữ liệu' : `Hiển thị ${from}–${to} / ${total}`}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Trang trước"
          disabled={page <= 1}
          onClick={() => onChange(page - 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="font-semibold text-gray-700">
          Trang {page}/{totalPages}
        </span>
        <button
          type="button"
          aria-label="Trang sau"
          disabled={page >= totalPages}
          onClick={() => onChange(page + 1)}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;

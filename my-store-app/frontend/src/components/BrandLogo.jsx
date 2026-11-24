import logo from '../assets/icon/iconLogo.svg';
import { BRAND } from '../config/brand';

// Logo UniPOS: biểu tượng + chữ "Uni" (navy) "POS" (xanh). Dùng ở sidebar, trang đăng nhập, header mobile.
const SIZES = {
  sm: { icon: 'w-8 h-8', text: 'text-xl' },
  md: { icon: 'w-10 h-10', text: 'text-2xl' },
  lg: { icon: 'w-16 h-16', text: 'text-5xl' },
};

const BrandLogo = ({ size = 'md', showSlogan = false, className = '' }) => {
  const s = SIZES[size] || SIZES.md;
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      <img src={logo} alt="" aria-hidden="true" className={`${s.icon} shrink-0`} />
      <div className="flex flex-col min-w-0">
        <span className={`font-brand font-extrabold tracking-tight leading-none ${s.text}`}>
          <span className="text-brand-950">{BRAND.nameParts[0]}</span>
          <span className="text-brand-500">{BRAND.nameParts[1]}</span>
        </span>
        {showSlogan && <span className="text-xs text-gray-500 mt-1 truncate">{BRAND.slogan}</span>}
      </div>
    </div>
  );
};

export default BrandLogo;

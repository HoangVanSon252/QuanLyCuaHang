import { useEffect, useId, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { SwitchCamera } from 'lucide-react';

// Các loại mã dùng trong bán lẻ: mã vạch sản phẩm (EAN/UPC), mã nội bộ (Code 128/39) và QR.
// Giới hạn loại mã giúp nhận diện nhanh và ít nhầm hơn so với dò mọi định dạng.
const FORMATS = [
  Html5QrcodeSupportedFormats.EAN_13,
  Html5QrcodeSupportedFormats.EAN_8,
  Html5QrcodeSupportedFormats.UPC_A,
  Html5QrcodeSupportedFormats.UPC_E,
  Html5QrcodeSupportedFormats.CODE_128,
  Html5QrcodeSupportedFormats.CODE_39,
  Html5QrcodeSupportedFormats.ITF,
  Html5QrcodeSupportedFormats.QR_CODE,
];

// html5-qrcode giải mã trên canvas có kích thước bằng khung video trên màn hình (px CSS).
// Khung hẹp trên điện thoại (~400px) làm ảnh bị thu nhỏ, vạch mã quá mảnh → không đọc được.
// Vì vậy luôn đặt bề rộng bố cục cố định rồi mới thu nhỏ bằng transform để hiển thị.
const DECODE_WIDTH = 800;

const BACK_CAMERA = /back|rear|environment|sau|trás|arrière|後|후면/i;
const FRONT_CAMERA = /front|user|trước|facetime|前|전면/i;
const isMobileDevice = () =>
  navigator.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

// Chọn camera: điện thoại → camera sau; máy tính → camera đầu tiên (thường là webcam).
const pickCamera = (devices, preferredId) => {
  if (preferredId) {
    const d = devices.find((x) => x.id === preferredId);
    if (d) return { device: d, facingUser: FRONT_CAMERA.test(d.label) || (!isMobileDevice() && !BACK_CAMERA.test(d.label)) };
  }
  const back = devices.filter((d) => BACK_CAMERA.test(d.label));
  // Một số điện thoại có nhiều camera sau (góc rộng, tele...). Camera chính thường xuất hiện cuối danh sách.
  if (back.length) return { device: back[back.length - 1], facingUser: false };
  if (isMobileDevice()) return { device: null, facingUser: false }; // nhãn bị ẩn → xin facingMode environment
  return { device: devices[0], facingUser: !BACK_CAMERA.test(devices[0]?.label || '') };
};

const errorText = (err) => {
  const s = String(err?.name || err?.message || err);
  if (/NotAllowed|Permission/i.test(s)) return 'Chưa được cấp quyền camera. Hãy cho phép camera trong cài đặt trình duyệt.';
  if (/NotFound|Overconstrained|DevicesNotFound/i.test(s)) return 'Không tìm thấy camera phù hợp trên thiết bị.';
  if (/NotReadable|TrackStart/i.test(s)) return 'Camera đang được ứng dụng khác sử dụng.';
  if (!window.isSecureContext) return 'Camera chỉ hoạt động trên HTTPS (hoặc localhost).';
  return 'Không mở được camera.';
};

/**
 * Máy quét mã vạch / QR bằng camera.
 * - Điện thoại tự dùng camera sau; camera trước (webcam) được lật như gương để chuyển động cùng chiều.
 * - Quét trên toàn khung hình (không lệch vùng quét), ưu tiên BarcodeDetector có sẵn của trình duyệt.
 */
const BarcodeScanner = ({ onDetected, onError, className = '', compact = false }) => {
  const rawId = useId();
  const elementId = 'scanner-' + rawId.replace(/[^a-zA-Z0-9_-]/g, '');
  const [devices, setDevices] = useState([]);
  const [requestedId, setRequestedId] = useState(null); // camera người dùng chọn bằng nút "Đổi camera"
  const [activeId, setActiveId] = useState(null);       // camera đang chạy (chỉ để hiển thị / đổi tiếp)
  const [mirrored, setMirrored] = useState(false);
  const [status, setStatus] = useState('starting'); // starting | scanning | error
  const [message, setMessage] = useState('');
  const [scale, setScale] = useState(0.5);
  const boxRef = useRef(null);
  const stageRef = useRef(null);
  const onDetectedRef = useRef(onDetected);
  const onErrorRef = useRef(onError);
  useEffect(() => { onDetectedRef.current = onDetected; onErrorRef.current = onError; });

  // Tính tỉ lệ thu/phóng để video phủ kín khung (giống object-cover) mà không đổi kích thước bố cục
  useEffect(() => {
    const box = boxRef.current;
    const stage = stageRef.current;
    if (!box || !stage || typeof ResizeObserver === 'undefined') return;
    const fit = () => {
      const w = stage.offsetWidth || DECODE_WIDTH;
      const h = stage.offsetHeight || (w * 9) / 16;
      setScale(Math.max(box.clientWidth / w, box.clientHeight / h));
    };
    const ro = new ResizeObserver(fit);
    ro.observe(box);
    ro.observe(stage);
    fit();
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;
    let running = false;
    const el = document.getElementById(elementId);
    if (el) el.innerHTML = '';
    const scanner = new Html5Qrcode(elementId, {
      formatsToSupport: FORMATS,
      useBarCodeDetectorIfSupported: true,
      experimentalFeatures: { useBarCodeDetectorIfSupported: true },
      verbose: false,
    });

    // Bỏ qua cùng một mã trong 1,5 giây (camera đọc được nhiều lần mỗi giây)
    let lastCode = '';
    let lastAt = 0;
    const onSuccess = (text) => {
      const now = Date.now();
      if (text === lastCode && now - lastAt < 1500) return;
      lastCode = text;
      lastAt = now;
      try { navigator.vibrate?.(60); } catch { /* không hỗ trợ rung */ }
      onDetectedRef.current?.(text.trim());
    };

    const start = async () => {
      try {
        const list = await Html5Qrcode.getCameras(); // xin quyền camera + lấy danh sách
        if (cancelled) return;
        if (!list?.length) throw new Error('NotFoundError');
        setDevices(list);
        const { device, facingUser } = pickCamera(list, requestedId);
        const constraints = {
          ...(device ? { deviceId: { exact: device.id } } : { facingMode: { exact: 'environment' } }),
          width: { ideal: 1280 },
          height: { ideal: 720 },
        };
        // disableFlip: mã vạch/QR in trên bao bì không bị lật → bỏ lần quét ảnh lật, nhanh gấp đôi
        const config = { fps: 12, disableFlip: true, videoConstraints: constraints };
        try {
          await scanner.start(device ? device.id : { facingMode: 'environment' }, config, onSuccess, () => {});
        } catch (e) {
          // Thiết bị không có camera sau → thử camera bất kỳ
          if (device) throw e;
          await scanner.start({ facingMode: 'user' }, { fps: 12, disableFlip: true }, onSuccess, () => {});
        }
        running = true;
        if (cancelled) {
          await scanner.stop().catch(() => {});
          return;
        }
        // Lấy nét liên tục nếu camera hỗ trợ (giúp đọc mã vạch nhỏ trên bao bì)
        scanner.applyVideoConstraints?.({ advanced: [{ focusMode: 'continuous' }] }).catch(() => {});
        setMirrored(facingUser);
        setActiveId(device?.id || null);
        setStatus('scanning');
      } catch (err) {
        if (cancelled) return;
        const msg = errorText(err);
        setStatus('error');
        setMessage(msg);
        onErrorRef.current?.(msg);
      }
    };
    start();

    return () => {
      cancelled = true;
      if (running) {
        scanner.stop().then(() => scanner.clear()).catch(() => {});
      } else {
        try { scanner.clear(); } catch { /* đã dọn */ }
      }
    };
    // Chỉ khởi động lại khi người dùng bấm "Đổi camera"
  }, [elementId, requestedId]);

  const switchCamera = () => {
    if (devices.length < 2) return;
    const idx = devices.findIndex((d) => d.id === activeId);
    setStatus('starting');
    setRequestedId(devices[(idx + 1) % devices.length].id);
  };

  return (
    <div ref={boxRef} className={`relative bg-zinc-900 overflow-hidden ${className}`}>
      {/* Video do html5-qrcode chèn vào. Bề rộng bố cục cố định DECODE_WIDTH để ảnh giải mã đủ nét,
          sau đó chỉ thu/phóng bằng transform cho phủ kín khung; lật như gương khi dùng camera trước. */}
      <div
        ref={stageRef}
        className="absolute left-1/2 top-1/2 origin-center"
        style={{
          width: DECODE_WIDTH,
          transform: `translate(-50%, -50%) scale(${scale}) ${mirrored ? 'scaleX(-1)' : ''}`,
        }}
      >
        <div id={elementId} className="w-full [&_video]:!w-full [&_video]:!h-auto" />
      </div>

      {/* Khung ngắm (trang trí — thực tế quét cả khung hình) */}
      <div className="absolute inset-0 z-10 pointer-events-none flex items-center justify-center">
        <div className={`relative ${compact ? 'w-56 h-28' : 'w-72 h-40 sm:w-96 sm:h-48'}`}>
          <div className="absolute top-0 left-0 w-7 h-7 border-t-4 border-l-4 border-brand-400 rounded-tl-xl" />
          <div className="absolute top-0 right-0 w-7 h-7 border-t-4 border-r-4 border-brand-400 rounded-tr-xl" />
          <div className="absolute bottom-0 left-0 w-7 h-7 border-b-4 border-l-4 border-brand-400 rounded-bl-xl" />
          <div className="absolute bottom-0 right-0 w-7 h-7 border-b-4 border-r-4 border-brand-400 rounded-br-xl" />
          <div className="absolute top-1/2 left-2 right-2 h-0.5 bg-red-500/80 shadow-[0_0_10px_2px_rgba(239,68,68,0.6)] animate-pulse" />
        </div>
      </div>

      {devices.length > 1 && status === 'scanning' && (
        <button
          type="button"
          onClick={switchCamera}
          aria-label="Đổi camera"
          title="Đổi camera"
          className="absolute top-3 right-3 z-20 p-2.5 bg-black/50 text-white rounded-full backdrop-blur-md hover:bg-black/70"
        >
          <SwitchCamera size={20} />
        </button>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20 bg-zinc-800/85 text-white px-4 py-2 rounded-full text-xs font-semibold flex items-center gap-2 backdrop-blur-md whitespace-nowrap">
        {status === 'error' ? (
          <span className="text-red-300">{message}</span>
        ) : (
          <>
            <span className={`w-2.5 h-2.5 rounded-full ${status === 'scanning' ? 'bg-green-500 animate-pulse' : 'bg-yellow-400'}`} />
            {status === 'scanning' ? 'Đưa mã vạch / QR vào khung' : 'Đang mở camera...'}
          </>
        )}
      </div>
    </div>
  );
};

export default BarcodeScanner;

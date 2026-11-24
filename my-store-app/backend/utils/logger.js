// Logger JSON một dòng (dễ gom bằng docker logs / Loki / ELK). Không thêm thư viện ngoài.
const write = (level, msg, extra) => {
  const line = { time: new Date().toISOString(), level, msg, ...extra };
  const out = level === "error" || level === "warn" ? process.stderr : process.stdout;
  out.write(JSON.stringify(line) + "\n");
};

const serializeError = (err) =>
  err ? { name: err.name, message: err.message, code: err.code, stack: err.stack } : undefined;

module.exports = {
  info: (msg, extra = {}) => write("info", msg, extra),
  warn: (msg, extra = {}) => write("warn", msg, extra),
  error: (msg, err, extra = {}) => write("error", msg, { ...extra, err: serializeError(err) }),
};

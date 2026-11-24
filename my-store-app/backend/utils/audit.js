// Ghi nhật ký thao tác. Không bao giờ làm hỏng request chính nếu ghi log lỗi.
const db = require("../config/db");
const logger = require("./logger");

const audit = async (req, action, { entity = null, entityId = null, detail = null, storeId, userId, conn } = {}) => {
  try {
    const executor = conn || db;
    await executor.query(
      "INSERT INTO audit_logs (store_id, user_id, action, entity, entity_id, detail, ip) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [
        storeId !== undefined ? storeId : req.user?.store_id ?? null,
        userId !== undefined ? userId : req.user?.userId ?? null,
        action,
        entity,
        entityId === null ? null : String(entityId),
        detail ? JSON.stringify(detail) : null,
        req.ip || null,
      ]
    );
  } catch (err) {
    logger.error("audit_write_failed", err, { action });
  }
};

module.exports = audit;

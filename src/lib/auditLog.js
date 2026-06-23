export function createAuditEvent(eventType, metadata = {}, userId = "local-user") {
  return {
    id: makeId("audit"),
    userId,
    eventType,
    metadata,
    createdAt: new Date().toISOString(),
  };
}

export function appendAuditEvent(events, eventType, metadata = {}, userId = "local-user") {
  return [createAuditEvent(eventType, metadata, userId), ...events].slice(0, 200);
}

function makeId(prefix) {
  if (globalThis.crypto?.randomUUID) {
    return globalThis.crypto.randomUUID();
  }
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

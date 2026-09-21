// WebSocket-хаб: общий канал (краш, PvP, арена, live-лента) + личные сообщения (баланс)
const all = new Set<any>();
const byUser = new Map<number, Set<any>>();

export function addSocket(ws: any, userId: number) {
  all.add(ws);
  if (!byUser.has(userId)) byUser.set(userId, new Set());
  byUser.get(userId)!.add(ws);
  ws.on('close', () => {
    all.delete(ws);
    byUser.get(userId)?.delete(ws);
  });
}

export function broadcast(msg: object) {
  const s = JSON.stringify(msg);
  for (const ws of all) if (ws.readyState === 1) ws.send(s);
}

export function toUser(userId: number, msg: object) {
  const s = JSON.stringify(msg);
  for (const ws of byUser.get(userId) ?? []) if (ws.readyState === 1) ws.send(s);
}

export const online = () => [...byUser.values()].filter(s => s.size > 0).length;

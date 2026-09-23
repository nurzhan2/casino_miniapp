// TON Connect: привязка кошелька и оплата в одно нажатие.
// Библиотека грузится только при первом обращении, чтобы не тянуть её в основной бандл.
let uiPromise: Promise<any> | null = null;
async function tonUI() {
  if (!uiPromise) {
    uiPromise = import('@tonconnect/ui').then(m => new m.TonConnectUI({
      manifestUrl: location.origin + '/tonconnect-manifest.json',
    }));
  }
  return uiPromise;
}

/** BOC ячейки с текстовым комментарием (опкод 0 + текст) — без сторонних библиотек. */
export function commentPayload(text: string) {
  const body = new TextEncoder().encode(text);
  const data = new Uint8Array(4 + body.length);      // 4 нулевых байта = опкод комментария
  data.set(body, 4);
  const cell = new Uint8Array(2 + data.length);
  cell[0] = 0;                                        // d1: нет ссылок
  cell[1] = data.length * 2;                          // d2: данные выровнены по байтам
  cell.set(data, 2);
  const boc = new Uint8Array([
    0xb5, 0xee, 0x9c, 0x72,   // магия BOC
    0x01,                     // размер ссылки 1 байт
    0x01,                     // размер смещения 1 байт
    0x01, 0x01, 0x00,         // ячеек 1, корней 1, отсутствующих 0
    cell.length,              // общий размер ячеек
    0x00,                     // индекс корня
    ...cell,
  ]);
  return btoa(String.fromCharCode(...boc));
}

/** Платёж: при необходимости просит привязать кошелёк, затем отправляет перевод с комментарием. */
export async function tonPay(address: string, amountTon: string, comment: string) {
  const u = await tonUI();
  if (!u.account) {
    await u.openModal();
    await new Promise<void>(res => { const off = u.onStatusChange((w: any) => { if (w) { off(); res(); } }); });
  }
  await u.sendTransaction({
    validUntil: Math.floor(Date.now() / 1000) + 600,
    messages: [{ address, amount: String(Math.round(Number(amountTon) * 1e9)), payload: commentPayload(comment) }],
  });
}

export const tonDisconnect = async () => (await tonUI()).disconnect();

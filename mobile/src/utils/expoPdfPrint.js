import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

const escapeHtml = (value) => String(value ?? '').replace(/[&<>"']/g, (character) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
}[character]));

export const createReceiptHtml = (shop, cart, billNo, createdAt = new Date()) => {
  const total = cart.reduce((sum, item) => sum + Math.round(item.price * item.qty * 100) / 100, 0);
  const rows = cart.map((item) => `
    <div class="item"><strong>${escapeHtml(item.name)}</strong>
      <div class="line"><span>${escapeHtml(item.qty)} ${escapeHtml(item.unit)} x ${escapeHtml(item.price)}</span>
      <span>Rs.${(Math.round(item.qty * item.price * 100) / 100).toFixed(2)}</span></div>
    </div>`).join('');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1">
  <style>
    @page { margin: 4mm; }
    body { font: 12px monospace; color: #111; width: 72mm; margin: 0 auto; }
    h1,p { text-align: center; margin: 3px 0; }
    h1 { font-size: 16px; } .rule { border-top: 1px dashed #222; margin: 7px 0; }
    .line { display: flex; justify-content: space-between; gap: 6px; }
    .item { margin: 7px 0; } .total { font-weight: bold; font-size: 14px; }
  </style></head><body>
  <h1>${escapeHtml(shop?.shopName || 'My Shop')}</h1>
  ${shop?.address ? `<p>${escapeHtml(shop.address)}</p>` : ''}
  ${shop?.mobNo ? `<p>Mob: ${escapeHtml(shop.mobNo)}</p>` : ''}
  <div class="rule"></div><div>Bill No: ${escapeHtml(billNo)}</div>
  <div>${new Date(createdAt).toLocaleString('en-IN')}</div><div class="rule"></div>
  ${rows}<div class="rule"></div><div class="line total"><span>TOTAL</span><span>Rs.${total.toFixed(2)}</span></div>
  <div class="rule"></div><p>${escapeHtml(shop?.endMsg || '')}</p></body></html>`;
};

export const printReceiptPdf = async (shop, cart, billNo, createdAt = new Date()) => {
  const { uri } = await Print.printToFileAsync({ html: createReceiptHtml(shop, cart, billNo, createdAt) });
  await Print.printAsync({ uri });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: `Bill ${billNo}` });
  }
  return uri;
};

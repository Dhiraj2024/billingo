
export const buildMobileReceipt = (shop, cart, billNo, createdAt = new Date()) => {
  const WIDTH = 32;

  const center = (value) => {
    const text = String(value).slice(0, WIDTH);
    return `${' '.repeat(Math.max(0, Math.floor((WIDTH - text.length) / 2)))}${text}`;
  };

  const twoCol = (left, right) => {
    const l = String(left);
    const r = String(right);
    return `${l.slice(0, Math.max(0, WIDTH - r.length - 1))}${' '.repeat(Math.max(1, WIDTH - l.length - r.length))}${r}`;
  };

  const now = new Date(createdAt);
  const lines = [
    center(shop?.shopName || 'My Shop'),
    ...(shop?.address ? [center(shop.address)] : []),
    ...(shop?.mobNo ? [center(`Mob: ${shop.mobNo}`)] : []),
    '='.repeat(WIDTH),
    `Bill No: ${billNo}`,
    twoCol(
      now.toLocaleDateString('en-IN'),
      now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
    ),
    '-'.repeat(WIDTH),
  ];

  let total = 0;

  cart.forEach((item) => {
    const amount = Math.round(item.price * item.qty * 100) / 100;
    total += amount;
    lines.push(String(item.name).slice(0, WIDTH));
    lines.push(twoCol(`${item.qty} ${item.unit} x ${item.price}`, `Rs.${amount.toFixed(2)}`));
  });

  lines.push('='.repeat(WIDTH), twoCol('TOTAL', `Rs.${total.toFixed(2)}`), '='.repeat(WIDTH));

  if (shop?.endMsg) lines.push(center(shop.endMsg));

  return { text: `${lines.join('\n')}\n\n\n`, total };
};

export const scanBluetoothPrinters = async () => {
  throw new Error('Bluetooth printer scanning is available in the Android app, not the web preview.');
};

export const connectBluetoothPrinter = async () => {
  throw new Error('Bluetooth printer connection is available in the Android app, not the web preview.');
};

export const disconnectBluetoothPrinter = async () => {};

export const printBluetoothReceipt = async () => {
  throw new Error('Bluetooth printing is available in the Android app, not the web preview.');
};

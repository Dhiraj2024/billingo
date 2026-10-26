import { BleManager } from 'react-native-ble-plx';
import { Buffer } from 'buffer';
import { scanBluetoothPrinters } from '../utils/blePrinter';

const manager = new BleManager();
const WIDTH = 32;
let activeDevice = null;
let writeTarget = null;

const center = (value) => {
  const text = String(value).slice(0, WIDTH);
  return `${' '.repeat(Math.max(0, Math.floor((WIDTH - text.length) / 2)))}${text}`;
};

const twoCol = (left, right) => {
  const l = String(left);
  const r = String(right);
  return `${l.slice(0, Math.max(0, WIDTH - r.length - 1))}${' '.repeat(Math.max(1, WIDTH - l.length - r.length))}${r}`;
};

export const buildMobileReceipt = (shop, cart, billNo, createdAt = new Date()) => {
  const now = new Date(createdAt);
  const lines = [
    center(shop?.shopName || 'My Shop'),
    ...(shop?.address ? [center(shop.address)] : []),
    ...(shop?.mobNo ? [center(`Mob: ${shop.mobNo}`)] : []),
    '='.repeat(WIDTH),
    `Bill No: ${billNo}`,
    twoCol(now.toLocaleDateString('en-IN'), now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })),
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

export const scanBluetoothPrinters = (durationMs = 7000) => new Promise((resolve, reject) => {
  const devices = new Map();
  let finished = false;
  const complete = () => {
    if (finished) return;
    finished = true;
    manager.stopDeviceScan();
    clearTimeout(timer);
    resolve([...devices.values()]);
  };
  const timer = setTimeout(complete, durationMs);
  manager.startDeviceScan(null, { allowDuplicates: false }, (error, device) => {
    if (error) {
      if (!finished) {
        finished = true;
        clearTimeout(timer);
        reject(error);
      }
      return;
    }
    if (device && (device.name || device.localName)) devices.set(device.id, device);
  });
});

export const connectBluetoothPrinter = async (deviceId) => {
  const device = await manager.connectToDevice(deviceId, { timeout: 15000 });
  await device.discoverAllServicesAndCharacteristics();
  const services = await device.services();
  const candidates = [];
  for (const service of services) {
    const characteristics = await service.characteristics();
    for (const characteristic of characteristics) {
      if (characteristic.isWritableWithoutResponse || characteristic.isWritableWithResponse) {
        candidates.push({ serviceUUID: service.uuid, characteristicUUID: characteristic.uuid, characteristic });
      }
    }
  }
  const preferred = candidates.find(({ serviceUUID, characteristicUUID }) =>
    /ffe0|ff00|18f0|e781/i.test(serviceUUID) || /ffe1|ff01|bf11/i.test(characteristicUUID)
  );
  writeTarget = preferred || candidates[0];
  if (!writeTarget) {
    await manager.cancelDeviceConnection(device.id);
    throw new Error('This device has no writable printer service.');
  }
  activeDevice = device;
  return device;
};

export const disconnectBluetoothPrinter = async () => {
  if (activeDevice) await manager.cancelDeviceConnection(activeDevice.id);
  activeDevice = null;
  writeTarget = null;
};

export const printBluetoothReceipt = async (shop, cart, billNo) => {
  if (!activeDevice || !writeTarget) throw new Error('Connect a Bluetooth printer first.');
  const { text } = buildMobileReceipt(shop, cart, billNo);
  const bytes = [0x1b, 0x40, ...Buffer.from(text, 'utf8'), 0x1d, 0x56, 0x42, 0x00];
  for (let offset = 0; offset < bytes.length; offset += 15) {
    const chunk = Buffer.from(bytes.slice(offset, offset + 15)).toString('base64');
    if (writeTarget.characteristic.isWritableWithoutResponse) {
      await activeDevice.writeCharacteristicWithoutResponseForService(
        writeTarget.serviceUUID, writeTarget.characteristicUUID, chunk
      );
    } else {
      await activeDevice.writeCharacteristicWithResponseForService(
        writeTarget.serviceUUID, writeTarget.characteristicUUID, chunk
      );
    }
  }
};

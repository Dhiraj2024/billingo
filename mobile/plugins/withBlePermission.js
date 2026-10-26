const { withInfoPlist } = require('@expo/config-plugins');

module.exports = function withBlePermission(config) {
  return withInfoPlist(config, (modConfig) => {
    modConfig.modResults.NSBluetoothAlwaysUsageDescription =
      'Billin.go uses Bluetooth to connect to thermal receipt printers.';
    return modConfig;
  });
};

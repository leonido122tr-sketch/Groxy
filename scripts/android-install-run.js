#!/usr/bin/env node
/**
 * Устанавливает debug APK на подключённое устройство/эмулятор и запускает приложение.
 * Требуется: собранный проект (npm run build, npx cap sync android) и запущенный эмулятор или устройство.
 */
const path = require('path');
const { execSync, spawnSync } = require('child_process');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const isWin = process.platform === 'win32';
const gradlew = isWin ? path.join(androidDir, 'gradlew.bat') : path.join(androidDir, 'gradlew');

function getAdbPath() {
  const env = process.env.LOCALAPPDATA || process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT;
  const candidates = [
    env && path.join(env, 'Android', 'Sdk', 'platform-tools', 'adb' + (isWin ? '.exe' : '')),
    process.env.ANDROID_HOME && path.join(process.env.ANDROID_HOME, 'platform-tools', 'adb' + (isWin ? '.exe' : '')),
    process.env.ANDROID_SDK_ROOT && path.join(process.env.ANDROID_SDK_ROOT, 'platform-tools', 'adb' + (isWin ? '.exe' : '')),
  ].filter(Boolean);
  for (const p of candidates) {
    try {
      require('fs').accessSync(p);
      return p;
    } catch {
      // skip
    }
  }
  return 'adb';
}

const port = process.env.ANDROID_EMULATOR_PORT || process.argv[2];
const device = port ? `emulator-${port}` : undefined;
if (device) process.env.ANDROID_SERIAL = device;

console.log('Installing debug APK...');
const gradleCmd = isWin ? `"${gradlew}"` : './gradlew';
const installResult = spawnSync(gradleCmd, ['installDebug'], {
  cwd: androidDir,
  stdio: 'inherit',
  shell: true,
});
if (installResult.status !== 0) {
  process.exit(installResult.status || 1);
}

const adb = getAdbPath();
const adbArgs = (cmd) => (device ? ['-s', device, ...cmd] : cmd);

console.log('Launching app...');
const launchResult = spawnSync(adb, adbArgs(['shell', 'am', 'start', '-n', 'com.groxy.app/.MainActivity']), {
  stdio: 'inherit',
});
process.exit(launchResult.status || 0);

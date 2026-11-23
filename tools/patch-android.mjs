// Applies Care Me's native settings to the Capacitor-generated Android project.
// Run after `npx cap add android` (the GitHub workflow does this automatically).
import fs from 'node:fs';

const edit = (file, fn) => { const before = fs.readFileSync(file, 'utf8'); const after = fn(before); if (after === before) console.warn('  (no change) ' + file); fs.writeFileSync(file, after); };
const must = (s, find) => { if (!s.includes(find)) throw new Error('Expected text not found: ' + find.slice(0, 60)); return s; };

// 1. Permissions: camera for the live viewfinder, notifications for reminders.
edit('android/app/src/main/AndroidManifest.xml', s => {
  if (s.includes('android.permission.CAMERA')) return s;
  must(s, '<uses-permission android:name="android.permission.INTERNET" />');
  return s.replace('<uses-permission android:name="android.permission.INTERNET" />', `<uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.CAMERA" />
    <uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
    <uses-feature android:name="android.hardware.camera" android:required="false" />
    <uses-feature android:name="android.hardware.camera.flash" android:required="false" />`);
});

// 2. Health Connect needs Android 8.0 (API 26) or newer.
edit('android/variables.gradle', s => must(s, 'minSdkVersion = 24').replace('minSdkVersion = 24', 'minSdkVersion = 26'));

// 3. Stable signing key (so each new APK installs over the old one and keeps your data)
//    and an increasing version number from the GitHub build number.
edit('android/app/build.gradle', s => {
  if (s.includes('careme-sideload')) return s;
  must(s, 'versionCode 1'); must(s, 'buildTypes {');
  return s
    .replace('versionCode 1', 'versionCode ((System.getenv("GITHUB_RUN_NUMBER") ?: "1") as Integer)')
    .replace(/versionName "1\.0"/, 'versionName "1.0." + (System.getenv("GITHUB_RUN_NUMBER") ?: "0")')
    .replace('buildTypes {', `signingConfigs {
        debug { // careme-sideload key, see tools/debug.keystore.b64
            storeFile file('debug.keystore')
            storePassword 'android'
            keyAlias 'androiddebugkey'
            keyPassword 'android'
        }
    }
    buildTypes {`);
});

// 4. Decode the shared sideload keystore.
const b64 = fs.readFileSync('tools/debug.keystore.b64', 'utf8').replace(/\s+/g, '');
fs.writeFileSync('android/app/debug.keystore', Buffer.from(b64, 'base64'));

console.log('Android project patched for Care Me.');

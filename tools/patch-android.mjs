// Applies Care Me's native settings to the Capacitor-generated Android project.
// Run after `npx cap add android` (the GitHub workflow does this automatically).
import fs from 'node:fs';

const KOTLIN = '2.2.20'; // same version the Health Connect plugin is built with

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

// 4. Firebase: Google sign-in + Care Me AI (on-device Gemini Nano with cloud fallback).
//    google-services.json comes from the owner's Firebase project (public config, protected by App Check).
fs.copyFileSync('android-config/google-services.json', 'android/app/google-services.json');
edit('android/variables.gradle', s => s.includes('rgcfaIncludeGoogle') ? s : s.replace(/ext \{/, 'ext {\n    rgcfaIncludeGoogle = true'));
edit('android/build.gradle', s => s.includes('kotlin-gradle-plugin') ? s :
  must(s, "classpath 'com.google.gms:google-services").replace(/(classpath 'com\.google\.gms:google-services:[^']+')/, `$1\n        classpath 'org.jetbrains.kotlin:kotlin-gradle-plugin:${KOTLIN}'`));
edit('android/app/build.gradle', s => {
  if (s.includes('org.jetbrains.kotlin.android')) return s;
  must(s, "apply plugin: 'com.android.application'"); must(s, 'dependencies {');
  return s
    .replace("apply plugin: 'com.android.application'", "apply plugin: 'com.android.application'\napply plugin: 'org.jetbrains.kotlin.android'")
    .replace('buildTypes {', `kotlinOptions { jvmTarget = '21' }\n    buildTypes {`)
    .replace('dependencies {', `dependencies {
    // Care Me AI: Firebase AI Logic (cloud Gemini) + on-device Gemini Nano + App Check (Play Integrity)
    implementation platform('com.google.firebase:firebase-bom:35.0.2')
    implementation 'com.google.firebase:firebase-appcheck-playintegrity'
    implementation 'com.google.firebase:firebase-ai:18.2.0'
    implementation 'com.google.firebase:firebase-ai-ondevice:16.0.0-beta08'
    implementation 'org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2'`);
});
const pluginDir = 'android/app/src/main/java/app/careme/ai';
fs.mkdirSync(pluginDir, { recursive: true });
fs.copyFileSync('tools/android/CareAIPlugin.kt', pluginDir + '/CareAIPlugin.kt');
edit('android/app/src/main/java/in/sivashankaran/careme/MainActivity.java', s => s.includes('CareAIPlugin') ? s : `package in.sivashankaran.careme;

import android.os.Bundle;
import com.getcapacitor.BridgeActivity;
import app.careme.ai.CareAIPlugin;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        registerPlugin(CareAIPlugin.class);
        super.onCreate(savedInstanceState);
    }
}
`);

// 5. Decode the shared sideload keystore.
const b64 = fs.readFileSync('tools/debug.keystore.b64', 'utf8').replace(/\s+/g, '');
fs.writeFileSync('android/app/debug.keystore', Buffer.from(b64, 'base64'));

console.log('Android project patched for Care Me.');

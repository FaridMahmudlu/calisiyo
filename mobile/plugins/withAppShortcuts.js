const fs = require('fs');
const path = require('path');
const { AndroidConfig, withAndroidManifest, withDangerousMod, withStringsXml } = require('expo/config-plugins');

// Long-press launcher shortcuts (Android static shortcuts). Each one opens an
// Expo Router deep link, so no extra native handling is needed.
const SHORTCUTS = [
  { id: 'focus', short: 'Odak başlat', long: 'Odak oturumu başlat', url: 'planliyo://kronometre?baslat=1', glyph: 'timer' },
  { id: 'task', short: 'Görev ekle', long: 'Bugüne görev ekle', url: 'planliyo://program?yeni=1', glyph: 'plus' },
  { id: 'today', short: 'Bugün', long: 'Bugünkü planım', url: 'planliyo://', glyph: 'today' },
  { id: 'classes', short: 'Sınıflar', long: 'Çalışma sınıflarım', url: 'planliyo://arkadaslar', glyph: 'classes' },
];

// 24dp-grid glyphs drawn in white on the brand-green disc (108dp adaptive canvas, 66dp safe zone).
const GLYPHS = {
  timer: '<path android:strokeColor="#FFFFFF" android:strokeWidth="2.2" android:strokeLineCap="round" android:pathData="M12,6.6a6.8,6.8 0,1 1,0 13.6a6.8,6.8 0,1 1,0 -13.6zM10,3.2h4M12,3.2v2.4M12,13.4l2.6,-2.6"/>',
  plus: '<path android:strokeColor="#FFFFFF" android:strokeWidth="2.4" android:strokeLineCap="round" android:pathData="M12,6.5v11M6.5,12h11"/>',
  today: '<path android:strokeColor="#FFFFFF" android:strokeWidth="2.2" android:strokeLineCap="round" android:strokeLineJoin="round" android:pathData="M5,10.6 12,5l7,5.6V18.4a1.4,1.4 0,0 1,-1.4 1.4H6.4A1.4,1.4 0,0 1,5 18.4z"/><path android:strokeColor="#FFC247" android:strokeWidth="2.2" android:strokeLineCap="round" android:pathData="M10,19.8v-4.2a2,2 0,0 1,4 0v4.2"/>',
  classes: '<path android:strokeColor="#FFFFFF" android:strokeWidth="2.1" android:strokeLineCap="round" android:pathData="M9.4,6a3,3 0,1 1,0 6a3,3 0,1 1,0 -6zM4.4,18.8c0.5,-2.9 2.4,-4.7 5,-4.7s4.5,1.8 5,4.7"/><path android:strokeColor="#FFC247" android:strokeWidth="2.1" android:strokeLineCap="round" android:pathData="M16.2,7.2a2.3,2.3 0,1 1,0 4.6a2.3,2.3 0,1 1,0 -4.6zM16.8,14.2c1.8,0.4 2.9,1.9 3.2,4"/>',
};

const icon = (glyph) => `<?xml version="1.0" encoding="utf-8"?>
<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="108dp" android:height="108dp" android:viewportWidth="108" android:viewportHeight="108">
  <path android:fillColor="#00A870" android:pathData="M54,21a33,33 0,1 1,0 66a33,33 0,1 1,0 -66z"/>
  <group android:scaleX="1.75" android:scaleY="1.75" android:translateX="33" android:translateY="33">
    ${GLYPHS[glyph]}
  </group>
</vector>
`;

const shortcutsXml = (pkg) => `<?xml version="1.0" encoding="utf-8"?>
<shortcuts xmlns:android="http://schemas.android.com/apk/res/android">
${SHORTCUTS.map((s) => `  <shortcut android:shortcutId="${s.id}" android:enabled="true" android:icon="@drawable/shortcut_${s.id}"
    android:shortcutShortLabel="@string/shortcut_${s.id}_short" android:shortcutLongLabel="@string/shortcut_${s.id}_long">
    <intent android:action="android.intent.action.VIEW" android:targetPackage="${pkg}" android:targetClass="${pkg}.MainActivity" android:data="${s.url.replace(/&/g, '&amp;')}" />
  </shortcut>`).join('\n')}
</shortcuts>
`;

function withShortcutResources(config) {
  return withDangerousMod(config, ['android', (mod) => {
    const res = path.join(mod.modRequest.platformProjectRoot, 'app', 'src', 'main', 'res');
    fs.mkdirSync(path.join(res, 'xml'), { recursive: true });
    fs.mkdirSync(path.join(res, 'drawable'), { recursive: true });
    fs.writeFileSync(path.join(res, 'xml', 'shortcuts.xml'), shortcutsXml(config.android.package));
    for (const s of SHORTCUTS) fs.writeFileSync(path.join(res, 'drawable', `shortcut_${s.id}.xml`), icon(s.glyph));
    return mod;
  }]);
}

function withShortcutStrings(config) {
  return withStringsXml(config, (mod) => {
    for (const s of SHORTCUTS) {
      mod.modResults = AndroidConfig.Strings.setStringItem([
        { $: { name: `shortcut_${s.id}_short` }, _: s.short },
        { $: { name: `shortcut_${s.id}_long` }, _: s.long },
      ], mod.modResults);
    }
    return mod;
  });
}

function withShortcutMetadata(config) {
  return withAndroidManifest(config, (mod) => {
    const activity = AndroidConfig.Manifest.getMainActivityOrThrow(mod.modResults);
    activity['meta-data'] = (activity['meta-data'] || []).filter((item) => item.$['android:name'] !== 'android.app.shortcuts');
    activity['meta-data'].push({ $: { 'android:name': 'android.app.shortcuts', 'android:resource': '@xml/shortcuts' } });
    return mod;
  });
}

module.exports = (config) => withShortcutMetadata(withShortcutStrings(withShortcutResources(config)));

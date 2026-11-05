import json
import os
import pathlib
import subprocess
import sys


def command(*args):
    return subprocess.check_output(args, text=True).strip()


kind = sys.argv[1]
runtime_data = json.loads(command('xcrun', 'simctl', 'list', 'runtimes', '--json'))
runtimes = [r for r in runtime_data['runtimes'] if r.get('isAvailable') and '.iOS-' in r['identifier']]
runtime = max(runtimes, key=lambda r: tuple(int(p) for p in r['version'].split('.')))
types = json.loads(command('xcrun', 'simctl', 'list', 'devicetypes', '--json'))['devicetypes']
preferred = ['iPhone 16 Pro Max', 'iPhone 17 Pro Max'] if kind == 'iphone' else ['iPad Pro 13-inch (M4)', 'iPad Pro 13-inch (M5)']
device_type = next((t for name in preferred for t in types if t['name'] == name), None)
if not device_type:
    raise RuntimeError('Required App Store screenshot device type unavailable')
device_id = command('xcrun', 'simctl', 'create', f'Planliyo-Store-{kind}', device_type['identifier'], runtime['identifier'])
command('xcrun', 'simctl', 'boot', device_id)
subprocess.run(['xcrun', 'simctl', 'bootstatus', device_id, '-b'], check=True, timeout=360)
subprocess.run(['xcrun', 'simctl', 'status_bar', device_id, 'override', '--time', '9:41', '--dataNetwork', 'wifi', '--wifiMode', 'active', '--wifiBars', '3', '--batteryState', 'charged', '--batteryLevel', '100'], check=True)
subprocess.run(['xcrun', 'simctl', 'ui', device_id, 'appearance', 'light'], check=True)
apps = list(pathlib.Path(os.environ['RUNNER_TEMP'], 'planliyo-app').rglob('*.app'))
app = next(a for a in apps if 'Watch' not in str(a))
bundle = command('/usr/libexec/PlistBuddy', '-c', 'Print :CFBundleIdentifier', str(app / 'Info.plist'))
if bundle != 'tr.com.planliyo.app':
    raise RuntimeError('Unexpected simulator application identity')
subprocess.run(['xcrun', 'simctl', 'install', device_id, str(app)], check=True, timeout=180)
with open(os.environ['GITHUB_ENV'], 'a', encoding='utf8') as env:
    env.write(f'PLANLIYO_SIMULATOR_ID={device_id}\n')
print(json.dumps({'kind': kind, 'device': device_type['name'], 'runtime': runtime['version'], 'bundle': bundle}))

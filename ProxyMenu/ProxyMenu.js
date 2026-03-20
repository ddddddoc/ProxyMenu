ObjC.import('Cocoa');
ObjC.import('stdlib');

const app = Application.currentApplication();
app.includeStandardAdditions = true;

const config = {
  networkService: 'Wi-Fi',
  host: '161.0.25.72',
  port: '8000',
  keychainService: 'codex.proxy-menu.https.wifi',
  username: 'enoFkG',
};

let statusItem;
let menu;
let stateItem;
let toggleItem;
let delegate;
let refreshTimer;

function shellQuote(value) {
  return "'" + String(value).replace(/'/g, "'\\''") + "'";
}

function runShell(command, administratorPrivileges) {
  const options = administratorPrivileges ? { administratorPrivileges: true } : {};
  return app.doShellScript(command, options);
}

function passwordFromKeychain() {
  const command = [
    '/usr/bin/security',
    'find-generic-password',
    '-s', shellQuote(config.keychainService),
    '-a', shellQuote(config.username),
    '-w',
  ].join(' ');

  return runShell(command, false).trim();
}

function isProxyEnabled() {
  try {
    const output = runShell(
      '/usr/sbin/networksetup -getsecurewebproxy ' + shellQuote(config.networkService),
      false
    );

    return output.indexOf('Enabled: Yes') >= 0;
  } catch (error) {
    return false;
  }
}

function runProxyCommand(command) {
  try {
    runShell(command, false);
    return;
  } catch (error) {
    runShell(command, true);
  }
}

function enableProxy() {
  const password = passwordFromKeychain();
  const commands = [
    [
      '/usr/sbin/networksetup',
      '-setwebproxy',
      shellQuote(config.networkService),
      shellQuote(config.host),
      shellQuote(config.port),
      'on',
      shellQuote(config.username),
      shellQuote(password),
    ].join(' '),
    [
      '/usr/sbin/networksetup',
      '-setsecurewebproxy',
      shellQuote(config.networkService),
      shellQuote(config.host),
      shellQuote(config.port),
      'on',
      shellQuote(config.username),
      shellQuote(password),
    ].join(' '),
  ];

  commands.forEach(runProxyCommand);
}

function disableProxy() {
  const commands = [
    [
      '/usr/sbin/networksetup',
      '-setwebproxystate',
      shellQuote(config.networkService),
      'off',
    ].join(' '),
    [
      '/usr/sbin/networksetup',
      '-setsecurewebproxystate',
      shellQuote(config.networkService),
      'off',
    ].join(' '),
  ];

  commands.forEach(runProxyCommand);
}

function refreshUi() {
  const enabled = isProxyEnabled();
  statusItem.button.title = enabled ? 'P On' : 'P Off';
  stateItem.title = enabled
    ? 'Proxy enabled: ' + config.host + ':' + config.port + ' (' + config.networkService + ')'
    : 'Proxy disabled';
  toggleItem.title = enabled ? 'Disable Proxy' : 'Enable Proxy';
}

function showAlert(messageText) {
  const alert = $.NSAlert.alloc.init;
  alert.messageText = 'Proxy Toggle';
  alert.informativeText = messageText;
  alert.addButtonWithTitle('OK');
  alert.runModal;
}

ObjC.registerSubclass({
  name: 'ProxyMenuDelegate',
  protocols: ['NSApplicationDelegate', 'NSMenuDelegate'],
  methods: {
    'applicationDidFinishLaunching:': {
      types: ['void', ['id']],
      implementation: function() {
        $.NSApp.setActivationPolicy($.NSApplicationActivationPolicyAccessory);

        statusItem = $.NSStatusBar.systemStatusBar.statusItemWithLength($.NSVariableStatusItemLength);
        statusItem.button.title = 'P Off';

        menu = $.NSMenu.alloc.init;
        menu.setDelegate(this);

        stateItem = $.NSMenuItem.alloc.initWithTitleActionKeyEquivalent('Loading...', null, '');
        stateItem.setEnabled(false);

        toggleItem = $.NSMenuItem.alloc.initWithTitleActionKeyEquivalent('Enable Proxy', 'toggleProxy:', '');
        toggleItem.setTarget(this);

        menu.addItem(stateItem);
        menu.addItem(toggleItem);

        statusItem.menu = menu;

        refreshUi();

        refreshTimer = $.NSTimer.scheduledTimerWithTimeIntervalTargetSelectorUserInfoRepeats(
          5.0,
          this,
          'refreshState:',
          null,
          true
        );
      },
    },
    'menuWillOpen:': {
      types: ['void', ['id']],
      implementation: function() {
        refreshUi();
      },
    },
    'refreshState:': {
      types: ['void', ['id']],
      implementation: function() {
        refreshUi();
      },
    },
    'toggleProxy:': {
      types: ['void', ['id']],
      implementation: function() {
        try {
          if (isProxyEnabled()) {
            disableProxy();
          } else {
            enableProxy();
          }

          refreshUi();
        } catch (error) {
          showAlert('Не удалось переключить прокси. ' + error.toString());
        }
      },
    },
  },
});

delegate = $.ProxyMenuDelegate.alloc.init;
$.NSApplication.sharedApplication.setDelegate(delegate);
$.NSApplication.sharedApplication.run;

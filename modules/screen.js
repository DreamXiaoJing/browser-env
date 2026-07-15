'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * screen 模块
 */

function install(sandbox, config = {}) {
  const cfg = config.screen || {};
  const navCfg = config.navigator || {};
  const ua = navCfg.userAgent || '';
  const isiPhone = /iPhone/.test(ua);
  const isiPad = /iPad/.test(ua);
  const isAndroid = /Android/.test(ua);
  const isMobile = isiPhone || isiPad || isAndroid;

  const baseWidth = cfg.width || (isiPhone ? 390 : isiPad ? 1024 : isAndroid ? 412 : 1920);
  const baseHeight = cfg.height || (isiPhone ? 844 : isiPad ? 1366 : isAndroid ? 915 : 1080);

  const screen = {
    width: baseWidth,
    height: baseHeight,
    availWidth: cfg.availWidth || baseWidth,
    availHeight: cfg.availHeight || baseHeight,
    availLeft: cfg.availLeft || 0,
    availTop: cfg.availTop || 0,
    colorDepth: cfg.colorDepth || 24,
    pixelDepth: cfg.pixelDepth || 24,
    devicePixelRatio: cfg.devicePixelRatio || (isiPhone || isiPad ? 3 : isAndroid ? 2 : 1),
    isExtended: false,
    orientation: {
      type: cfg.orientation || (isMobile ? 'portrait-primary' : 'landscape-primary'),
      angle: cfg.angle || 0,
      onchange: null
    },
    mozOrientation: isMobile ? 'portrait-primary' : 'landscape-primary',
    onorientationchange: null
  };

  screen.toString = makeNative(function toString() {
    return `Screen { width=${screen.width}, height=${screen.height}, availWidth=${screen.availWidth}, availHeight=${screen.availHeight}, colorDepth=${screen.colorDepth}, pixelDepth=${screen.pixelDepth} }`;
  }, 'toString');

  sandbox.Screen = function Screen() {};
  makeNative(sandbox.Screen, 'Screen');
  sandbox.screen = screen;

  Object.setPrototypeOf(screen, sandbox.Screen.prototype);
}

module.exports = { install };

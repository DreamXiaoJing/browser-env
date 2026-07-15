'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * history 模块
 */

function install(sandbox, config = {}) {
  const cfg = config.history || {};

  let stack = [{ url: cfg.initialURL || sandbox.location?.href || null, title: '' }];
  let index = 0;

  const history = {
    length: stack.length,
    scrollRestoration: 'auto',
    state: null,

    back: makeNative(function back() {
      if (index > 0) {
        index--;
        const entry = stack[index];
        history.state = entry.state || null;
        history.length = stack.length;
      }
    }, 'back'),

    forward: makeNative(function forward() {
      if (index < stack.length - 1) {
        index++;
        const entry = stack[index];
        history.state = entry.state || null;
        history.length = stack.length;
      }
    }, 'forward'),

    go: makeNative(function go(delta) {
      const target = index + (delta || 0);
      if (target >= 0 && target < stack.length) {
        index = target;
        const entry = stack[index];
        history.state = entry.state || null;
        history.length = stack.length;
      }
    }, 'go'),

    pushState: makeNative(function pushState(state, title, url) {
      index++;
      stack = stack.slice(0, index);
      stack.push({ state, title: title || '', url: url || null });
      history.length = stack.length;
      history.state = state;
      // 如果传了 url，更新 location
      if (url && sandbox.location) {
        sandbox.location.href = String(url);
      }
    }, 'pushState'),

    replaceState: makeNative(function replaceState(state, title, url) {
      stack[index] = { state, title: title || '', url: url || null };
      history.state = state;
      if (url && sandbox.location) {
        sandbox.location.href = String(url);
      }
    }, 'replaceState')
  };

  sandbox.History = function History() {};
  makeNative(sandbox.History, 'History');
  sandbox.history = history;

  Object.setPrototypeOf(history, sandbox.History.prototype);
}

module.exports = { install };

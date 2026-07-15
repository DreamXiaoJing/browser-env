'use strict';

const { makeNative, defineProp, defineConstant } = require('../lib/guard');

/**
 * 事件模块
 *
 * 浏览器 DOM 事件系统的基础类。
 * 提供 Event, CustomEvent, MouseEvent, PointerEvent, TouchEvent, WheelEvent, KeyboardEvent。
 *
 * 注意：这是一个轻量模拟，不实现完整的 DOM 事件传播模型。
 * dispatchEvent 返回 true（事件未被取消），并同步调用监听器。
 */

function install(sandbox, config = {}) {
  // ── Event ──
  function Event(type, init = {}) {
    this.type = type || '';
    this.bubbles = init.bubbles || false;
    this.cancelable = init.cancelable || false;
    this.composed = init.composed || false;
    this.defaultPrevented = false;
    this.target = null;
    this.currentTarget = null;
    this.eventPhase = 0;
    this.timeStamp = Date.now();
    this._propagationStopped = false;
    this._immediatePropagationStopped = false;
  }
  makeNative(Event, 'Event');

  Event.prototype = {
    NONE: 0,
    CAPTURING_PHASE: 1,
    AT_TARGET: 2,
    BUBBLING_PHASE: 3,
    stopPropagation: makeNative(function() { this._propagationStopped = true; }, 'stopPropagation'),
    stopImmediatePropagation: makeNative(function() { this._immediatePropagationStopped = true; this._propagationStopped = true; }, 'stopImmediatePropagation'),
    preventDefault: makeNative(function() { if (this.cancelable) this.defaultPrevented = true; }, 'preventDefault'),
    composedPath: makeNative(function() { return [this.target]; }, 'composedPath')
  };

  // 常量 on prototype
  for (const k of ['NONE', 'CAPTURING_PHASE', 'AT_TARGET', 'BUBBLING_PHASE']) {
    Object.defineProperty(Event.prototype, k, { value: Event.prototype[k], writable: false, configurable: false });
  }

  // ── CustomEvent ──
  function CustomEvent(type, init = {}) {
    Event.call(this, type, init);
    this.detail = init.detail || null;
  }
  makeNative(CustomEvent, 'CustomEvent');
  Object.setPrototypeOf(CustomEvent.prototype, Event.prototype);

  // ── UIEvent ──
  function UIEvent(type, init = {}) {
    Event.call(this, type, init);
    this.view = init.view || null;
    this.detail = init.detail || 0;
  }
  makeNative(UIEvent, 'UIEvent');
  Object.setPrototypeOf(UIEvent.prototype, Event.prototype);

  // ── MouseEvent ──
  function MouseEvent(type, init = {}) {
    UIEvent.call(this, type, init);
    this.screenX = init.screenX || 0;
    this.screenY = init.screenY || 0;
    this.clientX = init.clientX || 0;
    this.clientY = init.clientY || 0;
    this.pageX = init.pageX || init.clientX || 0;
    this.pageY = init.pageY || init.clientY || 0;
    this.offsetX = init.offsetX || 0;
    this.offsetY = init.offsetY || 0;
    this.ctrlKey = init.ctrlKey || false;
    this.shiftKey = init.shiftKey || false;
    this.altKey = init.altKey || false;
    this.metaKey = init.metaKey || false;
    this.button = init.button || 0;
    this.buttons = init.buttons || 0;
    this.relatedTarget = init.relatedTarget || null;
    this.region = init.region || null;
    this.movementX = init.movementX || 0;
    this.movementY = init.movementY || 0;
  }
  makeNative(MouseEvent, 'MouseEvent');

  // MouseEvent 常量
  MouseEvent.prototype = Object.create(UIEvent.prototype, {});
  MouseEvent.prototype.constructor = MouseEvent;
  MouseEvent.prototype.getModifierState = makeNative(function(key) { return false; }, 'getModifierState');

  // ── PointerEvent ──
  function PointerEvent(type, init = {}) {
    MouseEvent.call(this, type, init);
    this.pointerId = init.pointerId || 0;
    this.width = init.width || 1;
    this.height = init.height || 1;
    this.pressure = init.pressure || (init.buttons > 0 ? 0.5 : 0);
    this.tangentialPressure = init.tangentialPressure || 0;
    this.tiltX = init.tiltX || 0;
    this.tiltY = init.tiltY || 0;
    this.twist = init.twist || 0;
    this.pointerType = init.pointerType || 'mouse';
    this.isPrimary = init.isPrimary || false;
  }
  makeNative(PointerEvent, 'PointerEvent');
  Object.setPrototypeOf(PointerEvent.prototype, MouseEvent.prototype);

  // ── WheelEvent ──
  function WheelEvent(type, init = {}) {
    MouseEvent.call(this, type, init);
    this.deltaX = init.deltaX || 0;
    this.deltaY = init.deltaY || 0;
    this.deltaZ = init.deltaZ || 0;
    this.deltaMode = init.deltaMode || 0;
  }
  makeNative(WheelEvent, 'WheelEvent');
  Object.setPrototypeOf(WheelEvent.prototype, MouseEvent.prototype);
  WheelEvent.DOM_DELTA_PIXEL = 0;
  WheelEvent.DOM_DELTA_LINE = 1;
  WheelEvent.DOM_DELTA_PAGE = 2;

  // ── KeyboardEvent ──
  function KeyboardEvent(type, init = {}) {
    UIEvent.call(this, type, init);
    this.key = init.key || '';
    this.code = init.code || '';
    this.location = init.location || 0;
    this.ctrlKey = init.ctrlKey || false;
    this.shiftKey = init.shiftKey || false;
    this.altKey = init.altKey || false;
    this.metaKey = init.metaKey || false;
    this.repeat = init.repeat || false;
    this.isComposing = init.isComposing || false;
    this.keyCode = init.keyCode || 0;
    this.which = init.which || init.keyCode || 0;
  }
  makeNative(KeyboardEvent, 'KeyboardEvent');
  Object.setPrototypeOf(KeyboardEvent.prototype, UIEvent.prototype);

  // ── TouchEvent（简化）──
  function TouchEvent(type, init = {}) {
    UIEvent.call(this, type, init);
    this.touches = init.touches || [];
    this.targetTouches = init.targetTouches || [];
    this.changedTouches = init.changedTouches || [];
    this.ctrlKey = init.ctrlKey || false;
    this.shiftKey = init.shiftKey || false;
    this.altKey = init.altKey || false;
    this.metaKey = init.metaKey || false;
  }
  makeNative(TouchEvent, 'TouchEvent');
  Object.setPrototypeOf(TouchEvent.prototype, UIEvent.prototype);

  // ── Touch（简化）──
  function Touch(init = {}) {
    this.identifier = init.identifier || 0;
    this.screenX = init.screenX || 0;
    this.screenY = init.screenY || 0;
    this.clientX = init.clientX || 0;
    this.clientY = init.clientY || 0;
    this.pageX = init.pageX || init.clientX || 0;
    this.pageY = init.pageY || init.clientY || 0;
    this.target = init.target || null;
    this.radiusX = init.radiusX || 1;
    this.radiusY = init.radiusY || 1;
    this.rotationAngle = init.rotationAngle || 0;
    this.force = init.force || 1;
  }
  makeNative(Touch, 'Touch');

  // ── FocusEvent ──
  function FocusEvent(type, init = {}) {
    UIEvent.call(this, type, init);
    this.relatedTarget = init.relatedTarget || null;
  }
  makeNative(FocusEvent, 'FocusEvent');
  Object.setPrototypeOf(FocusEvent.prototype, UIEvent.prototype);

  // ── 安装 ──
  sandbox.Event = Event;
  sandbox.CustomEvent = CustomEvent;
  sandbox.UIEvent = UIEvent;
  sandbox.MouseEvent = MouseEvent;
  sandbox.PointerEvent = PointerEvent;
  sandbox.WheelEvent = WheelEvent;
  sandbox.KeyboardEvent = KeyboardEvent;
  sandbox.TouchEvent = TouchEvent;
  sandbox.Touch = Touch;
  sandbox.FocusEvent = FocusEvent;
}

module.exports = { install };

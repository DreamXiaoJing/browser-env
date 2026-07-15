'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * Audio / AudioContext 模块
 *
 * 模拟浏览器音频 API（AudioContext, OfflineAudioContext）。
 * 所有方法返回固定值，不执行实际音频处理。
 *
 * 包含:
 * - AudioContext
 * - OfflineAudioContext (指纹检测重要目标)
 * - AudioBuffer
 * - AudioNode / GainNode / OscillatorNode / AnalyserNode
 * - AudioDestinationNode
 * - AudioListener
 * - AudioParam
 * - BaseAudioContext
 */

function install(sandbox, config = {}) {
  const cfg = config.audio || {};

  // ── BaseAudioContext ──
  function BaseAudioContext() {}
  makeNative(BaseAudioContext, 'BaseAudioContext');

  // ── AudioContext ──
  function AudioContext() {
    this.state = 'running';
    this.baseLatency = 0.01;
    this.outputLatency = 0.02;
    this.sampleRate = cfg.sampleRate || 48000;
    this.currentTime = cfg.currentTime || 0;
    this.listener = {
      positionX: { value: 0 },
      positionY: { value: 0 },
      positionZ: { value: 0 },
      forwardX: { value: 0 },
      forwardY: { value: 0 },
      forwardZ: { value: -1 },
      upX: { value: 0 },
      upY: { value: 0 },
      upZ: { value: 0 },
      dopplerFactor: cfg.dopplerFactor || 1,
      speedOfSound: cfg.speedOfSound || 343,
      setPosition: makeNative(function(x, y, z) {}, 'setPosition'),
      setOrientation: makeNative(function(x, y, z, ux, uy, uz) {}, 'setOrientation'),
      setVelocity: makeNative(function(x, y, z) {}, 'setVelocity')
    };
    this.destination = { maxChannelCount: 2, channelCount: 2 };
    this.audioWorklet = { addModule: makeNative(function() { return Promise.resolve(); }, 'addModule') };
    this.onstatechange = null;
  }
  makeNative(AudioContext, 'AudioContext');
  Object.setPrototypeOf(AudioContext.prototype, BaseAudioContext.prototype);

  AudioContext.prototype = {
    get state() { return this._state; },
    set state(v) { this._state = v; },

    suspend: makeNative(function suspend() {
      this.state = 'suspended';
      return Promise.resolve();
    }, 'suspend'),

    resume: makeNative(function resume() {
      this.state = 'running';
      return Promise.resolve();
    }, 'resume'),

    close: makeNative(function close() {
      this.state = 'closed';
      return Promise.resolve();
    }, 'close'),

    createBuffer: makeNative(function createBuffer(channels, length, sampleRate) {
      return _createAudioBuffer(channels || 1, length || 2048, sampleRate || 48000);
    }, 'createBuffer'),

    decodeAudioData: makeNative(function decodeAudioData(data, success, error) {
      const buf = _createAudioBuffer(2, 44100, 44100);
      if (success) setTimeout(() => success(buf), 0);
      return Promise.resolve(buf);
    }, 'decodeAudioData'),

    createAnalyser: makeNative(function createAnalyser() {
      return _createAnalyserNode();
    }, 'createAnalyser'),

    createGain: makeNative(function createGain() {
      return _createAudioNode('gain');
    }, 'createGain'),

    createOscillator: makeNative(function createOscillator() {
      return _createOscillatorNode();
    }, 'createOscillator'),

    createDelay: makeNative(function createDelay(maxDelay) {
      return _createAudioNode('delay');
    }, 'createDelay'),

    createBiquadFilter: makeNative(function createBiquadFilter() {
      return _createAudioNode('biquad');
    }, 'createBiquadFilter'),

    createBufferSource: makeNative(function createBufferSource() {
      return _createBufferSource();
    }, 'createBufferSource'),

    createDynamicsCompressor: makeNative(function createDynamicsCompressor() {
      return _createAudioNode('compressor');
    }, 'createDynamicsCompressor'),

    createWaveShaper: makeNative(function createWaveShaper() {
      return _createAudioNode('waveshaper');
    }, 'createWaveShaper'),

    createConvolver: makeNative(function createConvolver() {
      return _createAudioNode('convolver');
    }, 'createConvolver'),

    createChannelSplitter: makeNative(function createChannelSplitter(count) {
      return _createAudioNode('splitter');
    }, 'createChannelSplitter'),

    createChannelMerger: makeNative(function createChannelMerger(count) {
      return _createAudioNode('merger');
    }, 'createChannelMerger'),

    createStereoPanner: makeNative(function createStereoPanner() {
      return _createAudioNode('stereo');
    }, 'createStereoPanner'),

    createConstantSource: makeNative(function createConstantSource() {
      return _createAudioNode('constant');
    }, 'createConstantSource'),

    createIIRFilter: makeNative(function createIIRFilter() {
      return _createAudioNode('iir');
    }, 'createIIRFilter'),

    getOutputTimestamp: makeNative(function getOutputTimestamp() {
      return { contextTime: this.currentTime, performanceTime: performance ? performance.now() : Date.now() };
    }, 'getOutputTimestamp')
  };
  // restored defineProperty for state
  Object.defineProperty(AudioContext.prototype, 'state', {
    get: makeNative(function() { return this._state || 'running'; }, 'get state'),
    set: makeNative(function(v) { this._state = v; }, 'set state'),
    configurable: true, enumerable: true
  });

  // ── OfflineAudioContext（音频指纹检测的关键目标）──
  function OfflineAudioContext(channels, length, sampleRate) {
    this.state = 'suspended';
    this.sampleRate = cfg.sampleRate || 48000;
    this.baseLatency = 0;
    this.currentTime = 0;
    // 如果传的是对象参数形式
    if (typeof channels === 'object') {
      ({ numberOfChannels: channels, length, sampleRate } = channels);
    }
    this.destination = { maxChannelCount: 2, channelCount: 2 };
    this.oncomplete = null;
    this._resultBuffer = null;
  }
  makeNative(OfflineAudioContext, 'OfflineAudioContext');
  Object.setPrototypeOf(OfflineAudioContext.prototype, BaseAudioContext.prototype);

  OfflineAudioContext.prototype = {
    startRendering: makeNative(function startRendering() {
      // 模拟音频指纹：返回固定数据
      const buf = _createAudioBuffer(
        cfg.audioFingerprintChannels || 1,
        cfg.audioFingerprintLength || 4410,
        cfg.sampleRate || 48000
      );
      // 填充固定指纹数据（绕过 AudioContext 检测）
      if (cfg.fingerprintData) {
        for (let c = 0; c < buf.numberOfChannels; c++) {
          const channel = buf.getChannelData(c);
          for (let i = 0; i < channel.length; i++) {
            channel[i] = cfg.fingerprintData[c] ? cfg.fingerprintData[c][i] || 0 : 0;
          }
        }
      }

      const event = {
        type: 'complete',
        renderedBuffer: buf
      };
      this._resultBuffer = buf;

      // 异步回调
      const self = this;
      return new Promise(function(resolve) {
        global.setTimeout(function() {
          if (self.oncomplete) self.oncomplete(event);
          resolve(event);
        }, 0);
      });
    }, 'startRendering'),

    resume: makeNative(function resume() {
      this.state = 'running';
      return Promise.resolve();
    }, 'resume'),

    // 代理到 AudioContext 的 create* 方法
    createBuffer: AudioContext.prototype.createBuffer,
    createOscillator: AudioContext.prototype.createOscillator,
    createGain: AudioContext.prototype.createGain,
    createAnalyser: AudioContext.prototype.createAnalyser,
    createBufferSource: AudioContext.prototype.createBufferSource,
    createBiquadFilter: AudioContext.prototype.createBiquadFilter,
    createDynamicsCompressor: AudioContext.prototype.createDynamicsCompressor,
    createDelay: AudioContext.prototype.createDelay
  };

  // ── 辅助创建对象 ──
  function _createAudioBuffer(channels, length, sampleRate) {
    const buffer = {
      numberOfChannels: channels,
      length: length,
      sampleRate: sampleRate,
      duration: length / sampleRate,

      getChannelData: makeNative(function getChannelData(channel) {
        if (!buffer._channels) {
          buffer._channels = {};
        }
        if (!buffer._channels[channel]) {
          buffer._channels[channel] = new Float32Array(length);
        }
        return buffer._channels[channel];
      }, 'getChannelData'),

      copyFromChannel: makeNative(function copyFromChannel(dest, channel, offset) {
        const src = this.getChannelData(channel);
        for (let i = 0; i < dest.length; i++) {
          dest[i] = src[i + (offset || 0)] || 0;
        }
      }, 'copyFromChannel'),

      copyToChannel: makeNative(function copyToChannel(src, channel, offset) {
        const dest = this.getChannelData(channel);
        for (let i = 0; i < src.length; i++) {
          dest[i + (offset || 0)] = src[i];
        }
      }, 'copyToChannel')
    };
    Object.setPrototypeOf(buffer, AudioBuffer.prototype);
    return buffer;
  }

  function AudioBuffer() {}
  makeNative(AudioBuffer, 'AudioBuffer');

  function _createAudioNode(type) {
    return {
      type: type,
      channelCount: 2,
      channelCountMode: 'max',
      channelInterpretation: 'speakers',
      numberOfInputs: 1,
      numberOfOutputs: 1,
      gain: { value: 1, setValueAtTime: function() {}, linearRampToValueAtTime: function() {} },
      frequency: { value: 440, setValueAtTime: function() {}, linearRampToValueAtTime: function() {} },
      detune: { value: 0 },
      Q: { value: 1 },
      type: 'sine',
      connect: makeNative(function(node) { return node; }, 'connect'),
      disconnect: makeNative(function() {}, 'disconnect'),
      start: makeNative(function(when) {}, 'start'),
      stop: makeNative(function(when) {}, 'stop')
    };
  }

  function _createOscillatorNode() {
    const node = _createAudioNode('oscillator');
    node.setPeriodicWave = makeNative(function() {}, 'setPeriodicWave');
    return node;
  }

  function _createBufferSource() {
    return {
      buffer: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      playbackRate: { value: 1 },
      detune: { value: 0 },
      connect: makeNative(function(node) { return node; }, 'connect'),
      disconnect: makeNative(function() {}, 'disconnect'),
      start: makeNative(function(when, offset, duration) {}, 'start'),
      stop: makeNative(function(when) {}, 'stop'),
      onended: null
    };
  }

  function _createAnalyserNode() {
    const fftSize = 2048;
    return {
      fftSize: fftSize,
      frequencyBinCount: fftSize / 2,
      minDecibels: -100,
      maxDecibels: -30,
      smoothingTimeConstant: 0.8,
      getByteFrequencyData: makeNative(function(arr) {
        for (let i = 0; i < arr.length; i++) arr[i] = 128 + (i % 64);
      }, 'getByteFrequencyData'),
      getByteTimeDomainData: makeNative(function(arr) {
        for (let i = 0; i < arr.length; i++) arr[i] = 128;
      }, 'getByteTimeDomainData'),
      getFloatFrequencyData: makeNative(function(arr) {
        for (let i = 0; i < arr.length; i++) arr[i] = -30 + (i % 10);
      }, 'getFloatFrequencyData'),
      getFloatTimeDomainData: makeNative(function(arr) {
        for (let i = 0; i < arr.length; i++) arr[i] = 0;
      }, 'getFloatTimeDomainData'),
      connect: makeNative(function(node) { return node; }, 'connect'),
      disconnect: makeNative(function() {}, 'disconnect')
    };
  }

  // ── 安装 ──
  sandbox.BaseAudioContext = BaseAudioContext;
  sandbox.AudioContext = AudioContext;
  sandbox.OfflineAudioContext = OfflineAudioContext;
  sandbox.AudioBuffer = AudioBuffer;
  sandbox.AudioNode = function AudioNode() { return _createAudioNode('generic'); };
  makeNative(sandbox.AudioNode, 'AudioNode');
  sandbox.AudioDestinationNode = function AudioDestinationNode() { return { maxChannelCount: 2 }; };
  makeNative(sandbox.AudioDestinationNode, 'AudioDestinationNode');
  sandbox.AudioListener = function AudioListener() { return { dopplerFactor: 1, speedOfSound: 343 }; };
  makeNative(sandbox.AudioListener, 'AudioListener');
  sandbox.AudioParam = function AudioParam() { return { value: 1 }; };
  makeNative(sandbox.AudioParam, 'AudioParam');
  sandbox.PeriodicWave = function PeriodicWave() {};
  makeNative(sandbox.PeriodicWave, 'PeriodicWave');

  // HTMLAudioElement
  if (!sandbox.HTMLAudioElement) {
    sandbox.HTMLAudioElement = function HTMLAudioElement() {};
    makeNative(sandbox.HTMLAudioElement, 'HTMLAudioElement');
    Object.setPrototypeOf(sandbox.HTMLAudioElement.prototype, sandbox.HTMLElement ? sandbox.HTMLElement.prototype : Object.prototype);
  }
  
  sandbox.HTMLAudioElement.prototype.src = '';
  sandbox.HTMLAudioElement.prototype.currentTime = 0;
  sandbox.HTMLAudioElement.prototype.duration = NaN;
  sandbox.HTMLAudioElement.prototype.paused = true;
  sandbox.HTMLAudioElement.prototype.volume = 1;
  sandbox.HTMLAudioElement.prototype.muted = false;
  sandbox.HTMLAudioElement.prototype.playbackRate = 1;
  sandbox.HTMLAudioElement.prototype.loop = false;
  sandbox.HTMLAudioElement.prototype.play = makeNative(function() {
    this.paused = false;
    return Promise.resolve();
  }, 'play');
  sandbox.HTMLAudioElement.prototype.pause = makeNative(function() { this.paused = true; }, 'pause');
  sandbox.HTMLAudioElement.prototype.load = makeNative(function() {}, 'load');
  sandbox.HTMLAudioElement.prototype.canPlayType = makeNative(function(type) { return 'probably'; }, 'canPlayType');
  
  sandbox.Audio = function Audio(src) {
    const el = {};
    el.src = src || '';
    el.currentTime = 0;
    el.duration = NaN;
    el.paused = true;
    el.volume = 1;
    el.muted = false;
    el.playbackRate = 1;
    el.loop = false;
    Object.setPrototypeOf(el, sandbox.HTMLAudioElement.prototype);
    return el;
  };
  makeNative(sandbox.Audio, 'Audio');
}

module.exports = { install };

'use strict';

const { makeNative } = require('../lib/guard');

/**
 * 全局构造函数模块
 *
 * 提供浏览器环境中所有全局可用的构造函数和API，包括：
 * - Audio API (AudioContext, AudioBuffer, etc.)
 * - WebGL API (WebGLRenderingContext, etc.)
 * - File API (File, FileReader, Blob)
 * - Streams API (ReadableStream, WritableStream)
 * - TextEncoder/TextDecoder
 * - URL/URLSearchParams
 * - FormData
 * - AbortController/AbortSignal
 * - WebSocket
 * - BroadcastChannel
 * - MessageChannel
 * - DOMParser/XMLSerializer
 * - XPathEvaluator
 * - etc.
 */

function install(sandbox, config = {}) {
  const cfg = config.globals || {};

  // ── Audio API ──
  function AudioContext() {
    this.sampleRate = 44100;
    this.currentTime = 0;
    this.state = 'running';
    this.destination = {
      connect: function() {}, disconnect: function() {},
      numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2,
      channelCountMode: 'explicit', channelInterpretation: 'speakers'
    };
  }
  makeNative(AudioContext, 'AudioContext');
  AudioContext.prototype = {
    resume: makeNative(function() { this.state = 'running'; return Promise.resolve(); }, 'resume'),
    suspend: makeNative(function() { this.state = 'suspended'; return Promise.resolve(); }, 'suspend'),
    close: makeNative(function() { this.state = 'closed'; return Promise.resolve(); }, 'close'),
    createBuffer: makeNative(function(numberOfChannels, length, sampleRate) {
      return new AudioBuffer(numberOfChannels, length, sampleRate);
    }, 'createBuffer'),
    createBufferSource: makeNative(function() {
      return {
        buffer: null, connect: function() {}, disconnect: function() {},
        start: function() {}, stop: function() {},
        numberOfInputs: 0, numberOfOutputs: 1, channelCount: 2,
        channelCountMode: 'max', channelInterpretation: 'speakers',
        playbackRate: { value: 1 }, detune: { value: 0 }, loop: false,
        loopStart: 0, loopEnd: 0, onended: null
      };
    }, 'createBufferSource'),
    createGain: makeNative(function() {
      return {
        connect: function() {}, disconnect: function() {},
        gain: { value: 1 }, numberOfInputs: 1, numberOfOutputs: 1,
        channelCount: 2, channelCountMode: 'max', channelInterpretation: 'speakers'
      };
    }, 'createGain'),
    createAnalyser: makeNative(function() {
      return {
        connect: function() {}, disconnect: function() {},
        fftSize: 2048, frequencyBinCount: 1024,
        minDecibels: -100, maxDecibels: -30, smoothingTimeConstant: 0.8,
        getFloatFrequencyData: makeNative(function(arr) {}, 'getFloatFrequencyData'),
        getByteFrequencyData: makeNative(function(arr) {}, 'getByteFrequencyData'),
        getFloatTimeDomainData: makeNative(function(arr) {}, 'getFloatTimeDomainData'),
        getByteTimeDomainData: makeNative(function(arr) {}, 'getByteTimeDomainData'),
        numberOfInputs: 1, numberOfOutputs: 0, channelCount: 2,
        channelCountMode: 'max', channelInterpretation: 'speakers'
      };
    }, 'createAnalyser'),
    createOscillator: makeNative(function() {
      return {
        connect: function() {}, disconnect: function() {},
        type: 'sine', frequency: { value: 440 }, detune: { value: 0 },
        start: function() {}, stop: function() {},
        numberOfInputs: 0, numberOfOutputs: 1, channelCount: 2,
        channelCountMode: 'max', channelInterpretation: 'speakers',
        onended: null
      };
    }, 'createOscillator'),
    createBiquadFilter: makeNative(function() {
      return {
        connect: function() {}, disconnect: function() {},
        type: 'lowpass', frequency: { value: 350 }, detune: { value: 0 },
        Q: { value: 1 }, gain: { value: 0 },
        numberOfInputs: 1, numberOfOutputs: 1, channelCount: 2,
        channelCountMode: 'max', channelInterpretation: 'speakers'
      };
    }, 'createBiquadFilter'),
    createScriptProcessor: makeNative(function(bufferSize, numberOfInputChannels, numberOfOutputChannels) {
      return {
        connect: function() {}, disconnect: function() {},
        bufferSize: bufferSize || 4096,
        numberOfInputs: numberOfInputChannels || 2, numberOfOutputs: numberOfOutputChannels || 2,
        channelCount: 2, channelCountMode: 'explicit', channelInterpretation: 'speakers',
        onaudioprocess: null
      };
    }, 'createScriptProcessor'),
    createMediaElementSource: makeNative(function() {
      return {
        connect: function() {}, disconnect: function() {},
        numberOfInputs: 0, numberOfOutputs: 1, channelCount: 2,
        channelCountMode: 'max', channelInterpretation: 'speakers'
      };
    }, 'createMediaElementSource'),
    decodeAudioData: makeNative(function(audioData, success, error) {
      success(new AudioBuffer(2, audioData.length, this.sampleRate));
    }, 'decodeAudioData'),
    createChannelMerger: makeNative(function() { return { connect: function() {}, disconnect: function() {}, numberOfInputs: 2, numberOfOutputs: 1 }; }, 'createChannelMerger'),
    createChannelSplitter: makeNative(function() { return { connect: function() {}, disconnect: function() {}, numberOfInputs: 1, numberOfOutputs: 2 }; }, 'createChannelSplitter'),
    createConvolver: makeNative(function() { return { connect: function() {}, disconnect: function() {}, buffer: null, normalize: true, numberOfInputs: 1, numberOfOutputs: 1 }; }, 'createConvolver'),
    createDelay: makeNative(function() { return { connect: function() {}, disconnect: function() {}, delayTime: { value: 0 }, maxDelayTime: 1, numberOfInputs: 1, numberOfOutputs: 1 }; }, 'createDelay'),
    createDynamicsCompressor: makeNative(function() { return { connect: function() {}, disconnect: function() {}, threshold: { value: -24 }, knee: { value: 30 }, ratio: { value: 12 }, attack: { value: 0.003 }, release: { value: 0.25 }, reduction: 0, numberOfInputs: 1, numberOfOutputs: 1 }; }, 'createDynamicsCompressor'),
    createWaveShaper: makeNative(function() { return { connect: function() {}, disconnect: function() {}, curve: null, oversample: 'none', numberOfInputs: 1, numberOfOutputs: 1 }; }, 'createWaveShaper'),
    createPeriodicWave: makeNative(function() { return {}; }, 'createPeriodicWave'),
    createPanner: makeNative(function() { return { connect: function() {}, disconnect: function() {}, positionX: { value: 0 }, positionY: { value: 0 }, positionZ: { value: 0 }, orientationX: { value: 0 }, orientationY: { value: 0 }, orientationZ: { value: -1 }, velocityX: { value: 0 }, velocityY: { value: 0 }, velocityZ: { value: 0 }, coneInnerAngle: 360, coneOuterAngle: 360, coneOuterGain: 0, distanceModel: 'inverse', maxDistance: 10000, refDistance: 1, rolloffFactor: 1, numberOfInputs: 1, numberOfOutputs: 1 }; }, 'createPanner'),
    createStereoPanner: makeNative(function() { return { connect: function() {}, disconnect: function() {}, pan: { value: 0 }, numberOfInputs: 1, numberOfOutputs: 1 }; }, 'createStereoPanner'),
    createConstantSource: makeNative(function() { return { connect: function() {}, disconnect: function() {}, offset: { value: 1 }, start: function() {}, stop: function() {}, numberOfInputs: 0, numberOfOutputs: 1 }; }, 'createConstantSource'),
    createMediaStreamDestination: makeNative(function() { return { connect: function() {}, disconnect: function() {}, stream: {}, numberOfInputs: 1, numberOfOutputs: 0 }; }, 'createMediaStreamDestination'),
    createMediaStreamSource: makeNative(function() { return { connect: function() {}, disconnect: function() {}, numberOfInputs: 0, numberOfOutputs: 1 }; }, 'createMediaStreamSource'),
    createOffscreenAudioContext: makeNative(function() { return new AudioContext(); }, 'createOffscreenAudioContext')
  };

  function OfflineAudioContext(numberOfChannels, length, sampleRate) {
    AudioContext.call(this);
    this.length = length || 0;
  }
  makeNative(OfflineAudioContext, 'OfflineAudioContext');
  Object.setPrototypeOf(OfflineAudioContext.prototype, AudioContext.prototype);
  OfflineAudioContext.prototype.startRendering = makeNative(function() { return Promise.resolve(new AudioBuffer(2, this.length, this.sampleRate)); }, 'startRendering');

  function AudioBuffer(numberOfChannels, length, sampleRate) {
    this.numberOfChannels = numberOfChannels || 2;
    this.length = length || 0;
    this.sampleRate = sampleRate || 44100;
    this.duration = this.length / this.sampleRate;
  }
  makeNative(AudioBuffer, 'AudioBuffer');
  AudioBuffer.prototype = {
    getChannelData: makeNative(function(channel) { return new Float32Array(this.length); }, 'getChannelData'),
    copyFromChannel: makeNative(function(dest, channelNumber, startInChannel) {}, 'copyFromChannel'),
    copyToChannel: makeNative(function(source, channelNumber, startInChannel) {}, 'copyToChannel')
  };

  function AudioBufferSourceNode() {}
  makeNative(AudioBufferSourceNode, 'AudioBufferSourceNode');

  function AudioNode() {}
  makeNative(AudioNode, 'AudioNode');

  function AudioParam() {}
  makeNative(AudioParam, 'AudioParam');

  function GainNode() {}
  makeNative(GainNode, 'GainNode');

  function AnalyserNode() {}
  makeNative(AnalyserNode, 'AnalyserNode');

  function OscillatorNode() {}
  makeNative(OscillatorNode, 'OscillatorNode');

  function BiquadFilterNode() {}
  makeNative(BiquadFilterNode, 'BiquadFilterNode');

  function AudioDestinationNode() {}
  makeNative(AudioDestinationNode, 'AudioDestinationNode');

  function ScriptProcessorNode() {}
  makeNative(ScriptProcessorNode, 'ScriptProcessorNode');

  function MediaElementAudioSourceNode() {}
  makeNative(MediaElementAudioSourceNode, 'MediaElementAudioSourceNode');

  // ── WebGL API ──
  function WebGLRenderingContext() {}
  makeNative(WebGLRenderingContext, 'WebGLRenderingContext');
  WebGLRenderingContext.prototype = {
    getExtension: makeNative(function(name) { return null; }, 'getExtension'),
    getParameter: makeNative(function(name) { return null; }, 'getParameter'),
    getSupportedExtensions: makeNative(function() { return []; }, 'getSupportedExtensions'),
    clearColor: makeNative(function() {}, 'clearColor'),
    clear: makeNative(function() {}, 'clear'),
    enable: makeNative(function() {}, 'enable'),
    disable: makeNative(function() {}, 'disable'),
    depthFunc: makeNative(function() {}, 'depthFunc'),
    blendFunc: makeNative(function() {}, 'blendFunc'),
    createBuffer: makeNative(function() { return {}; }, 'createBuffer'),
    bindBuffer: makeNative(function() {}, 'bindBuffer'),
    bufferData: makeNative(function() {}, 'bufferData'),
    createProgram: makeNative(function() { return {}; }, 'createProgram'),
    createShader: makeNative(function() { return {}; }, 'createShader'),
    shaderSource: makeNative(function() {}, 'shaderSource'),
    compileShader: makeNative(function() {}, 'compileShader'),
    attachShader: makeNative(function() {}, 'attachShader'),
    linkProgram: makeNative(function() {}, 'linkProgram'),
    useProgram: makeNative(function() {}, 'useProgram'),
    getAttribLocation: makeNative(function() { return 0; }, 'getAttribLocation'),
    enableVertexAttribArray: makeNative(function() {}, 'enableVertexAttribArray'),
    vertexAttribPointer: makeNative(function() {}, 'vertexAttribPointer'),
    drawArrays: makeNative(function() {}, 'drawArrays'),
    drawElements: makeNative(function() {}, 'drawElements'),
    createTexture: makeNative(function() { return {}; }, 'createTexture'),
    bindTexture: makeNative(function() {}, 'bindTexture'),
    texParameteri: makeNative(function() {}, 'texParameteri'),
    texImage2D: makeNative(function() {}, 'texImage2D'),
    activeTexture: makeNative(function() {}, 'activeTexture'),
    uniform1i: makeNative(function() {}, 'uniform1i'),
    uniformMatrix4fv: makeNative(function() {}, 'uniformMatrix4fv'),
    createVertexArray: makeNative(function() { return {}; }, 'createVertexArray'),
    bindVertexArray: makeNative(function() {}, 'bindVertexArray'),
    deleteBuffer: makeNative(function() {}, 'deleteBuffer'),
    deleteProgram: makeNative(function() {}, 'deleteProgram'),
    deleteShader: makeNative(function() {}, 'deleteShader'),
    deleteTexture: makeNative(function() {}, 'deleteTexture'),
    deleteVertexArray: makeNative(function() {}, 'deleteVertexArray'),
    isBuffer: makeNative(function() { return false; }, 'isBuffer'),
    isProgram: makeNative(function() { return false; }, 'isProgram'),
    isShader: makeNative(function() { return false; }, 'isShader'),
    isTexture: makeNative(function() { return false; }, 'isTexture'),
    isVertexArray: makeNative(function() { return false; }, 'isVertexArray'),
    getShaderParameter: makeNative(function() { return 0; }, 'getShaderParameter'),
    getShaderInfoLog: makeNative(function() { return ''; }, 'getShaderInfoLog'),
    getProgramParameter: makeNative(function() { return 0; }, 'getProgramParameter'),
    getProgramInfoLog: makeNative(function() { return ''; }, 'getProgramInfoLog'),
    viewport: makeNative(function() {}, 'viewport'),
    scissor: makeNative(function() {}, 'scissor'),
    frontFace: makeNative(function() {}, 'frontFace'),
    cullFace: makeNative(function() {}, 'cullFace'),
    polygonOffset: makeNative(function() {}, 'polygonOffset'),
    sampleCoverage: makeNative(function() {}, 'sampleCoverage'),
    lineWidth: makeNative(function() {}, 'lineWidth'),
    pointSize: makeNative(function() {}, 'pointSize'),
    hint: makeNative(function() {}, 'hint'),
    getError: makeNative(function() { return 0; }, 'getError'),
    getUniformLocation: makeNative(function() { return null; }, 'getUniformLocation'),
    uniform1f: makeNative(function() {}, 'uniform1f'),
    uniform2f: makeNative(function() {}, 'uniform2f'),
    uniform3f: makeNative(function() {}, 'uniform3f'),
    uniform4f: makeNative(function() {}, 'uniform4f'),
    uniform2fv: makeNative(function() {}, 'uniform2fv'),
    uniform3fv: makeNative(function() {}, 'uniform3fv'),
    uniform4fv: makeNative(function() {}, 'uniform4fv'),
    uniform1iv: makeNative(function() {}, 'uniform1iv'),
    uniformMatrix2fv: makeNative(function() {}, 'uniformMatrix2fv'),
    uniformMatrix3fv: makeNative(function() {}, 'uniformMatrix3fv'),
    vertexAttrib1f: makeNative(function() {}, 'vertexAttrib1f'),
    vertexAttrib2f: makeNative(function() {}, 'vertexAttrib2f'),
    vertexAttrib3f: makeNative(function() {}, 'vertexAttrib3f'),
    vertexAttrib4f: makeNative(function() {}, 'vertexAttrib4f'),
    vertexAttrib1fv: makeNative(function() {}, 'vertexAttrib1fv'),
    vertexAttrib2fv: makeNative(function() {}, 'vertexAttrib2fv'),
    vertexAttrib3fv: makeNative(function() {}, 'vertexAttrib3fv'),
    vertexAttrib4fv: makeNative(function() {}, 'vertexAttrib4fv'),
    getVertexAttrib: makeNative(function() { return 0; }, 'getVertexAttrib'),
    getVertexAttribOffset: makeNative(function() { return 0; }, 'getVertexAttribOffset'),
    bindAttribLocation: makeNative(function() {}, 'bindAttribLocation'),
    framebufferTexture2D: makeNative(function() {}, 'framebufferTexture2D'),
    checkFramebufferStatus: makeNative(function() { return 36053; }, 'checkFramebufferStatus'),
    createFramebuffer: makeNative(function() { return {}; }, 'createFramebuffer'),
    bindFramebuffer: makeNative(function() {}, 'bindFramebuffer'),
    deleteFramebuffer: makeNative(function() {}, 'deleteFramebuffer'),
    isFramebuffer: makeNative(function() { return false; }, 'isFramebuffer'),
    readPixels: makeNative(function() {}, 'readPixels'),
    flush: makeNative(function() {}, 'flush'),
    finish: makeNative(function() {}, 'finish'),
    compressedTexImage2D: makeNative(function() {}, 'compressedTexImage2D'),
    compressedTexSubImage2D: makeNative(function() {}, 'compressedTexSubImage2D'),
    generateMipmap: makeNative(function() {}, 'generateMipmap'),
    texSubImage2D: makeNative(function() {}, 'texSubImage2D'),
    copyTexImage2D: makeNative(function() {}, 'copyTexImage2D'),
    copyTexSubImage2D: makeNative(function() {}, 'copyTexSubImage2D'),
    getTexParameter: makeNative(function() { return 0; }, 'getTexParameter'),
    pixelStorei: makeNative(function() {}, 'pixelStorei'),
    getPixelStorei: makeNative(function() { return 0; }, 'getPixelStorei'),
    blendFuncSeparate: makeNative(function() {}, 'blendFuncSeparate'),
    blendEquation: makeNative(function() {}, 'blendEquation'),
    blendEquationSeparate: makeNative(function() {}, 'blendEquationSeparate'),
    colorMask: makeNative(function() {}, 'colorMask'),
    depthMask: makeNative(function() {}, 'depthMask'),
    stencilMask: makeNative(function() {}, 'stencilMask'),
    stencilMaskSeparate: makeNative(function() {}, 'stencilMaskSeparate'),
    stencilFunc: makeNative(function() {}, 'stencilFunc'),
    stencilFuncSeparate: makeNative(function() {}, 'stencilFuncSeparate'),
    stencilOp: makeNative(function() {}, 'stencilOp'),
    stencilOpSeparate: makeNative(function() {}, 'stencilOpSeparate'),
    clearDepth: makeNative(function() {}, 'clearDepth'),
    clearStencil: makeNative(function() {}, 'clearStencil'),
    depthRange: makeNative(function() {}, 'depthRange'),
    drawBuffers: makeNative(function() {}, 'drawBuffers'),
    getFramebufferAttachmentParameter: makeNative(function() { return 0; }, 'getFramebufferAttachmentParameter'),
    renderbufferStorage: makeNative(function() {}, 'renderbufferStorage'),
    createRenderbuffer: makeNative(function() { return {}; }, 'createRenderbuffer'),
    bindRenderbuffer: makeNative(function() {}, 'bindRenderbuffer'),
    deleteRenderbuffer: makeNative(function() {}, 'deleteRenderbuffer'),
    isRenderbuffer: makeNative(function() { return false; }, 'isRenderbuffer'),
    getRenderbufferParameter: makeNative(function() { return 0; }, 'getRenderbufferParameter'),
    framebufferRenderbuffer: makeNative(function() {}, 'framebufferRenderbuffer'),
    createSampler: makeNative(function() { return {}; }, 'createSampler'),
    deleteSampler: makeNative(function() {}, 'deleteSampler'),
    isSampler: makeNative(function() { return false; }, 'isSampler'),
    bindSampler: makeNative(function() {}, 'bindSampler'),
    samplerParameteri: makeNative(function() {}, 'samplerParameteri'),
    getSamplerParameter: makeNative(function() { return 0; }, 'getSamplerParameter'),
    texStorage2D: makeNative(function() {}, 'texStorage2D'),
    texStorage3D: makeNative(function() {}, 'texStorage3D'),
    texSubImage3D: makeNative(function() {}, 'texSubImage3D'),
    compressedTexSubImage3D: makeNative(function() {}, 'compressedTexSubImage3D'),
    copyTexSubImage3D: makeNative(function() {}, 'copyTexSubImage3D'),
    bindBufferRange: makeNative(function() {}, 'bindBufferRange'),
    bindBufferBase: makeNative(function() {}, 'bindBufferBase'),
    bufferSubData: makeNative(function() {}, 'bufferSubData'),
    getBufferParameter: makeNative(function() { return 0; }, 'getBufferParameter'),
    getBufferSubData: makeNative(function() {}, 'getBufferSubData'),
    createTransformFeedback: makeNative(function() { return {}; }, 'createTransformFeedback'),
    deleteTransformFeedback: makeNative(function() {}, 'deleteTransformFeedback'),
    isTransformFeedback: makeNative(function() { return false; }, 'isTransformFeedback'),
    bindTransformFeedback: makeNative(function() {}, 'bindTransformFeedback'),
    beginTransformFeedback: makeNative(function() {}, 'beginTransformFeedback'),
    endTransformFeedback: makeNative(function() {}, 'endTransformFeedback'),
    pauseTransformFeedback: makeNative(function() {}, 'pauseTransformFeedback'),
    resumeTransformFeedback: makeNative(function() {}, 'resumeTransformFeedback'),
    transformFeedbackVaryings: makeNative(function() {}, 'transformFeedbackVaryings'),
    getTransformFeedbackVarying: makeNative(function() { return null; }, 'getTransformFeedbackVarying'),
    createQuery: makeNative(function() { return {}; }, 'createQuery'),
    deleteQuery: makeNative(function() {}, 'deleteQuery'),
    isQuery: makeNative(function() { return false; }, 'isQuery'),
    beginQuery: makeNative(function() {}, 'beginQuery'),
    endQuery: makeNative(function() {}, 'endQuery'),
    getQueryParameter: makeNative(function() { return 0; }, 'getQueryParameter'),
    fenceSync: makeNative(function() { return {}; }, 'fenceSync'),
    deleteSync: makeNative(function() {}, 'deleteSync'),
    isSync: makeNative(function() { return false; }, 'isSync'),
    waitSync: makeNative(function() {}, 'waitSync'),
    clientWaitSync: makeNative(function() { return 37149; }, 'clientWaitSync'),
    getSyncParameter: makeNative(function() { return 0; }, 'getSyncParameter'),
    uniformBlockBinding: makeNative(function() {}, 'uniformBlockBinding'),
    getUniformBlockIndex: makeNative(function() { return 0; }, 'getUniformBlockIndex'),
    uniformBlockBinding: makeNative(function() {}, 'uniformBlockBinding'),
    getActiveUniformBlockParameter: makeNative(function() { return 0; }, 'getActiveUniformBlockParameter'),
    getActiveUniformBlockName: makeNative(function() { return ''; }, 'getActiveUniformBlockName'),
    getActiveUniforms: makeNative(function() { return []; }, 'getActiveUniforms'),
    getActiveUniform: makeNative(function() { return null; }, 'getActiveUniform'),
    getAttribOffset: makeNative(function() { return 0; }, 'getAttribOffset'),
    getActiveAttrib: makeNative(function() { return null; }, 'getActiveAttrib'),
    getExtension: makeNative(function(name) { return null; }, 'getExtension'),
    getSupportedExtensions: makeNative(function() { return []; }, 'getSupportedExtensions'),
    isContextLost: makeNative(function() { return false; }, 'isContextLost'),
    getContextAttributes: makeNative(function() { return {}; }, 'getContextAttributes'),
    loseContext: makeNative(function() {}, 'loseContext'),
    restoreContext: makeNative(function() {}, 'restoreContext')
  };

  function WebGL2RenderingContext() {}
  makeNative(WebGL2RenderingContext, 'WebGL2RenderingContext');
  Object.setPrototypeOf(WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype);

  function WebGLShader() {}
  makeNative(WebGLShader, 'WebGLShader');

  function WebGLProgram() {}
  makeNative(WebGLProgram, 'WebGLProgram');

  function WebGLBuffer() {}
  makeNative(WebGLBuffer, 'WebGLBuffer');

  function WebGLTexture() {}
  makeNative(WebGLTexture, 'WebGLTexture');

  function WebGLFramebuffer() {}
  makeNative(WebGLFramebuffer, 'WebGLFramebuffer');

  function WebGLRenderbuffer() {}
  makeNative(WebGLRenderbuffer, 'WebGLRenderbuffer');

  function WebGLVertexArrayObject() {}
  makeNative(WebGLVertexArrayObject, 'WebGLVertexArrayObject');

  function WebGLSampler() {}
  makeNative(WebGLSampler, 'WebGLSampler');

  function WebGLSync() {}
  makeNative(WebGLSync, 'WebGLSync');

  function WebGLQuery() {}
  makeNative(WebGLQuery, 'WebGLQuery');

  function WebGLTransformFeedback() {}
  makeNative(WebGLTransformFeedback, 'WebGLTransformFeedback');

  // ── File API ──
  // Blob URL registry - shared across Blob/URL/Worker for blob: URL support
  const blobURLRegistry = (sandbox.__blobURLRegistry__ = {});
  let blobURLCounter = 0;

  function Blob(parts, options) {
    // Store actual content - critical for Worker blob: URL execution
    let content = '';
    if (parts && parts.length) {
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        if (p == null) continue;
        if (typeof p === 'string') content += p;
        else if (ArrayBuffer.isView(p) || p instanceof ArrayBuffer) {
          const buf = p instanceof ArrayBuffer ? p : p.buffer;
          content += Buffer.from(buf).toString('utf8');
        } else if (p instanceof Blob) {
          content += p.__content__ || '';
        } else {
          content += String(p);
        }
      }
    }
    this.__content__ = content;
    this.size = content.length;
    this.type = (options && options.type) || '';
  }
  makeNative(Blob, 'Blob');
  Blob.prototype = {
    slice: makeNative(function(start, end, contentType) {
      const s = start || 0;
      const e = end === undefined ? this.size : end;
      const sliced = (this.__content__ || '').slice(s, e);
      const b = new Blob([], { type: contentType || '' });
      b.__content__ = sliced;
      b.size = sliced.length;
      return b;
    }, 'slice'),
    stream: makeNative(function() { return new ReadableStream(); }, 'stream'),
    text: makeNative(function() { return Promise.resolve(this.__content__ || ''); }, 'text'),
    arrayBuffer: makeNative(function() {
      const buf = new ArrayBuffer((this.__content__ || '').length);
      const view = new Uint8Array(buf);
      const s = this.__content__ || '';
      for (let i = 0; i < s.length; i++) view[i] = s.charCodeAt(i) & 0xff;
      return Promise.resolve(buf);
    }, 'arrayBuffer')
  };

  function File(parts, name, options) {
    Blob.call(this, parts, options);
    this.name = name || '';
    this.lastModified = (options && options.lastModified) || Date.now();
  }
  makeNative(File, 'File');
  Object.setPrototypeOf(File.prototype, Blob.prototype);

  function FileReader() {
    this.result = null;
    this.error = null;
    this.readyState = 0;
    this.onloadstart = null;
    this.onprogress = null;
    this.onload = null;
    this.onabort = null;
    this.onerror = null;
    this.onloadend = null;
  }
  makeNative(FileReader, 'FileReader');
  FileReader.EMPTY = 0;
  FileReader.LOADING = 1;
  FileReader.DONE = 2;
  FileReader.prototype = {
    readAsArrayBuffer: makeNative(function(blob) {
      this.readyState = 1;
      var self = this;
      setTimeout(function() {
        self.result = new ArrayBuffer(0);
        self.readyState = 2;
        if (typeof self.onload === 'function') self.onload({ target: self });
        if (typeof self.onloadend === 'function') self.onloadend({ target: self });
      }, 0);
    }, 'readAsArrayBuffer'),
    readAsText: makeNative(function(blob, encoding) {
      this.readyState = 1;
      var self = this;
      setTimeout(function() {
        self.result = '';
        self.readyState = 2;
        if (typeof self.onload === 'function') self.onload({ target: self });
        if (typeof self.onloadend === 'function') self.onloadend({ target: self });
      }, 0);
    }, 'readAsText'),
    readAsDataURL: makeNative(function(blob) {
      this.readyState = 1;
      var self = this;
      setTimeout(function() {
        self.result = '';
        self.readyState = 2;
        if (typeof self.onload === 'function') self.onload({ target: self });
        if (typeof self.onloadend === 'function') self.onloadend({ target: self });
      }, 0);
    }, 'readAsDataURL'),
    abort: makeNative(function() {
      this.readyState = 2;
      if (typeof this.onabort === 'function') this.onabort({ target: this });
      if (typeof this.onloadend === 'function') this.onloadend({ target: this });
    }, 'abort')
  };

  function FileReaderSync() {}
  makeNative(FileReaderSync, 'FileReaderSync');
  FileReaderSync.prototype = {
    readAsArrayBuffer: makeNative(function() { return new ArrayBuffer(0); }, 'readAsArrayBuffer'),
    readAsText: makeNative(function() { return ''; }, 'readAsText'),
    readAsDataURL: makeNative(function() { return ''; }, 'readAsDataURL')
  };

  // ── Streams API ──
  function ReadableStream(underlyingSource) {
    this._source = underlyingSource || {};
  }
  makeNative(ReadableStream, 'ReadableStream');
  ReadableStream.prototype = {
    getReader: makeNative(function() {
      return {
        read: makeNative(function() { return Promise.resolve({ done: true, value: undefined }); }, 'read'),
        cancel: makeNative(function() { return Promise.resolve(); }, 'cancel'),
        releaseLock: makeNative(function() {}, 'releaseLock'),
        closed: Promise.resolve()
      };
    }, 'getReader'),
    pipeThrough: makeNative(function() { return new ReadableStream(); }, 'pipeThrough'),
    pipeTo: makeNative(function() { return Promise.resolve(); }, 'pipeTo'),
    tee: makeNative(function() { return [new ReadableStream(), new ReadableStream()]; }, 'tee'),
    locked: false
  };

  function WritableStream(underlyingSink) {
    this._sink = underlyingSink || {};
  }
  makeNative(WritableStream, 'WritableStream');
  WritableStream.prototype = {
    getWriter: makeNative(function() {
      return {
        write: makeNative(function() { return Promise.resolve(); }, 'write'),
        close: makeNative(function() { return Promise.resolve(); }, 'close'),
        abort: makeNative(function() { return Promise.resolve(); }, 'abort'),
        releaseLock: makeNative(function() {}, 'releaseLock'),
        closed: Promise.resolve(),
        ready: Promise.resolve()
      };
    }, 'getWriter'),
    locked: false
  };

  function TransformStream(transformer) {
    this._transformer = transformer || {};
  }
  makeNative(TransformStream, 'TransformStream');
  TransformStream.prototype = {
    readable: new ReadableStream(),
    writable: new WritableStream()
  };

  // ── TextEncoder/TextDecoder ──
  function TextEncoder() {}
  makeNative(TextEncoder, 'TextEncoder');
  TextEncoder.prototype = {
    encode: makeNative(function(str) {
      var result = new Uint8Array(str.length);
      for (var i = 0; i < str.length; i++) {
        result[i] = str.charCodeAt(i);
      }
      return result;
    }, 'encode'),
    encodeInto: makeNative(function(src, dest) {
      var len = Math.min(src.length, dest.length);
      for (var i = 0; i < len; i++) {
        dest[i] = src.charCodeAt(i);
      }
      return { read: len, written: len };
    }, 'encodeInto'),
    encoding: 'utf-8'
  };

  function TextDecoder(label, options) {
    this.encoding = (label || 'utf-8').toLowerCase();
    this.fatal = !!(options && options.fatal);
    this.ignoreBOM = !!(options && options.ignoreBOM);
  }
  makeNative(TextDecoder, 'TextDecoder');
  TextDecoder.prototype = {
    decode: makeNative(function(input, options) {
      if (!input) return '';
      var result = '';
      for (var i = 0; i < input.length; i++) {
        result += String.fromCharCode(input[i]);
      }
      return result;
    }, 'decode')
  };

  // ── URL/URLSearchParams ──
  // 使用Node.js原生URL实现，确保解析正确
  const NativeURL = require('url').URL;
  
  // 包装URL构造函数，确保原型链正确
  function URL(url, base) {
    var parsed;
    if (base) {
      parsed = new NativeURL(url, base);
    } else {
      parsed = new NativeURL(url);
    }
    
    // 复制所有属性到this
    this.href = parsed.href;
    this.origin = parsed.origin;
    this.protocol = parsed.protocol;
    this.username = parsed.username;
    this.password = parsed.password;
    this.host = parsed.host;
    this.hostname = parsed.hostname;
    this.port = parsed.port;
    this.pathname = parsed.pathname;
    this.search = parsed.search;
    this.searchParams = parsed.searchParams;
    this.hash = parsed.hash;
    
    // 保存原生URL对象用于后续操作
    this._nativeURL = parsed;
  }
  makeNative(URL, 'URL');
  URL.prototype = {
    toString: makeNative(function() { return this.href; }, 'toString'),
    toJSON: makeNative(function() { return this.href; }, 'toJSON')
  };
  URL.createObjectURL = makeNative(function(obj) {
    // Register blob for later retrieval by Worker
    const id = 'blob:cf-' + (++blobURLCounter);
    blobURLRegistry[id] = obj;
    return id;
  }, 'createObjectURL');
  URL.revokeObjectURL = makeNative(function(url) {
    delete blobURLRegistry[url];
  }, 'revokeObjectURL');

  function URLSearchParams(init) {
    this._params = {};
    if (typeof init === 'string') {
      init.split('&').forEach(function(pair) {
        var parts = pair.split('=');
        this._params[decodeURIComponent(parts[0])] = parts[1] ? decodeURIComponent(parts[1]) : '';
      }.bind(this));
    } else if (Array.isArray(init)) {
      init.forEach(function(pair) {
        if (pair.length >= 2) this._params[pair[0]] = pair[1];
      }.bind(this));
    } else if (init && typeof init === 'object') {
      for (var key in init) {
        if (init.hasOwnProperty(key)) this._params[key] = init[key];
      }
    }
  }
  makeNative(URLSearchParams, 'URLSearchParams');
  URLSearchParams.prototype = {
    append: makeNative(function(name, value) { this._params[name] = String(value); }, 'append'),
    delete: makeNative(function(name) { delete this._params[name]; }, 'delete'),
    get: makeNative(function(name) { return this._params[name] || null; }, 'get'),
    getAll: makeNative(function(name) { return this._params[name] ? [this._params[name]] : []; }, 'getAll'),
    has: makeNative(function(name) { return name in this._params; }, 'has'),
    set: makeNative(function(name, value) { this._params[name] = String(value); }, 'set'),
    sort: makeNative(function() {}, 'sort'),
    toString: makeNative(function() {
      var parts = [];
      for (var key in this._params) {
        if (this._params.hasOwnProperty(key)) {
          parts.push(encodeURIComponent(key) + '=' + encodeURIComponent(this._params[key]));
        }
      }
      return parts.join('&');
    }, 'toString'),
    forEach: makeNative(function(callback, thisArg) {
      for (var key in this._params) {
        if (this._params.hasOwnProperty(key)) {
          callback.call(thisArg, this._params[key], key, this);
        }
      }
    }, 'forEach'),
    keys: makeNative(function() { return Object.keys(this._params).keys(); }, 'keys'),
    values: makeNative(function() { return Object.values(this._params).values(); }, 'values'),
    entries: makeNative(function() { return Object.entries(this._params).entries(); }, 'entries'),
    [Symbol.iterator]: makeNative(function() {
      var self = this;
      var keys = Object.keys(this._params);
      var idx = 0;
      return { next: function() {
        if (idx >= keys.length) return { done: true, value: undefined };
        var key = keys[idx++];
        return { done: false, value: [key, self._params[key]] };
      }};
    }, '[Symbol.iterator]'),
    get length() { return Object.keys(this._params).length; }
  };

  // ── FormData ──
  function FormData(form) {
    this._data = [];
  }
  makeNative(FormData, 'FormData');
  FormData.prototype = {
    append: makeNative(function(name, value, filename) {
      this._data.push({ name: String(name), value: value, filename: filename });
    }, 'append'),
    delete: makeNative(function(name) {
      this._data = this._data.filter(function(item) { return item.name !== name; });
    }, 'delete'),
    get: makeNative(function(name) {
      var item = this._data.find(function(item) { return item.name === name; });
      return item ? item.value : null;
    }, 'get'),
    getAll: makeNative(function(name) {
      return this._data.filter(function(item) { return item.name === name; }).map(function(item) { return item.value; });
    }, 'getAll'),
    has: makeNative(function(name) {
      return this._data.some(function(item) { return item.name === name; });
    }, 'has'),
    set: makeNative(function(name, value, filename) {
      this._data = this._data.filter(function(item) { return item.name !== name; });
      this._data.push({ name: String(name), value: value, filename: filename });
    }, 'set'),
    forEach: makeNative(function(callback, thisArg) {
      this._data.forEach(function(item) {
        callback.call(thisArg, item.value, item.name, this);
      }, this);
    }, 'forEach'),
    keys: makeNative(function() { return this._data.map(function(item) { return item.name; }).keys(); }, 'keys'),
    values: makeNative(function() { return this._data.map(function(item) { return item.value; }).values(); }, 'values'),
    entries: makeNative(function() { return this._data.map(function(item) { return [item.name, item.value]; }).entries(); }, 'entries'),
    [Symbol.iterator]: makeNative(function() {
      var self = this;
      var idx = 0;
      return { next: function() {
        if (idx >= self._data.length) return { done: true, value: undefined };
        var item = self._data[idx++];
        return { done: false, value: [item.name, item.value] };
      }};
    }, '[Symbol.iterator]')
  };

  // ── AbortController/AbortSignal ──
  function AbortController() {
    this.signal = new AbortSignal();
  }
  makeNative(AbortController, 'AbortController');
  AbortController.prototype = {
    abort: makeNative(function(reason) {
      this.signal._aborted = true;
      this.signal.reason = reason;
      if (typeof this.signal.onabort === 'function') {
        this.signal.onabort({ type: 'abort', target: this.signal, bubbles: false, cancelable: false });
      }
    }, 'abort')
  };

  function AbortSignal() {
    this._aborted = false;
    this.reason = undefined;
    this.onabort = null;
  }
  makeNative(AbortSignal, 'AbortSignal');
  AbortSignal.prototype = {
    get aborted() { return this._aborted; },
    addEventListener: makeNative(function(type, cb) {
      if (type === 'abort' && !this._listeners) this._listeners = [];
      if (this._listeners && this._listeners.indexOf(cb) === -1) this._listeners.push(cb);
    }, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {
      if (this._listeners) this._listeners = this._listeners.filter(function(c) { return c !== cb; });
    }, 'removeEventListener'),
    dispatchEvent: makeNative(function(event) {
      if (event.type === 'abort' && this._listeners) {
        this._listeners.forEach(function(cb) { cb(event); });
      }
      return true;
    }, 'dispatchEvent')
  };
  AbortSignal.abort = makeNative(function(reason) {
    var signal = new AbortSignal();
    signal._aborted = true;
    signal.reason = reason;
    return signal;
  }, 'abort');
  AbortSignal.timeout = makeNative(function(milliseconds) {
    var signal = new AbortSignal();
    setTimeout(function() {
      signal._aborted = true;
      signal.reason = new DOMException('The operation was aborted due to timeout.', 'TimeoutError');
    }, milliseconds);
    return signal;
  }, 'timeout');

  // ── BroadcastChannel ──
  function BroadcastChannel(name) {
    this.name = name || '';
    this.onmessage = null;
    this.onmessageerror = null;
  }
  makeNative(BroadcastChannel, 'BroadcastChannel');
  BroadcastChannel.prototype = {
    postMessage: makeNative(function(message) {}, 'postMessage'),
    close: makeNative(function() {}, 'close'),
    addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener'),
    dispatchEvent: makeNative(function(event) { return true; }, 'dispatchEvent')
  };

  // ── MessageChannel ──
  function MessageChannel() {
    this.port1 = new MessagePort();
    this.port2 = new MessagePort();
  }
  makeNative(MessageChannel, 'MessageChannel');

  function MessagePort() {
    this.onmessage = null;
    this.onmessageerror = null;
  }
  makeNative(MessagePort, 'MessagePort');
  MessagePort.prototype = {
    postMessage: makeNative(function(message, transfer) {}, 'postMessage'),
    start: makeNative(function() {}, 'start'),
    close: makeNative(function() {}, 'close'),
    addEventListener: makeNative(function(type, cb) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, cb) {}, 'removeEventListener'),
    dispatchEvent: makeNative(function(event) { return true; }, 'dispatchEvent')
  };

  // ── DOMParser/XMLSerializer ──
  function DOMParser() {}
  makeNative(DOMParser, 'DOMParser');
  DOMParser.prototype = {
    parseFromString: makeNative(function(str, type) {
      return {
        documentElement: { tagName: 'html', children: [], childNodes: [] },
        head: { tagName: 'head', children: [], childNodes: [] },
        body: { tagName: 'body', children: [], childNodes: [] },
        querySelector: makeNative(function() { return null; }, 'querySelector'),
        querySelectorAll: makeNative(function() { return []; }, 'querySelectorAll'),
        getElementById: makeNative(function() { return null; }, 'getElementById'),
        getElementsByTagName: makeNative(function() { return []; }, 'getElementsByTagName'),
        textContent: str
      };
    }, 'parseFromString')
  };

  function XMLSerializer() {}
  makeNative(XMLSerializer, 'XMLSerializer');
  XMLSerializer.prototype = {
    serializeToString: makeNative(function(node) { return node.textContent || ''; }, 'serializeToString')
  };

  // ── XPathEvaluator ──
  function XPathEvaluator() {}
  makeNative(XPathEvaluator, 'XPathEvaluator');
  XPathEvaluator.prototype = {
    createExpression: makeNative(function() { return {}; }, 'createExpression'),
    createNSResolver: makeNative(function() { return {}; }, 'createNSResolver'),
    evaluate: makeNative(function() { return {}; }, 'evaluate')
  };

  function XPathExpression() {}
  makeNative(XPathExpression, 'XPathExpression');
  XPathExpression.prototype = { evaluate: makeNative(function() { return {}; }, 'evaluate') };

  function XPathNSResolver() {}
  makeNative(XPathNSResolver, 'XPathNSResolver');
  XPathNSResolver.prototype = { lookupNamespaceURI: makeNative(function() { return null; }, 'lookupNamespaceURI') };

  function XPathResult() {}
  makeNative(XPathResult, 'XPathResult');

  // ── 其他全局对象 ──
  function DataTransfer() {
    this.dropEffect = 'none';
    this.effectAllowed = 'uninitialized';
    this.files = [];
    this.items = [];
    this.types = [];
  }
  makeNative(DataTransfer, 'DataTransfer');
  DataTransfer.prototype = {
    clearData: makeNative(function() {}, 'clearData'),
    getData: makeNative(function() { return ''; }, 'getData'),
    setData: makeNative(function() {}, 'setData'),
    setDragImage: makeNative(function() {}, 'setDragImage')
  };

  function DataTransferItem() {
    this.kind = '';
    this.type = '';
  }
  makeNative(DataTransferItem, 'DataTransferItem');
  DataTransferItem.prototype = {
    getAsFile: makeNative(function() { return null; }, 'getAsFile'),
    getAsString: makeNative(function() {}, 'getAsString')
  };

  function DataTransferItemList() {}
  makeNative(DataTransferItemList, 'DataTransferItemList');
  DataTransferItemList.prototype = {
    add: makeNative(function() {}, 'add'),
    remove: makeNative(function() {}, 'remove'),
    clear: makeNative(function() {}, 'clear'),
    item: makeNative(function() { return null; }, 'item'),
    get length() { return 0; }
  };

  function TextMetrics() {
    this.width = 0;
    this.actualBoundingBoxLeft = 0;
    this.actualBoundingBoxRight = 0;
    this.fontBoundingBoxAscent = 0;
    this.fontBoundingBoxDescent = 0;
    this.actualBoundingBoxAscent = 0;
    this.actualBoundingBoxDescent = 0;
    this.emHeightAscent = 0;
    this.emHeightDescent = 0;
    this.hangingBaseline = 0;
    this.alphabeticBaseline = 0;
    this.ideographicBaseline = 0;
  }
  makeNative(TextMetrics, 'TextMetrics');

  function Path2D(path) {}
  makeNative(Path2D, 'Path2D');
  Path2D.prototype = {
    addPath: makeNative(function() {}, 'addPath'),
    moveTo: makeNative(function() {}, 'moveTo'),
    closePath: makeNative(function() {}, 'closePath'),
    lineTo: makeNative(function() {}, 'lineTo'),
    bezierCurveTo: makeNative(function() {}, 'bezierCurveTo'),
    quadraticCurveTo: makeNative(function() {}, 'quadraticCurveTo'),
    arc: makeNative(function() {}, 'arc'),
    arcTo: makeNative(function() {}, 'arcTo'),
    ellipse: makeNative(function() {}, 'ellipse'),
    rect: makeNative(function() {}, 'rect')
  };

  function CanvasGradient() {}
  makeNative(CanvasGradient, 'CanvasGradient');
  CanvasGradient.prototype = {
    addColorStop: makeNative(function() {}, 'addColorStop')
  };

  function CanvasPattern() {}
  makeNative(CanvasPattern, 'CanvasPattern');
  CanvasPattern.prototype = {
    setTransform: makeNative(function() {}, 'setTransform')
  };

  function ImageBitmap() {}
  makeNative(ImageBitmap, 'ImageBitmap');
  ImageBitmap.prototype = {
    close: makeNative(function() {}, 'close'),
    get width() { return 0; },
    get height() { return 0; }
  };

  function ImageData(width, height, data) {
    this.width = width || 0;
    this.height = height || 0;
    this.data = data || new Uint8ClampedArray((width || 0) * (height || 0) * 4);
  }
  makeNative(ImageData, 'ImageData');

  function DOMMatrix() {}
  makeNative(DOMMatrix, 'DOMMatrix');
  DOMMatrix.fromMatrix = makeNative(function() { return new DOMMatrix(); }, 'fromMatrix');
  DOMMatrix.prototype = {
    a: 1, b: 0, c: 0, d: 1, e: 0, f: 0,
    m11: 1, m12: 0, m21: 0, m22: 1, m41: 0, m42: 0,
    multiply: makeNative(function() { return new DOMMatrix(); }, 'multiply'),
    inverse: makeNative(function() { return new DOMMatrix(); }, 'inverse'),
    translate: makeNative(function() { return new DOMMatrix(); }, 'translate'),
    scale: makeNative(function() { return new DOMMatrix(); }, 'scale'),
    rotate: makeNative(function() { return new DOMMatrix(); }, 'rotate'),
    rotateFromVector: makeNative(function() { return new DOMMatrix(); }, 'rotateFromVector'),
    flipX: makeNative(function() { return new DOMMatrix(); }, 'flipX'),
    flipY: makeNative(function() { return new DOMMatrix(); }, 'flipY'),
    skewX: makeNative(function() { return new DOMMatrix(); }, 'skewX'),
    skewY: makeNative(function() { return new DOMMatrix(); }, 'skewY'),
    toFloat32Array: makeNative(function() { return new Float32Array([1, 0, 0, 1, 0, 0]); }, 'toFloat32Array'),
    toFloat64Array: makeNative(function() { return new Float64Array([1, 0, 0, 1, 0, 0]); }, 'toFloat64Array'),
    toString: makeNative(function() { return 'matrix(1, 0, 0, 1, 0, 0)'; }, 'toString'),
    get is2D() { return true; },
    get isIdentity() { return true; },
    get determinant() { return 1; }
  };

  function DOMMatrixReadOnly() {}
  makeNative(DOMMatrixReadOnly, 'DOMMatrixReadOnly');
  DOMMatrixReadOnly.fromMatrix = makeNative(function() { return new DOMMatrixReadOnly(); }, 'fromMatrix');

  function DOMPoint(x, y, z, w) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 1;
  }
  makeNative(DOMPoint, 'DOMPoint');
  DOMPoint.fromPoint = makeNative(function() { return new DOMPoint(); }, 'fromPoint');
  DOMPoint.prototype = {
    matrixTransform: makeNative(function() { return new DOMPoint(); }, 'matrixTransform')
  };

  function DOMPointReadOnly(x, y, z, w) {
    this.x = x || 0;
    this.y = y || 0;
    this.z = z || 0;
    this.w = w || 1;
  }
  makeNative(DOMPointReadOnly, 'DOMPointReadOnly');
  DOMPointReadOnly.fromPoint = makeNative(function() { return new DOMPointReadOnly(); }, 'fromPoint');

  function DOMRect(x, y, width, height) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
    this.top = this.y;
    this.right = this.x + this.width;
    this.bottom = this.y + this.height;
    this.left = this.x;
  }
  makeNative(DOMRect, 'DOMRect');
  DOMRect.fromRect = makeNative(function() { return new DOMRect(); }, 'fromRect');

  function DOMRectReadOnly(x, y, width, height) {
    this.x = x || 0;
    this.y = y || 0;
    this.width = width || 0;
    this.height = height || 0;
    Object.defineProperty(this, 'top', { get: function() { return this.y; }, enumerable: true });
    Object.defineProperty(this, 'right', { get: function() { return this.x + this.width; }, enumerable: true });
    Object.defineProperty(this, 'bottom', { get: function() { return this.y + this.height; }, enumerable: true });
    Object.defineProperty(this, 'left', { get: function() { return this.x; }, enumerable: true });
  }
  makeNative(DOMRectReadOnly, 'DOMRectReadOnly');
  DOMRectReadOnly.fromRect = makeNative(function() { return new DOMRectReadOnly(); }, 'fromRect');

  function DOMQuad() {}
  makeNative(DOMQuad, 'DOMQuad');
  DOMQuad.fromRect = makeNative(function() { return new DOMQuad(); }, 'fromRect');
  DOMQuad.prototype = {
    get p1() { return new DOMPoint(); },
    get p2() { return new DOMPoint(); },
    get p3() { return new DOMPoint(); },
    get p4() { return new DOMPoint(); },
    bounds: makeNative(function() { return new DOMRect(); }, 'bounds'),
    transform: makeNative(function() { return new DOMQuad(); }, 'transform'),
    toJSON: makeNative(function() { return {}; }, 'toJSON')
  };

  function DOMTokenList() {}
  makeNative(DOMTokenList, 'DOMTokenList');

  // ── ResizeObserverEntry ──
  function ResizeObserverEntry(target) {
    this.target = target;
    this.contentRect = new DOMRectReadOnly();
    this.contentBoxSize = [{ inlineSize: 0, blockSize: 0 }];
    this.borderBoxSize = [{ inlineSize: 0, blockSize: 0 }];
    this.devicePixelContentBoxSize = [{ inlineSize: 0, blockSize: 0 }];
  }
  makeNative(ResizeObserverEntry, 'ResizeObserverEntry');

  // ── IntersectionObserverEntry ──
  function IntersectionObserverEntry() {
    this.boundingClientRect = new DOMRectReadOnly();
    this.intersectionRect = new DOMRectReadOnly();
    this.intersectionRatio = 0;
    this.isIntersecting = false;
    this.rootBounds = null;
    this.target = null;
    this.time = 0;
  }
  makeNative(IntersectionObserverEntry, 'IntersectionObserverEntry');

  // ── MutationRecord ──
  function MutationRecord() {
    this.type = '';
    this.target = null;
    this.addedNodes = [];
    this.removedNodes = [];
    this.previousSibling = null;
    this.nextSibling = null;
    this.attributeName = null;
    this.attributeNamespace = null;
    this.oldValue = null;
  }
  makeNative(MutationRecord, 'MutationRecord');

  // ── PerformanceObserverEntryList ──
  function PerformanceObserverEntryList() {}
  makeNative(PerformanceObserverEntryList, 'PerformanceObserverEntryList');
  PerformanceObserverEntryList.prototype = {
    getEntries: makeNative(function() { return []; }, 'getEntries'),
    getEntriesByType: makeNative(function() { return []; }, 'getEntriesByType'),
    getEntriesByName: makeNative(function() { return []; }, 'getEntriesByName')
  };

  // ── MediaQueryListEvent ──
  function MediaQueryListEvent(type, init) {
    this.type = type || '';
    this.media = (init && init.media) || '';
    this.matches = !!(init && init.matches);
  }
  makeNative(MediaQueryListEvent, 'MediaQueryListEvent');

  // ── 安装到 sandbox ──
  // Audio API
  sandbox.AudioContext = AudioContext;
  sandbox.OfflineAudioContext = OfflineAudioContext;
  sandbox.AudioBuffer = AudioBuffer;
  sandbox.AudioBufferSourceNode = AudioBufferSourceNode;
  sandbox.AudioNode = AudioNode;
  sandbox.AudioParam = AudioParam;
  sandbox.GainNode = GainNode;
  sandbox.AnalyserNode = AnalyserNode;
  sandbox.OscillatorNode = OscillatorNode;
  sandbox.BiquadFilterNode = BiquadFilterNode;
  sandbox.AudioDestinationNode = AudioDestinationNode;
  sandbox.ScriptProcessorNode = ScriptProcessorNode;
  sandbox.MediaElementAudioSourceNode = MediaElementAudioSourceNode;

  // WebGL API
  sandbox.WebGLRenderingContext = WebGLRenderingContext;
  sandbox.WebGL2RenderingContext = WebGL2RenderingContext;
  sandbox.WebGLShader = WebGLShader;
  sandbox.WebGLProgram = WebGLProgram;
  sandbox.WebGLBuffer = WebGLBuffer;
  sandbox.WebGLTexture = WebGLTexture;
  sandbox.WebGLFramebuffer = WebGLFramebuffer;
  sandbox.WebGLRenderbuffer = WebGLRenderbuffer;
  sandbox.WebGLVertexArrayObject = WebGLVertexArrayObject;
  sandbox.WebGLSampler = WebGLSampler;
  sandbox.WebGLSync = WebGLSync;
  sandbox.WebGLQuery = WebGLQuery;
  sandbox.WebGLTransformFeedback = WebGLTransformFeedback;

  // File API
  sandbox.Blob = Blob;
  sandbox.File = File;
  sandbox.FileReader = FileReader;
  sandbox.FileReaderSync = FileReaderSync;

  // Streams API
  sandbox.ReadableStream = ReadableStream;
  sandbox.WritableStream = WritableStream;
  sandbox.TransformStream = TransformStream;

  // TextEncoder/TextDecoder
  sandbox.TextEncoder = TextEncoder;
  sandbox.TextDecoder = TextDecoder;

  // URL/URLSearchParams
  sandbox.URL = URL;
  sandbox.URLSearchParams = URLSearchParams;

  // FormData
  sandbox.FormData = FormData;

  // AbortController/AbortSignal
  sandbox.AbortController = AbortController;
  sandbox.AbortSignal = AbortSignal;

  // BroadcastChannel/MessageChannel
  sandbox.BroadcastChannel = BroadcastChannel;
  sandbox.MessageChannel = MessageChannel;
  sandbox.MessagePort = MessagePort;

  // DOMParser/XMLSerializer/XPath
  sandbox.DOMParser = DOMParser;
  sandbox.XMLSerializer = XMLSerializer;
  sandbox.XPathEvaluator = XPathEvaluator;
  sandbox.XPathExpression = XPathExpression;
  sandbox.XPathNSResolver = XPathNSResolver;
  sandbox.XPathResult = XPathResult;

  // DataTransfer
  sandbox.DataTransfer = DataTransfer;
  sandbox.DataTransferItem = DataTransferItem;
  sandbox.DataTransferItemList = DataTransferItemList;

  // Canvas related
  sandbox.TextMetrics = TextMetrics;
  sandbox.Path2D = Path2D;
  sandbox.CanvasGradient = CanvasGradient;
  sandbox.CanvasPattern = CanvasPattern;
  sandbox.ImageBitmap = ImageBitmap;
  sandbox.ImageData = ImageData;

  // DOMMatrix/DOMPoint/DOMRect
  sandbox.DOMMatrix = DOMMatrix;
  sandbox.DOMMatrixReadOnly = DOMMatrixReadOnly;
  sandbox.DOMPoint = DOMPoint;
  sandbox.DOMPointReadOnly = DOMPointReadOnly;
  sandbox.DOMRect = DOMRect;
  sandbox.DOMRectReadOnly = DOMRectReadOnly;
  sandbox.DOMQuad = DOMQuad;

  // Observer entries
  sandbox.ResizeObserverEntry = ResizeObserverEntry;
  sandbox.IntersectionObserverEntry = IntersectionObserverEntry;
  sandbox.MutationRecord = MutationRecord;
  sandbox.PerformanceObserverEntryList = PerformanceObserverEntryList;

  // MediaQueryList
  sandbox.MediaQueryListEvent = MediaQueryListEvent;

  // SVGElement
  function SVGElement() {}
  makeNative(SVGElement, 'SVGElement');
  Object.setPrototypeOf(SVGElement.prototype, sandbox.Element.prototype);
  sandbox.SVGElement = SVGElement;

  // DOMStringMap (dataset)
  function DOMStringMap() {}
  makeNative(DOMStringMap, 'DOMStringMap');
  sandbox.DOMStringMap = DOMStringMap;

  // NamedNodeMap (attributes)
  function NamedNodeMap() {}
  makeNative(NamedNodeMap, 'NamedNodeMap');
  NamedNodeMap.prototype.item = makeNative(function(idx) { return this[idx] || null; }, 'item');
  sandbox.NamedNodeMap = NamedNodeMap;

  // DOMImplementation
  function DOMImplementation() {}
  makeNative(DOMImplementation, 'DOMImplementation');
  DOMImplementation.prototype.createDocument = makeNative(function(namespaceURI, qualifiedName, doctype) {
    return sandbox.document;
  }, 'createDocument');
  DOMImplementation.prototype.createHTMLDocument = makeNative(function(title) {
    return sandbox.document;
  }, 'createHTMLDocument');
  DOMImplementation.prototype.hasFeature = makeNative(function(feature, version) {
    return true;
  }, 'hasFeature');
  sandbox.DOMImplementation = DOMImplementation;

  // Range
  function Range() {}
  makeNative(Range, 'Range');
  Range.prototype.collapse = makeNative(function(toStart) {}, 'collapse');
  Range.prototype.selectNode = makeNative(function(node) {}, 'selectNode');
  Range.prototype.selectNodeContents = makeNative(function(node) {}, 'selectNodeContents');
  Range.prototype.deleteContents = makeNative(function() {}, 'deleteContents');
  Range.prototype.extractContents = makeNative(function() { return document.createDocumentFragment(); }, 'extractContents');
  Range.prototype.cloneContents = makeNative(function() { return document.createDocumentFragment(); }, 'cloneContents');
  Range.prototype.insertNode = makeNative(function(node) {}, 'insertNode');
  Range.prototype.surroundContents = makeNative(function(newParent) {}, 'surroundContents');
  Range.prototype.compareBoundaryPoints = makeNative(function(how, sourceRange) { return 0; }, 'compareBoundaryPoints');
  Range.prototype.cloneRange = makeNative(function() { return new Range(); }, 'cloneRange');
  Range.prototype.detach = makeNative(function() {}, 'detach');
  Range.prototype.toString = makeNative(function() { return ''; }, 'toString');
  Range.prototype.setStart = makeNative(function(node, offset) {}, 'setStart');
  Range.prototype.setEnd = makeNative(function(node, offset) {}, 'setEnd');
  Range.prototype.setStartBefore = makeNative(function(node) {}, 'setStartBefore');
  Range.prototype.setStartAfter = makeNative(function(node) {}, 'setStartAfter');
  Range.prototype.setEndBefore = makeNative(function(node) {}, 'setEndBefore');
  Range.prototype.setEndAfter = makeNative(function(node) {}, 'setEndAfter');
  Range.prototype.collapse = makeNative(function(toStart) {}, 'collapse');
  Range.prototype.selectNode = makeNative(function(node) {}, 'selectNode');
  Range.prototype.selectNodeContents = makeNative(function(node) {}, 'selectNodeContents');
  Range.prototype.compareNode = makeNative(function(referenceNode) { return 0; }, 'compareNode');
  Range.prototype.intersectsNode = makeNative(function(referenceNode) { return false; }, 'intersectsNode');
  Range.prototype.isPointInRange = makeNative(function(node, offset) { return false; }, 'isPointInRange');
  Range.prototype.comparePoint = makeNative(function(node, offset) { return 0; }, 'comparePoint');
  Range.prototype.getBoundingClientRect = makeNative(function() { return new sandbox.DOMRect(); }, 'getBoundingClientRect');
  Range.prototype.getClientRects = makeNative(function() { return []; }, 'getClientRects');
  sandbox.Range = Range;

  // Selection
  function Selection() {}
  makeNative(Selection, 'Selection');
  Selection.prototype.type = 'None';
  Selection.prototype.rangeCount = 0;
  Selection.prototype.anchorNode = null;
  Selection.prototype.anchorOffset = 0;
  Selection.prototype.focusNode = null;
  Selection.prototype.focusOffset = 0;
  Selection.prototype.isCollapsed = true;
  Selection.prototype.baseNode = null;
  Selection.prototype.baseOffset = 0;
  Selection.prototype.extentNode = null;
  Selection.prototype.extentOffset = 0;
  Selection.prototype.collapse = makeNative(function(node, offset) {}, 'collapse');
  Selection.prototype.collapseToStart = makeNative(function() {}, 'collapseToStart');
  Selection.prototype.collapseToEnd = makeNative(function() {}, 'collapseToEnd');
  Selection.prototype.selectAllChildren = makeNative(function(node) {}, 'selectAllChildren');
  Selection.prototype.deleteFromDocument = makeNative(function() {}, 'deleteFromDocument');
  Selection.prototype.containsNode = makeNative(function(node, allowPartialContainment) { return false; }, 'containsNode');
  Selection.prototype.addRange = makeNative(function(range) {}, 'addRange');
  Selection.prototype.removeRange = makeNative(function(range) {}, 'removeRange');
  Selection.prototype.removeAllRanges = makeNative(function() {}, 'removeAllRanges');
  Selection.prototype.toString = makeNative(function() { return ''; }, 'toString');
  sandbox.Selection = Selection;

  // FileList
  function FileList() {}
  makeNative(FileList, 'FileList');
  FileList.prototype.item = makeNative(function(idx) { return this[idx] || null; }, 'item');
  sandbox.FileList = FileList;

  // DOMException
  function DOMException(message, name) {
    this.name = name || 'Error';
    this.message = message || '';
    this.code = 0;
    this.stack = (new Error(message)).stack;
  }
  makeNative(DOMException, 'DOMException');
  DOMException.prototype = Object.create(Error.prototype);
  DOMException.prototype.constructor = DOMException;
  DOMException.prototype.toString = makeNative(function() {
    return this.name + (this.message ? ': ' + this.message : '');
  }, 'toString');
  DOMException.INDEX_SIZE_ERR = 1;
  DOMException.DOMSTRING_SIZE_ERR = 2;
  DOMException.HIERARCHY_REQUEST_ERR = 3;
  DOMException.WRONG_DOCUMENT_ERR = 4;
  DOMException.INVALID_CHARACTER_ERR = 5;
  DOMException.NO_DATA_ALLOWED_ERR = 6;
  DOMException.NO_MODIFICATION_ALLOWED_ERR = 7;
  DOMException.NOT_FOUND_ERR = 8;
  DOMException.NOT_SUPPORTED_ERR = 9;
  DOMException.INUSE_ATTRIBUTE_ERR = 10;
  DOMException.INVALID_STATE_ERR = 11;
  DOMException.SYNTAX_ERR = 12;
  DOMException.INVALID_MODIFICATION_ERR = 13;
  DOMException.NAMESPACE_ERR = 14;
  DOMException.INVALID_ACCESS_ERR = 15;
  DOMException.VALIDATION_ERR = 16;
  DOMException.TYPE_MISMATCH_ERR = 17;
  DOMException.SECURITY_ERR = 18;
  DOMException.NETWORK_ERR = 19;
  DOMException.ABORT_ERR = 20;
  DOMException.URL_MISMATCH_ERR = 21;
  DOMException.QUOTA_EXCEEDED_ERR = 22;
  DOMException.TIMEOUT_ERR = 23;
  DOMException.INVALID_NODE_TYPE_ERR = 24;
  DOMException.DATA_CLONE_ERR = 25;
  DOMException.ENCODING_ERR = 26;
  DOMException.NO_MODIFICATION_ALLOWED_ERR = 27;
  DOMException.INVALID_STATE_ERR = 28;
  DOMException.SYNTAX_ERR = 29;
  DOMException.INVALID_MODIFICATION_ERR = 30;
  DOMException.NAMESPACE_ERR = 31;
  DOMException.INVALID_ACCESS_ERR = 32;
  DOMException.VALIDATION_ERR = 33;
  DOMException.TYPE_MISMATCH_ERR = 34;
  DOMException.SECURITY_ERR = 35;
  DOMException.NETWORK_ERR = 36;
  DOMException.ABORT_ERR = 37;
  DOMException.URL_MISMATCH_ERR = 38;
  DOMException.QUOTA_EXCEEDED_ERR = 39;
  DOMException.TIMEOUT_ERR = 40;
  DOMException.INVALID_NODE_TYPE_ERR = 41;
  DOMException.DATA_CLONE_ERR = 42;
  sandbox.DOMException = DOMException;

  // btoa / atob
  sandbox.btoa = makeNative(function btoa(str) {
    return Buffer.from(String(str), 'binary').toString('base64');
  }, 'btoa');
  
  sandbox.atob = makeNative(function atob(str) {
    return Buffer.from(String(str), 'base64').toString('binary');
  }, 'atob');

  // clear / print / alert / confirm / prompt (常用全局函数)
  sandbox.clear = makeNative(function clear() {}, 'clear');
  sandbox.print = makeNative(function print() {}, 'print');
  sandbox.alert = makeNative(function alert(message) {}, 'alert');
  sandbox.confirm = makeNative(function confirm(message) { return true; }, 'confirm');
  sandbox.prompt = makeNative(function prompt(message, defaultValue) { return defaultValue || ''; }, 'prompt');

  // isNaN / isFinite / parseFloat / parseInt (确保可用)
  // 这些通常是vm自带的，但确保一下
  if (typeof sandbox.isNaN === 'undefined') sandbox.isNaN = isNaN;
  if (typeof sandbox.isFinite === 'undefined') sandbox.isFinite = isFinite;
  if (typeof sandbox.parseFloat === 'undefined') sandbox.parseFloat = parseFloat;
  if (typeof sandbox.parseInt === 'undefined') sandbox.parseInt = parseInt;
  if (typeof sandbox.encodeURI === 'undefined') sandbox.encodeURI = encodeURI;
  if (typeof sandbox.decodeURI === 'undefined') sandbox.decodeURI = decodeURI;
  if (typeof sandbox.encodeURIComponent === 'undefined') sandbox.encodeURIComponent = encodeURIComponent;
  if (typeof sandbox.decodeURIComponent === 'undefined') sandbox.decodeURIComponent = decodeURIComponent;
  if (typeof sandbox.escape === 'undefined') sandbox.escape = escape;
  if (typeof sandbox.unescape === 'undefined') sandbox.unescape = unescape;

  // structuredClone (较新的API，Cloudflare可能使用)
  if (typeof sandbox.structuredClone === 'undefined') {
    sandbox.structuredClone = makeNative(function structuredClone(value, options) {
      return JSON.parse(JSON.stringify(value));
    }, 'structuredClone');
  }

  // createImageBitmap
  sandbox.createImageBitmap = makeNative(function createImageBitmap(blob, options) {
    return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
  }, 'createImageBitmap');

  // reportError
  sandbox.reportError = makeNative(function reportError(error) {
    if (sandbox.console && sandbox.console.error) {
      sandbox.console.error(error);
    }
  }, 'reportError');

  // scheduler (Chrome 94+)
  sandbox.scheduler = {
    postTask: makeNative(function postTask(callback, options) {
      var priority = (options && options.priority) || 'user-visible';
      var delay = (options && options.delay) || 0;
      return new Promise(function(resolve, reject) {
        global.setTimeout(function() {
          try {
            resolve(callback());
          } catch(e) {
            reject(e);
          }
        }, delay);
      });
    }, 'postTask')
  };

  // caches (CacheStorage)
  sandbox.caches = {
    open: makeNative(function open(cacheName) {
      return Promise.reject(new DOMException('Operation not supported', 'NotSupportedError'));
    }, 'open'),
    keys: makeNative(function keys() { return Promise.resolve([]); }, 'keys'),
    match: makeNative(function match(request, options) {
      return Promise.resolve(undefined);
    }, 'match'),
    has: makeNative(function has(cacheName) { return Promise.resolve(false); }, 'has'),
    delete: makeNative(function _delete(cacheName) { return Promise.resolve(false); }, 'delete')
  };

  // cookieStore
  sandbox.cookieStore = {
    get: makeNative(function get(name) { return Promise.resolve(null); }, 'get'),
    getAll: makeNative(function getAll() { return Promise.resolve([]); }, 'getAll'),
    set: makeNative(function set(name, value) { return Promise.resolve(); }, 'set'),
    delete: makeNative(function _delete(name) { return Promise.resolve(); }, 'delete'),
    addEventListener: makeNative(function(type, listener, options) {}, 'addEventListener'),
    removeEventListener: makeNative(function(type, listener, options) {}, 'removeEventListener')
  };

  // Trusted Types
  sandbox.trustedTypes = {
    createPolicy: makeNative(function createPolicy(policyName, policyOptions) {
      return {
        createHTML: makeNative(function(s) { return s; }, 'createHTML'),
        createScript: makeNative(function(s) { return s; }, 'createScript'),
        createScriptURL: makeNative(function(s) { return s; }, 'createScriptURL')
      };
    }, 'createPolicy'),
    emptyHTML: '',
    emptyScript: ''
  };
}

module.exports = { install };

'use strict';

const { makeNative, defineProp } = require('../lib/guard');

/**
 * WebRTC 模块
 *
 * 模拟 WebRTC API，用于环境完整性。
 * 包含:
 * - RTCPeerConnection
 * - RTCSessionDescription
 * - RTCIceCandidate
 * - RTCDataChannel
 * - MediaStream / MediaStreamTrack
 */

function install(sandbox, config = {}) {
  const cfg = config.webrtc || {};

  // ── RTCSessionDescription ──
  function RTCSessionDescription(init) {
    this.type = init ? init.type : '';
    this.sdp = init ? init.sdp : '';
  }
  makeNative(RTCSessionDescription, 'RTCSessionDescription');
  RTCSessionDescription.prototype.toJSON = makeNative(function() {
    return { type: this.type, sdp: this.sdp };
  }, 'toJSON');

  // ── RTCIceCandidate ──
  function RTCIceCandidate(init) {
    this.candidate = init ? init.candidate : '';
    this.sdpMid = init ? init.sdpMid : null;
    this.sdpMLineIndex = init ? init.sdpMLineIndex : null;
    this.foundation = null;
    this.component = null;
    this.priority = null;
    this.ip = null;
    this.protocol = null;
    this.port = null;
    this.type = null;
    this.tcpType = null;
    this.relatedAddress = null;
    this.relatedPort = null;
    this.usernameFragment = null;
  }
  makeNative(RTCIceCandidate, 'RTCIceCandidate');
  RTCIceCandidate.prototype.toJSON = makeNative(function() {
    return { candidate: this.candidate, sdpMid: this.sdpMid, sdpMLineIndex: this.sdpMLineIndex };
  }, 'toJSON');

  // ── RTCDataChannel ──
  function RTCDataChannel() {
    this.label = '';
    this.ordered = true;
    this.maxPacketLifeTime = null;
    this.maxRetransmits = null;
    this.protocol = '';
    this.negotiated = false;
    this.id = null;
    this.readyState = 'connecting';
    this.bufferedAmount = 0;
    this.bufferedAmountLowThreshold = 0;
    this.binaryType = 'blob';
    this.onopen = null;
    this.onclose = null;
    this.onmessage = null;
    this.onerror = null;
    this.onbufferedamountlow = null;
    this._listeners = {};
  }
  makeNative(RTCDataChannel, 'RTCDataChannel');
  RTCDataChannel.prototype.send = makeNative(function(data) {}, 'send');
  RTCDataChannel.prototype.close = makeNative(function close() {
    this.readyState = 'closed';
  }, 'close');
  RTCDataChannel.prototype.addEventListener = makeNative(function(type, cb) {
    if (!this._listeners[type]) this._listeners[type] = [];
    this._listeners[type].push(cb);
  }, 'addEventListener');
  RTCDataChannel.prototype.removeEventListener = makeNative(function(type, cb) {
    if (!this._listeners[type]) return;
    this._listeners[type] = this._listeners[type].filter(c => c !== cb);
  }, 'removeEventListener');

  // ── MediaStream ──
  function MediaStream() {
    this.id = cfg.streamId || 'default-stream-id';
    this.active = true;
    this._tracks = [];
  }
  makeNative(MediaStream, 'MediaStream');
  MediaStream.prototype.getAudioTracks = makeNative(function() { return []; }, 'getAudioTracks');
  MediaStream.prototype.getVideoTracks = makeNative(function() { return []; }, 'getVideoTracks');
  MediaStream.prototype.getTracks = makeNative(function() { return this._tracks; }, 'getTracks');
  MediaStream.prototype.addTrack = makeNative(function(track) { this._tracks.push(track); }, 'addTrack');
  MediaStream.prototype.removeTrack = makeNative(function(track) {
    this._tracks = this._tracks.filter(t => t !== track);
  }, 'removeTrack');
  MediaStream.prototype.clone = makeNative(function() { return new MediaStream(); }, 'clone');
  MediaStream.prototype.getVideoTracks = makeNative(function() { return []; }, 'getVideoTracks');
  MediaStream.prototype.getAudioTracks = makeNative(function() {
    return [{
      enabled: true,
      kind: 'audio',
      id: 'default-audio-track',
      label: '',
      muted: false,
      readyState: 'live'
    }];
  }, 'getAudioTracks');

  // ── RTCPeerConnection ──
  function RTCPeerConnection(config) {
    this.localDescription = null;
    this.remoteDescription = null;
    this.currentLocalDescription = null;
    this.currentRemoteDescription = null;
    this.pendingLocalDescription = null;
    this.pendingRemoteDescription = null;
    this.iceConnectionState = 'new';
    this.iceGatheringState = 'new';
    this.signalingState = 'stable';
    this.connectionState = 'new';
    this._listeners = {};
    this._dataChannel = null;

    // 模拟 ICE 候选
    const pc = this;
    global.setTimeout(function() {
      pc._simulateIce();
    }, 50);
  }
  makeNative(RTCPeerConnection, 'RTCPeerConnection');

  RTCPeerConnection.prototype = {
    createOffer: makeNative(function createOffer(options) {
      const pc = this;
      return new Promise(function(resolve) {
        global.setTimeout(function() {
          pc.signalingState = 'have-local-offer';
          const desc = new RTCSessionDescription({
            type: 'offer',
            sdp: cfg.iceSdp || `v=0\r\no=- 0 0 IN IP4 0.0.0.0\r\ns=-\r\nt=0 0\r\na=group:BUNDLE 0\r\na=msid-semantic: WMS\r\nm=application 9 UDP/DTLS/SCTP webrtc-datachannel\r\nc=IN IP4 0.0.0.0\r\na=ice-ufrag:${cfg.iceUfrag || 'test'}\r\na=ice-pwd:${cfg.icePwd || 'test'}\r\na=fingerprint:sha-256 ${cfg.fingerprint || '00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00:00'}\r\na=setup:actpass\r\na=mid:0\r\na=sctp-port:5000\r\na=max-message-size:262144\r\n`
          });
          resolve(desc);
        }, 10);
      });
    }, 'createOffer'),

    createAnswer: makeNative(function createAnswer() {
      const pc = this;
      return new Promise(function(resolve) {
        global.setTimeout(function() {
          const desc = new RTCSessionDescription({
            type: 'answer',
            sdp: cfg.iceSdp || 'v=0\r\n...'
          });
          resolve(desc);
        }, 10);
      });
    }, 'createAnswer'),

    setLocalDescription: makeNative(function setLocalDescription(desc) {
      const pc = this;
      return new Promise(function(resolve) {
        pc.localDescription = desc;
        pc.signalingState = desc.type === 'offer' ? 'have-local-offer' : 'stable';
        resolve();
      });
    }, 'setLocalDescription'),

    setRemoteDescription: makeNative(function setRemoteDescription(desc) {
      const pc = this;
      return new Promise(function(resolve) {
        pc.remoteDescription = desc;
        resolve();
      });
    }, 'setRemoteDescription'),

    addIceCandidate: makeNative(function addIceCandidate(candidate) {
      return Promise.resolve();
    }, 'addIceCandidate'),

    createDataChannel: makeNative(function createDataChannel(label, options) {
      this._dataChannel = new RTCDataChannel();
      this._dataChannel.label = label || '';
      return this._dataChannel;
    }, 'createDataChannel'),

    close: makeNative(function close() {
      this.iceConnectionState = 'closed';
      this.signalingState = 'closed';
      this.connectionState = 'closed';
    }, 'close'),

    getSenders: makeNative(function getSenders() { return []; }, 'getSenders'),
    getReceivers: makeNative(function getReceivers() { return []; }, 'getReceivers'),
    getTransceivers: makeNative(function getTransceivers() { return []; }, 'getTransceivers'),

    addEventListener: makeNative(function(type, cb) {
      if (!this._listeners[type]) this._listeners[type] = [];
      this._listeners[type].push(cb);
    }, 'addEventListener'),

    removeEventListener: makeNative(function(type, cb) {
      if (!this._listeners[type]) return;
      this._listeners[type] = this._listeners[type].filter(c => c !== cb);
    }, 'removeEventListener'),

    _simulateIce: makeNative(function _simulateIce() {
      this.iceGatheringState = 'gathering';
      // 产生一个 ICE 候选（本地 IP 泄漏模拟）
      if (this._listeners['icecandidate']) {
        const candidate = new RTCIceCandidate({
          candidate: `candidate:1 1 UDP 2122252543 ${cfg.localIP || '192.168.1.101'} ${cfg.localPort || 55234} typ host`,
          sdpMid: '0',
          sdpMLineIndex: 0
        });
        for (const cb of this._listeners['icecandidate']) {
          cb({ candidate, target: this });
        }
      }
      // 候选结束
      this.iceGatheringState = 'complete';
      if (this._listeners['icecandidate']) {
        for (const cb of this._listeners['icecandidate']) {
          cb({ candidate: null, target: this });
        }
      }
      // 连接
      this.iceConnectionState = 'connected';
      this.connectionState = 'connected';
    }, '_simulateIce')
  };

  // ── 安装 ──
  sandbox.RTCPeerConnection = RTCPeerConnection;
  sandbox.RTCSessionDescription = RTCSessionDescription;
  sandbox.RTCIceCandidate = RTCIceCandidate;
  sandbox.RTCDataChannel = RTCDataChannel;
  sandbox.MediaStream = MediaStream;
  sandbox.MediaStreamTrack = function MediaStreamTrack() {};
  makeNative(sandbox.MediaStreamTrack, 'MediaStreamTrack');
  sandbox.MediaDeviceInfo = function MediaDeviceInfo() {};
  makeNative(sandbox.MediaDeviceInfo, 'MediaDeviceInfo');
}

module.exports = { install };

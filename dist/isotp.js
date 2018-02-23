"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require('events');
var isotp_wrap_1 = require('./isotp_wrap');
var Socket = (function (_super) {
    __extends(Socket, _super);
    function Socket(iface, tx, rx) {
        var _this = this;
        _super.call(this);
        this._handle = new isotp_wrap_1.ISOTPWrap();
        this._handle.onSent(function (err) { _this._onSent(err); });
        this._handle.onMessage(function (buffer) { _this.emit('message', buffer); });
        this._handle.onError(function (err) { _this.emit('error', err); });
        this._sendQueue = [];
        this._bound = false;
        if (iface && tx && rx) {
            this.bind(iface, tx, rx);
        }
    }
    Socket.prototype.bind = function (iface, tx, rx) {
        if (this._bound) {
            throw new Error('Socket is already bound');
        }
        this._healthCheck();
        var err = this._handle.bind(iface, tx, rx);
        if (err != 0) {
            throw new Error('Failed to bind: ' + err);
        }
        console.log("bindoo");
        this._bound = true;
        return this;
    };
    Socket.prototype.send = function (buffer, callback) {
        if (!(buffer instanceof Buffer)) {
            buffer = new Buffer(buffer);
        }
        var castedBuffer = buffer;
        this._healthCheck();
        var sending = this._sendQueue.length > 0;
        this._sendQueue.push({ buffer: castedBuffer, callback: callback });
        if (!sending) {
            this._handle.send(castedBuffer);
        }
    };
    Socket.prototype.setFilter = function (filter, mask) {
        this._healthCheck();
        this._handle.setFilter(filter >>> 0, mask);
    };
    Socket.prototype.close = function () {
        this._healthCheck();
        this._handle.close();
        this._handle = undefined;
        this.emit('close');
    };
    Socket.prototype.ref = function () {
        this._healthCheck();
        this._handle.ref();
    };
    Socket.prototype.unref = function () {
        this._healthCheck();
        this._handle.unref();
    };
    Socket.prototype._onSent = function (err) {
        console.log("onSent", err);
        var sent = this._sendQueue[0];
        if (sent.callback) {
            sent.callback(err);
        }
        this._sendQueue.shift();
        var next = this._sendQueue[0];
        if (next) {
            this._handle.send(next.buffer);
        }
    };
    Socket.prototype._healthCheck = function () {
        if (!this._handle) {
            throw new Error('Not running');
        }
    };
    return Socket;
}(events_1.EventEmitter));
exports.Socket = Socket;
function createSocket(iface, tx, rx) { return new Socket(iface, tx, rx); }
exports.createSocket = createSocket;
exports.EFF_FLAG = 0x80000000;
exports.RTR_FLAG = 0x40000000;
exports.ERR_FLAG = 0x20000000;
exports.SFF_MASK = 0x7FF;
exports.EFF_MASK = 0x1FFFFFFF;
exports.ERR_MASK = 0x1FFFFFFF;

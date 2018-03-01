"use strict";
var __extends = (this && this.__extends) || function (d, b) {
    for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p];
    function __() { this.constructor = d; }
    d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
};
var events_1 = require('events');
var isotp_wrap_1 = require('./isotp_wrap');
var IsoTpSocket = (function (_super) {
    __extends(IsoTpSocket, _super);
    function IsoTpSocket(iface, tx, rx) {
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
    IsoTpSocket.prototype.bind = function (iface, tx, rx) {
        if (this._bound) {
            throw new Error('IsoTpSocket is already bound');
        }
        this._healthCheck();
        var err = this._handle.bind(iface, tx, rx);
        if (err != 0) {
            throw new Error('Failed to bind: ' + err);
        }
        this._bound = true;
        return this;
    };
    IsoTpSocket.prototype.send = function (buffer, callback) {
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
    IsoTpSocket.prototype.close = function () {
        this._healthCheck();
        this._handle.close();
        this._handle = undefined;
        this.emit('close');
    };
    IsoTpSocket.prototype.ref = function () {
        this._healthCheck();
        this._handle.ref();
    };
    IsoTpSocket.prototype.unref = function () {
        this._healthCheck();
        this._handle.unref();
    };
    IsoTpSocket.prototype._onSent = function (err) {
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
    IsoTpSocket.prototype._healthCheck = function () {
        if (!this._handle) {
            throw new Error('Not running');
        }
    };
    return IsoTpSocket;
}(events_1.EventEmitter));
exports.IsoTpSocket = IsoTpSocket;

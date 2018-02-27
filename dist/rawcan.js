"use strict";
function __export(m) {
    for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
}
var can_1 = require('./can');
var isotp_1 = require('./isotp');
__export(require('./can'));
__export(require('./isotp'));
exports.CAN_RAW = 1;
exports.CAN_ISOTP = 6;
function createSocket(iface, type, tx, rx) {
    if (type === exports.CAN_ISOTP) {
        if (!tx || !rx)
            throw new Error("Arguments tx and rx must not be undefined!");
        return new isotp_1.IsoTpSocket(iface, tx, rx);
    }
    else {
        return new can_1.CanSocket(iface);
    }
}
exports.createSocket = createSocket;

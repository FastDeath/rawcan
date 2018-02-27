# rawcan
[![Build Status](https://travis-ci.org/FastDeath/rawcan.svg?branch=master)](https://travis-ci.org/FastDeath/rawcan)

Requires the [can-isotp](https://github.com/hartkopp/can-isotp) kernel module to be installed for ISO 15765-2 Transport Protocol support.

*Modifications in progress*

Lightweight asynchronous Node.js bindings for SocketCAN. SocketCAN is a socket based implementation of the CAN bus protocol for the Linux kernel, developed primarily by VW.

### Raw CAN-Bus frames

```javascript
import * as can from 'rawcan';

const socket = can.createSocket('vcan0', can.CAN_RAW);

socket.on('error', err => { console.log('socket error: ' + err); });
socket.on('message', (id, buffer) => {
  console.log('received frame [' + id.toString(16) + '] ' + buffer.toString('hex'));
});

socket.send(can.EFF_FLAG | 0x23c89f, 'hello');
```

### ISO 15765-2 Transport Protocol

```javascript
const socket = can.createSocket('vcan0', can.CAN_ISOTP, 0x7df, 0x7e8);

socket.on('error', err => { console.log('socket error: ' + err); });
socket.on('message', (buffer) => {
  console.log('received datagram', buffer.toString('hex'));
});

socket.send('Hello ISO-15765-2 world!');
```

Installing
----------

Follow the steps outlined in [README.isotp](https://github.com/hartkopp/can-isotp/blob/master/README.isotp) to build and install  the [can-isotp](https://github.com/hartkopp/can-isotp) kernel module.

~This package is published to npm, so installing is as simple as:~ *Not this version yet, unfortunately*

```
$ npm install rawcan
```

Typescript bindings are included, so Typescript should just work.

Development
-----------

The workflow is mostly standard for a node addon. There is a native component, so a c++ compiler and make are required. In Ubuntu these dependencies can be installed by running the following in your shell

```
$ sudo aptitude install build-essential
```

After you have cloned the repo, run the following to install the npm dependencies and build the code:

```
$ npm install
$ npm run build
```

Running the tests requires a virtual CAN network interface called vcan0.

```
$ sudo modprobe vcan
$ sudo ip link add type vcan
$ sudo ip link set vcan0 up
```

Then the tests can be run with npm

```
$ npm test
```

How is this different from node-can?
------------------------------------

There is another node package for SocketCAN called [node-can](https://github.com/sebi2k1/node-can) (socketcan in npm). The main difference is that node-can is not evented- sends are synchronous and receives are done on a separate thread. By contrast, this package ties into the libuv based node event system, which uses epoll under the hood. node-can also has some messaging features, while this package is strictly a thin wrapper around raw CAN sockets.

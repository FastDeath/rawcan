import {EventEmitter} from 'events';
import {CanSocket} from './can';
import {IsoTpSocket} from './isotp';
// export {CanSocket, IsoTpSocket};

export * from './can';
export * from './isotp';

export const CAN_RAW: number = 1; // RAW sockets
export const CAN_ISOTP: number = 6; // ISO 15765-2 Transport Protocol

export function createSocket(iface?: string, type?: number, tx?: number, rx?: number): EventEmitter {
  if (type === CAN_ISOTP) {
    if (!tx || !rx)
      throw new Error("Arguments tx and rx must not be undefined!");
    return new IsoTpSocket(iface, tx, rx);
  } else {
    return new CanSocket(iface);
  }
}


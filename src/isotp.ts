/// <library path="../typings/main.d.ts"/>
import {EventEmitter} from 'events';
/// <reference path="./isotp_wrap.d.ts"/>
import {ISOTPWrap} from './isotp_wrap';

interface SendRequest {
  buffer: Buffer;
  callback: (err: number) => void;
}

export class IsoTpSocket extends EventEmitter {
  private _handle: ISOTPWrap;
  private _bound: boolean;
  private _sendQueue: SendRequest[];

  constructor(iface?: string, tx?: number, rx?: number) {
    super();
    this._handle = new ISOTPWrap();
    this._handle.onSent((err) => { this._onSent(err); });
    this._handle.onMessage(
        (buffer) => { this.emit('message', buffer); });
    this._handle.onError((err) => { this.emit('error', err); });
    this._sendQueue = [];
    this._bound = false;
    if (iface && tx && rx) {
      this.bind(iface, tx, rx);
    }
  }

  bind(iface: string, tx: number, rx: number): IsoTpSocket {
    if (this._bound) {
      throw new Error('IsoTpSocket is already bound');
    }

    this._healthCheck();
    
    const err = this._handle.bind(iface, tx, rx);
    if (err != 0) {
      throw new Error('Failed to bind: ' + err);
    }

    this._bound = true;
    return this;
  }

  send(buffer: string | Buffer | number[], callback?: (err: number) => void): void {
    if (!(buffer instanceof Buffer)) {
      buffer = new Buffer(<any>buffer);
    }
    const castedBuffer = <Buffer>buffer;

    this._healthCheck();
    const sending = this._sendQueue.length > 0;
    this._sendQueue.push({buffer: castedBuffer, callback: callback});

    if (!sending) {
      this._handle.send(castedBuffer);
    }
  }

  close(): void {
    this._healthCheck();
    this._handle.close();
    this._handle = undefined;
    this.emit('close');
  }

  ref(): void {
    this._healthCheck();
    this._handle.ref();
  }

  unref(): void {
    this._healthCheck();
    this._handle.unref();
  }

  _onSent(err: number): void {
    const sent = this._sendQueue[0];
    if (sent.callback) {
      sent.callback(err);
    }
    this._sendQueue.shift();
    const next = this._sendQueue[0];
    if (next) {
      this._handle.send(next.buffer);
    }
  }

  _healthCheck(): void {
    if (!this._handle) {
      throw new Error('Not running');
    }
  }
}
/// <reference path="../typings/main.d.ts"/>

export declare class ISOTPWrap {
  constructor();
  bind(iface: string, tx: number, rx: number): number;
  send(buffer: Buffer): void;
  close(): void;
  onSent(callback: (err: number) => void): void;
  onMessage(callback: (id: number, message: Buffer) => void): void;
  onError(callback: (err: number) => void): void;
  ref(): void;
  unref(): void;
}

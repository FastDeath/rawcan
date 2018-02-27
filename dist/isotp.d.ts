import { EventEmitter } from 'events';
export declare class IsoTpSocket extends EventEmitter {
    private _handle;
    private _bound;
    private _sendQueue;
    constructor(iface?: string, tx?: number, rx?: number);
    bind(iface: string, tx: number, rx: number): IsoTpSocket;
    send(buffer: string | Buffer | number[], callback?: (err: number) => void): void;
    close(): void;
    ref(): void;
    unref(): void;
    _onSent(err: number): void;
    _healthCheck(): void;
}

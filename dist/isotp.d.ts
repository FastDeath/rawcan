import { EventEmitter } from 'events';
export declare class Socket extends EventEmitter {
    private _handle;
    private _bound;
    private _sendQueue;
    constructor(iface?: string, tx?: number, rx?: number);
    bind(iface: string, tx: number, rx: number): Socket;
    send(buffer: string | Buffer | number[], callback?: (err: number) => void): void;
    setFilter(filter: number, mask: number): void;
    close(): void;
    ref(): void;
    unref(): void;
    _onSent(err: number): void;
    _healthCheck(): void;
}
export declare function createSocket(iface?: string, tx?: number, rx?: number): Socket;
export declare const EFF_FLAG: number;
export declare const RTR_FLAG: number;
export declare const ERR_FLAG: number;
export declare const SFF_MASK: number;
export declare const EFF_MASK: number;
export declare const ERR_MASK: number;

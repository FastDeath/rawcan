import { EventEmitter } from 'events';
export * from './can';
export * from './isotp';
export declare const CAN_RAW: number;
export declare const CAN_ISOTP: number;
export declare function createSocket(iface?: string, type?: number, tx?: number, rx?: number): EventEmitter;

import { GrapevineError } from "..";

export interface IResult<T = undefined> {
    event: string;
    ref?: string;
    status: string;
    payload?: T;
    error?: string;
}

export interface IPacket {
    event: string;
    ref?: string;
}

export type IAuthResult = IResult<{ unicode: string; version: string }>;

export interface IEvents {
    heartbeat(): void;
    restart(downtime: number): void;
    disconnected(error?: { code: number; reason: string }): void;
    connected(): void;
}
export interface IAuthenticate {
    client_id: string;
    client_secret: string;
    supports: string[];
    channels: string[];
    version: string;
    user_agent: string;
}

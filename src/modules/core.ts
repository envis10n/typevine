export interface IResult<T = undefined> {
    event: string;
    ref?: string;
    status: string;
    payload?: T;
    error?: string;
}

export type IAuthResult = IResult<{ unicode: string; version: string }>;

export interface IEvents {
    heartbeat(): void;
    restart(downtime: number): void;
    broadcast(): void;
    gameConnect(game: string): void;
    gameDisconnect(game: string): void;
}
export interface IAuthenticate {
    client_id: string;
    client_secret: string;
    supports: string[];
    channels: string[];
    version: string;
    user_agent: string;
}

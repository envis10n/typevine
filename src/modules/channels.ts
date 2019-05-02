export interface IBroadcast {
    ref: string;
    channel: string;
    message: string;
    game: string;
    name: string;
}

export interface IMessage {
    channel: string;
    name: string;
    message: string;
}

export interface IEvents {
    broadcast(payload: IBroadcast): void;
}

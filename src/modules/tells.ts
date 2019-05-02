export interface ITellSend {
    ref: string;
    from_name: string;
    to_game: string;
    to_name: string;
    sent_at: string;
    message: string;
}

export interface ITellReceive extends ITellSend {
    from_game: string;
}

export interface IEvents {
    receive(payload: ITellReceive): void;
}

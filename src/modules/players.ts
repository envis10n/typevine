export interface ISignIn {
    game: string;
    name: string;
}

export type ISignOut = ISignIn;

export interface IStatus {
    game: string;
    players: string[];
}

export interface IEvents {
    signIn(payload: ISignIn): void;
    signOut(payload: ISignOut): void;
    status(payload: IStatus): void;
}

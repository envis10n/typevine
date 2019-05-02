export interface IConnect {
    type: string;
    host: string;
    port: number;
}

export interface IStatus {
    ref: string;
    game: string;
    display_name: string;
    description: string;
    homepage_url: string;
    user_agent: string;
    user_agent_repo_url: string;
    connections: IConnect[];
    supports: string[];
    players_online_count: number;
}

export interface IEvents {
    connect(game: string): void;
    disconnect(game: string): void;
}

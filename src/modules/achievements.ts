export interface IAchievement {
    title: string;
    description: string;
    points: number;
    display: boolean;
    partial_progress: boolean;
    total_progress: number | null;
}

export interface IAchievementCreate {
    title?: string;
    description?: string;
    points?: number;
    display?: boolean;
    partial_progress?: boolean;
    total_progress?: number | null;
}

export interface IAchievementUpdate extends IAchievementCreate {
    key: string;
}

export interface IResult {
    event: string;
    ref: string;
    status: string;
    payload: IAchievementResponse;
}

export interface IAchievementResponse extends IAchievement {
    key: string;
    errors?: {
        [key: string]: string[];
    };
}

export interface IResultDelete {
    event: string;
    ref: string;
    status: string;
    payload: {
        key: string;
        errors?: {
            [key: string]: string[];
        };
    };
}

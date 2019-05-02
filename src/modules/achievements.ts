export interface IAchievement {
    key: string;
    title: string;
    description: string;
    points: number;
    display: boolean;
    partial_progress: boolean;
    total_progress: number | null;
}

export function parseAs<T extends {}>(json: string): T {
    return JSON.parse(json) as T;
}

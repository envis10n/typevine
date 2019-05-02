/*
    GRAPEVINE NODE INTEGRATION - https://grapevine.haus
    envis10n <envis10n@protonmail.com> - https://github.com/envis10n
    Mud Coders Guild - https://mudcoders.com
    Join us on slack! https://slack.mudcoders.com
    @@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    @@@@@//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@(/@@@@@@@@@@@@@@@@@@@@@@@@@@
    @@@@@@//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    @@@@@@@//@@@@@@/////%@///(///@@@@////@@@@//@//%@@@@@/////@@//@@@@//@@@///&@@@@//(///@@@@@/////@@@@@
    @@@@@@@@//@@@@//@@%/%@@@//@@//@@@@@@//@@@///@//&@@@//@@@//@@//@@//@@@@@//&@@@@///@@%/%@@//@@@//@@@@
    @@@@@@@//@@@@//@@@#/%@@@//@@@@@@//////@@@//@@@//@@////////@@@//%/#@@@@@//%@@@@//@@@#/%@////////@@@@
    @@@@@@//@@@@@@//@&//%@@@//@@@@@(/(@@//@@@//@@//&@@@//@@@@@@@@////@@@@@@//%@@@@//@@@#/%@@//@@@@@@@@@
    @@@@@//@@@@@@@@///%/%@/////@@@@@(///@//@@/////%@@@@@/////@@@@@//@@@@@%/////@@@//@@@%/%@@@/////@@@@@
    @@@@@@@@@@@@@@@@@&//@@@@@@@@@@@@@@@@@@@@@//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
    @@@@@@@@@@@@@@@////@@@@@@@@@@@@@@@@@@@@@@//@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@@
*/
import { EventEmitter as EE } from "ee-ts";
import { v4 } from "uuid";
import WebSocket from "ws";

// Grapevine Modules
import * as Achievements from "./modules/achievements";
import * as Channels from "./modules/channels";
import * as Core from "./modules/core";
import * as Games from "./modules/games";
import * as Players from "./modules/players";
import * as Tells from "./modules/tells";

interface IEventContainer {
    core: EE<Core.IEvents>;
    channels: EE<Channels.IEvents>;
    players: EE<Players.IEvents>;
    tells: EE<Tells.IEvents>;
}

type Resolver = (arg: any) => void;

export class Typevine {
    public events: IEventContainer = {
        channels: new EE(),
        core: new EE(),
        players: new EE(),
        tells: new EE(),
    };
    private clientID: string = "";
    private clientSecret: string = "";
    private socket: WebSocket;
    private channels: string[] = [];
    private eventCache: { [key: string]: Resolver } = {};
    private refCache: Map<string, Resolver> = new Map();
    constructor(
        private supports: string[],
        public readonly userAgent: string = "Typevine 0.0.1-dev",
        public readonly version: string = "2.3.0",
    ) {
        this.socket = new WebSocket("wss://grapevine.haus/socket");
    }
    public setChannels(channels: string[]): void {
        this.channels = channels;
    }
    public async authenticate(
        id: string,
        secret: string,
    ): Promise<Core.IAuthResult> {
        return this.waitEvent("authenticate", {
            channels: this.channels,
            client_id: this.clientID,
            client_secret: this.clientSecret,
            supports: this.supports,
            user_agent: this.userAgent,
            version: this.version,
        });
    }
    public async subscribe(channel: string): Promise<Core.IResult> {
        return this.sendWithRef({
            event: "channels/subscribe",
            payload: {
                channel,
            },
        });
    }
    public heartbeat(players?: string[]): void {
        this.sendToVine({
            event: "heartbeat",
            payload: {
                players,
            },
        });
    }
    public async unsubscribe(channel: string): Promise<Core.IResult> {
        return this.sendWithRef({
            event: "channels/unsubscribe",
            payload: {
                channel,
            },
        });
    }
    public async signIn(name: string): Promise<Core.IResult> {
        return this.sendWithRef({
            event: "players/sign-in",
            payload: {
                name,
            },
        });
    }
    public async signOut(name: string): Promise<Core.IResult> {
        return this.sendWithRef({
            event: "players/sign-out",
            payload: {
                name,
            },
        });
    }
    public playerStatus(): void {
        this.sendWithRef({
            event: "players/status",
        });
    }
    public async gameStatus(
        game: string,
    ): Promise<Core.IResult<Games.IStatus>> {
        return this.sendWithRef({
            event: "games/status",
            payload: {
                game,
            },
        });
    }
    public async send(
        from: string,
        to: string,
        game: string,
        message: string,
    ): Promise<Core.IResult> {
        return this.sendWithRef({
            event: "tells/send",
            payload: {
                from_name: from,
                message,
                sent_at: new Date().toISOString(),
                to_game: game,
                to_name: to,
            },
        });
    }
    public async syncAchievements(): Promise<
        Core.IResult<Achievements.IAchievementResponse[]>
    > {
        return this.sendWithRef({
            event: "achievements/sync",
        });
    }
    public async createAchievement(
        achievement: Achievements.IAchievementCreate,
    ): Promise<Achievements.IResult> {
        return this.sendWithRef({
            event: "achievements/create",
            payload: achievement,
        });
    }
    public async updateAchievement(
        update: Achievements.IAchievementUpdate,
    ): Promise<Achievements.IResult> {
        return this.sendWithRef({
            event: "achievements/update",
            payload: update,
        });
    }
    public async deleteAchievement(
        key: string,
    ): Promise<Achievements.IResultDelete> {
        return this.sendWithRef({
            event: "achievements/delete",
            payload: {
                key,
            },
        });
    }
    private sendToVine(data: IObjectAny): boolean {
        if (this.socket.readyState === 1) {
            // Good to send (READYSTATE OPEN)
            this.socket.send(JSON.stringify(data));
            return true;
        } else {
            return false;
        }
    }
    private async sendWithRef<T>(data: IObjectAny): Promise<T> {
        return new Promise((resolve, reject) => {
            const ref = v4();
            data.ref = ref;
            this.refCache.set(ref, (arg) => {
                this.refCache.delete(ref);
                resolve(arg as T);
            });
            const sent: boolean = this.sendToVine(data);
            if (!sent) {
                reject("Unable to send.");
            }
        });
    }
    private waitEvent<T>(event: string, data: object): Promise<T> {
        return new Promise((resolve, reject) => {
            this.eventCache[event] = (arg) => {
                this.eventCache[event] = undefined;
                resolve(arg as T);
            };
            this.sendToVine(data);
        });
    }
}

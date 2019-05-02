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
import { parseAs } from "./lib/json";

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
    games: EE<Games.IEvents>;
}

type Resolver = (arg: any) => void;

export class Typevine {
    public events: IEventContainer = {
        channels: new EE(),
        core: new EE(),
        games: new EE(),
        players: new EE(),
        tells: new EE(),
    };
    private clientID: string = "";
    private clientSecret: string = "";
    private socket: WebSocket;
    private channels: string[] = [];
    private eventCache: { [key: string]: Resolver } = {};
    private refCache: Map<string, Resolver> = new Map();
    private restart?: number;
    constructor(
        private supports: string[],
        public readonly userAgent: string = "Typevine 0.0.1-dev",
        public readonly version: string = "2.3.0",
    ) {
        this.setupSocket();
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
    private async setupSocket(): Promise<void> {
        this.socket = new WebSocket("wss://grapevine.haus/socket");
        this.socket.on("close", (code, reason) => {
            this.events.core.emit("disconnected");
            if (this.restart !== undefined) {
                setTimeout(this.setupSocket, this.restart + 20 * 1000);
            }
        });
        this.socket.on("open", () => {
            if (this.restart !== undefined) {
                this.restart = undefined;
            }
            this.events.core.emit("connected");
        });
        this.socket.on("message", (data) => {
            if (typeof data !== "string") {
                data = data.toString();
            }
            try {
                const dobj: Core.IPacket = parseAs(data);
                if (dobj.ref !== undefined) {
                    const resolver = this.refCache.get(dobj.ref);
                    if (resolver !== undefined) {
                        resolver(dobj);
                        return;
                    }
                }
                const event = dobj.event.split("/");
                const mod = event[0];
                const evCall = this.eventCache[mod];
                if (evCall !== undefined) {
                    evCall(dobj as any);
                    return;
                }
                const modevent = event[1];
                switch (mod) {
                    case "channels":
                        switch (modevent) {
                            case "broadcast":
                                this.events.channels.emit(
                                    "broadcast",
                                    (dobj as any).payload as Channels.IBroadcast,
                                );
                                break;
                        }
                        break;
                    case "players":
                        switch (modevent) {
                            case "sign-in":
                                this.events.players.emit("signIn", (dobj as any)
                                    .payload as Players.ISignIn);
                                break;
                            case "sign-out":
                                this.events.players.emit(
                                    "signOut",
                                    (dobj as any).payload as Players.ISignOut,
                                );
                                break;
                            case "status":
                                this.events.players.emit("status", (dobj as any)
                                    .payload as Players.IStatus);
                                break;
                        }
                        break;
                    case "tells":
                        switch (modevent) {
                            case "receive":
                                this.events.tells.emit("receive", (dobj as any)
                                    .payload as Tells.ITellReceive);
                                break;
                        }
                        break;
                    case "games":
                        switch (modevent) {
                            case "connect":
                            case "disconnect":
                                this.events.games.emit(
                                    modevent,
                                    (dobj as any).payload.game,
                                );
                                break;
                        }
                        break;
                    case "heartbeat":
                        this.events.core.emit("heartbeat");
                        break;
                    case "restart":
                        this.events.core.emit("restart", (dobj as any).payload
                            .duration as number);
                        this.restart = (dobj as any).payload.duration as number;
                        break;
                }
            } catch (e) {
                //
            }
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

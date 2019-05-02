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

type Resolver = (arg: any) => void;

export class Typevine {
    public events: EE<Core.IEvents> = new EE<Core.IEvents>();
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
        });
    }
}

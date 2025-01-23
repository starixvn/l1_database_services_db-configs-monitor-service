import type { BaseLogger } from "@ldb/logger";
import type { ChangeStreamNameSpace, MongoClient } from "@ldb/mongo";
import { Dispatcher } from "@ldb/utils";
import type { ConfigWatcherEvents, EventSchema, GameConfig, IndexInitiatorEvents } from "../types/index.js";
import type { ConfigWatcher } from "../watchers/config-watcher.js";

export class IndexInitiator extends Dispatcher<IndexInitiatorEvents, ConfigWatcherEvents> {
    constructor(
        private readonly watcherMongo: MongoClient,
        logger: BaseLogger,
    ) {
        super(logger);
        this.selfBound();
    }

    private selfBound() {
        this.initiate = this.initiate.bind(this);
    }

    private initiate(...args: Parameters<ConfigWatcherEvents["INDEX"]>) {
        const [, index, cascadedNs] = args;

        for (const namespace of cascadedNs.GAME) {
            const { db: gameDB } = namespace;
            this.indexInitiator(gameDB, index, namespace);
        }
    }

    private async indexInitiator(db: string, doc: Omit<EventSchema["INDEX"], "dbs">, gameConfigsNamespace: ChangeStreamNameSpace) {
        const { type, data } = doc;
        const gameConfigsCursor = this.getGameConfigs(type, gameConfigsNamespace);

        for await (const { name } of gameConfigsCursor) {
            for (const { postfix, idxs } of data) {
                const coll = `${name}${postfix}`;
                this.emit("DEPLOY_INDEX", { db, coll }, Object.values(idxs), false);
            }
        }
    }

    private getGameConfigs(type: number, gameConfigsNamespace: ChangeStreamNameSpace) {
        const { db, coll } = gameConfigsNamespace;
        return this.watcherMongo
            .db(db)
            .collection<GameConfig>(coll)
            .find({ type }, { projection: { _id: 0, gameId: 1, name: 1, type: 1 } });
    }

    subscribe(publisher: ConfigWatcher): boolean {
        return [
            super.subscribe(publisher, "INDEX", this.initiate), //
        ].every(Boolean);
    }

    unsubscribe(publisher: ConfigWatcher): boolean {
        return [
            super.unsubscribe(publisher, "INDEX", this.initiate), //
        ].every(Boolean);
    }
}

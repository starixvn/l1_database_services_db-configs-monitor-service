import type { BaseLogger } from "@ldb/logger";
import type { ChangeStreamNameSpace, MongoClient } from "@ldb/mongo";
import { Dispatcher, type GenericListener } from "@ldb/utils";
import type { ArchiveInitiatorEvents, ConfigWatcherEvents, EventSchema, GameConfig } from "../types/index.js";
import { archiveTemplater } from "../utils/archive-templater.js";
import type { ConfigWatcher } from "../watchers/config-watcher.js";

export class ArchiveInitiator extends Dispatcher<ArchiveInitiatorEvents, ConfigWatcherEvents> {
    private readonly initiators: Record<string, GenericListener> = {};

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

    private initiate(...args: Parameters<ConfigWatcherEvents["ARCHIVE"]>) {
        const [, archive, cascadedNs] = args;

        for (const namespace of cascadedNs.GAME) {
            const { db: gameDB } = namespace;
            this.archiveInitiator(gameDB, archive, namespace);
        }
    }

    private async archiveInitiator(db: string, doc: Omit<EventSchema["ARCHIVE"], "dbs">, gameConfigsNamespace: ChangeStreamNameSpace) {
        const { type, data, targets } = doc;
        const gameConfigsCursor = this.getGameConfigs(type, gameConfigsNamespace);

        for await (const gameConfig of gameConfigsCursor) {
            const configs = data.map((template) => archiveTemplater("games", db, gameConfig, template));
            for (const target of targets) {
                this.emit("DEPLOY_ARCHIVE", target, configs, false);
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
            super.subscribe(publisher, "ARCHIVE", this.initiate), //
        ].every(Boolean);
    }

    unsubscribe(publisher: ConfigWatcher): boolean {
        return [
            super.unsubscribe(publisher, "ARCHIVE", this.initiate), //
        ].every(Boolean);
    }
}

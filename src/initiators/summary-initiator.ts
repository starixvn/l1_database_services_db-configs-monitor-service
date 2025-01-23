import type { BaseLogger } from "@ldb/logger";
import type { ChangeStreamNameSpace, MongoClient } from "@ldb/mongo";
import { Dispatcher } from "@ldb/utils";
import type { ConfigWatcherEvents, EventSchema, GameConfig, SummaryInitiatorEvents } from "../types/index.js";
import { summaryTemplater } from "../utils/summary-templater.js";
import type { ConfigWatcher } from "../watchers/config-watcher.js";

export class SummaryInitiator extends Dispatcher<SummaryInitiatorEvents, ConfigWatcherEvents> {
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

    private initiate(...args: Parameters<ConfigWatcherEvents["SUMMARY"]>) {
        const [, summary, cascadedNs] = args;

        for (const namespace of cascadedNs.GAME) {
            const { db: gameDB } = namespace;
            this.summaryInitiator(gameDB, summary, namespace);
        }
    }

    private async summaryInitiator(db: string, doc: Omit<EventSchema["SUMMARY"], "dbs">, gameConfigsNamespace: ChangeStreamNameSpace) {
        const { type, data, targets } = doc;
        const gameConfigsCursor = this.getGameConfigs(type, gameConfigsNamespace);

        for await (const gameConfig of gameConfigsCursor) {
            const configs = data.map((template) => summaryTemplater("games", db, gameConfig, template));
            for (const target of targets) {
                this.emit("DEPLOY_SUMMARY", target, configs, false);
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
            super.subscribe(publisher, "SUMMARY", this.initiate), //
        ].every(Boolean);
    }

    unsubscribe(publisher: ConfigWatcher): boolean {
        return [
            super.unsubscribe(publisher, "SUMMARY", this.initiate), //
        ].every(Boolean);
    }
}

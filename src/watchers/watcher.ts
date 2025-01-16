import type { BaseLogger } from "@ldb/logger";
import {
    type ChangeStreamDeleteDocument,
    type ChangeStreamInsertDocument,
    type ChangeStreamReplaceDocument,
    type ChangeStreamUpdateDocument,
    type CollectionAggregationPipeline,
    type Document,
    type MongoClient,
} from "@ldb/mongo";
import { ClusterWatcher } from "@ldb/watcher";
import type { WatcherEventType } from "../types/event-types.js";
import type { GameConfig } from "../types/game-configs.js";
import type { WatcherEvents } from "../types/watcher-configs.js";

export class Watcher extends ClusterWatcher<WatcherEvents> {
    constructor(
        private readonly watcherMongo: MongoClient,
        private readonly watcherConfigs: Map<string, WatcherEventType>,
        watcherPipeline: CollectionAggregationPipeline,
        logger: BaseLogger,
    ) {
        super(watcherMongo, watcherPipeline, logger);
    }

    protected handleDocumentDelete(changeDocument: ChangeStreamDeleteDocument<Document>): void {
        const { ns } = changeDocument;
        const { db, coll } = ns;
        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_delete`, ns, changeDocument);
    }

    protected handleDocumentInsert(changeDocument: ChangeStreamInsertDocument<Document>): void {
        const { ns } = changeDocument;
        const { db, coll } = ns;
        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_insert`, ns, changeDocument);
    }

    protected handleDocumentUpdate(changeDocument: ChangeStreamUpdateDocument<Document>): void {
        const { ns } = changeDocument;
        const { db, coll } = ns;
        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_update`, ns, changeDocument);
    }

    protected handleDocumentReplace(changeDocument: ChangeStreamReplaceDocument<Document>): void {
        const { ns } = changeDocument;
        const { db, coll } = ns;
        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_replace`, ns, changeDocument);
    }

    async initiate() {
        for (const [ns, event] of this.watcherConfigs.entries()) {
            if (event !== "GAME") continue;

            const [db, coll] = ns.split(".");
            const games = this.watcherMongo
                .db(db)
                .collection<GameConfig>(coll)
                .find({}, { projection: { _id: 0, name: 1, gameId: 1, type: 1 } });

            for await (const { name, gameId, type } of games) {
                const insertDocument = {
                    operationType: "insert",
                    ns: { db, coll },
                    fullDocument: { name, gameId, type },
                } as unknown as ChangeStreamInsertDocument<GameConfig>;
                this.emit("GAME_initiate", { db, coll }, insertDocument);
            }
        }
    }
}

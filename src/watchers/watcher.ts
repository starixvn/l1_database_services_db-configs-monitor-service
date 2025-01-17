import type { BaseLogger } from "@ldb/logger";
import { type Collection, type CollectionAggregationPipeline, type MongoClient } from "@ldb/mongo";
import { ClusterWatcher } from "@ldb/watcher";
import type { TemplateEventType, WatcherEventType } from "../types/event-types.js";
import type { GameConfig } from "../types/game-configs.js";
import type { ChangeStreamConfig, OperationType, WatcherEvents } from "../types/watcher-configs.js";

const DEFAULT_WATCHER_PIPELINE = [{ $match: { ns: {} } }] as const satisfies CollectionAggregationPipeline;

export class Watcher extends ClusterWatcher<WatcherEvents> {
    private watcherConfigs: Map<string, WatcherEventType> = new Map();

    constructor(
        private readonly watcherMongo: MongoClient,
        private readonly changeStreamConfigsCollection: Collection<ChangeStreamConfig>,
        logger: BaseLogger,
    ) {
        super(watcherMongo, DEFAULT_WATCHER_PIPELINE, logger);
    }

    private async reloadChangeStream() {
        const configsNameSpace = { db: this.changeStreamConfigsCollection.dbName, coll: this.changeStreamConfigsCollection.collectionName };
        const changeStreamConfigs = await this.changeStreamConfigsCollection.find({}, { projection: { _id: 0, ns: 1, event: 1 } }).toArray();

        this.watcherConfigs.clear();
        this.watcherConfigs = new Map(changeStreamConfigs.map(({ ns: { db, coll }, event }) => [`${db}.${coll}`, event]));

        const namespaces = changeStreamConfigs.map(({ ns }) => ns);
        namespaces.push(configsNameSpace);
        const pipeline = [
            {
                $match: {
                    operationType: { $in: ["insert", "update", "delete", "replace"] },
                    ns: { $in: namespaces },
                },
            },
        ] as const satisfies CollectionAggregationPipeline;

        this.replaceChangeStream(pipeline);

        this.logger.logWarning({ title: this.className, message: "Change stream reloaded with new configs" }, { extra: { namespaces } });
    }

    protected async handleDocumentDelete(changeDocument: OperationType<TemplateEventType>["delete"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_delete`, ns, changeDocument);
    }

    protected async handleDocumentInsert(changeDocument: OperationType<TemplateEventType>["insert"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_insert`, ns, changeDocument);
    }

    protected async handleDocumentUpdate(changeDocument: OperationType<TemplateEventType>["update"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_update`, ns, changeDocument);
    }

    protected async handleDocumentReplace(changeDocument: OperationType<TemplateEventType>["replace"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_replace`, ns, changeDocument);
    }

    async initiate() {
        await this.reloadChangeStream();

        for (const [ns, event] of this.watcherConfigs.entries()) {
            if (event !== "GAME") continue;

            const [db, coll] = ns.split(".");
            const games = this.watcherMongo
                .db(db)
                .collection<GameConfig>(coll)
                .find({}, { projection: { _id: 0, name: 1, gameId: 1, type: 1 } });

            for await (const { name, gameId, type } of games) {
                const insertDocument = {
                    ns: { db, coll },
                    fullDocument: { name, gameId, type },
                };
                this.emit("GAME_initiate", { db, coll }, insertDocument);
            }
        }
    }
}

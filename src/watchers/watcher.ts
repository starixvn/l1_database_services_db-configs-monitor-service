import type { BaseLogger } from "@ldb/logger";
import { type ChangeStreamNameSpace, type Collection, type CollectionAggregationPipeline, type MongoClient } from "@ldb/mongo";
import { ClusterWatcher } from "@ldb/watcher";
import type { TemplateEventType, WatcherEventType } from "../types/event-types.js";
import type { GameConfig } from "../types/game-configs.js";
import type { ChangeStreamConfig, OperationType, WatcherEvents } from "../types/watcher-configs.js";

const DEFAULT_WATCHER_PIPELINE = [{ $match: { ns: {} } }] as const satisfies CollectionAggregationPipeline;

export class Watcher extends ClusterWatcher<WatcherEvents> {
    private watcherConfigs: Map<string, WatcherEventType> = new Map();
    private watcherNamespaces: Map<string, ChangeStreamNameSpace> = new Map();
    private gameConfigNamespaces: Map<string, ChangeStreamNameSpace> = new Map();

    constructor(
        private readonly watcherMongo: MongoClient,
        private readonly changeStreamConfigsCollection: Collection<ChangeStreamConfig>,
        logger: BaseLogger,
    ) {
        super(watcherMongo, DEFAULT_WATCHER_PIPELINE, logger);
    }

    private async reloadChangeStream() {
        const { dbName, collectionName } = this.changeStreamConfigsCollection;
        const configsNameSpace: ChangeStreamNameSpace = { db: dbName, coll: collectionName };
        const changeStreamConfigs = this.changeStreamConfigsCollection.find({}, { projection: { _id: 0, ns: 1, event: 1 } });

        this.watcherConfigs.clear();
        this.watcherNamespaces.clear();
        this.gameConfigNamespaces.clear();

        const namespaces = [configsNameSpace];
        for await (const { ns, event } of changeStreamConfigs) {
            namespaces.push(ns);

            const { db, coll } = ns;
            if (event === "GAME") {
                this.gameConfigNamespaces.set(`${db}.${coll}`, ns);
            } else {
                this.watcherNamespaces.set(`${db}.${coll}`, ns);
            }

            this.watcherConfigs.set(`${db}.${coll}`, event);
        }

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

    private getCascadedNamespaces(event: WatcherEventType) {
        if (event === "GAME") {
            return Array.from(this.watcherNamespaces.values());
        } else {
            return Array.from(this.gameConfigNamespaces.values());
        }
    }

    protected async handleDocumentDelete(changeDocument: OperationType<TemplateEventType>["delete"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_delete`, ns, changeDocument, this.getCascadedNamespaces(event));
    }

    protected async handleDocumentInsert(changeDocument: OperationType<TemplateEventType>["insert"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_insert`, ns, changeDocument, this.getCascadedNamespaces(event));
    }

    protected async handleDocumentUpdate(changeDocument: OperationType<TemplateEventType>["update"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_update`, ns, changeDocument, this.getCascadedNamespaces(event));
    }

    protected async handleDocumentReplace(changeDocument: OperationType<TemplateEventType>["replace"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        this.emit(`${event}_replace`, ns, changeDocument, this.getCascadedNamespaces(event));
    }

    async initiate() {
        await this.reloadChangeStream();

        for (const { db, coll } of this.gameConfigNamespaces.values()) {
            const games = this.watcherMongo
                .db(db)
                .collection<GameConfig>(coll)
                .find({}, { projection: { _id: 0, name: 1, gameId: 1, type: 1 } });

            for await (const { name, gameId, type } of games) {
                const insertDocument = {
                    ns: { db, coll },
                    fullDocument: { name, gameId, type },
                };
                this.emit("GAME_initiate", { db, coll }, insertDocument, this.getCascadedNamespaces("GAME"));
            }
        }
    }
}

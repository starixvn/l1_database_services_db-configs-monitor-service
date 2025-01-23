import type { BaseLogger } from "@ldb/logger";
import { type ChangeStreamNameSpace, type Collection, type CollectionAggregationPipeline, type MongoClient } from "@ldb/mongo";
import { ClusterWatcher } from "@ldb/watcher";
import type { CascadedNamespaces, ChangeStreamConfig, GameConfig, GameEventType, OperationType, TemplateEventType, WatcherEvents, WatcherEventType } from "../types/index.js";

const DEFAULT_WATCHER_PIPELINE = [{ $match: { ns: {} } }] as const satisfies CollectionAggregationPipeline;

/**
 * The Watcher class monitors all changes in the cluster using cluster change streams.
 * Because the number of events is enormous, we apply filters to the change stream to only
 * return events from our configured collections, which is saved in the change stream configs
 * collection.
 *
 * There are 3 groups of collections:
 * - **Game config collections**: Store game configuration of our system. Each game has a game `type`
 *   to identify which template to apply. We want to trigger actions whenever new game is added.
 * - **Index template collection**: Store index definitions for each game `type`. Changes in each
 *   template will trigger actions to create or update the indexes of all games in the same
 *   `type`.
 * - **Config template collections**: Each collection will store config template for corresponding job.
 *   Changes in each template will trigger actions to create or modify config of all games in the
 *   same `type`. Currently we have 2 jobs: archive and summaries.
 */
export class Watcher extends ClusterWatcher<WatcherEvents> {
    private watcherConfigs: Map<string, WatcherEventType> = new Map();
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
        this.gameConfigNamespaces.clear();

        const namespaces = [configsNameSpace];
        for await (const { ns, event } of changeStreamConfigs) {
            namespaces.push(ns);

            const { db, coll } = ns;

            if (event === "GAME") {
                this.gameConfigNamespaces.set(`${db}.${coll}`, ns);
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

    private getCascadedNamespaces(event: GameEventType): CascadedNamespaces<GameEventType>;
    private getCascadedNamespaces(event: TemplateEventType): CascadedNamespaces<TemplateEventType>;
    private getCascadedNamespaces<T extends WatcherEventType>(event: T): CascadedNamespaces<T> {
        if (event === "GAME") {
            const cascadedNamespaces: CascadedNamespaces<"GAME"> = {
                INDEX: [],
                ARCHIVE: [],
                SUMMARY: [],
            };

            for (const [key, value] of this.watcherConfigs.entries()) {
                if (value === "GAME") continue;

                const [db, coll] = key.split(".");
                const namespace = { db, coll };
                cascadedNamespaces[`${value}`].push(namespace);
            }

            return cascadedNamespaces as CascadedNamespaces<T>;
        } else if (event === "INDEX" || event === "ARCHIVE" || event === "SUMMARY") {
            return { GAME: Array.from(this.gameConfigNamespaces.values()) } as CascadedNamespaces<T>;
        }
        throw new Error(`Invalid event type: ${event}`);
    }

    protected async handleDocumentDelete(changeDocument: OperationType<WatcherEventType>["delete"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        if (event === "GAME") {
            const changeDocument$ = changeDocument as OperationType<GameEventType>["delete"];
            this.emit(`${event}_delete`, ns, changeDocument$, this.getCascadedNamespaces(event));
        } else {
            const changeDocument$ = changeDocument as OperationType<TemplateEventType>["delete"];
            this.emit(`${event}_delete`, ns, changeDocument$, this.getCascadedNamespaces(event));
        }
    }

    protected async handleDocumentInsert(changeDocument: OperationType<WatcherEventType>["insert"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        if (event === "GAME") {
            const changeDocument$ = changeDocument as OperationType<GameEventType>["insert"];
            this.emit(`${event}_insert`, ns, changeDocument$, this.getCascadedNamespaces(event));
        } else {
            const changeDocument$ = changeDocument as OperationType<TemplateEventType>["insert"];
            this.emit(`${event}_insert`, ns, changeDocument$, this.getCascadedNamespaces(event));
        }
    }

    protected async handleDocumentUpdate(changeDocument: OperationType<WatcherEventType>["update"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        if (event === "GAME") {
            const changeDocument$ = changeDocument as OperationType<GameEventType>["update"];
            this.emit(`${event}_update`, ns, changeDocument$, this.getCascadedNamespaces(event));
        } else {
            const changeDocument$ = changeDocument as OperationType<TemplateEventType>["update"];
            this.emit(`${event}_update`, ns, changeDocument$, this.getCascadedNamespaces(event));
        }
    }

    protected async handleDocumentReplace(changeDocument: OperationType<WatcherEventType>["replace"]) {
        const { ns } = changeDocument;
        const { db, coll } = ns;

        if (`${db}.${coll}` === this.changeStreamConfigsCollection.namespace) return await this.initiate();

        const event = this.watcherConfigs.get(`${db}.${coll}`);
        if (!event) return;

        if (event === "GAME") {
            const changeDocument$ = changeDocument as OperationType<GameEventType>["replace"];
            this.emit(`${event}_replace`, ns, changeDocument$, this.getCascadedNamespaces(event));
        } else {
            const changeDocument$ = changeDocument as OperationType<TemplateEventType>["replace"];
            this.emit(`${event}_replace`, ns, changeDocument$, this.getCascadedNamespaces(event));
        }
    }

    async initiate() {
        await this.reloadChangeStream();

        const extra: Record<string, unknown[]> = {};

        for (const { db, coll } of this.gameConfigNamespaces.values()) {
            extra[`${db}`] = [];
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
                extra[`${db}`].push({ name, gameId, type });
            }
        }
        this.logger.logInfo({ title: this.className, message: "Games initiated" }, { extra });
    }
}

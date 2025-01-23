import { asClass, asValue, BaseContainer } from "@ldb/base-container";
import type { ChangeStreamNameSpace, MongoClient } from "@ldb/mongo";
import { healthcheckPort, lumiLoggerConfig } from "./app-configs.js";
import { App } from "./app.js";
import { ArchiveInitiator, GameInitiator, IndexInitiator, SummaryInitiator } from "./initiators/index.js";
import { metadata } from "./metadata.js";
import type { ChangeStreamConfig } from "./types/index.js";
import { ConfigWatcher, GameWatcher, Watcher } from "./watchers/index.js";

export class Container extends BaseContainer {
    constructor() {
        super();
    }

    register() {
        this.registerLogger(lumiLoggerConfig).registerHealthcheck(metadata, healthcheckPort).registerClasses();
        return this;
    }

    private registerClasses() {
        this.container.register({
            app: asClass(App).singleton(),

            watcher: asClass(Watcher).singleton(),
            gameWatcher: asClass(GameWatcher).singleton(),
            configWatcher: asClass(ConfigWatcher).singleton(),

            gameInitiator: asClass(GameInitiator).singleton(),
            indexInitiator: asClass(IndexInitiator).singleton(),
            archiveInitiator: asClass(ArchiveInitiator).singleton(),
            summaryInitiator: asClass(SummaryInitiator).singleton(),
        });
        return this;
    }

    async registerDatabases(watcherMongo: MongoClient, targetMongo: MongoClient, watcherNamespaces: Record<string, ChangeStreamNameSpace>) {
        this.container.register({
            watcherMongo: asValue(watcherMongo),
            targetMongo: asValue(targetMongo),
        });

        for (const [key, { db, coll }] of Object.entries(watcherNamespaces)) {
            this.container.register({
                [key]: asValue(watcherMongo.db(db).collection<ChangeStreamConfig>(coll)),
            });
        }

        return this;
    }
}

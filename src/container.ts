import { asClass, asValue, BaseContainer } from "@ldb/base-container";
import type { ChangeStreamNameSpace, CollectionAggregationPipeline, MongoClient } from "@ldb/mongo";
import { healthcheckPort, lumiLoggerConfig } from "./app-configs.js";
import { App } from "./app.js";
import { metadata } from "./metadata.js";
import type { ChangeStreamConfig } from "./types/watcher-configs.js";
import { ConfigWatcher } from "./watchers/config-watcher.js";
import { GameWatcher } from "./watchers/game-watcher.js";
import { Watcher } from "./watchers/watcher.js";

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
        });
        return this;
    }

    async registerDatabases(watcherMongo: MongoClient, targetMongo: MongoClient, changeStreamConfigsNamespace: ChangeStreamNameSpace) {
        this.container.register({
            watcherMongo: asValue(watcherMongo),
            targetMongo: asValue(targetMongo),
        });

        const { db, coll } = changeStreamConfigsNamespace;
        const changeStreamConfigs = await watcherMongo
            .db(db)
            .collection<ChangeStreamConfig>(coll)
            .find({}, { projection: { _id: 0, ns: 1, event: 1 } })
            .toArray();

        const watcherPipeline: CollectionAggregationPipeline = [
            {
                $match: {
                    operationType: { $in: ["insert", "update", "delete", "replace"] },
                    ns: { $in: changeStreamConfigs.map(({ ns }) => ns) },
                },
            },
        ];

        const watcherConfigs = new Map(changeStreamConfigs.map(({ ns: { db, coll }, event }) => [`${db}.${coll}`, event]));

        this.container.register({
            watcherPipeline: asValue(watcherPipeline),
            watcherConfigs: asValue(watcherConfigs),
        });

        return this;
    }
}

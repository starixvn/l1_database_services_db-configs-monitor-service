import { asClass, asValue, BaseContainer } from "@ldb/base-container";
import type { ChangeStreamNameSpace, MongoClient } from "@ldb/mongo";
import { healthcheckPort, lumiLoggerConfig } from "./app-configs.js";
import { App } from "./app.js";
import { GameInitiator } from "./initiators/game-initiator.js";
import { metadata } from "./metadata.js";
import type { ChangeStreamConfig } from "./types/watchers.js";
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

            gameInitiator: asClass(GameInitiator).singleton(),
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

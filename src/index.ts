import { MongoClient } from "@ldb/mongo";
import { database } from "./app-configs.js";
import type { App } from "./app.js";
import { Container } from "./container.js";
import { watcherNamespaces } from "./namespaces.js";

const init = async () => {
    const { watcherUri, targetUri } = database;
    const watcherMongo = new MongoClient(watcherUri);
    const targetMongo = new MongoClient(targetUri);

    const container = new Container().register();
    await container.registerDatabases(watcherMongo, targetMongo, watcherNamespaces);
    const app: App = container.resolve("app");
    container.resolve("healthcheckServer");

    app.initiate();
};
init();

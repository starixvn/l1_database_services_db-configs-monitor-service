import { MongoClient } from "@ldb/mongo";
import { database } from "./app-configs.js";
import type { App } from "./app.js";
import { Container } from "./container.js";
import { namespaces } from "./namespaces.js";

const init = async () => {
    const { watcherUri, targetUri } = database;
    const watcherMongo = new MongoClient(watcherUri);
    const targetMongo = new MongoClient(targetUri);
    const { changeStreamConfigsNamespace } = namespaces;

    console.log("watcherMongo", await watcherMongo.db("ops_configs").collection("change_stream_configs").find({}).toArray());

    const container = new Container().register();
    await container.registerDatabases(watcherMongo, targetMongo, changeStreamConfigsNamespace);
    const app: App = container.resolve("app");
    container.resolve("healthcheckServer");

    app.initiate();
};
init();

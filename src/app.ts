import { BaseApp } from "@ldb/base-app";
import type { BaseLogger } from "@ldb/logger";
import type { Metadata } from "@ldb/utils";
import type { ConfigWatcher } from "./watchers/config-watcher.js";
import type { GameWatcher } from "./watchers/game-watcher.js";
import type { Watcher } from "./watchers/watcher.js";

export class App extends BaseApp {
    constructor(
        private readonly watcher: Watcher,
        private readonly gameWatcher: GameWatcher,
        private readonly configWatcher: ConfigWatcher,

        metadata: Metadata,
        logger: BaseLogger,
    ) {
        super(metadata, logger);
    }

    initiate() {
        this.gameWatcher.subscribe(this.watcher);
        this.gameWatcher.on("INITIATE", (ns, doc, cascadedNs) =>
            this.logger.logDebug({ title: this.className, message: `Initiated ${ns} ${JSON.stringify(doc)}` }, { extra: { cascadedNs } }),
        );
        this.gameWatcher.on("GAME", (ns, doc, cascadedNs) =>
            this.logger.logDebug({ title: this.className, message: `Game event ${ns} ${JSON.stringify(doc)}` }, { extra: { cascadedNs } }),
        );

        this.configWatcher.subscribe(this.watcher);
        this.configWatcher.on("INDEX", (ns, doc, cascadedNs) =>
            this.logger.logDebug({ title: this.className, message: `Index event ${ns} ${JSON.stringify(doc)}` }, { extra: { cascadedNs } }),
        );
        this.configWatcher.on("SUMMARY", (ns, doc, cascadedNs) =>
            this.logger.logDebug({ title: this.className, message: `Summary event ${ns} ${JSON.stringify(doc)}` }, { extra: { cascadedNs } }),
        );
        this.configWatcher.on("ARCHIVE", (ns, doc, cascadedNs) =>
            this.logger.logDebug({ title: this.className, message: `Archive event ${ns} ${JSON.stringify(doc)}` }, { extra: { cascadedNs } }),
        );

        this.watcher.initiate();
        super.initiate();
    }

    terminate() {
        this.gameWatcher.unsubscribe(this.watcher);

        super.terminate();
    }
}

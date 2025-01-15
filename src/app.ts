import { BaseApp } from "@ldb/base-app";
import type { BaseLogger } from "@ldb/logger";
import type { Metadata } from "@ldb/utils";
import type { GameWatcher } from "./watchers/game-watcher.js";
import type { Watcher } from "./watchers/watcher.js";

export class App extends BaseApp {
    constructor(
        private readonly watcher: Watcher,
        private readonly gameWatcher: GameWatcher,

        metadata: Metadata,
        logger: BaseLogger,
    ) {
        super(metadata, logger);
    }

    initiate() {
        this.gameWatcher.subscribe(this.watcher);

        this.watcher.initiate();
        super.initiate();
    }

    terminate() {
        this.gameWatcher.unsubscribe(this.watcher);

        super.terminate();
    }
}

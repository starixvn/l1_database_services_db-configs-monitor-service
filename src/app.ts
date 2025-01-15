import { BaseApp } from "@ldb/base-app";
import type { BaseLogger } from "@ldb/logger";
import type { Metadata } from "@ldb/utils";
import type { GameInitiator } from "./initiators/game-initiator.js";
import type { Watcher } from "./watchers/watcher.js";

export class App extends BaseApp {
    constructor(
        private readonly watcher: Watcher,
        private readonly gameInitiator: GameInitiator,

        metadata: Metadata,
        logger: BaseLogger,
    ) {
        super(metadata, logger);
    }

    initiate() {
        this.gameInitiator.subscribe(this.watcher);

        this.watcher.initiate();
        super.initiate();
    }

    terminate() {
        this.gameInitiator.unsubscribe(this.watcher);

        super.terminate();
    }
}

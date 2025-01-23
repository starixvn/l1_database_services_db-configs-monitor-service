import { BaseApp } from "@ldb/base-app";
import type { BaseLogger } from "@ldb/logger";
import type { Metadata } from "@ldb/utils";
import type { ArchiveInitiator, GameInitiator, IndexInitiator, SummaryInitiator } from "./initiators/index.js";
import type { ConfigWatcher, GameWatcher, Watcher } from "./watchers/index.js";

export class App extends BaseApp {
    constructor(
        private readonly watcher: Watcher,
        private readonly gameWatcher: GameWatcher,
        private readonly configWatcher: ConfigWatcher,

        private readonly gameInitiator: GameInitiator,
        private readonly indexInitiator: IndexInitiator,
        private readonly archiveInitiator: ArchiveInitiator,
        private readonly summaryInitiator: SummaryInitiator,

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

        this.gameInitiator.subscribe(this.gameWatcher);
        this.gameInitiator.on("DEPLOY_INDEX", (ns, idxs, quiet) => {
            this.logger.logDebug({ title: this.className, message: `Deploy index from ${this.gameInitiator.className}` }, { extra: { ns, idxs, quiet } });
        });
        this.gameInitiator.on("DEPLOY_ARCHIVE", (ns, archive, quiet) => {
            this.logger.logDebug({ title: this.className, message: `Deploy archive from ${this.gameInitiator.className}` }, { extra: { ns, archive, quiet } });
        });
        this.gameInitiator.on("DEPLOY_SUMMARY", (ns, summary, quiet) => {
            this.logger.logDebug({ title: this.className, message: `Deploy summary from ${this.gameInitiator.className}` }, { extra: { ns, summary, quiet } });
        });

        this.indexInitiator.subscribe(this.configWatcher);
        this.indexInitiator.on("DEPLOY_INDEX", (ns, idxs, quiet) =>
            this.logger.logDebug({ title: this.className, message: `Deploy index from ${this.indexInitiator.className}` }, { extra: { ns, idxs, quiet } }),
        );

        this.archiveInitiator.subscribe(this.configWatcher);
        this.archiveInitiator.on("DEPLOY_ARCHIVE", (ns, archive, quiet) =>
            this.logger.logDebug({ title: this.className, message: `Deploy archive from ${this.archiveInitiator.className}` }, { extra: { ns, archive, quiet } }),
        );

        this.summaryInitiator.subscribe(this.configWatcher);
        this.summaryInitiator.on("DEPLOY_SUMMARY", (ns, summary, quiet) =>
            this.logger.logDebug({ title: this.className, message: `Deploy summary from ${this.summaryInitiator.className}` }, { extra: { ns, summary, quiet } }),
        );

        this.watcher.initiate();
        super.initiate();
    }

    terminate() {
        this.gameWatcher.unsubscribe(this.watcher);
        this.configWatcher.unsubscribe(this.watcher);

        this.gameInitiator.unsubscribe(this.gameWatcher);
        this.indexInitiator.unsubscribe(this.configWatcher);
        this.archiveInitiator.unsubscribe(this.configWatcher);
        this.summaryInitiator.unsubscribe(this.configWatcher);

        super.terminate();
    }
}

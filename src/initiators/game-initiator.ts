import type { BaseLogger } from "@ldb/logger";
import type { ChangeStreamNameSpace, Document, MongoClient } from "@ldb/mongo";
import { Dispatcher, type GenericListener } from "@ldb/utils";
import type {
    ArchiveTemplate,
    CascadedNamespaces,
    ConfigTemplate$3,
    GameConfig,
    GameEventType,
    GameInitiatorEvents,
    GameWatcherEvents,
    IndexTemplateData,
    SummaryTemplate,
} from "../types/index.js";
import { archiveTemplater } from "../utils/archive-templater.js";
import { summaryTemplater } from "../utils/summary-templater.js";
import type { GameWatcher } from "../watchers/game-watcher.js";

export class GameInitiator extends Dispatcher<GameInitiatorEvents, GameWatcherEvents> {
    private readonly initiators: Record<string, GenericListener> = {};

    constructor(
        private readonly watcherMongo: MongoClient,
        logger: BaseLogger,
    ) {
        super(logger);
        this.selfBound();
    }

    private selfBound() {
        this.initiators.initiate = this.initiate.bind(this, true);
        this.initiators.change = this.initiate.bind(this, false);
    }

    private initiate(quiet: boolean, db: string, doc: GameConfig, cascadedNs: CascadedNamespaces<GameEventType>) {
        const { INDEX, ARCHIVE, SUMMARY } = cascadedNs;
        this.indexIntiator(quiet, db, doc, INDEX);
        this.archiveInitiator(quiet, db, doc, ARCHIVE);
        this.summaryInitiator(quiet, db, doc, SUMMARY);
    }

    private async indexIntiator(quiet: boolean, db: string, doc: GameConfig, templateNamespaces: ChangeStreamNameSpace[]) {
        const indexTemplates = await this.getIndexTemplates(db, doc, templateNamespaces);

        const { name } = doc;

        for (const { postfix, idxs } of indexTemplates) {
            const coll = `${name}${postfix}`;
            this.emit("DEPLOY_INDEX", { db, coll }, Object.values(idxs), quiet);
        }
    }

    private async archiveInitiator(quiet: boolean, db: string, doc: GameConfig, templateNamespaces: ChangeStreamNameSpace[]) {
        const archiveTemplates = await this.getConfigTemplates<ArchiveTemplate>(db, doc, templateNamespaces);

        for (const { data, targets } of archiveTemplates) {
            const configs = data.map((template) => archiveTemplater("games", db, doc, template));
            for (const target of targets) {
                this.emit("DEPLOY_ARCHIVE", target, configs, quiet);
            }
        }
    }

    private async summaryInitiator(quiet: boolean, db: string, doc: GameConfig, templateNamespaces: ChangeStreamNameSpace[]) {
        const summaryTemplates = await this.getConfigTemplates<SummaryTemplate>(db, doc, templateNamespaces);

        for (const { data, targets } of summaryTemplates) {
            const configs = data.map((template) => summaryTemplater("games", db, doc, template));
            for (const target of targets) {
                this.emit("DEPLOY_SUMMARY", target, configs, quiet);
            }
        }
    }

    private async getIndexTemplates(targetDB: string, doc: GameConfig, templateNamespaces: ChangeStreamNameSpace[]) {
        const indexTemplates: IndexTemplateData[] = [];

        for (const ns of templateNamespaces) {
            const { db, coll } = ns;
            const templateCollection = this.watcherMongo.db(db).collection<ConfigTemplate$3<"games", IndexTemplateData>>(coll);

            const { type } = doc;
            const template = await templateCollection.findOne({ category: "games", type, dbs: targetDB, __v: 3 }, { projection: { _id: 0, data: 1 } });
            if (template) {
                indexTemplates.push(...template.data);
            }
        }
        return indexTemplates;
    }

    private async getConfigTemplates<Config extends Document>(targetDB: string, doc: GameConfig, templateNamespaces: ChangeStreamNameSpace[]) {
        const configTemplates: ConfigTemplate$3<string, Config>[] = [];

        for (const ns of templateNamespaces) {
            const { db, coll } = ns;
            const templateCollection = this.watcherMongo.db(db).collection<ConfigTemplate$3<string, Config>>(coll);

            const { type } = doc;
            const template = await templateCollection.findOne({ category: "games", type, dbs: targetDB, __v: 3 }, { projection: { _id: 0, data: 1, targets: 1 } });
            if (template) {
                configTemplates.push(template);
            }
        }
        return configTemplates;
    }

    subscribe(publisher: GameWatcher): boolean {
        return [
            super.subscribe(publisher, "INITIATE", this.initiators.initiate), //
            super.subscribe(publisher, "GAME", this.initiators.change),
        ].every(Boolean);
    }

    unsubscribe(publisher: GameWatcher): boolean {
        return [
            super.unsubscribe(publisher, "INITIATE", this.initiators.initiate), //
            super.unsubscribe(publisher, "GAME", this.initiators.change),
        ].every(Boolean);
    }
}

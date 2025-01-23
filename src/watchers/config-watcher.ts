import type { BaseLogger } from "@ldb/logger";
import type { ChangeStreamNameSpace, GenericListener } from "@ldb/mongo";
import { Dispatcher } from "@ldb/utils";
import type {
    CascadedNamespaces,
    ConfigTemplate,
    ConfigTemplate$3,
    ConfigWatcherEvents,
    OperationType,
    TemplateEventType,
    WatcherEvents,
    WatcherOperationType,
} from "../types/index.js";
import { validateConfigTemplate$3 } from "../utils/type-guards.js";
import type { Watcher } from "./watcher.js";

const INITIAL_EVENT_HANDLERS: Record<`init_${TemplateEventType}_${WatcherOperationType}`, GenericListener> = {
    init_INDEX_insert: Boolean,
    init_INDEX_update: Boolean,
    init_INDEX_replace: Boolean,
    init_INDEX_delete: Boolean,
    init_SUMMARY_insert: Boolean,
    init_SUMMARY_update: Boolean,
    init_SUMMARY_replace: Boolean,
    init_SUMMARY_delete: Boolean,
    init_ARCHIVE_insert: Boolean,
    init_ARCHIVE_update: Boolean,
    init_ARCHIVE_replace: Boolean,
    init_ARCHIVE_delete: Boolean,
};

export class ConfigWatcher extends Dispatcher<ConfigWatcherEvents, Pick<WatcherEvents, `${TemplateEventType}_${WatcherOperationType}`>> {
    private eventHandlers: Record<`init_${TemplateEventType}_${WatcherOperationType}`, GenericListener> = INITIAL_EVENT_HANDLERS;

    constructor(logger: BaseLogger) {
        super(logger);
        this.selfBound();
    }

    private selfBound() {
        this.eventHandlers.init_INDEX_insert = this.initInserted.bind(this, "INDEX");
        this.eventHandlers.init_INDEX_update = this.initUpdated.bind(this, "INDEX");
        this.eventHandlers.init_INDEX_replace = this.initReplaced.bind(this, "INDEX");
        this.eventHandlers.init_INDEX_delete = this.initDeleted.bind(this, "INDEX");

        this.eventHandlers.init_SUMMARY_insert = this.initInserted.bind(this, "SUMMARY");
        this.eventHandlers.init_SUMMARY_update = this.initUpdated.bind(this, "SUMMARY");
        this.eventHandlers.init_SUMMARY_replace = this.initReplaced.bind(this, "SUMMARY");
        this.eventHandlers.init_SUMMARY_delete = this.initDeleted.bind(this, "SUMMARY");

        this.eventHandlers.init_ARCHIVE_insert = this.initInserted.bind(this, "ARCHIVE");
        this.eventHandlers.init_ARCHIVE_update = this.initUpdated.bind(this, "ARCHIVE");
        this.eventHandlers.init_ARCHIVE_replace = this.initReplaced.bind(this, "ARCHIVE");
        this.eventHandlers.init_ARCHIVE_delete = this.initDeleted.bind(this, "ARCHIVE");
    }

    private validateTemplateVersion<T extends TemplateEventType>(event: T, ns: ChangeStreamNameSpace, document?: ConfigTemplate): document is ConfigTemplate$3 {
        if (!document) {
            this.logger.logError(
                { title: `${this.className}.${event}`, message: `Input document is empty` }, //
                { extra: { event, ns, document } },
            );
            return false;
        }

        const { category, type, __v } = document;
        if (validateConfigTemplate$3(document)) {
            return true;
        }

        this.logger.logError(
            { title: `${this.className}.${event}`, message: `Invalid template version: expected v3, got v${__v}` }, //
            { extra: { event, ns, category, type, __v } },
        );
        return false;
    }

    private initInserted<T extends TemplateEventType>(event: T, ns: ChangeStreamNameSpace, doc: OperationType<T>["insert"], cascadedNs: CascadedNamespaces<T>) {
        const { fullDocument } = doc;

        if (!this.validateTemplateVersion(event, ns, fullDocument)) {
            return;
        }
        const { category, type, dbs, data, targets, __v } = fullDocument;

        for (const db of dbs) {
            this.emit<TemplateEventType>(event, db, { category, type, data, targets, __v }, cascadedNs);
        }
    }

    private initUpdated<T extends TemplateEventType>(event: T, ns: ChangeStreamNameSpace, doc: OperationType<T>["update"], cascadedNs: CascadedNamespaces<T>) {
        const { fullDocument } = doc;

        if (!this.validateTemplateVersion(event, ns, fullDocument)) {
            return;
        }

        const { category, type, dbs, data, targets, __v } = fullDocument;
        for (const db of dbs) {
            this.emit<TemplateEventType>(event, db, { category, type, data, targets, __v }, cascadedNs);
        }
    }

    private initReplaced<T extends TemplateEventType>(event: T, ns: ChangeStreamNameSpace, doc: OperationType<T>["replace"], cascadedNs: CascadedNamespaces<T>) {
        const { fullDocument } = doc;

        if (!this.validateTemplateVersion(event, ns, fullDocument)) {
            return;
        }

        const { category, type, dbs, data, targets, __v } = fullDocument;
        for (const db of dbs) {
            this.emit<TemplateEventType>(event, db, { category, type, data, targets, __v }, cascadedNs);
        }
    }

    private initDeleted<T extends TemplateEventType>(event: T, ns: ChangeStreamNameSpace, doc: OperationType<T>["delete"]) {
        const { fullDocumentBeforeChange } = doc;

        if (!this.validateTemplateVersion(event, ns, fullDocumentBeforeChange)) {
            return;
        }

        const { category, type, dbs } = fullDocumentBeforeChange ?? { category: undefined, type: undefined, dbs: undefined };
        this.logger.logWarning({ title: this.className, message: "Dangerous delete detected" }, { extra: { ns, deleted: { category, type, dbs } } });
    }

    subscribe(publisher: Watcher) {
        return [
            super.subscribe(publisher, "INDEX_insert", this.eventHandlers.init_INDEX_insert),
            super.subscribe(publisher, "INDEX_update", this.eventHandlers.init_INDEX_update),
            super.subscribe(publisher, "INDEX_replace", this.eventHandlers.init_INDEX_replace),
            super.subscribe(publisher, "INDEX_delete", this.eventHandlers.init_INDEX_delete),

            super.subscribe(publisher, "SUMMARY_insert", this.eventHandlers.init_SUMMARY_insert),
            super.subscribe(publisher, "SUMMARY_update", this.eventHandlers.init_SUMMARY_update),
            super.subscribe(publisher, "SUMMARY_replace", this.eventHandlers.init_SUMMARY_replace),
            super.subscribe(publisher, "SUMMARY_delete", this.eventHandlers.init_SUMMARY_delete),

            super.subscribe(publisher, "ARCHIVE_insert", this.eventHandlers.init_ARCHIVE_insert),
            super.subscribe(publisher, "ARCHIVE_update", this.eventHandlers.init_ARCHIVE_update),
            super.subscribe(publisher, "ARCHIVE_replace", this.eventHandlers.init_ARCHIVE_replace),
            super.subscribe(publisher, "ARCHIVE_delete", this.eventHandlers.init_ARCHIVE_delete),
        ].every(Boolean);
    }

    unsubscribe(publisher: Watcher) {
        return [
            super.unsubscribe(publisher, "INDEX_insert", this.eventHandlers.init_INDEX_insert),
            super.unsubscribe(publisher, "INDEX_update", this.eventHandlers.init_INDEX_update),
            super.unsubscribe(publisher, "INDEX_replace", this.eventHandlers.init_INDEX_replace),
            super.unsubscribe(publisher, "INDEX_delete", this.eventHandlers.init_INDEX_delete),

            super.unsubscribe(publisher, "SUMMARY_insert", this.eventHandlers.init_SUMMARY_insert),
            super.unsubscribe(publisher, "SUMMARY_update", this.eventHandlers.init_SUMMARY_update),
            super.unsubscribe(publisher, "SUMMARY_replace", this.eventHandlers.init_SUMMARY_replace),
            super.unsubscribe(publisher, "SUMMARY_delete", this.eventHandlers.init_SUMMARY_delete),

            super.unsubscribe(publisher, "ARCHIVE_insert", this.eventHandlers.init_ARCHIVE_insert),
            super.unsubscribe(publisher, "ARCHIVE_update", this.eventHandlers.init_ARCHIVE_update),
            super.unsubscribe(publisher, "ARCHIVE_replace", this.eventHandlers.init_ARCHIVE_replace),
            super.unsubscribe(publisher, "ARCHIVE_delete", this.eventHandlers.init_ARCHIVE_delete),
        ].every(Boolean);
    }
}

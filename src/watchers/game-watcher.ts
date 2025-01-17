import type { BaseLogger, Extras } from "@ldb/logger";
import type { ChangeStreamDeleteDocument, ChangeStreamNameSpace, ChangeStreamReplaceDocument } from "@ldb/mongo";
import { Dispatcher, type GenericListener, type Satisfies } from "@ldb/utils";
import type { GameEventType } from "../types/event-types.js";
import type { GameConfig } from "../types/game-configs.js";
import type { OperationType, WatcherEvents, WatcherOperationType } from "../types/watcher-configs.js";
import type { Watcher } from "./watcher.js";

export type GameWatcherEvents = Satisfies<
    {
        INITIATE: (db: string, game: GameConfig) => void;
        GAME: (db: string, game: GameConfig) => void;
    },
    Record<GameEventType, GenericListener>
>;

export class GameWatcher extends Dispatcher<GameWatcherEvents, Pick<WatcherEvents, `${GameEventType}_${WatcherOperationType | "initiate"}`>> {
    constructor(logger: BaseLogger) {
        super(logger);
        this.selfBound();
    }

    private selfBound() {
        this.initGameInitiate = this.initGameInitiate.bind(this);
        this.initGameInserted = this.initGameInserted.bind(this);
        this.initGameUpdated = this.initGameUpdated.bind(this);
        this.initGameReplaced = this.initGameReplaced.bind(this);
        this.initGameDeleted = this.initGameDeleted.bind(this);
    }

    private initGameInitiate(ns: ChangeStreamNameSpace, doc: OperationType<GameEventType>["initiate"]) {
        const { db } = ns;
        const { fullDocument } = doc;
        const { name, gameId, type } = fullDocument;

        this.emit("INITIATE", db, { name, gameId, type });
    }

    private initGameInserted(ns: ChangeStreamNameSpace, doc: OperationType<GameEventType>["insert"]) {
        const { db } = ns;
        const { fullDocument } = doc;
        const { name, gameId, type } = fullDocument;

        this.emit("GAME", db, { name, gameId, type });
    }

    private initGameUpdated(ns: ChangeStreamNameSpace, doc: OperationType<GameEventType>["update"]) {
        const { updateDescription, fullDocumentBeforeChange } = doc;
        const { updatedFields, removedFields } = updateDescription;

        let report = false;
        const updated: Extras = {};

        const removed = (["name", "gameId", "type"] as const).filter((field) => !(removedFields ?? []).includes(field));
        if (removed.length > 0) {
            updated.removedFields = removed;
            report = true;
        }

        const { name: updatedName, gameId: updatedGameId, type: updatedType } = updatedFields ?? {};
        const { name, gameId, type } = fullDocumentBeforeChange ?? { name: undefined, gameId: undefined, type: undefined };
        if (updatedName != null) {
            updated.name = { before: name, after: updatedName };
            report = true;
        }
        if (updatedGameId != null) {
            updated.gameId = { before: gameId, after: updatedGameId };
            report = true;
        }
        if (updatedType != null) {
            updated.type = { before: type, after: updatedType };
            report = true;
        }

        updated.name = updated.name || name;
        updated.gameId = updated.gameId || gameId;
        updated.type = updated.type || type;

        if (report) {
            this.logger.logWarning({ title: this.className, message: "Dangerous update detected" }, { extra: { ns, updated } });
        }
    }

    private initGameReplaced(ns: ChangeStreamNameSpace, doc: ChangeStreamReplaceDocument<GameConfig>) {
        const { fullDocumentBeforeChange, fullDocument } = doc;
        const { name, gameId, type } = fullDocumentBeforeChange ?? { name: undefined, gameId: undefined, type: undefined };
        const { name: updatedName, gameId: updatedGameId, type: updatedType } = fullDocument;

        let report = false;
        const replaced: Extras = {};

        if (name !== updatedName) {
            replaced.name = { before: name, after: updatedName };
            report = true;
        }
        if (gameId !== updatedGameId) {
            replaced.gameId = { before: gameId, after: updatedGameId };
            report = true;
        }
        if (type !== updatedType) {
            replaced.type = { before: type, after: updatedType };
            report = true;
        }

        replaced.name = replaced.name || name;
        replaced.gameId = replaced.gameId || gameId;
        replaced.type = replaced.type || type;

        if (report) {
            this.logger.logWarning({ title: this.className, message: "Dangerous replace detected" }, { extra: { ns, replaced } });
        }
    }

    private initGameDeleted(ns: ChangeStreamNameSpace, doc: ChangeStreamDeleteDocument<GameConfig>) {
        const { fullDocumentBeforeChange } = doc;
        const { name, gameId, type } = fullDocumentBeforeChange ?? { name: undefined, gameId: undefined, type: undefined };

        this.logger.logWarning({ title: this.className, message: "Dangerous delete detected" }, { extra: { ns, deleted: { name, gameId, type } } });
    }

    subscribe(publisher: Watcher) {
        return [
            super.subscribe(publisher, "GAME_initiate", this.initGameInitiate),
            super.subscribe(publisher, "GAME_insert", this.initGameInserted),
            super.subscribe(publisher, "GAME_update", this.initGameUpdated),
            super.subscribe(publisher, "GAME_replace", this.initGameReplaced),
            super.subscribe(publisher, "GAME_delete", this.initGameDeleted),
        ].every(Boolean);
    }

    unsubscribe(publisher: Watcher) {
        return [
            super.unsubscribe(publisher, "GAME_initiate", this.initGameInitiate),
            super.unsubscribe(publisher, "GAME_insert", this.initGameInserted),
            super.unsubscribe(publisher, "GAME_update", this.initGameUpdated),
            super.unsubscribe(publisher, "GAME_replace", this.initGameReplaced),
            super.unsubscribe(publisher, "GAME_delete", this.initGameDeleted),
        ].every(Boolean);
    }
}

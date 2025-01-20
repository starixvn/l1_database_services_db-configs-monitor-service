import type {
    ChangeStreamDeleteDocument,
    ChangeStreamDocument,
    ChangeStreamInsertDocument,
    ChangeStreamNameSpace,
    ChangeStreamReplaceDocument,
    ChangeStreamUpdateDocument,
} from "@ldb/mongo";
import type { GenericListener, Satisfies } from "@ldb/utils";
import type { EventSchema, GameEventType, TemplateEventType, WatcherEventType } from "./event-types.js";
import type { GameConfig } from "./game-configs.js";

export type ChangeStreamConfig = {
    ns: ChangeStreamNameSpace;
    event: WatcherEventType;
};

export type WatcherOperationType = "insert" | "update" | "replace" | "delete";

export type OperationType<E extends WatcherEventType> = Satisfies<
    {
        insert: E extends WatcherEventType ? ChangeStreamInsertDocument<EventSchema[E]> : never;
        update: E extends WatcherEventType ? ChangeStreamUpdateDocument<EventSchema[E]> : never;
        replace: E extends WatcherEventType ? ChangeStreamReplaceDocument<EventSchema[E]> : never;
        delete: E extends WatcherEventType ? ChangeStreamDeleteDocument<EventSchema[E]> : never;
        initiate: E extends WatcherEventType ? Pick<ChangeStreamInsertDocument<GameConfig>, "ns" | "fullDocument"> : never;
    },
    Record<WatcherOperationType, ChangeStreamDocument<EventSchema[E]>>
>;

export type WatcherEventOperationType = `${WatcherEventType}_${WatcherOperationType}` | `${GameEventType}_initiate`;

export type WatcherEvents = {
    [K in WatcherEventOperationType]: K extends `${infer E}_${infer O}`
        ? (ns: ChangeStreamNameSpace, doc: OperationType<E & WatcherEventType>[O & (WatcherOperationType | "initiate")], cascadedNs: ChangeStreamNameSpace[]) => void
        : never;
};

export type GameWatcherEvents = Satisfies<
    {
        INITIATE: (db: string, game: GameConfig, cascadedNs: ChangeStreamNameSpace[]) => void;
        GAME: (db: string, game: GameConfig, cascadedNs: ChangeStreamNameSpace[]) => void;
    },
    Record<GameEventType, GenericListener>
>;

export type ConfigWatcherEvents = Satisfies<
    {
        INDEX: (db: string, index: Omit<EventSchema["INDEX"], "dbs">, cascadedNs: ChangeStreamNameSpace[]) => void;
        SUMMARY: (db: string, summary: Omit<EventSchema["SUMMARY"], "dbs">, cascadedNs: ChangeStreamNameSpace[]) => void;
        ARCHIVE: (db: string, archive: Omit<EventSchema["ARCHIVE"], "dbs">, cascadedNs: ChangeStreamNameSpace[]) => void;
    },
    Record<TemplateEventType, GenericListener>
>;

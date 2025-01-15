import type {
    ChangeStreamDeleteDocument,
    ChangeStreamDocument,
    ChangeStreamInsertDocument,
    ChangeStreamNameSpace,
    ChangeStreamReplaceDocument,
    ChangeStreamUpdateDocument,
    Document,
} from "@ldb/mongo";
import type { Satisfies } from "@ldb/utils";
import type { GameConfig } from "./game-configs.js";

export type WatcherEventType = "GAME" | "INDEX" | "SUMMARY" | "ARCHIVE";

export type ChangeStreamConfig = {
    ns: ChangeStreamNameSpace;
    event: WatcherEventType;
};

type EventSchema = Satisfies<
    {
        GAME: GameConfig;
        INDEX: Document;
        SUMMARY: Document;
        ARCHIVE: Document;
    },
    Record<WatcherEventType, Document>
>;

export type WatcherOperationType = "insert" | "update" | "replace" | "delete";

type OperationType<E extends WatcherEventType> = Satisfies<
    {
        insert: ChangeStreamInsertDocument<EventSchema[E]>;
        update: ChangeStreamUpdateDocument<EventSchema[E]>;
        replace: ChangeStreamReplaceDocument<EventSchema[E]>;
        delete: ChangeStreamDeleteDocument<EventSchema[E]>;
        initiate: ChangeStreamInsertDocument<GameConfig>;
    },
    Record<WatcherOperationType, ChangeStreamDocument<EventSchema[E]>>
>;

export type WatcherEventOperationType = `${WatcherEventType}_${WatcherOperationType}` | "GAME_initiate";

export type WatcherEvents = {
    [K in WatcherEventOperationType]: (
        ns: ChangeStreamNameSpace,
        doc: K extends `${infer E}_${infer O}` ? OperationType<E & WatcherEventType>[O & (WatcherOperationType | "initiate")] : never,
    ) => void;
};

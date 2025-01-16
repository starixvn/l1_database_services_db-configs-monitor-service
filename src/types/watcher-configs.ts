import type {
    ChangeStreamDeleteDocument,
    ChangeStreamDocument,
    ChangeStreamInsertDocument,
    ChangeStreamNameSpace,
    ChangeStreamReplaceDocument,
    ChangeStreamUpdateDocument,
} from "@ldb/mongo";
import type { Satisfies } from "@ldb/utils";
import type { EventSchema, GameEventType, WatcherEventType } from "./event-types.js";
import type { GameConfig } from "./game-configs.js";

export type ChangeStreamConfig = {
    ns: ChangeStreamNameSpace;
    event: WatcherEventType;
};

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

export type WatcherEventOperationType = `${WatcherEventType}_${WatcherOperationType}` | `${GameEventType}_initiate`;

export type WatcherEvents = {
    [K in WatcherEventOperationType]: (
        ns: ChangeStreamNameSpace,
        doc: K extends `${infer E}_${infer O}` ? OperationType<E & WatcherEventType>[O & (WatcherOperationType | "initiate")] : never,
    ) => void;
};

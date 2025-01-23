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
    E extends GameEventType
        ? {
              insert: ChangeStreamInsertDocument<EventSchema[E]>;
              update: ChangeStreamUpdateDocument<EventSchema[E]>;
              replace: ChangeStreamReplaceDocument<EventSchema[E]>;
              delete: ChangeStreamDeleteDocument<EventSchema[E]>;
              initiate: Pick<ChangeStreamInsertDocument<GameConfig>, "ns" | "fullDocument">;
          }
        : E extends TemplateEventType
          ? {
                insert: ChangeStreamInsertDocument<EventSchema[E]>;
                update: ChangeStreamUpdateDocument<EventSchema[E]>;
                replace: ChangeStreamReplaceDocument<EventSchema[E]>;
                delete: ChangeStreamDeleteDocument<EventSchema[E]>;
            }
          : never,
    Record<WatcherOperationType, ChangeStreamDocument<EventSchema[E]>>
>;

export type CascadedNamespaces<E extends WatcherEventType> = E extends GameEventType
    ? Record<TemplateEventType, ChangeStreamNameSpace[]>
    : E extends TemplateEventType
      ? Record<GameEventType, ChangeStreamNameSpace[]>
      : never;

export type WatcherEventOperationType = `${WatcherEventType}_${WatcherOperationType}` | `${GameEventType}_initiate`;

export type WatcherEvents = {
    [K in WatcherEventOperationType]: K extends `${infer E}_${infer O}`
        ? E extends GameEventType
            ? (
                  ns: ChangeStreamNameSpace, //
                  doc: OperationType<E & GameEventType>[O & (WatcherOperationType | "initiate")],
                  cascadedNs: CascadedNamespaces<E>,
              ) => void
            : E extends TemplateEventType
              ? (
                    ns: ChangeStreamNameSpace, //
                    doc: OperationType<E & TemplateEventType>[O & WatcherOperationType],
                    cascadedNs: CascadedNamespaces<E>,
                ) => void
              : never
        : never;
};

export type GameWatcherEvents = Satisfies<
    {
        INITIATE: (db: string, game: GameConfig, cascadedNs: CascadedNamespaces<"GAME">) => void;
        GAME: (db: string, game: GameConfig, cascadedNs: CascadedNamespaces<"GAME">) => void;
    },
    Record<GameEventType, GenericListener>
>;

export type ConfigWatcherEvents = Satisfies<
    {
        INDEX: (db: string, index: Omit<EventSchema["INDEX"], "dbs">, cascadedNs: CascadedNamespaces<"INDEX">) => void;
        SUMMARY: (db: string, summary: Omit<EventSchema["SUMMARY"], "dbs">, cascadedNs: CascadedNamespaces<"SUMMARY">) => void;
        ARCHIVE: (db: string, archive: Omit<EventSchema["ARCHIVE"], "dbs">, cascadedNs: CascadedNamespaces<"ARCHIVE">) => void;
    },
    Record<TemplateEventType, GenericListener>
>;

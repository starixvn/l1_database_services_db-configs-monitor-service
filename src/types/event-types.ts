import type { Document } from "@ldb/mongo";
import type { Satisfies } from "@ldb/utils";
import type { ConfigTemplate, IndexTemplateData } from "./config-templates.js";
import type { GameConfig } from "./game-configs.js";

export type GameEventType = "GAME";
export type TemplateEventType = "INDEX" | "SUMMARY" | "ARCHIVE";
export type WatcherEventType = GameEventType | TemplateEventType;

export type EventSchema = Satisfies<
    {
        GAME: GameConfig;
        INDEX: ConfigTemplate<"games", IndexTemplateData>;
        SUMMARY: ConfigTemplate<string, Document>;
        ARCHIVE: ConfigTemplate<string, Document>;
    },
    Record<GameEventType, GameConfig> & Record<TemplateEventType, ConfigTemplate>
>;

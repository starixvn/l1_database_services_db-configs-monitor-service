import type { LumiLoggerConfig } from "@ldb/logger";
import { name, version } from "./metadata.js";

export const environment = "DEV" as const;
export const healthcheckPort = 5000 as const;

export const lumiLoggerConfig = {
    sentryNodeOptions: {
        dsn: "https://098a0c6ad1d74e8eb39ec7df895e59e0@sentry.lumigame.com/76",
        environment,
        initialScope: {
            tags: { service: name },
        },
        release: `${name}@${version}`,
    },
    skynexOptions: {
        conversationIds: {
            telegram: -1001911631568,
            teams: "19:11eb3bf6c3c240fd993eb8048615835c@thread.tacv2",
        },
    },
    environment,
    terminalSeverityLevel: "debug",
} as const satisfies LumiLoggerConfig;

const watcherCred = "lmn_watcher:LmnWatcher" as const;
const targetCred = "lmn_backend:LmnBackend" as const;
const dbSrv = "10.10.50.12:39400,10.10.50.13:39400,10.10.50.14:39400" as const;
const dbRepl = "SPLocal0" as const;

export const database = {
    watcherUri: `mongodb://${watcherCred}@${dbSrv}/admin?authSource=admin&appName=${encodeURIComponent(name)}-watcher&replicaSet=${dbRepl}`,
    targetUri: `mongodb://${targetCred}@${dbSrv}/admin?authSource=admin&appName=${encodeURIComponent(name)}&replicaSet=${dbRepl}`,
} as const;

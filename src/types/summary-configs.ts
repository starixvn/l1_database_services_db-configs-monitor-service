export type SummaryTemplate = { others: unknown };

export type SummaryConfig = {
    category: string;
    type: number;
    id: number;
    gameConfigs: { gameId: number; name: string };
    db: string;
    others: unknown;
};

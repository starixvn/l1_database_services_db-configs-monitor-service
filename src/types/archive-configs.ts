export type ArchiveTemplate = {
    id: number;
    from: { db: string; postfix: string };
    to: { db: string; postfix: string };
    childs: {
        from: { db: string; postfix: string };
        to: { db: string; postfix: string };
    }[];
    others: unknown;
};

export type ArchiveConfig = {
    category: string;
    type: number;
    id: number;
    gameConfigs: { gameId: number; name: string };
    from: { db: string; postfix: string };
    to: { db: string; postfix: string };
    childs: {
        from: { db: string; postfix: string };
        to: { db: string; postfix: string };
    }[];
    others: unknown;
};

import type { Document } from "@ldb/mongo";
import type { ConfigTemplate, ConfigTemplate$2, ConfigTemplate$3 } from "../types/config-templates.js";

export const validateConfigTemplate$2 = <C extends string, T extends Document>(documment: ConfigTemplate<C, T, number>): documment is ConfigTemplate$2<T> => {
    const { __v } = documment;
    return __v === 2;
};

export const validateConfigTemplate$3 = <C extends string, T extends Document>(documment: ConfigTemplate<C, T, number>): documment is ConfigTemplate$3<C, T> => {
    const { __v } = documment;
    return __v === 3;
};

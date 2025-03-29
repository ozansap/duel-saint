// @ts-nocheck
import "dotenv/config";

export const TEST: boolean = false;

export const TOKEN: string = TEST ? process.env.TOKEN_TEST : process.env.TOKEN;
export const MONGO_URI: string = TEST ? process.env.MONGO_URI_TEST : process.env.MONGO_URI;
export const MONGO_DB_NAME: string = TEST ? process.env.MONGO_DB_NAME_TEST : process.env.MONGO_DB_NAME;
export const GUILD_ID: string = TEST ? process.env.GUILD_ID_TEST : process.env.GUILD_ID;
export const DISPUTE_CATEGORY_ID: string = TEST ? process.env.DISPUTE_CATEGORY_ID_TEST : process.env.DISPUTE_CATEGORY_ID;
export const ORDER_CHANNEL_ID: string = TEST ? process.env.ORDER_CHANNEL_ID_TEST : process.env.ORDER_CHANNEL_ID;
export const MOD_ROLE_ID: string = TEST ? process.env.MOD_ROLE_ID_TEST : process.env.MOD_ROLE_ID;
export const ECONOMY_ROLE_ID: string = TEST ? process.env.ECONOMY_ROLE_ID_TEST : process.env.ECONOMY_ROLE_ID;

export const OWNER_ID: string = process.env.OWNER_ID;

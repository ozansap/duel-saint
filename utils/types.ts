import { CommandInteraction, SlashCommandBuilder, Snowflake } from "discord.js";
import { ObjectId } from "mongodb";

export type UserData = {
	_id?: Snowflake;

	tag?: string;
	last?: number;

	wins: number;
	losses: number;
	elo: number;
	elo_highest: number;

	seasonal: {
		[season: string]: SeasonalProfile;
	};

	last_opponent: {
		id: Snowflake;
		count: number;
	};

	tagged: number;
	banned: number;

	offenses: { type: string; date: number; duration: number; reason: string }[];

	settings: {
		profile: "private" | "public";
		career: "all" | "wins" | "none";
	};

	events: {
		unique_opponents?: Snowflake[];
	};
};

export type DuelData = {
	_id?: ObjectId;
	user: { id: Snowflake; elo: number; d_elo: number; winner: number };
	target: { id: Snowflake; elo: number; d_elo: number; winner: number };
	date: number;

	dispute?: {
		rematch: number;
		channelID: Snowflake;
		messageID: Snowflake;
	};
};

export type GeneralData = {
	_id?: "1";

	duels: {
		enabled: boolean;
		message: string;
	};
};

export type RankInfo = {
	n: number;
	name: string;
	progress: number;
	remaining: number;
};

export type SeasonalProfile = {
	ranking?: number;
	elo_highest?: number;
	elo?: number;
	wins?: number;
	losses?: number;
};

export type Command = {
	execute: (interaction: CommandInteraction) => Promise<void>;
	data: SlashCommandBuilder;
};

export type Maybe<T> = { data: null; error: Error } | { data: T; error: null };
export const ErrorResult = (str: string) => { return { data: null, error: new Error(str) } };
export const SuccessResult = <T>(data: T) => { return { data, error: null } };
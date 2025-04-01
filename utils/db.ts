import { Snowflake } from "discord.js";
import { Collection, MongoClient, ObjectId, OptionalId } from "mongodb";
import { MONGO_URI, MONGO_DB_NAME } from "@config";
import { DuelData, GeneralData, LogData, OrderData, SeasonalProfile, UserData } from "@utils/types";
import { now, year } from "@utils/time";
import { seasons } from "@utils/vars";

const userData_default = {
	wins: 0,
	losses: 0,
	elo: 1000,
};

// ########## EXPORTS ##########

export class DB {
	static users: Collection<OptionalId<UserData>>;
	static duels: Collection<DuelData>;
	static orders: Collection<OrderData>;
	static general: Collection<GeneralData>;
	static logs: Collection<LogData>;
	static mongoClient = new MongoClient(MONGO_URI);

	static async connect(): Promise<void> {
		await DB.mongoClient.connect();
		const database = DB.mongoClient.db(MONGO_DB_NAME);

		DB.users = database.collection("users");
		DB.duels = database.collection("duels");
		DB.orders = database.collection("orders");
		DB.general = database.collection("general");
		DB.logs = database.collection("logs");
	}
}

export class UserHandler {
	data: UserData;
	stages: any[];
	userID: Snowflake;

	static async find_registry(registry: string, value: string): Promise<UserData | null> {
		let user = await DB.users.findOne({ [`registrations.${registry}`]: value });
		return user;
	}

	constructor(userID: Snowflake) {
		this.data = {
			coins: 0,
			wins: 0,
			losses: 0,
			elo: 1000,
			elo_highest: 1000,
			seasonal: {},
			last_opponent: {
				id: "0",
				count: 0,
			},
			tagged: 0,
			banned: 0,
			offenses: [],
			settings: {
				profile: "public",
				career: "all",
			},
			events: {},
			registrations: {},
		};
		this.stages = [];
		this.userID = userID;
	}

	async fetch(): Promise<UserData> {
		this.data = Object.assign(this.data, (await DB.users.findOne({ _id: this.userID })) ?? {});
		return this.data;
	}

	async update(tag?: string, returnOriginal: boolean = false): Promise<UserData> {
		const result = await DB.users.findOneAndUpdate(
			{ _id: this.userID },
			[
				...this.stages,
				{
					$set: {
						tag: tag || "$tag",
						last: now(),
					},
				},
			],
			{ returnDocument: returnOriginal ? "before" : "after", upsert: true }
		);

		return Object.assign({}, this.data, result.value);
	}

	elo_add(amount: number): UserHandler {
		this.stages.push({
			$set: {
				elo: {
					$cond: {
						if: { $eq: [{ $type: "$elo" }, "missing"] },
						then: 1000 + amount,
						else: { $max: [{ $add: ["$elo", amount] }, 0] },
					},
				},
			},
		});
		return this;
	}

	elo_sub(amount: number): UserHandler {
		this.stages.push({
			$set: {
				elo: {
					$cond: {
						if: { $eq: [{ $type: "$elo" }, "missing"] },
						then: 1000 - amount,
						else: { $max: [{ $subtract: ["$elo", amount] }, 0] },
					},
				},
			},
		});
		return this;
	}

	elo_set(amount: number): UserHandler {
		this.stages.push({
			$set: {
				elo: amount,
			},
		});
		return this;
	}

	highest_check(elo: number): UserHandler {
		this.stages.push({
			$set: {
				elo_highest: {
					$max: ["$elo_highest", elo],
				},
			},
		});
		return this;
	}

	highest_set(elo: number): UserHandler {
		this.stages.push({
			$set: {
				elo_highest: elo,
			},
		});
		return this;
	}

	wins_add(amount: number = 1) {
		this.stages.push({
			$set: {
				wins: {
					$cond: {
						if: { $eq: [{ $type: "$wins" }, "missing"] },
						then: amount,
						else: { $add: ["$wins", amount] },
					},
				},
			},
		});
		return this;
	}

	wins_set(amount: number): UserHandler {
		this.stages.push({
			$set: {
				wins: amount,
			},
		});
		return this;
	}

	losses_add(amount: number = 1): UserHandler {
		this.stages.push({
			$set: {
				losses: {
					$cond: {
						if: { $eq: [{ $type: "$losses" }, "missing"] },
						then: amount,
						else: { $add: ["$losses", amount] },
					},
				},
			},
		});
		return this;
	}

	losses_set(amount: number): UserHandler {
		this.stages.push({
			$set: {
				losses: amount,
			},
		});
		return this;
	}

	ban_set(date: number): UserHandler {
		this.stages.push({
			$set: {
				banned: date,
			},
		});
		return this;
	}

	tag_set(date: number): UserHandler {
		this.stages.push({
			$set: {
				tagged: date,
			},
		});
		return this;
	}

	ban_unset(): UserHandler {
		this.stages.push({
			$unset: "banned",
		});
		return this;
	}

	tag_unset(): UserHandler {
		this.stages.push({
			$unset: "tagged",
		});
		return this;
	}

	offense_add(offense: { type: string; date: number; duration: number; reason: string }): UserHandler {
		this.stages.push({
			$set: {
				offenses: {
					$cond: {
						if: { $eq: [{ $type: "$offenses" }, "missing"] },
						then: [offense],
						else: { $concatArrays: ["$offenses", [offense]] },
					},
				},
			},
		});
		return this;
	}

	unique_opponents_add(opponent: Snowflake): UserHandler {
		this.stages.push({
			$set: {
				"events.unique_opponents": {
					$cond: {
						if: { $eq: [{ $type: "$events.unique_opponents" }, "missing"] },
						then: [opponent],
						else: { $concatArrays: ["$events.unique_opponents", [opponent]] },
					},
				},
			},
		});
		return this;
	}

	event_unset(event: string): UserHandler {
		this.stages.push({
			$unset: `events.${event}`,
		});
		return this;
	}

	offenses_set(offenses: { type: string; date: number; duration: number; reason: string }[]): UserHandler {
		this.stages.push({
			$set: { offenses: offenses },
		});
		return this;
	}

	settings_set(settings: UserData["settings"]): UserHandler {
		this.stages.push({
			$set: {
				settings: settings,
			},
		});
		return this;
	}

	last_opponent_set(id: Snowflake, count: number): UserHandler {
		this.stages.push({
			$set: {
				last_opponent: {
					id: id,
					count: count,
				},
			},
		});
		return this;
	}

	seasonal_set(season: number, data: SeasonalProfile): UserHandler {
		if (Object.keys(data).length === 0) return this;

		this.stages.push({
			$set: {
				[`seasonal.${season}`]: data,
			},
		});
		return this;
	}

	coins_add(amount: number): UserHandler {
		this.stages.push({
			$set: {
				coins: {
					$cond: {
						if: { $eq: [{ $type: "$coins" }, "missing"] },
						then: amount,
						else: { $add: ["$coins", amount] },
					},
				},
			},
		});
		return this;
	}

	coins_set(amount: number): UserHandler {
		this.stages.push({
			$set: {
				coins: amount,
			},
		});
		return this;
	}

	registrations_set(registrations: UserData["registrations"]): UserHandler {
		this.stages.push({
			$set: {
				registrations: registrations,
			},
		});
		return this;
	}
}

export class DuelHandler {
	data: DuelData | null;
	id: string | null;

	constructor(id: string | null = null) {
		this.data = null;
		this.id = id;
	}

	async create(data: DuelData): Promise<string> {
		const response = await DB.duels.insertOne(data);
		this.id = response.insertedId.toString();
		return this.id;
	}

	async fetch() {
		this.data = await DB.duels.findOne({ _id: new ObjectId(this.id!) });
		return this.data;
	}

	async update(data: DuelData) {
		DB.duels.findOneAndReplace({ _id: new ObjectId(this.id!) }, data);
	}

	async dispute(data: Required<DuelData["dispute"]>): Promise<void> {
		DB.duels.findOneAndUpdate({ _id: new ObjectId(this.id!) }, { $set: { dispute: data } });
	}

	async resolve(): Promise<void> {
		DB.duels.findOneAndUpdate({ _id: new ObjectId(this.id!) }, { $unset: { dispute: "" } });
	}
}

export class GeneralHandler {
	static data: GeneralData = {
		_id: "1",
		duels: {
			enabled: true,
			message: "Duels are disabled right now",
		},
		shop: {
			enabled: true,
			message: "The shop is disabled right now",
			tags: [],
			items: [],
		}
	};
	stages: any[];

	constructor() {
		this.stages = [];
	}

	static async fetch(): Promise<void> {
		const value = (await DB.general.findOne({ _id: "1" })) ?? {};
		GeneralHandler.data = Object.assign({}, GeneralHandler.data, value);
	}

	async update(returnOriginal: boolean = false): Promise<void> {
		const result = await DB.general.findOneAndUpdate({ _id: "1" }, this.stages, {
			returnDocument: returnOriginal ? "before" : "after",
			upsert: true,
		});

		GeneralHandler.data = Object.assign({}, GeneralHandler.data, result.value);
	}

	duels_set(duels: GeneralData["duels"]): GeneralHandler {
		this.stages.push({
			$set: {
				duels: duels,
			},
		});
		return this;
	}

	shop_set(shop: GeneralData["shop"]) {
		this.stages.push({
			$set: {
				shop: shop,
			},
		});
	}
}

export class OrderHandler {
	data: OrderData | null;
	messageID: string;

	constructor(messageID: string) {
		this.data = null;
		this.messageID = messageID;
	}

	static async create(data: OrderData) {
		await DB.orders.insertOne(data);
	}

	static async find_all(userID: string) {
		const cursor = DB.orders
			.find({ user: userID, closedAt: { $exists: false } })
			.sort({ createdAt: -1 })

		let data = await cursor.toArray()
		cursor.close();

		return data;
	}

	async fetch() {
		this.data = await DB.orders.findOne({ $or: [{ message: this.messageID }, { reminder: this.messageID }] });
		return this.data;
	}

	async update(data: OrderData) {
		DB.orders.findOneAndReplace({ $or: [{ message: this.messageID }, { reminder: this.messageID }] }, data);
	}
}

export class LogsHandler {
	static async create(data: LogData) {
		await DB.logs.insertOne(data);
	}

	static async get_last(n: number): Promise<LogData[]> {
		let logs_cursor = DB.logs
			.find()
			.sort({ date: -1 })
			.limit(n);

		let orders_cursor = DB.orders
			.find({ $or: [{ result: { $not: { $eq: "refunded" } } }, { result: { $exists: false } }] })
			.sort({ createdAt: -1 })
			.limit(n);

		let logs_array = await logs_cursor.toArray();
		let orders_array = (await orders_cursor.toArray()).map((order) => {
			return {
				user: order.user,
				before: order.remaining + order.cost,
				after: order.remaining,
				reason: order.item,
				date: order.createdAt,
			};
		});

		let data = [...logs_array, ...orders_array].sort((a, b) => a.date - b.date).slice(-n);

		logs_cursor.close();
		orders_cursor.close();

		return data;
	}
}

export class Leaderboard {
	type: keyof UserData;
	limit: number;
	order: "asc" | "desc";
	data: UserData[];

	constructor() {
		this.type = "elo";
		this.limit = 10;
		this.order = "desc";
		this.data = [];
	}

	async fetch(type: keyof UserData = "elo"): Promise<UserData[]> {
		this.type = type;

		const cursor = DB.users
			.find({ banned: { $not: { $gte: year() } } })
			.sort({ [this.type]: this.order === "desc" ? -1 : 1 })
			.limit(this.limit * 2);

		let data: UserData[] = [];

		for await (const userData of cursor) {
			if (userData[this.type] === undefined) continue;
			if (userData[this.type] === userData_default[this.type as keyof typeof userData_default]) continue;
			if (userData.tag === undefined) continue;
			data.push(userData);
			if (data.length === this.limit) break;
		}

		cursor.close();

		this.data = data;
		return this.data;
	}

	async findAuthor(userID: Snowflake): Promise<[number, number]> {
		const userHandler = new UserHandler(userID);
		const userData = await userHandler.fetch();
		// @ts-ignore
		const authorValue = userData[this.type] ?? userData_default[this.type];

		if (userData.banned > year()) return [0, authorValue];

		let count = await DB.users.countDocuments({ $and: [{ [this.type]: { $gt: userData[this.type] } }, { banned: { $not: { $gte: year() } } }] });

		return [count + 1, authorValue];
	}
}

export async function allTimeRanking(elo_highest: number): Promise<number> {
	if (elo_highest === 1000) return 0;
	const paths = ["elo_highest", ...seasons.all().map((x) => `seasonal.${x}.elo_highest`)];
	const conditions = paths.map((x) => ({ [x]: { $gt: elo_highest } }));
	return (await DB.users.countDocuments({ $and: [{ $or: conditions }, { banned: { $not: { $gte: year() } } }] })) + 1;
}

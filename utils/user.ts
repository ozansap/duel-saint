import { Snowflake } from "discord.js";
import { allTimeRanking, DB, UserHandler } from "@utils/db";
import { createBar, number, rank } from "@utils/num";
import { Reply } from "@utils/reply";
import { date, duration, now, year } from "@utils/time";
import { DuelData, UserData } from "@utils/types";
import { events, seasons } from "@utils/vars";

export class User {
	constructor(data: UserData) {
		this.data = data;
	}

	profile(info: { tag: string; avatarURL: string }, peek = false, visible = false) {
		const s = this.data.settings;
		const rankInfo = rank(this.data.elo);

		let description = `Rating: **${number(this.data.elo)}**\n` + `Highest: **${number(this.data.elo_highest)}**\n\n` + `Rank: **${rankInfo.name}**\n` + `${createBar(rankInfo.progress, 10)}\n` + `**${number(rankInfo.remaining)} Rating** remaining to rank up\n\n`;

		if (s.career === "all" || peek) {
			const winrate = Math.round((100 * this.data.wins) / (this.data.wins + this.data.losses)) || 0;
			description += `Duel Career: **${number(this.data.wins, "Win")}**⠀•⠀**${number(this.data.losses, "Loss", "es")}**\n` + `${winrate}% Winrate\n\n`;
		} else if (s.career === "wins") {
			description += `Duel Career: **${number(this.data.wins, "Win")}**\n\n`;
		}

		if (this.data.banned > now()) {
			description += `⚠️ Player banned from ranked play for **${duration((this.data.banned - now()) * 1000)}**`;
		}

		const reply = new Reply({
			author: { name: info.tag },
			thumbnail: info.avatarURL,
			description,
		});

		if (peek) {
			return visible ? reply.visible() : reply.ephemeral();
		} else {
			return s.profile === "public" ? reply.visible() : reply.ephemeral();
		}
	}

	events(info: { tag: string; hidden: boolean }, peek = false, visible = false) {
		const title = "Current Events";
		let description = "";

		for (const event of events) {
			if (!event.active) continue;
			description += `\`${event.description}\`\n` + `Reward: **${event.reward}**\n` + `End: **<t:${event.end}:f>**\n` + `Progress: **${event.progress(this.data)}/${event.goal}**\n\n`;
		}

		if (description.length === 0) {
			description = "No active events";
		}

		const reply = new Reply({ author: { name: info.tag }, title, description });

		if (peek) {
			return visible ? reply.visible() : reply.ephemeral();
		} else {
			return info.hidden ? reply.ephemeral() : reply.visible();
		}
	}

	async history(info: { tag: string; hidden: boolean }, peek = false, visible = false) {
		const title = `Duel History`;
		let description = "";

		const cursor = DB.duels
			.find({ $and: [{ $or: [{ "user.id": this.data._id }, { "target.id": this.data._id }] }, { date: { $gt: seasons.dates[seasons.current - 1] } }] })
			.sort({ date: -1 })
			.limit(10);

		let data: DuelData[] = [];
		await cursor.forEach((duelData: DuelData) => {
			data.push(duelData);
		});
		cursor.close();

		for (const duelData of data) {
			const player = duelData.user.id === this.data._id ? "user" : "target";
			const opponent = player === "user" ? "target" : "user";
			const win = duelData[player].winner === 1 ? "🟩" : duelData[player].winner === -1 ? "🟥" : "🟨";

			const opponentHandler = new UserHandler(duelData[opponent].id);
			const opponentData = await opponentHandler.fetch();

			const d_elo = duelData[player].d_elo > 0 ? `+${duelData[player].d_elo}` : duelData[player].d_elo;

			description += `${win}⠀•⠀**${d_elo} Rating**⠀•⠀${opponentData.tag}\n`;
		}

		const reply = new Reply({ author: { name: info.tag }, title, description });

		if (peek) {
			return visible ? reply.visible() : reply.ephemeral();
		} else {
			return info.hidden ? reply.ephemeral() : reply.visible();
		}
	}

	async matchups(info: { tag: string; hidden: boolean }, peek = false, visible = false) {
		const title = `Matchups`;
		let description = "";

		const cursor = DB.duels.find({ $and: [{ $or: [{ "user.id": this.data._id }, { "target.id": this.data._id }] }, { date: { $gt: seasons.dates[seasons.current - 1] } }] });

		let data: {
			[id: Snowflake]: {
				wins: number;
				losses: number;
				d_elo: number;
				id: Snowflake;
			};
		} = {};

		await cursor.forEach((duelData: DuelData) => {
			const player = duelData.user.id === this.data._id ? "user" : "target";
			const opponent = player === "user" ? "target" : "user";

			if (duelData[player].winner === 1) {
				if (data[duelData[opponent].id]) {
					data[duelData[opponent].id].wins++;
					data[duelData[opponent].id].d_elo += duelData[player].d_elo;
				} else {
					data[duelData[opponent].id] = {
						id: duelData[opponent].id,
						wins: 1,
						losses: 0,
						d_elo: duelData[player].d_elo,
					};
				}
			} else if (duelData[player].winner === -1) {
				if (data[duelData[opponent].id]) {
					data[duelData[opponent].id].losses++;
					data[duelData[opponent].id].d_elo += duelData[player].d_elo;
				} else {
					data[duelData[opponent].id] = {
						id: duelData[opponent].id,
						wins: 0,
						losses: 1,
						d_elo: duelData[player].d_elo,
					};
				}
			}
		});
		cursor.close();

		const values = Object.values(data).sort((a, b) => b.d_elo - a.d_elo);

		if (values.length > 6) {
			for (let i = 0; i < 3; i++) {
				const v = values[i];
				const opponentHandler = new UserHandler(v.id);
				const opponentData = await opponentHandler.fetch();

				const wins = number(v.wins, "Win");
				const losses = number(v.losses, "Loss", "es");
				const winrate = `${Math.round((100 * v.wins) / (v.wins + v.losses)) || 0}% Winrate`;
				const d_elo = (v.d_elo > 0 ? `+${v.d_elo}` : v.d_elo) + " Rating";

				description += `\`vs ${opponentData.tag}\`\n`;
				description += `${wins}⠀•⠀${losses}⠀•⠀${winrate}⠀•⠀**${d_elo}**\n\n`;
			}

			description += "\n";

			for (let i = values.length - 3; i < values.length; i++) {
				const v = values[i];
				const opponentHandler = new UserHandler(v.id);
				const opponentData = await opponentHandler.fetch();

				const wins = number(v.wins, "Win");
				const losses = number(v.losses, "Loss", "es");
				const winrate = `${Math.round((100 * v.wins) / (v.wins + v.losses)) || 0}% Winrate`;
				const d_elo = (v.d_elo > 0 ? `+${v.d_elo}` : v.d_elo) + " Rating";

				description += `\`vs ${opponentData.tag}\`\n`;
				description += `${wins}⠀•⠀${losses}⠀•⠀${winrate}⠀•⠀**${d_elo}**\n\n`;
			}
		} else {
			for (const v of values) {
				const opponentHandler = new UserHandler(v.id);
				const opponentData = await opponentHandler.fetch();

				const wins = number(v.wins, "Win");
				const losses = number(v.losses, "Loss", "es");
				const winrate = `${Math.round((100 * v.wins) / (v.wins + v.losses)) || 0}% Winrate`;
				const d_elo = (v.d_elo > 0 ? `+${v.d_elo}` : v.d_elo) + " Rating";

				description += `\`vs ${opponentData.tag}\`\n`;
				description += `${wins}⠀•⠀${losses}⠀•⠀${winrate}⠀•⠀**${d_elo}**\n\n`;
			}
		}

		const reply = new Reply({ author: { name: info.tag }, title, description });

		if (peek) {
			return visible ? reply.visible() : reply.ephemeral();
		} else {
			return info.hidden ? reply.ephemeral() : reply.visible();
		}
	}

	async seasonal(info: { tag: string; avatarURL: string; season: string }, peek = false, visible = false) {
		const s = this.data.settings;
		const season = info.season;

		if (season === "alltime") {
			var elo = this.data.elo ?? 1000;
			var elo_highest = this.data.elo_highest ?? 1000;
			var wins = this.data.wins ?? 0;
			var losses = this.data.losses ?? 0;

			for (const i in this.data.seasonal) {
				const seasonalData = this.data.seasonal[i];

				wins += seasonalData?.wins ?? 0;
				losses += seasonalData?.losses ?? 0;

				if (seasonalData?.elo_highest && elo_highest < seasonalData.elo_highest) {
					elo_highest = seasonalData.elo_highest;
				}
			}

			var seasonStart = seasons.dates[0];
			var seasonEnd = now();
			var seasonName = "All-Time";
			var ranking = await allTimeRanking(elo_highest);

			if (this.data.banned > year()) ranking = 0;
		} else {
			const data = this.data.seasonal[season];

			var elo = data?.elo ?? 1000;
			var elo_highest = data?.elo_highest ?? 1000;
			var ranking = data?.ranking ?? 0;
			var wins = data?.wins ?? 0;
			var losses = data?.losses ?? 0;

			var seasonStart = seasons.dates[parseInt(season) - 1];
			var seasonEnd = seasons.dates[parseInt(season)];
			var seasonName = `Season ${season}`;
		}

		let finalRankInfo = rank(elo);
		let highestRankInfo = rank(elo_highest);

		let description = `<t:${seasonStart}:d> - <t:${seasonEnd}:d>\n\n` + `Final Rating: **${number(elo)}**⠀•⠀**${finalRankInfo.name}**\n` + `Highest Rating: **${number(elo_highest)}**⠀•⠀**${highestRankInfo.name}**\n\n`;

		if (s.career === "all" || peek) {
			const winrate = Math.round((100 * wins) / (wins + losses)) || 0;
			description += `Duel Career: **${number(wins, "Win")}**⠀•⠀**${number(losses, "Loss", "es")}**\n` + `${winrate}% Winrate\n\n`;
		} else if (s.career === "wins") {
			description += `Duel Career: **${number(wins, "Win")}**\n\n`;
		}

		const reply = new Reply({
			author: { name: info.tag },
			title: `${seasonName} ⠀•⠀ #${ranking}`,
			thumbnail: info.avatarURL,
			description,
		});

		if (peek) {
			return visible ? reply.visible() : reply.ephemeral();
		} else {
			return s.profile === "public" ? reply.visible() : reply.ephemeral();
		}
	}

	offenses(info: { tag: string; hidden: boolean }, peek = true, visible = false) {
		const offenses = this.data.offenses;

		const title = "Past Offenses";

		let description = "";
		for (let i = 0; i < offenses.length; i++) {
			const offense = offenses[i];
			if (offense === null) continue;
			const o1 = date(offense.date);
			const o2 = offense.type;
			const o3 = duration(offense.duration * 1000);
			description += `\`${i + 1}.\`⠀•⠀${o1}⠀•⠀**${o2}**⠀•⠀${o3}\n${offense.reason}\n\n`;
		}

		if (description.length === 0) {
			const reply = Reply.success("Player has no offenses");

			if (peek) {
				return visible ? reply.visible() : reply.ephemeral();
			} else {
				return info.hidden ? reply.ephemeral() : reply.visible();
			}
		}

		const reply = new Reply({ author: { name: info.tag }, title, description });

		if (peek) {
			return visible ? reply.visible() : reply.ephemeral();
		} else {
			return info.hidden ? reply.ephemeral() : reply.visible();
		}
	}
}

export interface User {
	data: UserData;
}

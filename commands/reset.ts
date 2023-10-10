import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { GUILD_ID } from "../config";
import { DB, Leaderboard, UserHandler } from "../utils/db";
import { Reply } from "../utils/reply";
import { now } from "../utils/time";
import { SeasonalProfile } from "../utils/types";
import { events, ranks, seasons } from "../utils/vars";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const subcommand = interaction.options.getSubcommand(true);

	if (interaction.guild?.id !== GUILD_ID) {
		const reply = Reply.error(`That command can only be used in the main server`);
		return interaction.reply(reply.ephemeral());
	}

	if (subcommand === "event") {
		const event = interaction.options.getString("event", true);

		const end = events.find((e) => e.id === event)?.end;

		if (end && now() < end) {
			const reply = Reply.error(`You cannot reset an event before it has ended`);
			return interaction.reply(reply.ephemeral());
		}

		const reply = Reply.info(`I started updating the database, this will take some time.\nI will update this message when I am done`);
		await interaction.reply(reply.visible());

		const cursor = DB.users.find({ [`events.${event}.0`]: { $exists: true } });
		await cursor.forEach((doc) => {
			const userHandler = new UserHandler(doc._id);
			userHandler.event_unset(event).update();
		});
	} else if (subcommand === "season") {
		if (now() < seasons.dates[seasons.current]) {
			const reply = Reply.error(`You cannot reset a season before it has ended`);
			return interaction.reply(reply.ephemeral());
		}

		const reply = Reply.info(`I started updating the database, this will take some time.\nI will update this message when I am done`);
		await interaction.reply(reply.visible());

		let handlers = [];
		const cursor = DB.users.find({});
		while (await cursor.hasNext()) {
			const doc = await cursor.next();

			if (!doc) return console.log("Something went horribly wrong");

			const userHandler = new UserHandler(doc._id);
			const userData = await userHandler.fetch();

			const lb = new Leaderboard();
			const [userIndex] = await lb.findAuthor(userData._id!);

			const seasonal: SeasonalProfile = {};
			if (userData.elo !== 1000) seasonal.ranking = userIndex;
			if (userData.elo !== 1000) seasonal.elo = userData.elo;
			if (userData.elo_highest !== 1000) seasonal.elo_highest = userData.elo_highest;
			if (userData.wins !== 0) seasonal.wins = userData.wins;
			if (userData.losses !== 0) seasonal.losses = userData.losses;

			// if (doc.elo) {
			// 	let elo;

			// 	if (doc.elo >= ranks[ranks.length - 2].elo) {
			// 		elo = ranks[ranks.length - 2].elo;
			// 	} else {
			// 		const floors = ranks.filter((r) => r.elo <= doc.elo && r.floor);
			// 		const floor = floors[floors.length - 1];
			// 		elo = floor ? floor.elo : 1000;
			// 	}

			// 	userHandler.elo_set(elo).highest_set(elo);
			// }

			userHandler.elo_set(1000).highest_set(1000);

			userHandler.wins_set(0).losses_set(0).seasonal_set(seasons.current, seasonal);
			handlers.push(userHandler);
		}

		await Promise.all(handlers.map((h) => h.update()));
	}

	const reply = Reply.success(`I finished updating the database`);
	interaction.editReply(reply.visible());
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("reset")
		.setDescription("Reset a season or event after it has finished")
		.setDefaultMemberPermissions(8)
		.setDMPermission(false)
		.addSubcommand((sc) => sc.setName("season").setDescription("Reset the season and start a new one"))
		.addSubcommand((sc) =>
			sc
				.setName("event")
				.setDescription("Reset an event and start it over")
				.addStringOption((o) =>
					o
						.setName("event")
						.setDescription("The event which you want to reset")
						.setRequired(true)
						.addChoices(...events.map((e) => ({ name: e.name, value: e.id })))
				)
		),
};

import { ChatInputCommandInteraction, GuildMember, SlashCommandBuilder } from "discord.js";
import { GUILD_ID } from "../config";
import { DB } from "../utils/db";
import { Reply } from "../utils/reply";
import { events } from "../utils/vars";
import { year } from "../utils/time";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const event = interaction.options.getString("event", true);
	const winners = interaction.options.getNumber("winners", true);

	if (interaction.guild?.id !== GUILD_ID) {
		const reply = Reply.error(`That command can only be used in the main server`);
		return interaction.reply(reply.ephemeral());
	}

	let list: GuildMember[] = [];

	if (event === "unique_opponents") {
		var count = await DB.users.countDocuments({ $and: [{ "events.unique_opponents.9": { $exists: true } }, { banned: { $not: { $gte: year() } } }] });

		while (list.length < winners && list.length < count) {
			let cursor = DB.users.aggregate([{ $match: { $and: [{ "events.unique_opponents.9": { $exists: true } }, { banned: { $not: { $gte: year() } } }] } }, { $sample: { size: 1 } }]);
			let doc = await cursor.next();
			cursor.close();

			if (doc === null) continue;
			const user = await interaction.guild?.members.fetch(doc._id);
			if (user === undefined) continue;
			if (list.some((u) => u.id === user.id)) continue;

			list.push(user);
		}
	} else {
		return;
	}

	const title = `Event Raffle⠀•⠀${events.find((e) => e.id === event)?.name}`;
	let description = `Total Entries: **${count}**\n\n` + `Winners:`;
	let content = "";

	for (let i = 0; i < list.length; i++) {
		const user = list[i];
		description += `\n\`${i + 1}.\` ${user}`;
		content += `${user} `;
	}

	const reply = new Reply({ title, description });
	interaction.reply(Object.assign({ content }, reply.visible()));
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("raffle")
		.setDescription("Find the winner(s) of a raffle")
		.setDefaultMemberPermissions(8)
		.setDMPermission(false)
		.addStringOption((o) =>
			o
				.setName("event")
				.setDescription("The event for which you want to run the raffle")
				.setRequired(true)
				.addChoices(...events.map((e) => ({ name: e.name, value: e.id })))
		)
		.addNumberOption((o) => o.setName("winners").setDescription("Amount of winners for this raffle").setRequired(true)),
};

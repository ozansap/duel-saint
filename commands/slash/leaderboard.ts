import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Leaderboard } from "@utils/db";
import { Reply } from "@utils/reply";
import { UserData } from "@utils/types";
import { seasons } from "@utils/vars";

const types = {
	elo: "Rating",
	wins: "Wins",
};

const execute = async (interaction: ChatInputCommandInteraction) => {
	const type = interaction.options.getString("type", true) as keyof typeof types;
	const user = interaction.user;

	const lb = new Leaderboard();
	const usersData = await lb.fetch(type as keyof UserData);
	const [userIndex, userValue] = await lb.findAuthor(user.id);

	const title = `Leaderboard⠀•⠀${types[type]}`;
	let description = `Season End: **<t:${seasons.dates[seasons.current]}:f>**\n\n`;

	let j = 0;
	for (let i = 0; i < Math.min(usersData.length, 10); i++) {
		const d = usersData[i];
		const position = d[type] === usersData[i - 1]?.[type] ? j + 1 : i + 1;
		j = position - 1;
		const spacing = position === 10 ? `\`${position}.\` •` : `\`${position}.\`⠀•`;
		description += `${spacing}⠀**${d[type]}**⠀•⠀${d.tag}\n`;
	}

	description += `\n\`${userIndex}.\`⠀•⠀**${userValue}**⠀•⠀${user.username}`;

	const reply = new Reply({ title, description });
	interaction.reply(reply.visible());
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("leaderboard")
		.setDescription("See the top rated players")
		.addStringOption((o) => o.setName("type").setDescription("Type of leaderboard").setRequired(true).addChoices({ name: "Rating", value: "elo" }, { name: "Wins", value: "wins" })),
};

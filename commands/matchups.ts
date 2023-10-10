import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { UserHandler } from "../utils/db";
import { User } from "../utils/user";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const hidden = interaction.options.getBoolean("hidden");

	const user = interaction.user;

	const userHandler = new UserHandler(user.id);
	const userData = await userHandler.fetch();

	const reply = await new User(userData).matchups({ tag: user.username, hidden: hidden ?? false });
	interaction.reply(reply);
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("matchups")
		.setDescription("See your winrate against certain opponents")
		.addBooleanOption((o) => o.setName("hidden").setDescription("Should the information be hidden from others")),
};

import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { UserHandler } from "../utils/db";
import { Reply } from "../utils/reply";
import { User } from "../utils/user";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const user = interaction.options.getUser("player") ?? interaction.user;
	const self = interaction.user.id === user.id;

	const userHandler = new UserHandler(user.id);
	const userData = await userHandler.fetch();

	const s = userData.settings;

	if (s.profile === "private" && interaction.user.id !== user.id) {
		const reply = Reply.error(`That player's profile is private`);
		return interaction.reply(reply.ephemeral());
	}

	const reply = new User(userData).profile({
		avatarURL: user.avatarURL({ size: 128 }) ?? "",
		tag: user.username,
	});

	if (self) {
		const message = await interaction.reply(Reply.deletable(reply));
		Reply.setupDeleter(message, user.id);
	} else {
		interaction.reply(reply);
	}
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("profile")
		.setDescription("See the profile of yourself or another player")
		.addUserOption((o) => o.setName("player").setDescription("The player whose profile you want to see")),
};

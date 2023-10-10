import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { GUILD_ID } from "../config";
import { UserHandler } from "../utils/db";
import { Reply } from "../utils/reply";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const subcommand = interaction.options.getSubcommand(true);
	const user = interaction.options.getUser("player", true);

	if (interaction.guild?.id !== GUILD_ID) {
		const reply = Reply.error(`That command can only be used in the main server`);
		return interaction.reply(reply.ephemeral());
	}

	const userHandler = new UserHandler(user.id);

	switch (subcommand) {
		case "ban":
			userHandler.ban_unset();
			break;
		case "tag":
			userHandler.tag_unset();
			break;
		case "offense":
			const offense = interaction.options.getNumber("offense", true);
			const userData = await userHandler.fetch();
			let offenses = userData.offenses;
			offenses.splice(offense - 1, 1);
			userHandler.offenses_set(offenses);
			break;
	}

	userHandler.update();

	const reply = Reply.success("Successfully pardoned");
	interaction.reply(reply.visible());
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("pardon")
		.setDescription("Pardon a player")
		.setDefaultMemberPermissions(8)
		.setDMPermission(false)
		.addSubcommand((sc) =>
			sc
				.setName("ban")
				.setDescription("Pardon a player's current ban")
				.addUserOption((o) => o.setName("player").setDescription("The player to pardon").setRequired(true))
		)
		.addSubcommand((sc) =>
			sc
				.setName("tag")
				.setDescription("Pardon a player's current tag")
				.addUserOption((o) => o.setName("player").setDescription("The player to pardon").setRequired(true))
		)
		.addSubcommand((sc) =>
			sc
				.setName("offense")
				.setDescription("Pardon a player's past offense")
				.addUserOption((o) => o.setName("player").setDescription("The player to pardon").setRequired(true))
				.addNumberOption((o) => o.setName("offense").setDescription("ID of the offense").setRequired(true))
		),
};

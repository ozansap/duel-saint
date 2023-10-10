import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { GUILD_ID } from "../config";
import { Commands } from "../utils/commands";
import { number } from "../utils/num";
import { Reply } from "../utils/reply";
import { colors } from "../utils/vars";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const subcommand = interaction.options.getSubcommand(true);

	if (interaction.guild?.id !== GUILD_ID) {
		const reply = Reply.error(`That command can only be used in the main server`);
		return interaction.reply(reply.ephemeral());
	}

	if (subcommand === "commands") {
		const size = await Commands.refresh(interaction.client);

		const description = `Deleted **${number(size[0], "command")}**\nDeployed **${number(size[1], "command")}**`;
		const reply = new Reply({ description, color: colors.green });
		return interaction.reply(reply.ephemeral());
	}
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("refresh")
		.setDescription("Refresh some parts of the bot")
		.setDefaultMemberPermissions(8)
		.setDMPermission(false)
		.addSubcommand((sc) => sc.setName("commands").setDescription("Refresh the global commands")),
};

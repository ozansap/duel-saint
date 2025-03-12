import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Reply } from "@utils/reply";

const execute = async (interaction: ChatInputCommandInteraction) => {
	let description = "";

	const commands = await interaction.client.application?.commands.fetch();
	commands?.forEach(async (c) => {
		if (!c.defaultMemberPermissions && c.type === ApplicationCommandType.ChatInput) {
			const subcommands = c.options.filter((o) => o.type === ApplicationCommandOptionType.Subcommand);
			if (subcommands.length !== 0) {
				for (const s of subcommands) {
					description += `</${c.name} ${s.name}:${c.id}>⠀•⠀${s.description}\n`;
				}
			} else {
				description += `</${c.name}:${c.id}>⠀•⠀${c.description}\n`;
			}
		}
	});

	const reply = Reply.info(description);
	interaction.reply(reply.visible());
};

module.exports = {
	execute,
	data: new SlashCommandBuilder().setName("help").setDescription("See information about commands"),
};

import { ApplicationCommandOptionType, ApplicationCommandType, ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from "discord.js";
import { Reply } from "@utils/reply";
import { TEST } from "@config";

const execute = async (interaction: ChatInputCommandInteraction) => {
	let commands = TEST ? await interaction.guild?.commands.fetch() : await interaction.client.application?.commands.fetch();
	let filtered = commands?.filter(c => !c.defaultMemberPermissions && c.type === ApplicationCommandType.ChatInput);

	let description = "";
	filtered?.forEach(async (c) => {
		const subcommands = c.options.filter((o) => o.type === ApplicationCommandOptionType.Subcommand);
		if (subcommands.length !== 0) {
			for (const s of subcommands) {
				description += `</${c.name} ${s.name}:${c.id}>⠀•⠀${s.description}\n`;
			}
		} else {
			description += `</${c.name}:${c.id}>⠀•⠀${c.description}\n`;
		}
	});

	const reply = Reply.info(description);
	interaction.reply(reply.visible());
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("help")
		.setDescription("See information about commands")
		.setContexts([InteractionContextType.Guild, InteractionContextType.BotDM])
};

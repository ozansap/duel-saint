import { ChatInputCommandInteraction, InteractionContextType, SlashCommandBuilder } from "discord.js";
import { Reply } from "@utils/reply";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const commands = await interaction.client.application?.commands.fetch();
	const command_duel = commands.find((c) => c.name === "duel");
	const command_profile = commands.find((c) => c.name === "profile");
	const command_settings = commands.find((c) => c.name === "settings");

	const duel = command_duel ? `</${command_duel.name}:${command_duel.id}>` : `/duel`;
	const profile = command_profile ? `</${command_profile.name}:${command_profile.id}>` : `/profile`;
	const settings = command_settings ? `</${command_settings.name}:${command_settings.id}>` : `/settings`;

	const channel_lfg = `<#1047004004577714176>`;
	const channel_info = `<#1056576857107070976>`;

	let title = "So you want to play a ranked duel, huh?";
	let description = `\`1.\` Find an opponent in ${channel_lfg}\n\n` + `\`2.\` One of you use ${duel} to invite the other to a duel\n` + `Click \`Accept\` and start your duel in game\n` + `After the duel ends, click \`Winner\` if you win\n\n` + `**⟶** You can use ${profile} to see your or another players profile\n` + `To change your profile privacy settings, use ${settings}\n\n` + `**⟶** You can learn more about the ranked system in ${channel_info}`;

	const reply = new Reply({ title, description });
	interaction.reply(reply.visible());
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("howto")
		.setDescription("Learn how ranked duels work")
		.setContexts([InteractionContextType.Guild, InteractionContextType.BotDM])
};

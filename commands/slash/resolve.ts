import { ChannelType, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { GUILD_ID } from "@config";
import { DuelHandler } from "@utils/db";
import { Duel } from "@utils/duel";
import { Reply } from "@utils/reply";
import { now } from "@utils/time";
import { colors } from "@utils/vars";

const verdicts = {
	user: "Player 1 Win",
	target: "Player 2 Win",
	draw: "Draw",
	reset: "Reset",
};

const execute = async (interaction: ChatInputCommandInteraction) => {
	const verdict = interaction.options.getString("verdict", true) as "user" | "target" | "draw" | "reset";
	const disputeID = interaction.channel?.type === ChannelType.GuildText ? interaction.channel.topic : null;

	if (interaction.guild?.id !== GUILD_ID) {
		const reply = Reply.error(`That command can only be used in the main server`);
		return interaction.reply(reply.ephemeral());
	}

	const duelHandler = new DuelHandler(disputeID);
	const duelData = await duelHandler.fetch();

	if (!duelData) {
		const reply = Reply.error(`Cannot find dispute, make sure you use the command in a dispute channel`);
		return interaction.reply(reply.ephemeral());
	}

	const duel = await Duel.from(duelHandler);
	await duel.payout(interaction.guild!, verdict);

	const title = "This dispute has been resolved";
	const description = `Verdict: **${verdicts[verdict]}**\nChannel is set to be deleted <t:${now() + 60 * 60 * 24}:R>`;

	const reply = new Reply({ title, description, color: colors.green });
	interaction.reply(reply.visible());

	const channel = interaction.guild?.channels.resolve(duelData.dispute!.channelID);
	if (!channel?.name.includes("-resolved")) {
		channel?.setName(channel.name + "-resolved");

		setTimeout(() => {
			interaction.guild?.channels.resolve(duelData.dispute!.channelID)?.delete();
			duelHandler.resolve();
		}, 1000 * 60 * 60 * 24);
	}
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("resolve")
		.setDescription("Resolve a dispute")
		.setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
		.setContexts([InteractionContextType.Guild, InteractionContextType.BotDM])
		.addStringOption((o) => o
			.setName("verdict")
			.setDescription("Your verdict")
			.setRequired(true)
			.addChoices(
				{ name: "Player 1 Win", value: "user" },
				{ name: "Player 2 Win", value: "target" },
				{ name: "Draw", value: "draw" },
				{ name: "Reset", value: "reset" }
			))
};

import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, ModalBuilder, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { GeneralHandler } from "@utils/db";
import { Duel, DuelState } from "@utils/duel";
import { Reply } from "@utils/reply";
import { GeneralData } from "@utils/types";
import { GUILD_ID } from "@config";

const description = (duels: GeneralData["duels"]): string => {
	const all = Array.from(Duel.list.values());
	const playing = all.filter((d) => d.state === DuelState.Playing).length;
	const ended = all.filter((d) => d.state === DuelState.Ended).length;
	const invitation = all.filter((d) => d.state === DuelState.Invitation).length;

	return `Currently Playing: **${playing}**\n` + `Waiting for Dispute: **${ended}**\n` + `Invitations: **${invitation}**\n\n` + `Duel Creation: **${duels.enabled ? "Enabled" : "Disabled"}**\n` + `Disabled Duel Message:\n\`${duels.message}\``;
};

const execute = async (interaction: ChatInputCommandInteraction) => {
	if (interaction.guild?.id !== GUILD_ID) {
		const reply = Reply.error(`That command can only be used in the main server`);
		return interaction.reply(reply.ephemeral());
	}

	const b_enable = new ButtonBuilder().setLabel("Enable").setStyle(ButtonStyle.Success).setCustomId("enable");
	const b_disable = new ButtonBuilder().setLabel("Disable").setStyle(ButtonStyle.Danger).setCustomId("disable");
	const b_message = new ButtonBuilder().setLabel("Edit Message").setStyle(ButtonStyle.Secondary).setCustomId("message");

	const reply = Reply.info(description(GeneralHandler.data.duels));
	const message = await interaction.reply(reply.addComponents([b_enable, b_disable, b_message]).visible());

	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: 300000,
	});

	collector.on("collect", async (i) => {
		if (i.user.id !== interaction.user.id) {
			const reply = Reply.error("This interaction does not belong to you");
			i.reply(reply.ephemeral());
			return;
		}

		let enabled = GeneralHandler.data.duels.enabled;
		let message = GeneralHandler.data.duels.message;

		if (i.customId === "message") {
			const input = new TextInputBuilder().setCustomId("message").setLabel("Message").setStyle(TextInputStyle.Short).setPlaceholder("Message to be displayed when a player tries to start a duel when it is disabled").setRequired(true);
			const row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
			const modal = new ModalBuilder().setCustomId(`modal-${i.id}`).setTitle("Disabled Duel Message").addComponents(row);
			i.showModal(modal);

			const submit = await i.awaitModalSubmit({
				filter: (submit) => submit.customId === `modal-${i.id}`,
				time: 5 * 60 * 1000,
			});

			if (submit && submit.isFromMessage()) {
				message = submit.fields.getTextInputValue("message");

				await new GeneralHandler().duels_set({ enabled, message }).update();
				const reply = Reply.info(description(GeneralHandler.data.duels));
				submit.update(reply.visible());
			}
		} else {
			enabled = i.customId === "enable";

			await new GeneralHandler().duels_set({ enabled, message }).update();
			const reply = Reply.info(description(GeneralHandler.data.duels));
			i.update(reply.visible());
		}
	});

	collector.on("end", (collected) => {
		interaction.editReply(Reply.error("This session is over, you can start a new one").removeComponents().visible());
	});
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("duel-manager")
		.setDescription("Admin dashboard for controlling duels")
		.setDefaultMemberPermissions(8)
		.setContexts(0),
};

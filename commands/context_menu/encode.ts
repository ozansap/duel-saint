import { ApplicationCommandType, ButtonBuilder, ButtonStyle, ComponentType, ContextMenuCommandBuilder, MessageContextMenuCommandInteraction } from "discord.js";
import { Reply } from "@utils/reply";
import { encode, fromImage, toText } from "@utils/code";

const execute = async (interaction: MessageContextMenuCommandInteraction) => {
	let attachment = interaction.targetMessage.attachments.first();

	if (!attachment || attachment.width === null) {
		const reply = Reply.error("Message has no image");
		return interaction.reply(reply.ephemeral());
	}

	if (attachment.width !== 1200 || attachment.height !== 1630) {
		const reply = Reply.error("Your image has the wrong dimensions");
		return interaction.reply(reply.ephemeral());
	}

	await interaction.deferReply();

	let fromImage_result = await fromImage(attachment.url);
	if (fromImage_result.error) {
		const reply = Reply.error(fromImage_result.error.message);
		return interaction.editReply(reply.visible());
	}

	let deck = fromImage_result.data;
	let code = encode(deck);

	let toText_result = toText(deck);
	if (toText_result.error) {
		const reply = Reply.error(toText_result.error.message);
		return interaction.editReply(reply.visible());
	}

	let lines = toText_result.data.split("\n");
	let title = lines.shift()!;
	let description = lines.join("\n");
	description += "\n\n⚠️ The deck code may not work, press `Next` until you get a working one";

	let b_offset = new ButtonBuilder().setLabel("Next").setStyle(ButtonStyle.Secondary).setCustomId("offset_next");
	let b_code = new ButtonBuilder().setLabel("See Code").setStyle(ButtonStyle.Secondary).setCustomId("see_code");

	let reply = new Reply({ title, description, footer: { text: code } });
	let message = await interaction.editReply(reply.addComponents([b_offset, b_code]).visible());

	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: 300000,
	});

	let offset = 0;
	collector.on("collect", async (i) => {
		if (i.customId === "see_code") {
			i.reply({ content: code, ephemeral: true });
		} else if (i.customId === "offset_next") {
			code = encode(deck, ++offset);
			i.update(new Reply({ title, description, footer: { text: code } }).addComponents([b_offset, b_code]).visible());
		}
	});

	collector.on("end", (collected) => {
		interaction.editReply(new Reply().removeComponents().visible());
	});
};

module.exports = {
	execute,
	data: new ContextMenuCommandBuilder()
		.setName("Encode Deck Image")
		.setType(ApplicationCommandType.Message)
		.setDMPermission(false)
};

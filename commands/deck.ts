import { ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, SlashCommandBuilder } from "discord.js";
import { Reply } from "../utils/reply";
import { decode, display, encode, extract } from "../utils/code";
import { now } from "../utils/time";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const subcommand = interaction.options.getSubcommand(true);
	let code = "";
	let deckString = "";

	if (subcommand === "encode") {
		const attachment = interaction.options.getAttachment("deck_image", true);

		if (attachment.width !== 1200 || attachment.height !== 1630) {
			const reply = Reply.error("Your image has the wrong dimensions");
			return interaction.reply(reply.ephemeral());
		}

		const title = "Reading your deck image...";
		const description = `This may take around 20 seconds\nStarted reading <t:${now()}:R>`;

		const reply = new Reply({ title, description });
		await interaction.reply(reply.visible());

		const [error_extract, cardsData] = await extract(attachment.url);

		if (error_extract !== null) {
			const reply = Reply.error(error_extract);
			return interaction.editReply(reply.ephemeral());
		}

		const [error_encode, result_encode] = encode(cardsData);

		if (error_encode !== null) {
			const reply = Reply.error(error_encode);
			return interaction.editReply(reply.ephemeral());
		}

		code = result_encode;
		deckString = display(cardsData);
	} else if (subcommand === "decode") {
		code = interaction.options.getString("deck_code", true);

		const [error_decode, cardsData] = decode(code);

		if (error_decode !== null) {
			const reply = Reply.error(error_decode);
			return interaction.editReply(reply.ephemeral());
		}

		deckString = display(cardsData);
	} else {
		return;
	}

	const lines = deckString.split("\n");
	const title = lines.shift();
	const description = lines.join("\n");

	const b_code = new ButtonBuilder().setLabel("Send Code").setStyle(ButtonStyle.Secondary).setCustomId("send_code");

	const reply = new Reply({ title, description, footer: { text: code } });
	let message;

	if (subcommand === "encode") {
		message = await interaction.editReply(reply.addComponents([b_code]).visible());
	} else if (subcommand === "decode") {
		message = await interaction.reply(reply.addComponents([b_code]).visible());
	} else {
		return;
	}

	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.Button,
		time: 300000,
	});

	collector.on("collect", async (i) => {
		if (i.customId === "send_code") {
			i.reply({ content: code, ephemeral: true });
		}
	});

	collector.on("end", (collected) => {
		interaction.editReply(new Reply().removeComponents().visible());
	});
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("deck")
		.setDescription("Encode or Decode deck codes and find the represented deck")
		.setDMPermission(false)
		.addSubcommand((sc) =>
			sc
				.setName("encode")
				.setDescription("Convert an image to deck code and find the cards")
				.addAttachmentOption((o) => o.setName("deck_image").setDescription("Deck image").setRequired(true))
		)
		.addSubcommand((sc) =>
			sc
				.setName("decode")
				.setDescription("Find the deck that is represented by the deck code")
				.addStringOption((o) => o.setName("deck_code").setDescription("Deck code").setRequired(true))
		),
};

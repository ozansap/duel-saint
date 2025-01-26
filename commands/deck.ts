import { ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, SlashCommandBuilder } from "discord.js";
import { Reply } from "../utils/reply";
import { decode, encode, fromImage, toText } from "../utils/code";
import { now } from "../utils/time";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const subcommand = interaction.options.getSubcommand(true);
	let code = "";
	let deckString = "";
	let deck: number[] = [];
	let offset = 0;

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

		let deck_maybe = await fromImage(attachment.url);
		if (deck_maybe instanceof Error) {
			const reply = Reply.error(deck_maybe.message);
			return interaction.editReply(reply.ephemeral());
		}

		deck = deck_maybe;
		code = encode(deck);
		deckString = toText(deck);
	} else if (subcommand === "decode") {
		code = interaction.options.getString("deck_code", true);

		deck = decode(code);
		deckString = toText(deck);
	} else {
		return;
	}

	const lines = deckString.split("\n");
	const title = lines.shift();
	const description = lines.join("\n");

	const b_offset = new ButtonBuilder().setLabel("Next").setStyle(ButtonStyle.Secondary).setCustomId("offset_next");
	const b_code = new ButtonBuilder().setLabel("Send Code").setStyle(ButtonStyle.Secondary).setCustomId("send_code");

	const reply = new Reply({ title, description, footer: { text: code } });
	let message;

	if (subcommand === "encode") {
		message = await interaction.editReply(reply.addComponents([b_offset, b_code]).visible());
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
		} else if (i.customId === "offset_next") {
			code = encode(deck, ++offset);
			interaction.editReply(new Reply({ title, description, footer: { text: code } }).visible());
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

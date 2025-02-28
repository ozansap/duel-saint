import { ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, SlashCommandBuilder } from "discord.js";
import { Reply } from "../utils/reply";
import { decode, encode, fromImage, toImage, toText } from "../utils/code";
import sharp from "sharp";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const subcommand = interaction.options.getSubcommand(true);
	let code = "";
	let deckString = "";
	let deckImage;
	let deck: number[] = [];
	let offset = 0;
	let message;

	if (subcommand === "encode") {
		const attachment = interaction.options.getAttachment("deck_image", true);

		if (attachment.width !== 1200 || attachment.height !== 1630) {
			const reply = Reply.error("Your image has the wrong dimensions");
			return interaction.reply(reply.ephemeral());
		}

		await interaction.deferReply();

		let deck_maybe = await fromImage(attachment.url);
		if (deck_maybe instanceof Error) {
			const reply = Reply.error(deck_maybe.message);
			return interaction.editReply(reply.ephemeral());
		}

		deck = deck_maybe;
		code = encode(deck);
		let deckString_maybe = toText(deck);
		if (deckString_maybe instanceof Error) {
			const reply = Reply.error(deckString_maybe.message);
			return interaction.editReply(reply.ephemeral());
		}

		deckString = deckString_maybe;
		let lines = deckString.split("\n");
		let title = lines.shift()!;
		let description = lines.join("\n");
		description += "\n\n⚠️ The deck code may not work, press `Next` until you get a working one";

		let b_offset = new ButtonBuilder().setLabel("Next").setStyle(ButtonStyle.Secondary).setCustomId("offset_next");
		let b_code = new ButtonBuilder().setLabel("See Code").setStyle(ButtonStyle.Secondary).setCustomId("see_code");

		let reply = new Reply({ title, description, footer: { text: code } });
		message = await interaction.editReply(reply.addComponents([b_offset, b_code]).visible());

		const collector = message.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 300000,
		});

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

	} else if (subcommand === "decode") {
		code = interaction.options.getString("deck_code", true);

		let deck_maybe = decode(code);
		if (deck_maybe instanceof Error) {
			const reply = Reply.error(deck_maybe.message);
			return interaction.reply(reply.ephemeral());
		}

		await interaction.deferReply();

		deck = deck_maybe;
		let image_maybe = await toImage(deck);
		if (image_maybe instanceof Error) {
			const reply = Reply.error(image_maybe.message);
			return interaction.editReply(reply.ephemeral());
		}

		deckImage = image_maybe;
		await sharp(deckImage, { raw: { width: 1200, height: 1630, channels: 4 } }).png().toFile("new.png");
		// let reply = new Reply({ footer: { text: code } }).attachImage(deckImage).visible();
		message = await interaction.editReply({ files: ["new.png"], embeds: [{ image: { url: "attachment://new.png" } }] });
	} else {
		return;
	}
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

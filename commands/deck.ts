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

		let fromImage_result = await fromImage(attachment.url);
		if (fromImage_result.error) {
			const reply = Reply.error(fromImage_result.error.message);
			return interaction.editReply(reply.ephemeral());
		}

		deck = fromImage_result.data;
		code = encode(deck);

		let toText_result = toText(deck);
		if (toText_result.error) {
			const reply = Reply.error(toText_result.error.message);
			return interaction.editReply(reply.ephemeral());
		}

		deckString = toText_result.data;
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

		let decode_result = decode(code);
		if (decode_result.error) {
			const reply = Reply.error(decode_result.error.message);
			return interaction.reply(reply.ephemeral());
		}

		await interaction.deferReply();

		deck = decode_result.data;
		let toImage_result = await toImage(deck);
		if (toImage_result.error) {
			const reply = Reply.error(toImage_result.error.message);
			return interaction.editReply(reply.ephemeral());
		}

		deckImage = toImage_result.data;
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

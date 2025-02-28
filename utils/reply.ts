import { ActionRowBuilder, AttachmentBuilder, BaseMessageOptions, ButtonBuilder, ButtonStyle, ColorResolvable, ComponentType, EmbedAuthorOptions, EmbedBuilder, EmbedFooterOptions, InteractionReplyOptions, InteractionResponse, MessageActionRowComponentBuilder } from "discord.js";
import { colors } from "./vars";

export class Reply {
	content: string | null;
	embeds: EmbedBuilder[];
	components: ActionRowBuilder[];
	files: AttachmentBuilder[];

	constructor(options?: EmbedOptions) {
		this.content = null;
		this.embeds = [];
		this.components = [];
		this.files = [];

		if (options) this.addEmbed(options);

		return this;
	}

	static info(description: string): Reply {
		let reply = new Reply();
		reply.addEmbed({
			color: colors.default,
			description,
		});
		return reply;
	}

	static success(description: string): Reply {
		let reply = new Reply();
		reply.addEmbed({
			color: colors.green,
			description: `<:em:744576203590991906> ${description}`,
		});
		return reply;
	}

	static error(description: string): Reply {
		let reply = new Reply();
		reply.addEmbed({
			color: colors.red,
			description: `<:em:744576222276747265> ${description}`,
		});
		return reply;
	}

	static deletable(m: BaseMessageOptions) {
		const b_delete = new ButtonBuilder().setLabel("Delete Message").setStyle(ButtonStyle.Danger).setCustomId("delete");
		const reply = new Reply().addComponents([b_delete]).visible();
		return Object.assign({}, reply, m);
	}

	static setupDeleter(m: InteractionResponse<boolean>, userID: string) {
		const collector = m.createMessageComponentCollector({
			componentType: ComponentType.Button,
			time: 300000,
		});

		collector.on("collect", async (i) => {
			if (i.user.id !== userID) {
				const reply = Reply.error("This interaction does not belong to you");
				i.reply(reply.ephemeral());
				return;
			}

			if (i.customId === "delete") {
				i.deferUpdate();
				await m.delete();
				collector.removeAllListeners();
				return;
			}
		});

		collector.on("end", (collected) => {
			m.edit(new Reply().removeComponents().visible());
		});
	}

	addEmbed(options: EmbedOptions): Reply {
		options.color = options.color ?? colors.default;
		this.embeds.push(formEmbed(options));
		return this;
	}

	attachImage(attachment: Buffer): Reply {
		this.files.push(new AttachmentBuilder(attachment, { name: "image.png" }));
		this.embeds[0].setImage("attachment://image.png");
		return this;
	}

	removeComponents() {
		this.components = [];
		return this;
	}

	addComponents(components: MessageActionRowComponentBuilder[]) {
		this.components = this.components ?? [];
		const row = new ActionRowBuilder<(typeof components)[0]>();

		for (const component of components) {
			row.addComponents(component);
		}

		this.components.push(row);
		return this;
	}

	setContent(content: string) {
		this.content = content;
		return this;
	}

	visible(): BaseMessageOptions {
		let message: BaseMessageOptions = {}

		// @ts-ignore
		message.components = this.components;
		if (this.content) message.content = this.content;
		if (this.files.length) message.files = this.files;
		if (this.embeds.length) message.embeds = this.embeds;

		return message;
	}

	ephemeral() {
		let message: InteractionReplyOptions = { ephemeral: true }

		// @ts-ignore
		message.components = this.components;
		if (this.content) message.content = this.content;
		if (this.files.length) message.files = this.files;
		if (this.embeds.length) message.embeds = this.embeds;

		return message;
	}
}

function formEmbed(options: EmbedOptions): EmbedBuilder {
	const { author, title, description, footer, image, thumbnail, timestamp, color, fields } = options;
	let embed = new EmbedBuilder();

	if (author) embed.setAuthor(author);
	if (title) embed.setTitle(title);
	if (description) embed.setDescription(description);
	if (footer) embed.setFooter(footer);
	if (image) embed.setImage(image);
	if (thumbnail) embed.setThumbnail(thumbnail);
	if (timestamp) embed.setTimestamp(timestamp);
	if (color) embed.setColor(color);
	if (fields) embed.addFields(fields);

	return embed;
}

type EmbedOptions = {
	author?: EmbedAuthorOptions;
	color?: ColorResolvable;
	description?: string;
	footer?: EmbedFooterOptions;
	image?: string;
	thumbnail?: string;
	timestamp?: number | Date;
	title?: string;
	fields?: { name: string; value: string; inline: boolean }[];
};

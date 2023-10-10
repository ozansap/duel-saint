import { ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import { UserHandler } from "../utils/db";
import { Reply } from "../utils/reply";
import { User } from "../utils/user";
import { seasons } from "../utils/vars";

const seasonMenu = (season = "alltime") => {
	return new StringSelectMenuBuilder().setCustomId("season").addOptions(
		{
			label: "All-Time",
			value: "alltime",
			default: season === "alltime",
		},
		...seasons.all().map((x) => ({
			label: `Season ${x}`,
			value: x.toString(),
			default: season === x.toString(),
		}))
	);
};

const execute = async (interaction: ChatInputCommandInteraction) => {
	const user = interaction.options.getUser("player") ?? interaction.user;
	const self = interaction.user.id === user.id;

	const userHandler = new UserHandler(user.id);
	const userData = await userHandler.fetch();

	const s = userData.settings;

	if (s.profile === "private" && interaction.user.id !== user.id) {
		const reply = Reply.error(`That player's profile is private`);
		return interaction.reply(reply.ephemeral());
	}

	const options = {
		avatarURL: user.avatarURL({ size: 128 }) ?? "",
		tag: user.username,
		season: "alltime",
	};

	const b_delete = new ButtonBuilder().setLabel("Delete Message").setStyle(ButtonStyle.Danger).setCustomId("delete");

	const replyHandler = new User(userData);
	const reply = await replyHandler.seasonal(options);
	let replyMenu = new Reply().addComponents([seasonMenu()]);
	if (self) replyMenu = replyMenu.addComponents([b_delete]);
	const message = await interaction.reply(Object.assign({}, replyMenu.visible(), reply));

	if (self) Reply.setupDeleter(message, user.id);

	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.StringSelect,
		time: 300000,
	});

	collector.on("collect", async (i) => {
		if (i.user.id !== interaction.user.id) {
			const reply = Reply.error("This interaction does not belong to you");
			i.reply(reply.ephemeral());
			return;
		}

		const season = i.values[0];
		const reply = await replyHandler.seasonal(Object.assign(options, { season }));
		let replyMenu = new Reply().addComponents([seasonMenu(season)]);
		if (self) replyMenu = replyMenu.addComponents([b_delete]);
		i.update(Object.assign({}, replyMenu.visible(), reply));
	});

	collector.on("end", (collected) => {
		interaction.editReply(new Reply().removeComponents().visible());
	});
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("seasonal")
		.setDescription("See the seasonal stats of yourself or another player")
		.addUserOption((o) => o.setName("player").setDescription("The player whose seasonal stats you want to see")),
};

import { ChatInputCommandInteraction, ComponentType, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import { UserHandler } from "../utils/db";
import { Reply } from "../utils/reply";
import { User } from "../utils/user";

const screenMenu = (screen = "profile") => {
	return new StringSelectMenuBuilder().setCustomId("screen").addOptions(
		{
			label: "Profile",
			value: "profile",
			default: screen === "profile",
		},
		{
			label: "History",
			value: "history",
			default: screen === "history",
		},
		{
			label: "Matchups",
			value: "matchups",
			default: screen === "matchups",
		},
		{
			label: "Events",
			value: "events",
			default: screen === "events",
		},
		{
			label: "Offenses",
			value: "offenses",
			default: screen === "offenses",
		}
	);
};

const execute = async (interaction: ChatInputCommandInteraction) => {
	const user = interaction.options.getUser("player", true);
	const visible = interaction.options.getBoolean("visible");

	const userHandler = new UserHandler(user.id);
	const userData = await userHandler.fetch();

	const options = {
		avatarURL: user.avatarURL({ size: 128 }) ?? "",
		tag: user.username,
		hidden: false,
	};

	const replyHandler = new User(userData);
	const reply = replyHandler.profile(options, true, visible ?? false);
	const replyMenu = new Reply().addComponents([screenMenu()]).visible();
	const message = await interaction.reply(Object.assign({}, replyMenu, reply));

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

		const screen = i.values[0] as "profile" | "history" | "matchups" | "events" | "offenses";
		const reply = await replyHandler[screen](options, true, visible ?? false);
		const replyMenu = new Reply().addComponents([screenMenu(screen)]).visible();
		i.update(Object.assign({}, replyMenu, reply));
	});

	collector.on("end", (collected) => {
		interaction.editReply(new Reply().removeComponents().visible());
	});
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("peek")
		.setDescription("Peek into the informations of a player")
		.setDefaultMemberPermissions(2)
		.setDMPermission(false)
		.addUserOption((o) => o.setName("player").setDescription("The player whose information you want to see").setRequired(true))
		.addBooleanOption((o) => o.setName("visible").setDescription("Should the profile be visible to everyone")),
};

import { ChatInputCommandInteraction, ComponentType, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import { UserHandler } from "../utils/db";
import { Reply } from "../utils/reply";

const types = {
	profile: {
		private: "Private",
		public: "Public",
	},
	career: {
		all: "Show All",
		wins: "Hide Losses",
		none: "Hide Everything",
	},
};

const execute = async (interaction: ChatInputCommandInteraction) => {
	const user = interaction.user;

	const userHandler = new UserHandler(user.id);
	let userData = await userHandler.fetch();

	let description = `Profile: **${types.profile[userData.settings.profile]}**\n` + `Duel Career: **${types.career[userData.settings.career]}**\n\n` + `ℹ️ Rating and Wins are always visible when duelling`;

	const profile = new StringSelectMenuBuilder().setCustomId("profile").setPlaceholder("Profile Visibility").addOptions(
		{
			label: "Private",
			description: "Only you can see your profile",
			value: "private",
		},
		{
			label: "Public",
			description: "Everybody can see your profile",
			value: "public",
		}
	);

	const career = new StringSelectMenuBuilder().setCustomId("career").setPlaceholder("Duel Career Visibility").addOptions(
		{
			label: "Show All",
			description: "Show Wins, Losses and Winrate",
			value: "all",
		},
		{
			label: "Hide Losses",
			description: "Show Wins Only",
			value: "wins",
		},
		{
			label: "Hide Everything",
			description: "Show nothing",
			value: "none",
		}
	);

	const reply = new Reply({ title: "Profile Settings", description });
	const message = await interaction.reply(reply.addComponents([profile]).addComponents([career]).ephemeral());

	const collector = message.createMessageComponentCollector({
		componentType: ComponentType.StringSelect,
		time: 300000,
	});

	collector.on("collect", async (i) => {
		const profile = i.customId === "profile" ? (i.values[0] as keyof typeof types.profile) : userData.settings.profile;
		const career = i.customId === "career" ? (i.values[0] as keyof typeof types.career) : userData.settings.career;

		userData = await userHandler.settings_set({ profile, career }).update();

		let description = `Profile: **${types.profile[profile]}**\n` + `Duel Career: **${types.career[career]}**\n\n` + `ℹ️ Rating and Wins are always visible when duelling`;

		const reply = new Reply({ title: "Profile Settings", description });
		i.update(reply.visible());
	});

	collector.on("end", (collected) => {
		interaction.editReply(Reply.error("This session is over, you can start a new one").removeComponents().ephemeral());
	});
};

module.exports = {
	execute,
	data: new SlashCommandBuilder().setName("settings").setDescription("Set your profile privacy settings"),
};

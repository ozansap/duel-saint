import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { GUILD_ID } from "@config";
import { UserHandler } from "@utils/db";
import { Reply } from "@utils/reply";
import { duration, now } from "@utils/time";

const durationList = {
	"1_day": 60 * 60 * 24,
	"3_day": 60 * 60 * 24 * 3,
	"1_week": 60 * 60 * 24 * 7,
	"2_week": 60 * 60 * 24 * 7 * 2,
	"1_month": 60 * 60 * 24 * 28,
	"100_year": 60 * 60 * 24 * 365.25 * 100,
};

const execute = async (interaction: ChatInputCommandInteraction) => {
	const user = interaction.options.getUser("player", true);
	const durationStr = interaction.options.getString("duration", true);
	const reason = interaction.options.getString("reason");

	if (interaction.guild?.id !== GUILD_ID) {
		const reply = Reply.error(`That command can only be used in the main server`);
		return interaction.reply(reply.ephemeral());
	}

	const durationNum = durationList[durationStr as keyof typeof durationList] ?? 60 * 60 * 24;

	const userHandler = new UserHandler(user.id);
	userHandler.ban_set(now() + durationNum);
	userHandler.offense_add({
		type: "Ban",
		date: now(),
		duration: durationNum,
		reason: reason ?? "",
	});

	userHandler.update();

	const reply = Reply.success(`Successfully banned ${user} for **${duration(durationNum * 1000)}**`);
	interaction.reply(reply.visible());
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("ban")
		.setDescription("Ban a player from ranked play")
		.setDefaultMemberPermissions(2)
		.setDMPermission(false)
		.addUserOption((o) => o.setName("player").setDescription("The player who you want to ban").setRequired(true))
		.addStringOption((o) => o.setName("duration").setDescription("How long do you want to ban").setRequired(true).setChoices({ name: "1 Day", value: "1_day" }, { name: "3 Days", value: "3_day" }, { name: "1 Week", value: "1_week" }, { name: "2 Weeks", value: "2_week" }, { name: "1 Month", value: "1_month" }, { name: "Lifelong", value: "100_year" }))
		.addStringOption((o) => o.setName("reason").setDescription("Reason to ban this player")),
};

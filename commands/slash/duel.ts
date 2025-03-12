import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { GUILD_ID, OWNER_ID } from "@config";
import { GeneralHandler, UserHandler } from "@utils/db";
import { Duel, DuelState } from "@utils/duel";
import { Reply } from "@utils/reply";
import { now } from "@utils/time";
import { seasons } from "@utils/vars";

const execute = async (interaction: ChatInputCommandInteraction) => {
	if (seasons.dates[seasons.current] < now()) {
		const reply = Reply.error(`Season has ended, maintenance in progress`);
		return interaction.reply(reply.ephemeral());
	}

	if (interaction.guild?.id !== GUILD_ID) {
		const reply = Reply.error(`That command can only be used in the main server`);
		return interaction.reply(reply.ephemeral());
	}

	if (!GeneralHandler.data.duels.enabled && interaction.user.id !== OWNER_ID) {
		const reply = Reply.error(GeneralHandler.data.duels.message);
		return interaction.reply(reply.visible());
	}

	const target = interaction.options.getUser("player", true);
	const user = interaction.user;

	if (target.id === user.id) {
		const reply = Reply.error(`You cannot duel yourself`);
		return interaction.reply(reply.ephemeral());
	}

	const blockers = [DuelState.Invitation, DuelState.Playing, DuelState.Disputed];

	const all = Array.from(Duel.list.values());
	const included = all.filter((d) => [d.user.id, d.target.id].some((s) => [user.id, target.id].includes(s)));
	const blocking = included.filter((d) => blockers.includes(d.state)).length;

	if (blocking) {
		const reply = Reply.error(`Either you or your opponent is already part of a duel`);
		return interaction.reply(reply.ephemeral());
	}

	const userHandler = new UserHandler(user.id);
	const userData = await userHandler.fetch();

	if (userData.banned > now()) {
		const reply = Reply.error(`You are banned from ranked duels`);
		return interaction.reply(reply.ephemeral());
	}

	const targetHandler = new UserHandler(target.id);
	const targetData = await targetHandler.fetch();

	if (targetData.banned > now()) {
		const reply = Reply.error(`That player is banned from ranked duels`);
		return interaction.reply(reply.ephemeral());
	}

	if (Math.abs(userData.elo - targetData.elo) > 500) {
		const reply = Reply.error(`The difference between your ratings is too big`);
		return interaction.reply(reply.ephemeral());
	}

	const duel = new Duel({
		user: { id: user.id, handler: userHandler, tag: user.username },
		target: { id: target.id, handler: targetHandler, tag: target.username },
	});

	duel.setup(interaction);
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("duel")
		.setDescription("Invite another player to a ranked duel")
		.setDMPermission(false)
		.addUserOption((o) => o.setName("player").setDescription("The player who you want to duel").setRequired(true)),
};

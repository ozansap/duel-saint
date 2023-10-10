import { ButtonBuilder, ButtonInteraction, ButtonStyle, ChannelType, CommandInteraction, ComponentType, Guild, Message, Snowflake } from "discord.js";
import { DISPUTE_CATEGORY_ID, MOD_ROLE_ID } from "../config";
import { DuelHandler, UserHandler } from "./db";
import { clamp, number, rank, uid } from "./num";
import { Reply } from "./reply";
import { now } from "./time";
import { colors, ranks } from "./vars";

const duration = 60 * 60 * 24 * 7;

export class Duel {
	static list = new Map<Snowflake, Duel>();

	static async from(duelHandler: DuelHandler) {
		const duelData = duelHandler.data!;

		const userHandler = new UserHandler(duelData.user.id);
		const targetHandler = new UserHandler(duelData.target.id);

		await userHandler.fetch();
		await targetHandler.fetch();

		return new Duel({
			user: { id: duelData.user.id, handler: userHandler, tag: "" },
			target: { id: duelData.target.id, handler: targetHandler, tag: "" },
			handler: duelHandler,
		});
	}

	constructor({ user, target, handler }: DuelConstructorData) {
		this.user = Object.assign(user, { winner: 0, d_elo: 0 });
		this.target = Object.assign(target, { winner: 0, d_elo: 0 });

		const userElo = this.user.handler.data.elo;
		const targetElo = this.target.handler.data.elo;
		const diff = Math.abs(userElo - targetElo);
		const value = diff / Math.min(userElo, targetElo);

		const userLastOpponent = this.user.handler.data.last_opponent;
		const targetLastOpponent = this.target.handler.data.last_opponent;

		const disputeRematch = handler?.data?.dispute?.rematch;
		const isRematch = userLastOpponent.id === target.id && targetLastOpponent.id === user.id;
		this.rematch = disputeRematch ?? isRematch ? Math.min(userLastOpponent.count, targetLastOpponent.count) : 0;

		const rematchValue = Math.floor(this.rematch / 2) + 1;

		this.leaderID = userElo < targetElo ? target.id : user.id;
		this.big = Math.round((10 * (1 + value)) / rematchValue);
		this.small = Math.round(10 / (1 + value) / rematchValue);

		this.big = clamp(0, this.big, 20);
		this.small = clamp(0, this.small, 10);

		this.big *= 3;
		this.small *= 3;

		this.state = DuelState.Invitation;
		this.handler = handler;
	}

	async handle(interaction: ButtonInteraction) {
		if (this.state === DuelState.Invitation) {
			switch (interaction.customId) {
				case "accept":
					if (interaction.user.id !== this.target.id) {
						const reply = Reply.error("You are not the invited player");
						return interaction.reply(reply.ephemeral());
					}

					return this.start(interaction);
				case "cancel":
					if (interaction.user.id !== this.user.id && interaction.user.id !== this.target.id) {
						const reply = Reply.error("You are not one of the players");
						return interaction.reply(reply.ephemeral());
					}

					return this.cancel(interaction);
			}
		} else if (this.state === DuelState.Playing) {
			if (interaction.user.id !== this.user.id && interaction.user.id !== this.target.id) {
				const reply = Reply.error("You are not one of the players");
				return interaction.reply(reply.ephemeral());
			}

			const opponent = this.user.id === interaction.user.id ? this.target : this.user;

			const description = interaction.customId === "cancel" ? `${interaction.user} wants to cancel the duel, do you accept?` : `You selected **\`${interaction.customId}\`**, do you wish to confirm your selection?`;

			const confirmed = await this.confirmation({
				interaction,
				description,
				ephemeral: interaction.customId !== "cancel",
				recipient: interaction.customId === "cancel" ? opponent.id : interaction.user.id,
			});

			if (!confirmed) return;

			switch (interaction.customId) {
				case "winner":
				case "draw":
					return this.end(interaction);
				case "cancel":
					return this.cancel(interaction);
			}
		} else if (this.state === DuelState.Ended) {
			if (interaction.user.id !== this.user.id && interaction.user.id !== this.target.id) {
				const reply = Reply.error("You are not one of the players");
				return interaction.reply(reply.ephemeral());
			}

			const confirmed = await this.confirmation({
				interaction,
				description: `Are you sure you want to dispute the result of this duel?`,
				ephemeral: true,
				recipient: interaction.user.id,
			});

			if (!confirmed) return;

			switch (interaction.customId) {
				case "dispute":
					return this.dispute(interaction);
			}
		}
	}

	fields(guild: Guild, end: boolean = false) {
		const user = guild.members.resolve(this.user.id);
		const target = guild.members.resolve(this.target.id);
		const userData = this.user.handler.data;
		const targetData = this.target.handler.data;

		let fields = [
			{
				name: "\u200b",
				inline: true,
				value: `${this.user.winner > 0 ? "🏆" : ""} ${user}\n` + `**${number(userData.elo)} Rating** • ${number(userData.wins, "win")}`,
			},
			{
				name: "\u200b",
				inline: true,
				value: `${this.target.winner > 0 ? "🏆" : ""} ${target}\n` + `**${number(targetData.elo)} Rating** • ${number(targetData.wins, "win")}`,
			},
		];

		if (end) {
			if (this.user.d_elo < 0) {
				fields[0].value += `\n${this.user.d_elo} Rating`;
			} else if (this.user.d_elo === 0) {
				fields[0].value += `\n-${this.user.d_elo} Rating`;
			} else {
				fields[0].value += `\n+${this.user.d_elo} Rating`;
			}

			if (this.target.d_elo < 0) {
				fields[1].value += `\n${this.target.d_elo} Rating`;
			} else if (this.target.d_elo === 0) {
				fields[1].value += `\n-${this.target.d_elo} Rating`;
			} else {
				fields[1].value += `\n+${this.target.d_elo} Rating`;
			}
		}

		return fields;
	}

	rematchAuthor() {
		const message = this.rematch ? (this.rematch >= 2 ? `Rematch! x${this.rematch}` : "Rematch!") : "";
		return this.rematch ? { name: message } : undefined;
	}

	async setup(interaction: CommandInteraction) {
		const target = interaction.guild?.members.resolve(this.target.id);

		if (!target) {
			const reply = Reply.error("That user is not in this server");
			return interaction.reply(reply.ephemeral());
		}

		const title = `${target.displayName}, you are invited to a __ranked__ TCG duel`;
		const fields = this.fields(interaction.guild!);
		const description = `⚠️ Once you accept this invitation, you have to play or you will be considered to have conceded`;

		const button1 = new ButtonBuilder().setLabel("Accept").setStyle(ButtonStyle.Primary).setCustomId("accept");
		const button2 = new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Secondary).setCustomId("cancel");

		const options = { author: this.rematchAuthor(), title, description, fields };
		const reply = new Reply(options).addComponents([button1, button2]);
		await interaction.reply(Object.assign({ content: `${target}` }, reply.visible()));
		const message = await interaction.fetchReply();
		this.register(message);
	}

	async confirmation(options: ConfirmationOptions): Promise<boolean> {
		let result = false;

		const button1 = new ButtonBuilder().setLabel("Confirm").setStyle(ButtonStyle.Success).setCustomId("true");
		const button2 = new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Secondary).setCustomId("false");

		const { description } = options;

		const reply = new Reply({ description, color: colors.red }).addComponents([button1, button2]);
		const message = await options.interaction.reply(options.ephemeral ? reply.ephemeral() : reply.visible());

		await new Promise<void>((resolve, reject) => {
			const collector = message.createMessageComponentCollector({
				componentType: ComponentType.Button,
				time: 10000,
			});

			collector.on("collect", (i) => {
				if (i.user.id !== options.recipient) {
					const reply = Reply.error("This interaction does not belong to you");
					i.reply(reply.ephemeral());
					return;
				}

				result = i.customId === "true";

				collector.stop();
			});

			collector.on("end", (collected) => {
				resolve();
			});
		});

		await options.interaction.deleteReply();
		return result;
	}

	register(message: Message) {
		this.message = message;
		Duel.list.set(message.id, this);

		this.timeout = setTimeout(() => {
			this.deregister();
			const reply = Reply.error(`Duel request was not accepted in time`);
			this.message.edit(reply.removeComponents().visible());
		}, 20000);
	}

	deregister() {
		clearTimeout(this.timeout);

		if (this.message) {
			Duel.list.delete(this.message.id);
		} else if (this.handler?.data?.dispute?.messageID) {
			Duel.list.delete(this.handler?.data?.dispute?.messageID);
		}
	}

	cancel(interaction: ButtonInteraction) {
		this.deregister();
		const reply = Reply.error(`This duel has been cancelled`).removeComponents().visible();
		interaction.replied ? interaction.message.edit(reply) : interaction.update(reply);
	}

	start(interaction: ButtonInteraction) {
		clearTimeout(this.timeout);
		this.state = DuelState.Playing;

		this.timeout = setTimeout(() => {
			this.deregister();
			const reply = Reply.error(`Duel was not played in time`);
			this.message.edit(reply.removeComponents().visible());
		}, 1000 * 60 * 60);

		const title = `Ranked TCG Duel`;
		const fields = this.fields(interaction.guild!);
		const description =
			`You have **1 hour** to play the TCG duel\n` + `If not played, nothing changes\n` + `**Winner declares their win** by pressing the button on this message\n` + `**Anyone can declare a draw** by pressing the button on this message\n` + `Winner might have to **prove their win**, make sure to take **screenshots**\n\n` + `⚠️ Do not declare a win or a draw unless it is the result of the in game duel\n` + `⚠️ Inability to prove a win when required might result in dismissal of the duel`;

		const button1 = new ButtonBuilder().setLabel("Winner").setStyle(ButtonStyle.Primary).setCustomId("winner");
		const button2 = new ButtonBuilder().setLabel("Draw").setStyle(ButtonStyle.Primary).setCustomId("draw");
		const button3 = new ButtonBuilder().setLabel("Cancel").setStyle(ButtonStyle.Secondary).setCustomId("cancel");

		const options = { author: this.rematchAuthor(), title, description, fields };
		const reply = new Reply(options).addComponents([button1, button2, button3]);
		interaction.update(reply.visible());
	}

	async end(interaction: ButtonInteraction) {
		clearTimeout(this.timeout);
		this.state = DuelState.Ended;

		const result = interaction.customId === "draw" ? "draw" : interaction.user.id === this.user.id ? "user" : "target";
		await this.payout(interaction.guild!, result);

		const title = `Ranked TCG Duel Results`;
		const fields = this.fields(interaction.guild!, true);
		const description = `If you are one of the players and believe that the result is false, **you may dispute**\n` + `You might have to **prove your claims**\n` + `You have up to **1 hour** after the end of a duel to dispute\n\n` + `⚠️ You may be penalized if you dispute unrightfully\n` + `⚠️ You may be permanently banned if caught abusing disputes`;

		const button = new ButtonBuilder().setLabel("Dispute").setStyle(ButtonStyle.Danger).setCustomId("dispute");

		const options = { author: this.rematchAuthor(), title, description, fields, color: colors.green };
		const reply = new Reply(options).addComponents([button]);
		interaction.message.edit(reply.visible());

		this.timeout = setTimeout(() => {
			this.deregister();
			const options = { author: this.rematchAuthor(), title, fields, color: colors.green };
			this.message.edit(new Reply(options).removeComponents().visible());
		}, 1000 * 60 * 60);
	}

	async payout(guild: Guild, winner: "user" | "target" | "draw" | "reset") {
		if (winner === "draw") {
			if (this.user.handler.data.elo === this.target.handler.data.elo) {
				this.user.d_elo = 0;
				this.target.d_elo = 0;
			} else {
				const elo = Math.round(this.big / 2);
				this.user.d_elo = this.user.id === this.leaderID ? -elo : elo;
				this.target.d_elo = this.target.id === this.leaderID ? -elo : elo;
			}
		} else if (winner === "reset") {
		} else {
			const elo = this[winner].id === this.leaderID ? this.small : this.big;
			const loser = winner === "user" ? "target" : "user";

			this[winner].d_elo = elo;
			this[winner].winner = 1;
			this[loser].d_elo = -elo;
			this[loser].winner = -1;

			this[winner].handler.wins_add();
			this[loser].handler.losses_add();
		}

		if (this.handler) {
			if (!this.handler.data) throw new Error("Could not find dispute");

			const old = this.handler.data;

			this.user.d_elo -= old.user.d_elo;
			this.target.d_elo -= old.target.d_elo;

			old.user.winner > 0 ? this.user.handler.wins_add(-1) : this.user.handler.losses_add(old.user.winner);
			old.target.winner > 0 ? this.target.handler.wins_add(-1) : this.target.handler.losses_add(old.target.winner);
		}

		const players = [this.user, this.target];

		for (let i = 0; i < players.length; i++) {
			const player = players[i];
			const opponent = players[1 - i];

			if (!this.handler) {
				// unique_opponents event
				if (!player.handler.data.events.unique_opponents?.includes(opponent.id)) player.handler.unique_opponents_add(opponent.id);

				// set last opponent
				player.handler.last_opponent_set(opponent.id, this.rematch + 1);
			}

			// undo last opponent
			if (winner === "reset") {
				if (player.handler.data.last_opponent.id === opponent.id) player.handler.last_opponent_set(opponent.id, this.rematch);
			}

			// floor rank protection
			const filtered = ranks.filter((r) => r.elo <= player.handler.data.elo && r.floor);
			const newFiltered = ranks.filter((r) => r.elo <= player.handler.data.elo + player.d_elo && r.floor);

			if (filtered.length > newFiltered.length) player.d_elo = filtered[filtered.length - 1].elo - player.handler.data.elo;

			const newElo = player.handler.data.elo + player.d_elo;

			// update
			player.handler.elo_add(player.d_elo).highest_check(newElo).update(player.tag);

			// check role
			this.roleCheck(guild, player.id, player.handler.data.elo + player.d_elo);
		}

		if (this.handler) {
			this.handler.update({
				user: {
					id: this.user.id,
					elo: this.handler.data!.user.elo,
					d_elo: this.user.d_elo + this.handler.data!.user.d_elo,
					winner: this.user.winner,
				},
				target: {
					id: this.target.id,
					elo: this.handler.data!.target.elo,
					d_elo: this.target.d_elo + this.handler.data!.target.d_elo,
					winner: this.target.winner,
				},
				date: this.handler.data!.date,
				dispute: this.handler.data?.dispute,
			});

			this.deregister();
		} else {
			this.handler = new DuelHandler();
			this.handler.create({
				user: {
					id: this.user.id,
					elo: this.user.handler.data.elo,
					d_elo: this.user.d_elo,
					winner: this.user.winner,
				},
				target: {
					id: this.target.id,
					elo: this.target.handler.data.elo,
					d_elo: this.target.d_elo,
					winner: this.target.winner,
				},
				date: now(),
			});
		}
	}

	async dispute(interaction: ButtonInteraction) {
		clearTimeout(this.timeout);
		this.state = DuelState.Disputed;

		const channel = await this.record(interaction);

		const title = `Ranked TCG Duel Results [DISPUTED]`;
		const description = `${channel} has been created to discuss this duel`;

		const reply = new Reply({ title, description, color: colors.red });
		interaction.message.edit(reply.removeComponents().visible());
	}

	async record(interaction: ButtonInteraction) {
		const category = interaction.guild?.channels.resolve(DISPUTE_CATEGORY_ID);
		if (category?.type !== ChannelType.GuildCategory) {
			throw new Error("Channel is not Category Channel");
		}

		const channel = await category.children.create({
			name: uid(4),
			topic: this.handler!.id!,
			permissionOverwrites: [
				{ allow: ["ViewChannel", "AttachFiles", "SendMessages"], id: this.user.id },
				{ allow: ["ViewChannel", "AttachFiles", "SendMessages"], id: this.target.id },
				{ allow: ["ViewChannel", "AttachFiles", "SendMessages"], id: MOD_ROLE_ID },
				{ deny: "ViewChannel", id: interaction.guild?.roles.everyone.id! },
			],
		});

		this.handler!.dispute({
			rematch: this.rematch,
			channelID: channel.id,
			messageID: this.message.id,
		});

		const fields = this.fields(interaction.guild!, true);
		const description = `Dispute Opened By: ${interaction.user}\n\n` + `A staff member will be with you shortly\n` + `In the meantime, if you have any proof ready, please **present them**\n\n` + `⚠️ If you are found guilty, you might be permanently banned from ranked play\n` + `⚠️ Confessing right now might reduce your penalty`;

		const user = interaction.guild?.members.resolve(this.user.id);
		const target = interaction.guild?.members.resolve(this.target.id);
		const modRole = interaction.guild?.roles.resolve(MOD_ROLE_ID);

		const options = { author: this.rematchAuthor(), description, fields };

		const url = interaction.message.url;
		const button1 = new ButtonBuilder().setLabel("Jump to Duel").setStyle(ButtonStyle.Link).setURL(url);

		const reply = new Reply(options).addComponents([button1]);
		channel.send(Object.assign({ content: `${user} ${target} ${modRole}` }, reply.visible()));

		return channel;
	}

	async roleCheck(guild: Guild, userID: Snowflake, elo: number) {
		const { n } = rank(elo);
		const roleID = ranks[n].role;

		const user = await guild.members.fetch(userID);
		const has = user.roles.resolve(roleID);

		if (!has) {
			if (user.roles.resolve(ranks[n - 3]?.role)) user.roles.remove(ranks[n - 3].role).catch((err) => console.error(err));
			if (user.roles.resolve(ranks[n - 2]?.role)) user.roles.remove(ranks[n - 2].role).catch((err) => console.error(err));
			if (user.roles.resolve(ranks[n - 1]?.role)) user.roles.remove(ranks[n - 1].role).catch((err) => console.error(err));
			if (user.roles.resolve(ranks[n + 1]?.role)) user.roles.remove(ranks[n + 1].role).catch((err) => console.error(err));
			if (user.roles.resolve(ranks[n + 2]?.role)) user.roles.remove(ranks[n + 2].role).catch((err) => console.error(err));
			user.roles.add(roleID).catch((err) => console.error(err));
		}
	}
}

export interface Duel {
	state: DuelState;
	timeout: NodeJS.Timeout;
	user: PlayerData;
	target: PlayerData;
	message: Message;
	leaderID: Snowflake;
	small: number;
	big: number;
	rematch: number;
	handler?: DuelHandler;
}

type DuelConstructorData = {
	user: Omit<PlayerData, "winner" | "d_elo">;
	target: Omit<PlayerData, "winner" | "d_elo">;
	handler?: DuelHandler;
};

type PlayerData = {
	id: Snowflake;
	tag: string;
	handler: UserHandler;
	winner: number;
	d_elo: number;
};

type ConfirmationOptions = {
	interaction: ButtonInteraction;
	recipient: Snowflake;
	ephemeral: boolean;
	description: string;
};

export enum DuelState {
	"Invitation" = 1,
	"Playing" = 2,
	"Ended" = 3,
	"Disputed" = 4,
}

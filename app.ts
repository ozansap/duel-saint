import { Client, ActivityType, GatewayIntentBits } from "discord.js";
import fs from "fs";
import { TOKEN } from "@config";
import { Command } from "@utils/types";
import { Commands } from "@utils/commands";
import { DB, GeneralHandler } from "@utils/db";
import { Duel } from "@utils/duel";
import { Cards } from "@utils/cards";
import { Shop } from "@utils/shop";
import { Order } from "@utils/order";
import { Reply } from "@utils/reply";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const commands: Command[] = [];
for (let type of ["slash", "context_menu"]) {
	let files = fs.readdirSync(__dirname + `/commands/${type}`);
	for (let file of files) {
		let command = require(`./commands/${type}/${file}`);
		commands.push(command);
	}
}

client.once("ready", async () => {
	client.user?.setPresence({ activities: [{ name: `/duel`, type: ActivityType.Listening }] });

	await DB.connect();
	await GeneralHandler.fetch();
	Cards.refresh();
	Shop.refresh();

	Commands.init(commands);
	await Commands.deploy(client);

	console.log(`Logged in as ${client.user?.username}!`);
});

client.on("interactionCreate", async (interaction) => {
	if (interaction.isChatInputCommand() || interaction.isContextMenuCommand()) {
		const command = Commands.list.get(interaction.commandName);

		try {
			command?.execute(interaction);
		} catch (err) {
			interaction.reply("There was an error trying to execute that command\nContact `swagnemite.` if you keep getting this error");
		}
	} else if (interaction.isButton()) {
		if (interaction.customId.startsWith("order-")) {
			if (!interaction.memberPermissions?.has("Administrator")) {
				let reply = Reply.error("You don't have the permission to do that little bro...");
				return interaction.reply(reply.ephemeral());
			}

			Order.handle(interaction);
		} else if (interaction.customId.startsWith("duel-")) {
			const duel = Duel.list.get(interaction.message.id);
			duel?.handle(interaction);
		}
	} else if (interaction.isAutocomplete()) {
		const command = Commands.list.get(interaction.commandName);

		try {
			if (!command?.autocomplete) throw new Error("Autocomplete error");
			await command.autocomplete(interaction);
		} catch (error) {
			console.error(error);
		}
	}
});

client.login(TOKEN);

import { Client, ActivityType, GatewayIntentBits } from "discord.js";
import fs from "fs";
import { TOKEN } from "@config";
import { Command } from "@utils/types";
import { Commands } from "@utils/commands";
import { DB, GeneralHandler } from "@utils/db";
import { Duel } from "@utils/duel";
import { Cards } from "@utils/cards";

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
	Commands.init(commands);

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
		if (Duel.list.has(interaction.message.id)) {
			const duel = Duel.list.get(interaction.message.id);
			duel?.handle(interaction);
		}
	}
});

client.login(TOKEN);

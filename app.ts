import { Client, ActivityType, GatewayIntentBits } from "discord.js";
import fs from "fs";

import { TOKEN } from "./config";
import { Command } from "./utils/types";
import { Commands } from "./utils/commands";
import { DB, GeneralHandler } from "./utils/db";
import { Duel } from "./utils/duel";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

const importedCommands: Command[] = [];
const importedCommandFiles = fs.readdirSync(__dirname + "/commands");
for (const file of importedCommandFiles) {
	const command = require(`./commands/${file}`);
	importedCommands.push(command);
}

client.once("ready", async () => {
	client.user?.setPresence({ activities: [{ name: `/duel`, type: ActivityType.Listening }] });

	await DB.connect();
	await GeneralHandler.fetch();

	Commands.init(importedCommands);
	await Commands.deploy(client);

	console.log(`Logged in as ${client.user?.username}!`);
});

client.on("interactionCreate", async (interaction) => {
	if (interaction.isCommand()) {
		const command = Commands.list.get(interaction.commandName);

		try {
			command?.execute(interaction);
		} catch (err) {
			interaction.reply("There was an error trying to execute that command\nContact Swagnemite#9374 if you keep getting this error");
		}
	} else if (interaction.isButton()) {
		if (Duel.list.has(interaction.message.id)) {
			const duel = Duel.list.get(interaction.message.id);
			duel?.handle(interaction);
		}
	}
});

client.login(TOKEN);

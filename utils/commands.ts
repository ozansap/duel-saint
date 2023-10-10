import { Client, REST, RESTPostAPIChatInputApplicationCommandsJSONBody, Routes } from "discord.js";
import { TEST, TOKEN, GUILD_ID } from "../config";
import { Command } from "./types";

export class Commands {
	static list: Map<string, Command> = new Map();

	static init(commands: Command[]): void {
		for (const command of commands) {
			Commands.list.set(command.data.name, command);
		}
	}

	static async deploy(client: Client): Promise<void> {
		let commandsData: RESTPostAPIChatInputApplicationCommandsJSONBody[] = [];
		for (const command of Commands.list.values()) {
			commandsData.push(command.data.toJSON());
		}

		const rest = new REST({ version: "10" }).setToken(TOKEN);

		try {
			if (TEST) {
				await rest.put(Routes.applicationGuildCommands(client.user?.id ?? "", GUILD_ID), { body: commandsData });
			} else {
				await rest.put(Routes.applicationCommands(client.user?.id ?? ""), { body: commandsData });
			}
		} catch (error) {
			console.error(error);
		}
	}

	static async refresh(client: Client): Promise<number[]> {
		const commands = await client.application?.commands.fetch();
		const size = [commands?.size ?? 0, Commands.list.size];

		commands?.forEach(async (c) => {
			await c.delete();
		});

		await Commands.deploy(client);
		return size;
	}
}

import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { DB } from "../utils/db";
import { Reply } from "../utils/reply";
import { colors } from "../utils/vars";

const execute = async (interaction: ChatInputCommandInteraction) => {
	const options = {
		rename,
	};

	const key = interaction.options.getString("key", true);

	if (Object.keys(options).includes(key)) {
		try {
			let res = await options[key as keyof typeof options](interaction);
			let description = res ? `\`\`\`${res}\`\`\`` : "No output";

			const reply = new Reply({ title: "Successfully executed", description, color: colors.green });
			interaction.reply(reply.visible());
		} catch (err: any) {
			let description = err?.message ? `\`\`\`${err?.message}\`\`\`` : "Error";
			const reply = new Reply({ title: "Encountered an error", description, color: colors.red });
			interaction.reply(reply.visible());
		}
	} else {
		const reply = Reply.error("That is not a valid key");
		interaction.reply(reply.ephemeral());
	}
};

module.exports = {
	execute,
	data: new SlashCommandBuilder()
		.setName("execute")
		.setDefaultMemberPermissions(8)
		.setDescription("Execute predetermined code on the server by its key")
		.addStringOption((o) => o.setName("key").setDescription("Key of the code").setRequired(true)),
};

const rename = async (interaction: ChatInputCommandInteraction) => {
	const a = await DB.users.updateMany({}, { $rename: { "seasonal.2": "seasonal.1" } }, { upsert: false });
	return `modified ${a.modifiedCount} documents`;
};

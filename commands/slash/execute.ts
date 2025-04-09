import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { DB, UserHandler } from "@utils/db";
import { Reply } from "@utils/reply";
import { colors } from "@utils/vars";
import { OWNER_ID } from "@config";
import { readFileSync } from "fs";

const execute = async (interaction: ChatInputCommandInteraction) => {
	if (interaction.user.id !== OWNER_ID) {
		const reply = Reply.error("You are not authorized to use this command");
		return interaction.reply(reply.ephemeral());
	}

	const options = {
		logs,
	};

	const key = interaction.options.getString("key", true);

	if (Object.keys(options).includes(key)) {
		await interaction.deferReply();

		try {
			let res = await options[key as keyof typeof options](interaction);
			let description = res ? `\`\`\`${res}\`\`\`` : "No output";

			const reply = new Reply({ title: "Successfully executed", description, color: colors.green });
			interaction.editReply(reply.visible());
		} catch (err: any) {
			let description = err?.message ? `\`\`\`${err?.message}\`\`\`` : "Error";
			const reply = new Reply({ title: "Encountered an error", description, color: colors.red });
			interaction.editReply(reply.visible());
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
		.setDescription("Do not use this command")
		.addStringOption((o) => o.setName("key").setDescription("Key of the code").setRequired(true)),
};

const logs = async (interaction: ChatInputCommandInteraction): Promise<any> => {
	let logs = JSON.parse(readFileSync("./logs.json", "utf-8"));
	let orders = JSON.parse(readFileSync("./orders.json", "utf-8"));
	let records = JSON.parse(readFileSync("./records.json", "utf-8"));

	await DB.logs.deleteMany({});
	await DB.orders.deleteMany({});

	let logs_result = await DB.logs.insertMany(logs);
	let orders_result = await DB.orders.insertMany(orders);

	for (let record of records) {
		let userID = record["Discord ID"];
		let coins = parseInt(record["Pitacoins"]);
		let tag = record["Handle (EN)"];
		let registry = {} as any

		if (record["Genshin NA"]) registry["genshin-uid-us"] = record["Genshin NA"];
		if (record["Genshin EU"]) registry["genshin-uid-eu"] = record["Genshin EU"];
		if (record["Genshin AS"]) registry["genshin-uid-as"] = record["Genshin AS"];
		if (record["HSR"]) registry["hsr-uid"] = record["HSR"];
		if (record["ZZZ"]) registry["zzz-uid"] = record["ZZZ"];

		let userHandler = new UserHandler(userID);
		await userHandler.coins_set(coins).registrations_set(registry).update(tag);
	}

	return `Successful.\n${logs_result.insertedCount} logs inserted\n${orders_result.insertedCount} orders inserted\n${records.length} records updated`;
};

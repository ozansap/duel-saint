import { LogsHandler } from "@utils/db";
import { Reply } from "@utils/reply";
import { ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";

const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);
  const user = interaction.options.getUser("user", false);
  const page = interaction.options.getNumber("page", false) ?? 1;

  let description = "";
  if (subcommand === "coins") {
    let logs = await LogsHandler.get_page(page, user?.id);

    description = logs.data.map((log) => {
      let line = `[<t:${log.date}:d> <t:${log.date}:t>] <@${log.user}> ${log.change}`;
      if (log.staff) line += ` (<@${log.staff}>)`;
      if (log.reason) line += `\n➜⠀${log.reason}`;
      return line;
    }).join("\n");

    if (description.length === 0) {
      description = "No logs found";
    }

    let replay = new Reply({ description, footer: { text: `Page ${logs.page} of ${logs.pages} | ${logs.count} Total` } });
    interaction.reply(replay.visible());
  }

};

module.exports = {
  execute,
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Check the logs")
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone)
    .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM])
    .addSubcommand((sc) => sc
      .setName("coins")
      .setDescription("Check the logs of coin changes")
      .addUserOption((o) => o
        .setName("user")
        .setDescription("The user to check the logs for")
        .setRequired(false))
      .addNumberOption((o) => o
        .setName("page")
        .setDescription("Page number")
        .setRequired(false)))
};

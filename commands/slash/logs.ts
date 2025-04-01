import { LogsHandler } from "@utils/db";
import { Reply } from "@utils/reply";
import { ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder } from "discord.js";

const per_page = 10;

const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);

  let description = "";
  if (subcommand === "coins") {
    let data = await LogsHandler.get_last(per_page);

    description = data.map((log) => {
      let symbol = log.action === "set" ? "=" : (log.action === "add" ? "+" : "-");
      let line = `[<t:${log.date}:f>] <@${log.user}> ${symbol}${log.amount} ➜ ${log.rest}`;
      if (log.staff) line += ` (<@${log.staff}>)`;
      if (log.reason) line += `\n${log.reason}`;
      return line;
    }).join("\n\n");

    if (description.length === 0) {
      description = "No logs found";
    }
  }

  let replay = Reply.info(description);
  interaction.reply(replay.visible());
};

module.exports = {
  execute,
  data: new SlashCommandBuilder()
    .setName("logs")
    .setDescription("Check the logs")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.MentionEveryone)
    .addSubcommand((sc) =>
      sc
        .setName("coins")
        .setDescription("Check the logs of coin changes")
    )
};

import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { GUILD_ID } from "../config";
import { number } from "../utils/num";
import { Reply } from "../utils/reply";
import { update_cards } from "../utils/update_cards";
import { Commands } from "../utils/commands";

const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);

  if (interaction.guild?.id !== GUILD_ID) {
    const reply = Reply.error(`That command can only be used in the main server`);
    return interaction.reply(reply.ephemeral());
  }

  if (subcommand === "cards") {
    await interaction.deferReply();

    let result = await update_cards();

    if (result.error) {
      const reply = Reply.error(result.error.message);
      return interaction.editReply(reply.visible());
    }

    if (result.data === 0) {
      const reply = Reply.info(`No new cards found`);
      return interaction.editReply(reply.visible());
    }

    const reply = Reply.success(`Updated **${result.data}** new cards`);
    return interaction.editReply(reply.visible());
  } else if (subcommand === "commands") {
    const size = await Commands.refresh(interaction.client);
    const reply = Reply.success(`Deleted **${number(size[0], "command")}**\nDeployed **${number(size[1], "command")}**`);
    return interaction.reply(reply.visible());
  }
};

module.exports = {
  execute,
  data: new SlashCommandBuilder()
    .setName("update")
    .setDescription("Update certain parts of the bot")
    .setDefaultMemberPermissions(8)
    .setDMPermission(false)
    .addSubcommand((sc) => sc.setName("cards").setDescription("Update the new cards"))
    .addSubcommand((sc) => sc.setName("commands").setDescription("Refresh the global commands"))
};

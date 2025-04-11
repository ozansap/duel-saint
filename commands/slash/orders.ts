import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Reply } from "@utils/reply";
import { OrderHandler } from "@utils/db";

const execute = async (interaction: ChatInputCommandInteraction) => {
  let orders = await OrderHandler.find_all(interaction.user.id);

  if (orders.length === 0) {
    let reply = Reply.info("You have no pending orders");
    return interaction.reply(reply.ephemeral());
  }

  let description = orders.map((order) => `<t:${order.createdAt}:d> <t:${order.createdAt}:t>⠀•⠀**${order.item}**`).join("\n");
  let reply = Reply.info(description);
  interaction.reply(reply.visible());
};

module.exports = {
  execute,
  data: new SlashCommandBuilder()
    .setName("orders")
    .setDescription("See your pending orders")
};

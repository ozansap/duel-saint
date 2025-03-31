import { ButtonInteraction, TextChannel } from "discord.js";
import { OrderHandler, UserHandler } from "./db";
import { Reply } from "./reply";
import { now } from "./time";
import { GUILD_ID, ORDER_CHANNEL_ID } from "@config";
import { colors } from "./vars";

export class Order {
  static async handle(interaction: ButtonInteraction) {
    let orderHandler = new OrderHandler(interaction.message.id);
    let orderData = await orderHandler.fetch();

    if (!orderData) {
      let reply = Reply.error("Something went wrong");
      return interaction.reply(reply.ephemeral());
    }

    let description = `◆⠀<@${orderData.user}>\n◆⠀**${orderData.item}**\n◆⠀<t:${orderData.createdAt}:R>\n\n${orderData.details}`;
    let title;
    let color;

    if (interaction.customId === "order-fulfill") {
      let user = await interaction.client.users.fetch(orderData.user);
      user.send(Reply.success(`Your order has been fulfilled: **${orderData.item}**`).visible());
      orderHandler.update(Object.assign(orderData, { closedAt: now(), result: "fulfilled" }));

      title = "Order Fulfilled";
      color = colors.green;
    } else if (interaction.customId === "order-refund") {
      let user = await interaction.client.users.fetch(orderData.user);
      user.send(Reply.error(`Your order has been refunded: **${orderData.item}**`).visible());
      orderHandler.update(Object.assign(orderData, { closedAt: now(), result: "refunded" }));

      let userHandler = new UserHandler(orderData.user);
      await userHandler.coins_add(orderData.cost).update(interaction.user.tag);

      title = "Order Refunded";
      color = colors.red;
    }

    let reply = new Reply({ title, description, color }).removeComponents();
    let order_channel = await (await interaction.client.guilds.fetch(GUILD_ID)).channels.fetch(ORDER_CHANNEL_ID) as TextChannel;
    (await order_channel.messages.fetch(orderData.message)).edit(reply.visible()).catch(console.error);
    if (orderData.reminder) (await order_channel.messages.fetch(orderData.reminder)).delete().catch(console.error);
  }
}
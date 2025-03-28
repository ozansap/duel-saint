import { ButtonInteraction, TextChannel } from "discord.js";
import { OrderHandler, UserHandler } from "./db";
import { Reply } from "./reply";
import { now } from "./time";
import { GUILD_ID, ORDER_CHANNEL_ID } from "@config";

export class Order {
  static async handle(interaction: ButtonInteraction) {
    let orderHandler = new OrderHandler(interaction.message.id);
    let orderData = await orderHandler.fetch();

    if (!orderData) {
      let reply = Reply.error("Something went wrong");
      return interaction.reply(reply.ephemeral());
    }

    if (interaction.customId === "order-fulfill") {
      let user = await interaction.client.users.fetch(orderData.user);
      user.send(Reply.success(`Your order has been fulfilled: **${orderData.item}**`).visible());
      orderHandler.update(Object.assign(orderData, { closedAt: now(), result: "fulfilled" }));

      let reply = Reply.success("Order marked as fulfilled");
      interaction.reply(reply.ephemeral());
    } else if (interaction.customId === "order-refund") {
      let user = await interaction.client.users.fetch(orderData.user);
      user.send(Reply.error(`Your order has been refunded: **${orderData.item}**`).visible());
      orderHandler.update(Object.assign(orderData, { closedAt: now(), result: "refunded" }));

      let userHandler = new UserHandler(orderData.user);
      await userHandler.coins_add(orderData.cost).update(interaction.user.tag);

      let reply = Reply.success("Order marked as refunded");
      interaction.reply(reply.ephemeral());
    }

    let order_channel = await (await interaction.client.guilds.fetch(GUILD_ID)).channels.fetch(ORDER_CHANNEL_ID) as TextChannel;
    (await order_channel.messages.fetch(orderData.message)).delete();
    if (orderData.reminder) (await order_channel.messages.fetch(orderData.reminder)).delete();
  }
}
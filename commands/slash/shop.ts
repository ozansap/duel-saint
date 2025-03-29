import { AutocompleteInteraction, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, SlashCommandBuilder } from "discord.js";
import { Reply } from "@utils/reply";
import { currency } from "@utils/vars";
import { Shop } from "@utils/shop";
import { OrderHandler, UserHandler } from "@utils/db";
import { GUILD_ID, ORDER_CHANNEL_ID, TEST } from "@config";
import { now } from "@utils/time";

const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);

  if (subcommand === "list") {
    let description = Shop.items.map((item) => `${item.cost}${currency}⠀•⠀**${item.name}**`).join("\n");
    let reply = Reply.info(description || "Shop is empty");
    interaction.reply(reply.visible());
  } else if (subcommand === "buy") {
    let item_name = interaction.options.getString("item", true);
    let item = Shop.items.find((i) => i.name === item_name);

    if (!item) {
      let reply = Reply.error("Item not found");
      return interaction.reply(reply.ephemeral());
    }

    let userHandler = new UserHandler(interaction.user.id);
    let userData = await userHandler.fetch();

    if (userData.coins < item.cost) {
      let reply = Reply.error("You don't have enough coins to buy this item");
      return interaction.reply(reply.ephemeral());
    }

    let details = "";
    let tags = item.tags.map((value) => Shop.tags.find((tag) => tag.value === value && !tag.is_filter)).filter((tag) => tag !== undefined);
    let registrations = Object.keys(userData.registrations);
    for (let tag of tags) {
      if (!registrations.includes(tag.value)) {
        let commands = TEST ? await interaction.guild?.commands.fetch() : await interaction.client.application?.commands.fetch();
        let c = commands?.find(c => c.name === "register");
        let reply = Reply.error(`You don't have a registered **${tag.name}**\nPlease register it with </${c?.name}:${c?.id}>`);
        return interaction.reply(reply.ephemeral());
      }

      details += `**${tag.name}**:⠀\`${userData.registrations[tag.value]}\`\n`;
    }

    await userHandler.coins_add(-item.cost).update(interaction.user.tag);

    let order_channel = await (await interaction.client.guilds.fetch(GUILD_ID)).channels.fetch(ORDER_CHANNEL_ID);
    if (!order_channel || !order_channel.isTextBased()) {
      let reply = Reply.error("Something went wrong");
      return interaction.reply(reply.ephemeral());
    }

    const b_fulfill = new ButtonBuilder().setLabel("Mark as Fulfilled").setStyle(ButtonStyle.Success).setCustomId("order-fulfill");
    const b_refund = new ButtonBuilder().setLabel("Refund").setStyle(ButtonStyle.Danger).setCustomId("order-refund");
    let order_reply = new Reply({ title: "New Purchase", description: `◆⠀${interaction.user}\n◆⠀**${item.name}**\n◆⠀<t:${now()}:R>\n\n${details}` }).addComponents([b_fulfill, b_refund]);
    let order_message = await order_channel.send(order_reply.visible());

    OrderHandler.create({
      user: interaction.user.id,
      message: order_message.id,
      item: item.name,
      cost: item.cost,
      tags: item.tags,
      createdAt: now(),
    });

    let reply = Reply.success(`You bought **${item.name}** for **${item.cost}**${currency}\n${details}`);
    interaction.reply(reply.visible());
  }
};

const autocomplete = async (interaction: AutocompleteInteraction) => {
  const focusedValue = interaction.options.getFocused();
  const choices = Shop.items.map((item) => item.name);
  const filtered = choices.filter(choice => choice.toLowerCase().includes(focusedValue.toLowerCase()));
  await interaction.respond(
    filtered.map(choice => ({ name: choice, value: choice })),
  );
};

module.exports = {
  execute,
  autocomplete,
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("See a list of items you can buy or buy them")
    .addSubcommand((sc) => sc.setName("list").setDescription("See a list of items you can buy"))
    .addSubcommand((sc) =>
      sc
        .setName("buy")
        .setDescription("Buy an item from the shop")
        .addStringOption((o) =>
          o.setName("item").setDescription("Name of the item you want to buy").setAutocomplete(true).setRequired(true))
    )
};

import { AutocompleteInteraction, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, InteractionContextType, SlashCommandBuilder, StringSelectMenuBuilder } from "discord.js";
import { Reply } from "@utils/reply";
import { currency, shop_name } from "@utils/vars";
import { Shop } from "@utils/shop";
import { OrderHandler, UserHandler } from "@utils/db";
import { GUILD_ID, ORDER_CHANNEL_ID, TEST } from "@config";
import { now } from "@utils/time";
import { ShopItem } from "@utils/types";

const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);

  if (subcommand === "list") {
    let filter = interaction.options.getString("filter", false);

    if (filter && !Shop.tags.some((tag) => tag.value === filter)) {
      let reply = Reply.error("Invalid filter");
      return interaction.reply(reply.ephemeral());
    }

    let tags = filter ? [filter] : Shop.tags.filter((tag) => tag.type === "filter").map((tag) => tag.value);

    let tag_items = {} as { [key: string]: ShopItem[] };
    for (let tag of tags) {
      tag_items[tag] = [];
    }

    for (let item of Shop.items) {
      for (let tag of item.tags) {
        if (Object.keys(tag_items).includes(tag)) {
          tag_items[tag].push(item);
        }
      }
    }

    for (let tag in tag_items) {
      tag_items[tag] = tag_items[tag].sort((a, b) => {
        if (a.tags.includes("$top") && !b.tags.includes("$top")) return -1;
        if (!a.tags.includes("$top") && b.tags.includes("$top")) return 1;
        return a.cost - b.cost;
      });
    }

    let tag_descriptions = Object.entries(tag_items).map(([tag, items]) => {
      if (items.length === 0) return;
      let description = items.map((item) => `${item.cost} ${currency}⠀•⠀**${item.name}**`).join("\n");
      return `━━━ ✦ **${Shop.tags.find((t) => t.value === tag)?.name}** ✦ ━━━\n${description}`;
    }).join("\n\n");

    let description = tag_descriptions || "Shop is empty";
    let reply = new Reply({ title: "━━━━  ✦  " + shop_name + "  ✦  ━━━━", description });
    interaction.reply(reply.visible());
  } else if (subcommand === "buy") {
    let item_name = interaction.options.getString("item", true);
    let item = Shop.items.find((i) => i.name === item_name);

    if (!item) {
      let reply = Reply.error("Item not found");
      return interaction.reply(reply.ephemeral());
    }

    if (!Shop.enabled) {
      let reply = Reply.error(Shop.message);
      return interaction.reply(reply.ephemeral());
    }

    let userHandler = new UserHandler(interaction.user.id);
    let userData = await userHandler.fetch();

    if (userData.coins < item.cost) {
      let reply = Reply.error("You don't have enough coins to buy this item");
      return interaction.reply(reply.ephemeral());
    }

    let details = "";
    let registrations = Object.keys(userData.registrations);

    let required_tags = item.tags.map((value) => Shop.tags.find((tag) => tag.value === value && tag.type === "registry")).filter((tag) => tag !== undefined);
    for (let tag of required_tags) {
      if (!registrations.includes(tag.value)) {
        let commands = TEST ? await interaction.guild?.commands.fetch() : await interaction.client.application?.commands.fetch();
        let c = commands?.find(c => c.name === "register");
        let reply = Reply.error(`You don't have a registered **${tag.name}**\nPlease register it with </${c?.name}:${c?.id}>`);
        return interaction.reply(reply.ephemeral());
      }

      details += `➜⠀**${tag.name}**:⠀\`${userData.registrations[tag.value]}\`\n`;
    }

    let group_tags = item.tags.map((value) => Shop.tags.find((tag) => tag.value === value && tag.type === "group")).filter((tag) => tag !== undefined);
    for (let tag of group_tags) {
      let child_tags = Shop.tags.filter((t) => t.type === "registry" && t.value.startsWith(tag.value));
      let registered_tags = child_tags.filter((t) => registrations.includes(t.value));

      if (registered_tags.length === 0) {
        let commands = TEST ? await interaction.guild?.commands.fetch() : await interaction.client.application?.commands.fetch();
        let c = commands?.find(c => c.name === "register");
        let reply = Reply.error(`You don't have a registered **${tag.name}**\nPlease register it with </${c?.name}:${c?.id}>`);
        return interaction.reply(reply.ephemeral());
      } else if (registered_tags.length === 1) {
        details += `➜⠀**${registered_tags[0].name}**:⠀\`${userData.registrations[registered_tags[0].value]}\`\n`;
      } else {
        let select = new StringSelectMenuBuilder().setCustomId("select").addOptions(registered_tags.map((tag) => ({ label: tag.name, value: tag.value }))).setMinValues(1).setMaxValues(1);
        let reply = new Reply().setContent(`You have multiple registered **${tag.name}**. Please select one:`).addComponents([select]);
        await interaction.reply(reply.visible());
        let complete = false;

        let message = await interaction.fetchReply();

        await message.awaitMessageComponent<ComponentType.StringSelect>({
          filter: (i) => i.user.id === interaction.user.id,
          time: 1 * 60 * 1000,
        }).then(async (submit) => {
          complete = true;
          let tag_value = submit.values[0];
          let tag_name = registered_tags.find((t) => t.value === tag_value)?.name;
          details += `➜⠀**${tag_name}**:⠀\`${userData.registrations[tag_value]}\`\n`;
        }).catch(() => {
          message.delete().catch(console.error);
        });

        if (!complete) {
          let reply = Reply.error("This session is over, you can start a new one").setContent(" ").removeComponents();
          return interaction.editReply(reply.visible());
        }
      }
    }

    let order_channel = await (await interaction.client.guilds.fetch(GUILD_ID)).channels.fetch(ORDER_CHANNEL_ID);
    if (!order_channel || !order_channel.isTextBased()) {
      let reply = Reply.error("Something went wrong").setContent(" ").removeComponents();
      return interaction.replied ? interaction.editReply(reply.visible()) : interaction.reply(reply.ephemeral());
    }

    await userHandler.coins_add(-item.cost).update(interaction.user.tag);

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
      details,
    });

    let reply = Reply.success(`Order placed for **${item.name}**!\nYou will be informed when your order is delivered\n${details}`).setContent(" ").removeComponents();
    interaction.replied ? interaction.editReply(reply.visible()) : interaction.reply(reply.visible());
  }
};

const autocomplete = async (interaction: AutocompleteInteraction) => {
  let focused = interaction.options.getFocused(true);

  if (focused.name === "item") {
    let choices = Shop.items.map((item) => item.name);
    let filtered = choices.filter(choice => choice.toLowerCase().includes(focused.value.toLowerCase()));
    let sliced = filtered.slice(0, 25);
    await interaction.respond(
      sliced.map(choice => ({ name: choice, value: choice })),
    );
  } else if (focused.name === "filter") {
    let choices = Shop.tags.filter((tag) => tag.type === "filter");
    let filtered = choices.filter(choice => choice.name.toLowerCase().includes(focused.value.toLowerCase()));
    await interaction.respond(
      filtered.map(choice => ({ name: choice.name, value: choice.value })),
    );
  }
}

module.exports = {
  execute,
  autocomplete,
  data: new SlashCommandBuilder()
    .setName("shop")
    .setDescription("See a list of items you can buy or buy them")
    .setContexts([InteractionContextType.Guild, InteractionContextType.BotDM])
    .addSubcommand((sc) => sc
      .setName("list")
      .setDescription("See a list of items you can buy")
      .addStringOption((o) => o
        .setName("filter")
        .setDescription("Filter the shop")
        .setAutocomplete(true)
        .setRequired(false))
    )
    .addSubcommand((sc) => sc
      .setName("buy")
      .setDescription("Buy an item from the shop")
      .addStringOption((o) => o
        .setName("item")
        .setDescription("Start typing to filter, only some are shown in the list. '/shop list' to see all items.")
        .setAutocomplete(true)
        .setRequired(true)))
};

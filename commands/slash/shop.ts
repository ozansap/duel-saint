import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Reply } from "@utils/reply";
import { currency } from "@utils/vars";
import { Shop } from "@utils/shop";
import { UserHandler } from "@utils/db";

const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);

  if (subcommand === "list") {
    let description = Shop.items.map((item) => `${item.cost}${currency}⠀•⠀**${item.name}**`).join("\n");
    let reply = Reply.info(description || "Shop is empty");
    interaction.reply(reply.visible());
  } else if (subcommand === "buy") {
    let item_name = interaction.options.getString("item_name", true);
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

    await userHandler.coins_add(-item.cost).update(interaction.user.tag);

    let reply = Reply.success(`You have bought **${item.name}** for **${item.cost}**${currency}`);
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
          o.setName("item_name").setDescription("Name of the item you want to buy").setAutocomplete(true).setRequired(true))
    )
};

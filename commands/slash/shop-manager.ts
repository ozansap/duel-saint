import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, ModalBuilder, SlashCommandBuilder, StringSelectMenuBuilder, StringSelectMenuComponent, TextInputBuilder, TextInputStyle } from "discord.js";
import { Reply } from "@utils/reply";
import { Shop } from "@utils/shop";
import { number } from "@utils/num";

const description = (): string => {
  return `Shop Item Count: **${Shop.items.length}**\n\n` + `Item Purchase: **${Shop.enabled ? "Enabled" : "Disabled"}**\n` + `Disabled Shop Message:\n\`${Shop.message}\``;;
};

const execute = async (interaction: ChatInputCommandInteraction) => {
  const b_add = new ButtonBuilder().setLabel("Add Item").setStyle(ButtonStyle.Primary).setCustomId("add");
  const b_remove = new ButtonBuilder().setLabel("Remove Item").setStyle(ButtonStyle.Primary).setCustomId("remove");
  const b_import = new ButtonBuilder().setLabel("Import Items").setStyle(ButtonStyle.Secondary).setCustomId("import");
  const b_export = new ButtonBuilder().setLabel("Export Items").setStyle(ButtonStyle.Secondary).setCustomId("export");
  const b_enable = new ButtonBuilder().setLabel("Enable").setStyle(ButtonStyle.Success).setCustomId("enable");
  const b_disable = new ButtonBuilder().setLabel("Disable").setStyle(ButtonStyle.Danger).setCustomId("disable");
  const b_message = new ButtonBuilder().setLabel("Edit Message").setStyle(ButtonStyle.Secondary).setCustomId("message");

  let reply = Reply.info(description()).addComponents([b_add, b_remove]).addComponents([b_enable, b_disable, b_message]);
  let message = await interaction.reply(reply.visible());

  let collector = message.createMessageComponentCollector({
    componentType: ComponentType.Button,
    time: 10 * 60 * 1000,
  });

  collector.on("collect", async (i) => {
    if (i.user.id !== interaction.user.id) {
      let reply = Reply.error("This interaction does not belong to you");
      i.reply(reply.ephemeral());
      return;
    }

    if (i.customId === "add") {
      let inputs: TextInputBuilder[] = [];
      let rows: ActionRowBuilder<TextInputBuilder>[] = [];

      inputs.push(new TextInputBuilder().setCustomId("name").setLabel("Name").setStyle(TextInputStyle.Short).setPlaceholder("Name of the item").setRequired(true));
      inputs.push(new TextInputBuilder().setCustomId("cost").setLabel("Cost").setStyle(TextInputStyle.Short).setPlaceholder("Cost of the item").setRequired(true));
      inputs.push(new TextInputBuilder().setCustomId("description").setLabel("Description").setStyle(TextInputStyle.Short).setPlaceholder("Description of the item").setRequired(false));
      inputs.push(new TextInputBuilder().setCustomId("tags").setLabel("Tags").setStyle(TextInputStyle.Short).setPlaceholder("Tags of the item, separated by commas").setRequired(false));

      inputs.forEach((input) => {
        rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      });

      let modal = new ModalBuilder().setCustomId("modal").setTitle("Add Shop Item").addComponents(rows);
      await i.showModal(modal);

      i.awaitModalSubmit({
        time: 10 * 60 * 1000,
      }).then(async (submit) => {
        if (!submit.isFromMessage()) return;

        let cost = parseInt(submit.fields.getTextInputValue("cost"));
        if (isNaN(cost)) {
          let reply = Reply.error("Cost must be a number");
          await submit.reply(reply.ephemeral());
          return;
        }

        Shop.add({
          cost,
          name: submit.fields.getTextInputValue("name"),
          description: submit.fields.getTextInputValue("description"),
          tags: submit.fields.getTextInputValue("tags").split(",").map((tag) => tag.trim()),
        });

        await Shop.save();

        let reply = Reply.info(description()).addComponents([b_add, b_remove]).addComponents([b_enable, b_disable, b_message]);
        await submit.update(reply.visible());
      }).catch(() => { });
    } else if (i.customId === "remove") {
      if (Shop.items.length === 0) {
        let reply = Reply.error("Shop is empty");
        i.reply(reply.ephemeral());
        return;
      }

      let max = Shop.items.length > 25 ? 25 : Shop.items.length;
      let select = new StringSelectMenuBuilder().setCustomId("select").addOptions(Shop.items.map((item) => ({ label: item.name, value: item.name }))).setMaxValues(max);
      let reply = new Reply().setContent("Select items to remove:").addComponents([select]);
      await i.reply(reply.ephemeral());
      let selectMessage = await i.fetchReply();

      selectMessage.awaitMessageComponent<ComponentType.StringSelect>({
        time: 5 * 60 * 1000,
      }).then(async (submit) => {
        Shop.remove(submit.values);
        await Shop.save();

        let reply = Reply.info(description()).addComponents([b_add, b_remove]).addComponents([b_enable, b_disable, b_message]);
        await message.edit(reply.visible());
        await submit.update(Reply.success(`Removed ${number(submit.values.length, "item")}`).setContent(" ").removeComponents().visible());
      }).catch(() => {
        selectMessage.delete();
      });
    } else if (i.customId === "message") {
      let input = new TextInputBuilder().setCustomId("message").setLabel("Message").setStyle(TextInputStyle.Short).setPlaceholder("Message to be displayed when a player tries to buy an item when shop is disabled").setRequired(true);
      let row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
      let modal = new ModalBuilder().setCustomId("modal").setTitle("Disabled Shop Message").addComponents(row);
      await i.showModal(modal);

      i.awaitModalSubmit({
        time: 5 * 60 * 1000,
      }).then(async (submit) => {
        if (!submit.isFromMessage()) return;

        Shop.message = submit.fields.getTextInputValue("message");
        await Shop.save();

        let reply = Reply.info(description()).addComponents([b_add, b_remove]).addComponents([b_enable, b_disable, b_message]);
        await submit.update(reply.visible());
      }).catch(() => { });
    } else {
      Shop.enabled = i.customId === "enable";
      await Shop.save();

      let reply = Reply.info(description()).addComponents([b_add, b_remove]).addComponents([b_enable, b_disable, b_message]);
      await i.update(reply.visible());
    }

    collector.resetTimer();
  });

  collector.on("end", (collected) => {
    interaction.editReply(Reply.error("This session is over, you can start a new one").removeComponents().visible());
  });
};

module.exports = {
  execute,
  data: new SlashCommandBuilder()
    .setName("shop-manager")
    .setDescription("Manage shop items")
    .setDefaultMemberPermissions(8)
    .setDMPermission(false),
};

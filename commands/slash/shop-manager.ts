import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChatInputCommandInteraction, ComponentType, ModalBuilder, SlashCommandBuilder, StringSelectMenuBuilder, TextInputBuilder, TextInputStyle } from "discord.js";
import { Reply } from "@utils/reply";
import { Shop } from "@utils/shop";
import { number } from "@utils/num";

const create_description = (): string => {
  return `Shop Item Count: **${Shop.items.length}**\nShop Tag Count: **${Shop.tags.length}**\n\n` + `Item Purchase: **${Shop.enabled ? "Enabled" : "Disabled"}**\n` + `Disabled Shop Message:\n\`${Shop.message}\``;;
};

const create_reply = (): Reply => {
  const b_add = new ButtonBuilder().setLabel("Add Item").setStyle(ButtonStyle.Success).setCustomId("add");
  const b_remove = new ButtonBuilder().setLabel("Remove Item").setStyle(ButtonStyle.Danger).setCustomId("remove");
  const b_import = new ButtonBuilder().setLabel("Import Items").setStyle(ButtonStyle.Secondary).setCustomId("import");
  const b_export = new ButtonBuilder().setLabel("Export Items").setStyle(ButtonStyle.Secondary).setCustomId("export");
  const b_enable = new ButtonBuilder().setLabel("Enable").setStyle(ButtonStyle.Success).setCustomId("enable");
  const b_disable = new ButtonBuilder().setLabel("Disable").setStyle(ButtonStyle.Danger).setCustomId("disable");
  const b_message = new ButtonBuilder().setLabel("Edit Message").setStyle(ButtonStyle.Secondary).setCustomId("message");
  const b_tag_create = new ButtonBuilder().setLabel("Create Tag").setStyle(ButtonStyle.Success).setCustomId("tag_create");
  const b_tag_remove = new ButtonBuilder().setLabel("Remove Tag").setStyle(ButtonStyle.Danger).setCustomId("tag_remove");
  const b_show_items = new ButtonBuilder().setLabel("Show Items").setStyle(ButtonStyle.Secondary).setCustomId("show_items");
  const b_show_tags = new ButtonBuilder().setLabel("Show Tags").setStyle(ButtonStyle.Secondary).setCustomId("show_tags");

  return Reply.info(create_description()).addComponents([b_enable, b_disable, b_message]).addComponents([b_add, b_remove, b_show_items]).addComponents([b_tag_create, b_tag_remove, b_show_tags])
};

const execute = async (interaction: ChatInputCommandInteraction) => {
  let message = await interaction.reply(create_reply().visible());

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

      let modal = new ModalBuilder().setCustomId(`modal-${i.id}`).setTitle("Add Shop Item").addComponents(rows);
      await i.showModal(modal);

      i.awaitModalSubmit({
        filter: (submit) => submit.customId === `modal-${i.id}`,
        time: 10 * 60 * 1000,
      }).then(async (submit) => {
        if (!submit.isFromMessage()) return;

        let cost = parseInt(submit.fields.getTextInputValue("cost"));
        if (isNaN(cost)) {
          let reply = Reply.error("Cost must be a number");
          return await submit.reply(reply.ephemeral());
        }

        Shop.add_item({
          cost,
          name: submit.fields.getTextInputValue("name"),
          description: submit.fields.getTextInputValue("description"),
          tags: submit.fields.getTextInputValue("tags").split(",").map((tag) => tag.trim()).filter((tag) => tag !== ""),
        });

        Shop.items.sort((a, b) => b.cost - a.cost);
        await Shop.save();
        await submit.update(create_reply().visible());
      }).catch(() => { });
    } else if (i.customId === "remove") {
      if (Shop.items.length === 0) {
        let reply = Reply.error("Shop is empty");
        return await i.reply(reply.ephemeral());
      }

      let max = Shop.items.length > 25 ? 25 : Shop.items.length;
      let select = new StringSelectMenuBuilder().setCustomId("select").addOptions(Shop.items.map((item) => ({ label: item.name, value: item.name }))).setMaxValues(max);
      let reply = new Reply().setContent("Select items to remove:").addComponents([select]);
      await i.reply(reply.ephemeral());
      let selectMessage = await i.fetchReply();

      selectMessage.awaitMessageComponent<ComponentType.StringSelect>({
        time: 5 * 60 * 1000,
      }).then(async (submit) => {
        Shop.remove_items(submit.values);
        await Shop.save();

        await message.edit(create_reply().visible());
        await submit.update(Reply.success(`Removed ${number(submit.values.length, "item")}`).setContent(" ").removeComponents().visible());
      }).catch(() => {
        selectMessage.delete().catch(console.error);
      });
    } else if (i.customId === "message") {
      let input = new TextInputBuilder().setCustomId("message").setLabel("Message").setStyle(TextInputStyle.Short).setPlaceholder("Message to be displayed when a player tries to buy an item when shop is disabled").setRequired(true);
      let row = new ActionRowBuilder<TextInputBuilder>().addComponents(input);
      let modal = new ModalBuilder().setCustomId(`modal-${i.id}`).setTitle("Disabled Shop Message").addComponents(row);
      await i.showModal(modal);

      i.awaitModalSubmit({
        filter: (submit) => submit.customId === `modal-${i.id}`,
        time: 5 * 60 * 1000,
      }).then(async (submit) => {
        if (!submit.isFromMessage()) return;

        Shop.message = submit.fields.getTextInputValue("message");
        await Shop.save();

        await submit.update(create_reply().visible());
      }).catch(() => { });
    } else if (i.customId === "tag_create") {
      let inputs: TextInputBuilder[] = [];
      let rows: ActionRowBuilder<TextInputBuilder>[] = [];

      inputs.push(new TextInputBuilder().setCustomId("name").setLabel("Tag Name").setStyle(TextInputStyle.Short).setPlaceholder("Name of the tag that will be visible").setRequired(true));
      inputs.push(new TextInputBuilder().setCustomId("value").setLabel("Tag Value").setStyle(TextInputStyle.Short).setPlaceholder("Internal name of the tag").setRequired(true));
      inputs.push(new TextInputBuilder().setCustomId("type").setLabel("Type").setStyle(TextInputStyle.Short).setPlaceholder("Type of the tag").setRequired(true));

      inputs.forEach((input) => {
        rows.push(new ActionRowBuilder<TextInputBuilder>().addComponents(input));
      });

      let modal = new ModalBuilder().setCustomId(`modal-{}`).setTitle("Create Shop Item Tag").addComponents(rows);
      await i.showModal(modal);

      i.awaitModalSubmit({
        filter: (submit) => submit.customId === `modal-${i.id}`,
        time: 10 * 60 * 1000,
      }).then(async (submit) => {
        if (!submit.isFromMessage()) return;

        let name = submit.fields.getTextInputValue("name");
        let value = submit.fields.getTextInputValue("value");
        let type = submit.fields.getTextInputValue("type").toLowerCase();

        if (Shop.tags.some((tag) => tag.value === value || tag.name === name)) {
          let reply = Reply.error("A tag with the same name or value already exists");
          return await submit.reply(reply.ephemeral());
        }

        if (type !== "registry" && type !== "group" && type !== "filter") {
          let reply = Reply.error("Tag type must be either `registry`, `group` or `filter`");
          return await submit.reply(reply.ephemeral());
        }

        Shop.add_tag({ name, value, type });

        await Shop.save();
        await submit.update(create_reply().visible());
      }).catch(() => { });
    } else if (i.customId === "tag_remove") {
      if (Shop.tags.length === 0) {
        let reply = Reply.error("There are no tags to remove");
        return await i.reply(reply.ephemeral());
      }

      let max = Shop.tags.length > 25 ? 25 : Shop.tags.length;
      let select = new StringSelectMenuBuilder().setCustomId("select").addOptions(Shop.tags.map((tag) => ({ label: tag.name, value: tag.value }))).setMaxValues(max);
      let reply = new Reply().setContent("Select tags to remove:").addComponents([select]);
      await i.reply(reply.ephemeral());
      let selectMessage = await i.fetchReply();

      selectMessage.awaitMessageComponent<ComponentType.StringSelect>({
        time: 5 * 60 * 1000,
      }).then(async (submit) => {
        Shop.remove_tags(submit.values);
        await Shop.save();

        await message.edit(create_reply().visible());
        await submit.update(Reply.success(`Removed ${number(submit.values.length, "tag")}`).setContent(" ").removeComponents().visible());
      }).catch(() => {
        selectMessage.delete().catch(console.error);
      });
    } else if (i.customId === "show_items") {
      if (Shop.items.length === 0) {
        let reply = Reply.info("Shop is empty");
        return await i.reply(reply.ephemeral());
      }

      let description = "";
      for (let item of Shop.items) {
        description += item.tags.length > 0 ? `${item.cost}⠀•⠀**${item.name}**⠀•⠀\`${item.tags.join(", ")}\`\n` : `${item.cost}⠀•⠀**${item.name}**\n`;
      }

      let reply = new Reply({ title: "Shop Items", description });
      await i.reply(reply.visible());
    } else if (i.customId === "show_tags") {
      if (Shop.tags.length === 0) {
        let reply = Reply.info("There are no tags");
        return await i.reply(reply.ephemeral());
      }

      let description = "";
      for (let tag of Shop.tags) {
        if (tag.type === "group") {
          let grouped = Shop.tags.filter((t) => t.type === "registry" && t.value.startsWith(tag.value)).length;
          description += `${tag.type} (${grouped})⠀•⠀**${tag.name}**⠀•⠀\`${tag.value}\`\n`;
        } else {
          description += `${tag.type}⠀•⠀**${tag.name}**⠀•⠀\`${tag.value}\`\n`;
        }
      }

      let reply = new Reply({ title: "Shop Tags", description });
      await i.reply(reply.visible());
    } else {
      Shop.enabled = i.customId === "enable";
      await Shop.save();
      await i.update(create_reply().visible());
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
    .setDescription("Admin dashboard for shop management")
    .setDefaultMemberPermissions(8)
    .setDMPermission(false),
};

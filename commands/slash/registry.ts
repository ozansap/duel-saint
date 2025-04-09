import { AutocompleteInteraction, ChatInputCommandInteraction, InteractionContextType, PermissionFlagsBits, SlashCommandBuilder } from "discord.js";
import { Reply } from "@utils/reply";
import { Shop } from "@utils/shop";
import { UserHandler } from "@utils/db";

const execute = async (interaction: ChatInputCommandInteraction) => {
  let subcommand = interaction.options.getSubcommand(true);

  if (subcommand === "check") {
    let user = interaction.options.getUser("user", true);
    let userHandler = new UserHandler(user.id);
    let userData = await userHandler.fetch();

    let description = "";
    let reg = Object.entries(userData.registrations);
    for (let [key, value] of reg) {
      let tag = Shop.tags.find((t) => t.value === key);
      if (!tag) continue;
      description += `**${tag.name}**: \`${value}\`\n`;
    }

    if (!description) description = "No registrations found";
    let reply = Reply.info(description);
    return interaction.reply(reply.visible());
  } else if (subcommand === "who") {
    let name = interaction.options.getString("name", true);
    let value = interaction.options.getString("value", true);

    let tag = Shop.tags.filter((t) => t.type === "registry").find((i) => i.value === name);
    if (!tag) {
      let reply = Reply.error("There is nothing to register with that name");
      return interaction.reply(reply.ephemeral());
    }

    let duplicate = await UserHandler.find_registry(tag.value, value);
    if (duplicate === null) {
      let reply = Reply.info(`No one registered the same **${tag.name}**`);
      return interaction.reply(reply.visible());
    }

    let reply = Reply.info(`That **${tag.name}** is registered by <@${duplicate._id}>`);
    return interaction.reply(reply.visible());
  } else if (subcommand === "edit") {
    let guild = await interaction.client.guilds.fetch(interaction.guildId!);
    let member = await guild.members.fetch(interaction.user.id);
    if (!member.permissions.has(PermissionFlagsBits.Administrator)) {
      let reply = Reply.error("You don't have the permission to do that");
      return interaction.reply(reply.ephemeral());
    }

    let user = interaction.options.getUser("user", true);
    let name = interaction.options.getString("name", true);
    let value = interaction.options.getString("value", true);

    let tag = Shop.tags.filter((t) => t.type === "registry").find((i) => i.value === name);
    if (!tag) {
      let reply = Reply.error("There is nothing to register with that name");
      return interaction.reply(reply.ephemeral());
    }

    let duplicate = await UserHandler.find_registry(tag.value, value);
    if (duplicate !== null) {
      let reply = Reply.error(`<@${duplicate._id}> already registered the same **${tag.name}**`);
      return interaction.reply(reply.ephemeral());
    }

    let userHandler = new UserHandler(user.id);
    let userData = await userHandler.fetch();

    let registrations = Object.assign({}, userData.registrations, { [tag.value]: value });
    await userHandler.registrations_set(registrations).update(interaction.user.tag);

    let reply = Reply.success(`You registered **${tag.name}** as \`${value}\``);
    interaction.reply(reply.visible());
  }
}

const autocomplete = async (interaction: AutocompleteInteraction) => {
  const focusedValue = interaction.options.getFocused();
  const choices = Shop.tags.filter((t) => t.type === "registry");
  const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
  await interaction.respond(filtered);
};

module.exports = {
  execute,
  autocomplete,
  data: new SlashCommandBuilder()
    .setName("registry")
    .setDescription("Manage user registries")
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone)
    .setContexts(InteractionContextType.Guild)
    .addSubcommand((sc) =>
      sc
        .setName("check")
        .setDescription("Check a user's registry")
        .addUserOption((o) => o.setName("user").setDescription("User you want to check").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("who")
        .setDescription("Check whom a registry belongs to")
        .addStringOption((o) => o.setName("name").setDescription("Name of the registry").setAutocomplete(true).setRequired(true))
        .addStringOption((o) => o.setName("value").setDescription("Value of the registry").setRequired(true)),
    )
    .addSubcommand((sc) =>
      sc
        .setName("edit")
        .setDescription("Edit a user's registry")
        .addUserOption((o) => o.setName("user").setDescription("User you want to edit").setRequired(true))
        .addStringOption((o) => o.setName("name").setDescription("Name of the registry").setAutocomplete(true).setRequired(true))
        .addStringOption((o) => o.setName("value").setDescription("Value of the registry").setRequired(true)),
    )
};

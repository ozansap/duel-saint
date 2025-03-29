import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Reply } from "@utils/reply";
import { Shop } from "@utils/shop";
import { UserHandler } from "@utils/db";

const execute = async (interaction: ChatInputCommandInteraction) => {
  let subcommand = interaction.options.getSubcommand(true);
  let user = interaction.options.getUser("user", true);

  if (subcommand === "check") {
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
  } if (subcommand === "edit") {
    let name = interaction.options.getString("name", true);
    let value = interaction.options.getString("value", true);

    let tag = Shop.tags.filter((t) => !t.is_filter).find((i) => i.value === name);
    if (!tag) {
      let reply = Reply.error("There is nothing to register with that name");
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
  const choices = Shop.tags.filter((t) => !t.is_filter);
  const filtered = choices.filter(choice => choice.name.toLowerCase().includes(focusedValue.toLowerCase()));
  await interaction.respond(
    filtered.map(choice => ({ name: choice.name, value: choice.value })),
  );
};

module.exports = {
  execute,
  autocomplete,
  data: new SlashCommandBuilder()
    .setName("registry")
    .setDescription("Manage user registries")
    .setDefaultMemberPermissions(8)
    .setDMPermission(false)
    .addSubcommand((sc) =>
      sc
        .setName("check")
        .setDescription("Check of a user's registry")
        .addUserOption((o) => o.setName("user").setDescription("User you want to check").setRequired(true))
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

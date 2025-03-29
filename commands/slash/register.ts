import { AutocompleteInteraction, ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";
import { Reply } from "@utils/reply";
import { Shop } from "@utils/shop";
import { UserHandler } from "@utils/db";

const execute = async (interaction: ChatInputCommandInteraction) => {
  let name = interaction.options.getString("name", true);
  let value = interaction.options.getString("value", true);

  let tag = Shop.tags.filter((t) => !t.is_filter).find((i) => i.value === name);
  if (!tag) {
    let reply = Reply.error("There is nothing to register with that name");
    return interaction.reply(reply.ephemeral());
  }

  let userHandler = new UserHandler(interaction.user.id);
  let userData = await userHandler.fetch();

  if (userData.registrations[tag.value]) {
    let reply = Reply.error(`You already a registered **${tag.name}**\nTo change it, please contact an administrator\nCurrent Value: \`${userData.registrations[tag.value]}\``);
    return interaction.reply(reply.ephemeral());
  }

  let registrations = Object.assign({}, userData.registrations, { [tag.value]: value });
  await userHandler.registrations_set(registrations).update(interaction.user.tag);

  let reply = Reply.success(`You registered **${tag.name}** as \`${value}\``);
  interaction.reply(reply.ephemeral());
};

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
    .setName("register")
    .setDescription("Register account information")
    .addStringOption((o) => o.setName("name").setDescription("Name of the information you want to register").setAutocomplete(true).setRequired(true))
    .addStringOption((o) => o.setName("value").setDescription("Value of the information").setRequired(true)),
};

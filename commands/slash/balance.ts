import { ECONOMY_ROLE_ID } from "@config";
import { LogsHandler, UserHandler } from "@utils/db";
import { Reply } from "@utils/reply";
import { now } from "@utils/time";
import { currency } from "@utils/vars";
import { ChatInputCommandInteraction, PermissionsBitField, SlashCommandBuilder } from "discord.js";

const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);
  const user = interaction.options.getUser("user", true);

  const userHandler = new UserHandler(user.id);
  const userData = await userHandler.fetch();

  if (subcommand === "check") {
    let reply = Reply.info(`${user} has **${userData.coins}** ${currency}`);
    interaction.reply(reply.visible());
  } else {
    const amount = interaction.options.getNumber("amount", true);
    const reason = interaction.options.getString("reason", false);
    let change = "";

    let guild = await interaction.client.guilds.fetch(interaction.guildId!);
    let member = await guild.members.fetch(interaction.user.id);
    if (!member.roles.cache.has(ECONOMY_ROLE_ID) && !member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      let reply = Reply.error("You don't have the permission to do that little bro...").setContent("<@122686558422695938> LMAO LOOK AT THIS GUY!!!");
      return interaction.reply(reply.visible());
    }

    if (subcommand === "add") {
      await userHandler.coins_add(amount).update(user.tag);
      let reply = Reply.success(`Added **${amount}** ${currency} to ${user}`);
      interaction.reply(reply.visible());
      change = `+${amount}`;
    } else if (subcommand === "sub") {
      await userHandler.coins_add(-amount).update(user.tag);
      let reply = Reply.success(`Removed **${amount}** ${currency} from ${user}`);
      interaction.reply(reply.visible());
      change = `-${amount}`;
    } else if (subcommand === "set") {
      await userHandler.coins_set(amount).update(user.tag);
      let reply = Reply.success(`${user} has **${amount}** ${currency}`);
      interaction.reply(reply.visible());
      change = `=${amount}`;
    } else return;

    LogsHandler.create({
      user: user.id,
      staff: interaction.user.id,
      change: change,
      reason: reason ?? "",
      date: now(),
    });
  }
};

module.exports = {
  execute,
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Manage user coins")
    .setDefaultMemberPermissions(PermissionsBitField.Flags.MentionEveryone)
    .addSubcommand((sc) =>
      sc
        .setName("add")
        .setDescription("(Admin) Add coins to a user")
        .addUserOption((o) => o.setName("user").setDescription("User you want to add coins to").setRequired(true))
        .addNumberOption((o) => o.setName("amount").setDescription("Amount of coins you want to add").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("A short reason for this action").setRequired(false))
    )
    .addSubcommand((sc) =>
      sc
        .setName("sub")
        .setDescription("(Admin) Remove coins from a user")
        .addUserOption((o) => o.setName("user").setDescription("User you want to remove coins from").setRequired(true))
        .addNumberOption((o) => o.setName("amount").setDescription("Amount of coins you want to remove").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("A short reason for this action").setRequired(false))
    )
    .addSubcommand((sc) =>
      sc
        .setName("set")
        .setDescription("(Admin) Set coins of a user")
        .addUserOption((o) => o.setName("user").setDescription("User you want to set coins of").setRequired(true))
        .addNumberOption((o) => o.setName("amount").setDescription("Amount of coins you want to set").setRequired(true))
        .addStringOption((o) => o.setName("reason").setDescription("A short reason for this action").setRequired(false))
    )
    .addSubcommand((sc) =>
      sc
        .setName("check")
        .setDescription("Check how many coins a user has")
        .addUserOption((o) => o.setName("user").setDescription("User you want to check coins of").setRequired(true))
    )

};

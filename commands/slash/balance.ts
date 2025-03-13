import { UserHandler } from "@utils/db";
import { Reply } from "@utils/reply";
import { currency } from "@utils/vars";
import { ChatInputCommandInteraction, SlashCommandBuilder } from "discord.js";

const execute = async (interaction: ChatInputCommandInteraction) => {
  const subcommand = interaction.options.getSubcommand(true);
  const user = interaction.options.getUser("user", true);

  if (subcommand === "add") {
    const amount = interaction.options.getNumber("amount", true);
    const userHandler = new UserHandler(user.id);
    await userHandler.coins_add(amount).update(user.tag);
    let reply = Reply.success(`Added **${amount}**${currency} to ${user}`);
    interaction.reply(reply.visible());
  } else if (subcommand === "sub") {
    const amount = interaction.options.getNumber("amount", true);
    const userHandler = new UserHandler(user.id);
    await userHandler.coins_add(-amount).update(user.tag);
    let reply = Reply.success(`Removed **${amount}**${currency} from ${user}`);
    interaction.reply(reply.visible());
  } else if (subcommand === "set") {
    const amount = interaction.options.getNumber("amount", true);
    const userHandler = new UserHandler(user.id);
    await userHandler.coins_set(amount).update(user.tag);
    let reply = Reply.success(`${user} has **${amount}**${currency}`);
    interaction.reply(reply.visible());
  } else if (subcommand === "check") {
    const userHandler = new UserHandler(user.id);
    const userData = await userHandler.fetch();
    let reply = Reply.info(`${user} has **${userData.coins}**${currency}`);
    interaction.reply(reply.visible());
  }
};

module.exports = {
  execute,
  data: new SlashCommandBuilder()
    .setName("balance")
    .setDescription("Manage user coins")
    .setDefaultMemberPermissions(8)
    .addSubcommand((sc) =>
      sc
        .setName("add")
        .setDescription("Add coins to a user")
        .addUserOption((o) => o.setName("user").setDescription("User you want to add coins to").setRequired(true))
        .addNumberOption((o) => o.setName("amount").setDescription("Amount of coins you want to add").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("sub")
        .setDescription("Remove coins from a user")
        .addUserOption((o) => o.setName("user").setDescription("User you want to remove coins from").setRequired(true))
        .addNumberOption((o) => o.setName("amount").setDescription("Amount of coins you want to remove").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("set")
        .setDescription("Set coins of a user")
        .addUserOption((o) => o.setName("user").setDescription("User you want to set coins of").setRequired(true))
        .addNumberOption((o) => o.setName("amount").setDescription("Amount of coins you want to set").setRequired(true))
    )
    .addSubcommand((sc) =>
      sc
        .setName("check")
        .setDescription("Check how many coins a user has")
        .addUserOption((o) => o.setName("user").setDescription("User you want to check coins of").setRequired(true))
    )

};

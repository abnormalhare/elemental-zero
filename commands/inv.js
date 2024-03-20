const { SlashCommandBuilder } = require('discord.js');
module.exports = {
  data: new SlashCommandBuilder()
    .setName('inv')
    .setDescription('View your inventory.'),
  async execute() { return "inv" },
};
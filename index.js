
const {
  Client,
  GatewayIntentBits,
  PermissionFlagsBits,
  SlashCommandBuilder,
  REST,
  Routes,
  EmbedBuilder
} = require("discord.js");

const fs = require("fs");

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
  throw new Error("Set TOKEN and CLIENT_ID in environment variables.");
}

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildModeration
  ]
});

const file = "./config.json";
let config = fs.existsSync(file)
  ? JSON.parse(fs.readFileSync(file, "utf8"))
  : {};

function save() {
  fs.writeFileSync(file, JSON.stringify(config, null, 2));
}

function setup(guildId) {
  if (!config[guildId]) config[guildId] = { roles: {} };
  return config[guildId];
}

function allowed(interaction, command, permission) {
  const member = interaction.member;
  const ids = setup(interaction.guild.id).roles[command] || [];

  if (member.permissions.has(PermissionFlagsBits.Administrator)) {
    return true;
  }

  if (ids.length) {
    return ids.some(id => member.roles.cache.has(id));
  }

  return member.permissions.has(permission);
}

function deny(interaction) {
  return interaction.reply({
    content: "❌ ما عندك صلاحية لاستخدام هذا الأمر.",
    ephemeral: true
  });
}

const commands = [
  new SlashCommandBuilder()
    .setName("help")
    .setDescription("عرض الأوامر"),

  new SlashCommandBuilder()
    .setName("setrole")
    .setDescription("تحديد رول لأمر")
    .addStringOption(o =>
      o.setName("command")
        .setDescription("اسم الأمر")
        .setRequired(true)
        .addChoices(
          { name: "broadcast", value: "broadcast" },
          { name: "ban", value: "ban" },
          { name: "kick", value: "kick" },
          { name: "timeout", value: "timeout" },
          { name: "clear", value: "clear" },
          { name: "role", value: "role" },
          { name: "lock", value: "lock" },
          { name: "unlock", value: "unlock" },
          { name: "warn", value: "warn" }
        ))
    .addRoleOption(o =>
      o.setName("role")
        .setDescription("الرول")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("removerole")
    .setDescription("إزالة رول من أمر")
    .addStringOption(o =>
      o.setName("command")
        .setDescription("اسم الأمر")
        .setRequired(true)
        .addChoices(
          { name: "broadcast", value: "broadcast" },
          { name: "ban", value: "ban" },
          { name: "kick", value: "kick" },
          { name: "timeout", value: "timeout" },
          { name: "clear", value: "clear" },
          { name: "role", value: "role" },
          { name: "lock", value: "lock" },
          { name: "unlock", value: "unlock" },
          { name: "warn", value: "warn" }
        ))
    .addRoleOption(o =>
      o.setName("role")
        .setDescription("الرول")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("broadcast")
    .setDescription("إرسال رسالة خاصة للأعضاء")
    .addStringOption(o =>
      o.setName("message")
        .setDescription("الرسالة")
        .setRequired(true)
        .setMaxLength(1800))
    .addRoleOption(o =>
      o.setName("role")
        .setDescription("إرسال لأعضاء رول محدد فقط")
        .setRequired(false))
    .addBooleanOption(o =>
      o.setName("confirm")
        .setDescription("تأكيد الإرسال")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("ban")
    .setDescription("حظر عضو")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("العضو")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("kick")
    .setDescription("طرد عضو")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("العضو")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("timeout")
    .setDescription("إسكات عضو")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("العضو")
        .setRequired(true))
    .addIntegerOption(o =>
      o.setName("minutes")
        .setDescription("المدة بالدقائق")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(40320)),

  new SlashCommandBuilder()
    .setName("clear")
    .setDescription("مسح رسائل")
    .addIntegerOption(o =>
      o.setName("amount")
        .setDescription("عدد الرسائل")
        .setRequired(true)
        .setMinValue(1)
        .setMaxValue(100)),

  new SlashCommandBuilder()
    .setName("role")
    .setDescription("إعطاء رول لعضو")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("العضو")
        .setRequired(true))
    .addRoleOption(o =>
      o.setName("role")
        .setDescription("الرول")
        .setRequired(true)),

  new SlashCommandBuilder()
    .setName("lock")
    .setDescription("قفل القناة"),

  new SlashCommandBuilder()
    .setName("unlock")
    .setDescription("فتح القناة"),

  new SlashCommandBuilder()
    .setName("warn")
    .setDescription("تحذير عضو")
    .addUserOption(o =>
      o.setName("member")
        .setDescription("العضو")
        .setRequired(true))
    .addStringOption(o =>
      o.setName("reason")
        .setDescription("السبب")
        .setRequired(true))
].map(command => command.toJSON());

async function registerCommands() {
  const rest = new REST({ version: "10" }).setToken(TOKEN);

  const route = GUILD_ID
    ? Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID)
    : Routes.applicationCommands(CLIENT_ID);

  await rest.put(route, { body: commands });
  console.log("Blor System commands registered.");
}

client.once("ready", () => {
  console.log(`Blor System online: ${client.user.tag}`);
  client.user.setActivity("Blor System");
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand()) return;
  if (!interaction.guild) {
    return interaction.reply({
      content: "هذا الأمر يعمل داخل السيرفر فقط.",
      ephemeral: true
    });
  }

  const name = interaction.commandName;

  try {
    if (name === "help") {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor(0x2463eb)
            .setTitle("Blor System")
            .setDescription(
              "`/setrole` تحديد رولات الأوامر\n" +
              "`/removerole` إزالة رولات الأوامر\n" +
              "`/broadcast` إرسال رسالة للخاص\n" +
              "`/ban` حظر\n`/kick` طرد\n" +
              "`/timeout` إسكات\n`/clear` مسح رسائل\n" +
              "`/role` إعطاء رول\n`/lock` قفل\n" +
              "`/unlock` فتح\n`/warn` تحذير"
            )
        ],
        ephemeral: true
      });
    }

    if (["setrole", "removerole"].includes(name)) {
      if (!interaction.memberPermissions.has(
        PermissionFlagsBits.Administrator
      )) return deny(interaction);

      const command = interaction.options.getString("command");
      const role = interaction.options.getRole("role");
      const guildConfig = setup(interaction.guild.id);

      guildConfig.roles[command] ||= [];

      if (name === "setrole") {
        if (!guildConfig.roles[command].includes(role.id)) {
          guildConfig.roles[command].push(role.id);
        }
      } else {
        guildConfig.roles[command] =
          guildConfig.roles[command].filter(id => id !== role.id);
      }

      save();

      return interaction.reply({
        content: name === "setrole"
          ? `تم السماح للرول ${role} باستخدام /${command}`
          : `تمت إزالة الرول ${role} من /${command}`,
        ephemeral: true
      });
    }

    const perms = {
      broadcast: PermissionFlagsBits.ManageGuild,
      ban: PermissionFlagsBits.BanMembers,
      kick: PermissionFlagsBits.KickMembers,
      timeout: PermissionFlagsBits.ModerateMembers,
      clear: PermissionFlagsBits.ManageMessages,
      role: PermissionFlagsBits.ManageRoles,
      lock: PermissionFlagsBits.ManageChannels,
      unlock: PermissionFlagsBits.ManageChannels,
      warn: PermissionFlagsBits.ModerateMembers
    };

    if (perms[name] && !allowed(interaction, name, perms[name])) {
      return deny(interaction);
    }

    if (name === "broadcast") {
      if (!interaction.options.getBoolean("confirm")) {
        return interaction.reply({
          content: "تم إلغاء الإرسال.",
          ephemeral: true
        });
      }

      await interaction.deferReply({ ephemeral: true });

      const message = interaction.options.getString("message");
      const role = interaction.options.getRole("role");
      const members = await interaction.guild.members.fetch();

      const targets = members.filter(member =>
        !member.user.bot &&
        (!role || member.roles.cache.has(role.id))
      );

      let sent = 0;
      let failed = 0;

      const embed = new EmbedBuilder()
        .setColor(0x2463eb)
        .setTitle(`رسالة من ${interaction.guild.name}`)
        .setDescription(message)
        .setTimestamp();

      await interaction.editReply(
        `بدأ إرسال الرسالة إلى ${targets.size} عضو.`
      );

      for (const member of targets.values()) {
        try {
          await member.send({ embeds: [embed] });
          sent++;
        } catch {
          failed++;
        }

        await new Promise(resolve => setTimeout(resolve, 1200));
      }

      return interaction.followUp({
        content: `انتهى الإرسال.\n✅ نجح: ${sent}\n⚠️ فشل: ${failed}`,
        ephemeral: true
      });
    }

    if (name === "ban" || name === "kick") {
      const user = interaction.options.getUser("member");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: "العضو غير موجود.", ephemeral: true });
      }
      if (member.id === interaction.user.id) {
        return interaction.reply({ content: "لا يمكنك تنفيذ الأمر على نفسك.", ephemeral: true });
      }
      if (name === "ban") {
        await member.ban({ reason: `By ${interaction.user.tag}` });
      } else {
        await member.kick(`By ${interaction.user.tag}`);
      }
      return interaction.reply({
        content: `تم ${name === "ban" ? "حظر" : "طرد"} ${user.tag}.`,
        ephemeral: true
      });
    }

    if (name === "timeout") {
      const user = interaction.options.getUser("member");
      const minutes = interaction.options.getInteger("minutes");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ content: "العضو غير موجود.", ephemeral: true });
      }
      await member.timeout(minutes * 60000, `By ${interaction.user.tag}`);
      return interaction.reply({
        content: `تم إسكات ${user.tag} لمدة ${minutes} دقيقة.`,
        ephemeral: true
      });
    }

    if (name === "clear") {
      const amount = interaction.options.getInteger("amount");
      const deleted = await interaction.channel.bulkDelete(amount, true);
      return interaction.reply({
        content: `تم حذف ${deleted.size} رسالة.`,
        ephemeral: true
      });
    }

    if (name === "role") {
      const user = interaction.options.getUser("member");
      const role = interaction.options.getRole("role");
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) return interaction.reply({ content: "العضو غير موجود.", ephemeral: true });
      if (role.managed || role.position >= interaction.guild.members.me.roles.highest.position) {
        return interaction.reply({ content: "ارفع رتبة البوت فوق الرول المطلوب.", ephemeral: true });
      }
      await member.roles.add(role);
      return interaction.reply({
        content: `تم إعطاء ${role} إلى ${user.tag}.`,
        ephemeral: true
      });
    }

    if (name === "lock" || name === "unlock") {
      await interaction.channel.permissionOverwrites.edit(
        interaction.guild.roles.everyone,
        { SendMessages: name === "lock" ? false : null }
      );
      return interaction.reply({
        content: name === "lock" ? "تم قفل القناة." : "تم فتح القناة.",
        ephemeral: true
      });
    }

    if (name === "warn") {
      const user = interaction.options.getUser("member");
      const reason = interaction.options.getString("reason");
      const key = `${interaction.guild.id}:${user.id}`;
      warnings[key] ||= [];
      warnings[key].push({
        reason,
        moderator: interaction.user.tag,
        date: new Date().toISOString()
      });
      writeJson(warningsPath, warnings);
      await user.send(`تم تحذيرك في ${interaction.guild.name}. السبب: ${reason}`).catch(() => null);
      return interaction.reply({
        content: `تم تسجيل تحذير على ${user.tag}.`,
        ephemeral: true
      });
    }
  } catch (error) {
    console.error(error);
    const msg = "حدث خطأ. تأكد من صلاحيات البوت ورتبته.";
    if (interaction.deferred || interaction.replied) {
      return interaction.followUp({ content: msg, ephemeral: true }).catch(() => {});
    }
    return interaction.reply({ content: msg, ephemeral: true }).catch(() => {});
  }
});

client.on("interactionCreate", async interaction => {
  if (!interaction.isChatInputCommand() || interaction.commandName !== "permissions") return;
  if (!interaction.guild || !interaction.memberPermissions.has(PermissionFlagsBits.Administrator)) {
    return interaction.reply({ content: "هذا الأمر للإدارة فقط.", ephemeral: true });
  }
  const cfg = getConfig(interaction.guild.id);
  const entries = Object.entries(cfg.roles || {});
  const description = entries.length
    ? entries.map(([command, ids]) => `**/${command}:** ${ids.map(id => interaction.guild.roles.cache.get(id)?.toString() || id).join("، ") || "لا توجد رولات"} `).join("\n")
    : "لم يتم تعيين رولات مخصصة. الأوامر تستخدم صلاحيات ديسكورد الافتراضية.";
  return interaction.reply({
    embeds: [new EmbedBuilder().setColor(0x2463eb).setTitle("صلاحيات Blor System").setDescription(description)],
    ephemeral: true
  });
});

const warnings = readJson(warningsPath, {});
client.login(token);
''',
"README.md": r'''# Blor System

Discord moderation and DM broadcast bot using Node.js and discord.js v14.

## Environment variables
- `TOKEN`: Discord bot token
- `CLIENT_ID`: Application ID
- `GUILD_ID`: Optional test server ID (registers slash commands quickly in one server)

## GitHub upload
Upload the contents of this folder to a repository named `blor-system`. Do not upload your bot token.

## Discord setup
1. Create an application and bot in the Discord Developer Portal.
2. Copy the bot token into the hosting environment variable `TOKEN`.
3. Copy the Application ID into `CLIENT_ID`.
4. Enable **Server Members Intent** under the Bot settings.
5. Invite the bot with `bot` and `applications.commands` scopes.
6. Give the bot only the permissions it needs: View Channels, Send Messages, Manage Messages, Manage Roles, Manage Channels, Ban Members, Kick Members, Moderate Members, and Read Message History as needed.
7. Keep the bot's role above roles it needs to assign or moderate.

## Deploy slash commands
Set `TOKEN`, `CLIENT_ID`, and optionally `GUILD_ID`, then run:
```bash
npm install
npm run deploy
npm start
```
For a single server, setting `GUILD_ID` makes commands appear faster.

## Render
Create a Background Worker connected to the GitHub repository:
- Build command: `npm install`
- Start command: `npm start`
- Environment: `TOKEN`, `CLIENT_ID`, optional `GUILD_ID`

Run `npm run deploy` once from a terminal with the same environment variables whenever you change slash command definitions.

## Role permissions
Use `/setrole command:broadcast role:@Announcements` to grant a custom role access to an action. Use `/removerole` to remove it. Only server administrators can edit these settings. When a custom role list exists for a command, matching roles and administrators can use it; otherwise Discord native permissions are used.

## DM broadcast
`/broadcast` can send a message to non-bot members, optionally filtered to a selected role. DM privacy settings can block delivery. Send only necessary, appropriate server announcements and avoid repeated unsolicited messages.

## Persistence warning
This starter uses JSON files under `data/`. Ephemeral hosting filesystems may be reset on redeploy/restart. For reliable persistent settings and warnings, configure a persistent disk or migrate to a database.

## Important
Never commit your token to GitHub. If it leaks, reset it immediately in the Developer Portal.
'''
}

# Fix an implementation detail: warnings is declared after event handlers but initialized before events fire;
# valid lexical binding due to runtime callback timing. Keep files as generated.
for rel, content in files.items():
    p = os.path.join(base, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "w", encoding="utf-8") as f:
        f.write(content)

zip_path = "/mnt/data/blor-system-code.zip"
with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as z:
    for rel in files:
        z.write(os.path.join(base, rel), rel)
print(zip_path)
print("Files:", ", ".join(files.keys()))
_redirect = "Project code prepared."
text(_redirect)

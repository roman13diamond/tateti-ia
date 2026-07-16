const CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

if (!CLIENT_ID || !BOT_TOKEN) {
  console.error("Faltan DISCORD_CLIENT_ID o DISCORD_BOT_TOKEN");
  process.exit(1);
}

const commands = [
  {
    id: "1518084725204455557",
    type: 4,
    name: "launch",
    description: "Launch an activity",
    handler: 2,
  },
  {
    type: 1,
    name: "tateti",
    description: "Abrí Ta-Te-Ti IA y jugá contra la inteligencia artificial Q-Learning",
  },
];

const res = await fetch(
  `https://discord.com/api/v10/applications/${CLIENT_ID}/commands`,
  {
    method: "PUT",
    headers: {
      Authorization: `Bot ${BOT_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(commands),
  }
);

if (!res.ok) {
  const text = await res.text();
  console.error(`Error ${res.status}: ${text}`);
  process.exit(1);
}

const data = await res.json();
console.log("Comandos registrados:");
console.log(JSON.stringify(data, null, 2));

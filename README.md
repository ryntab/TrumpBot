![DemoTruth](/docs/logo.png)
# TrumpBot 

A Discord bot that polls Trump's Truth Social posts and shares them in your server with rich embeds, media, and post stats.

> ⚠️ **Disclaimer**  
> This bot is **not a political tool**. It was built with financial and social media monitoring use-cases in mind — particularly for **trading communities** and **market watchers** who want real-time updates on posts from high-profile accounts.  
>  
> It’s intended for use in **Discord trading servers, stock discussion groups, and sentiment tracking tools**, where social media activity can impact markets.  
>  
> No political affiliation or endorsement is implied.


## Installation

- Clone or download this repository
- Install dependencies  
  `npm install`
- Create a `.env` file and add your bot token:  
  `TOKEN=your-discord-bot-token`
- Start the bot  
  `node index.js`

## Features

- 💬 Posts Trump’s latest “Truths” with author info, timestamps, and stats
- 📸 Supports embedded media (images + videos with fallback links)
- 💤 Smart polling with reduced frequency during known inactive hours (5–8 AM UTC)
- ⏱ Live countdown until next poll shown in the bot's presence
- ⚙️ Set your target channel with the `/setchannel` command (requires Manage Server permission)

## Setup Instructions

After running the bot:

1. Invite DonBot to your server with appropriate permissions.
2. Run `/setchannel` in your server and choose a text channel.
3. That’s it! TrumpBot will automatically begin posting new "Truths".
   
![DSlashSet](/docs/slash-setchannel.jpg)

## Example Output

```discord
@realDonaldTrump: We are taking historic action to help...
💬 5,000 🔁 10,200 ❤️ 28,000
Posted Today at 5:44 PM
```

![DemoTruth](/docs/demo-truth.jpg)

## Environment Variables

```
TOKEN=your-discord-bot-token
```

## Folder Structure

```
.
├── index.js              # Main entry
├── /core                 # Presence, client, shared utils
│   ├── client.js
│   ├── presence.js
│   └── utils.js
├── /services             # Polling logic
│   └── poller.js
├── /commands             # Slash command registration
│   └── slash.js
├── last-id.txt           # Stores last fetched post ID
├── channelMap.json       # Stores channel mappings per server
└── .env
```

## Notes

- Polling interval is dynamically adjusted:
  - Default: every 45 minutes
  - Burst mode: every 2 minutes after new post
  - Sleep mode (5–8 AM UTC): every 3 hours
- Presence updates every 15s with live countdown to next fetch

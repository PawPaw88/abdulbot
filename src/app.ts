import { Client, LocalAuth, Message, MessageMedia } from "whatsapp-web.js";
import qrcode from "qrcode-terminal";
import { Family100Game } from "./games/family100";
import { chatWithGemini } from "./services/gemini";

const client = new Client({
  restartOnAuthFail: true,
  webVersionCache: {
    type: "remote",
    remotePath:
      "https://raw.githubusercontent.com/wppconnect-team/wa-version/main/html/2.2410.1.html",
  },
  puppeteer: {
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-accelerated-2d-canvas",
      "--no-first-run",
      "--no-zygote",
      "--single-process",
      "--disable-gpu",
      "--max-old-space-size=4096",
    ],
  },
  authStrategy: new LocalAuth({
    dataPath: process.env.RAILWAY_ENV ? "/app/auth" : "./auth",
  }),
});

client.on("qr", (qr) => {
  qrcode.generate(qr, { small: true });
});

client.on("ready", () => {
  console.log("Client is ready!");
});

const family100Game = new Family100Game();

client.on("message", async (msg) => {
  if (msg.body === ".menu") {
    const contact = await msg.getContact();
    const nameOrNumber = contact.pushname || contact.number;

    const menuText = `Halo, ${nameOrNumber}! 👋
    
Mr. Abdul di sini, aku masih dalam tahap evolusi jadi maklum ya kalau kadang-kadang offline. Tapi tenang, aku selalu comeback dengan fitur-fitur baru yang bikin kamu terkesima!

Daftar Kategori Menu:
1. 🎮 Game - '.game'
2. 🖼️ Stiker - '.stiker'`;

    await msg.reply(menuText);
    return;
  }

  if (
    (msg.body.startsWith(".stiker") ||
      msg.body.startsWith("!stiker") ||
      msg.body.startsWith(".sticker") ||
      msg.body.startsWith("!sticker") ||
      msg.body === ".s") &&
    msg.type === "image"
  ) {
    let media;
    try {
      media = await msg.downloadMedia();
    } catch (error) {
      console.error(error);
      return msg.reply("Proses mengunduh gambar gagal!");
    }

    client.sendMessage(msg.from, media, {
      sendMediaAsSticker: true,
      stickerAuthor: "Abdul",
      stickerName: "🤨🤨",
    });
  }

  if (msg.body === ".game") {
    const gameMenu = `🎮 *DAFTAR GAME SERU* 🎮

1. 👨‍👩‍👧‍👦 *Family 100*
   • Tebak jawaban terpopuler!
   • Mainkan bersama teman-teman
   • Ketik '.f100' untuk mulai
   
2. 🎲 *Coming Soon*
   • Tebak Kata
   • Tebak Gambar
   • Quiz
   
💡 *Cara Bermain Family 100:*
- Ketik '.f100' untuk mulai game
- Jawab pertanyaan dalam waktu 3 menit
- Semakin populer jawaban, semakin tinggi poin!

_Game lainnya akan segera hadir! Stay tuned_ 🎯`;

    await msg.reply(gameMenu);
    return;
  }

  if (msg.body === ".f100") {
    const response = family100Game.startGame(msg);
    await client.sendMessage(msg.from, response);
    return;
  }

  // Proses jawaban Family 100
  const answerResponse = await family100Game.processAnswer(msg);
  if (answerResponse) {
    await client.sendMessage(msg.from, answerResponse);
  }

  // Tambahkan handler untuk chat dengan AI
  if (msg.body.startsWith("/")) {
    const question = msg.body.slice(1).trim(); // Hapus karakter "/"
    if (question) {
      const response = await chatWithGemini(question);
      if (response) {
        await client.sendMessage(msg.from, response);
      } else {
        await msg.reply(
          "Maaf, saya tidak dapat memproses pertanyaan Anda saat ini."
        );
      }
    }
    return;
  }
});

// Handle uncaught exceptions
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err) => {
  console.error("Unhandled Rejection:", err);
});

// Handle disconnections
client.on("disconnected", (reason) => {
  console.log("Client was disconnected:", reason);
});

client.initialize();

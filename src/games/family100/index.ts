import { Message } from "whatsapp-web.js";
import { questions } from "./questions";
import { GameSession, Family100Question } from "./types";
import { checkAnswerSimilarity } from "../../services/gemini";

export class Family100Game {
  private sessions: Map<string, GameSession> = new Map();

  private getRandomQuestion(): Family100Question {
    const randomIndex = Math.floor(Math.random() * questions.length);
    return questions[randomIndex];
  }

  public startGame(chatId: string): string {
    if (this.sessions.has(chatId)) {
      return "⚠️ Permainan sedang berlangsung di grup ini!";
    }

    const questionData = this.getRandomQuestion();
    const remainingAnswers = new Set(
      questionData.answers.map((a) => a.text.toLowerCase())
    );

    this.sessions.set(chatId, {
      isActive: true,
      questionData,
      remainingAnswers,
      participants: new Map(),
      chatId,
      answeredBy: new Map(),
      participantNames: new Map(),
    });

    const blankAnswers = Array(questionData.answers.length)
      .fill("_______")
      .map((line, index) => `${index + 1}. ${line}`)
      .join("\n");

    return `🎮 *FAMILY 100* 🎮\n\n*Pertanyaan:*\n${questionData.question}\n\n${blankAnswers}\n\nKetik jawaban kalian langsung!\nKetik *.nyerah* untuk menyerah.`;
  }

  public async processAnswer(msg: Message, chatId: string): Promise<string | null> {
    console.log("Processing answer:", msg.body);
    const session = this.sessions.get(chatId);

    if (!session?.isActive) {
      console.log("No active game session");
      return null; // Tidak ada permainan yang berlangsung, kembalikan null
    }

    // Periksa tipe pesan
    if (msg.hasMedia || msg.type !== "chat") {
      console.log("Ignoring non-text message");
      return null; // Abaikan pesan non-teks
    }

    if (msg.body.toLowerCase() === ".nyerah") {
      return this.endGame(chatId, true);
    }

    const answer = msg.body.toLowerCase();
    const correctAnswers = Array.from(session.remainingAnswers);

    const aiResponse = await checkAnswerSimilarity(
      answer,
      correctAnswers,
      session.questionData.question
    );
    console.log("AI Response:", aiResponse);

    const participant = msg.author || msg.from;
    const contact = await msg.getContact();
    const participantName =
      contact.pushname || contact.number || participant.split("@")[0];

    if (aiResponse.startsWith("BENAR:")) {
      const correctAnswer = aiResponse.replace("BENAR:", "").trim();
      session.remainingAnswers.delete(correctAnswer.toLowerCase());
      const answerData = session.questionData.answers.find(
        (a) => a.text.toLowerCase() === correctAnswer.toLowerCase()
      );

      if (!answerData) return "Terjadi kesalahan dalam memproses jawaban.";

      session.answeredBy.set(correctAnswer.toLowerCase(), participantName);

      const currentPoints = session.participants.get(participant) || 0;
      session.participants.set(participant, currentPoints + answerData.points);

      if (!session.participantNames) {
        session.participantNames = new Map();
      }
      session.participantNames.set(participant, participantName);

      const formattedAnswerList = this.getFormattedAnswerList(session);

      if (session.remainingAnswers.size === 0) {
        const winMessage = `🎉 *${participantName} Benar!* +${answerData.points} poin\n\n*Daftar Jawaban:*\n${formattedAnswerList}\n\n🎊 *SEMUA JAWABAN TELAH DITEMUKAN!* 🎊\n`;
        const endGameMessage = this.endGame(chatId, false);
        return winMessage + "\n" + endGameMessage;
      }

      return `🎉 *${participantName} Benar!* +${answerData.points} poin\n\n*Daftar Jawaban:*\n${formattedAnswerList}`;
    }

    // Jika jawaban salah, kembalikan respons dari AI
    return `${aiResponse}`;
  }

  private getFormattedAnswerList(session: GameSession): string {
    const totalAnswers = session.questionData.answers.length;
    const answerList = Array(totalAnswers).fill("_______");

    session.questionData.answers.forEach((a, index) => {
      if (!session.remainingAnswers.has(a.text.toLowerCase())) {
        const answeredBy = session.answeredBy.get(a.text.toLowerCase());
        answerList[index] = `${a.text} (${a.points}) - ${answeredBy}`;
      }
    });

    return answerList
      .map((answer, index) => `${index + 1}. ${answer}`)
      .join("\n");
  }

  public endGame(chatId: string, showAllAnswers: boolean): string {
    const session = this.sessions.get(chatId);
    if (!session) return "Tidak ada permainan yang sedang berlangsung.";

    session.isActive = false;
    this.sessions.delete(chatId);

    let message = "🏁 *PERMAINAN SELESAI!* 🏁\n\n";

    if (showAllAnswers) {
      message += "*Jawaban yang belum terjawab:*\n";
      session.questionData.answers.forEach((answer, index) => {
        if (session.remainingAnswers.has(answer.text.toLowerCase())) {
          message += `${index + 1}. ${answer.text} (${answer.points})\n`;
        }
      });
      message += "\n";
    }

    let leaderboard = Array.from(session.participants.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([participant, points], index) => {
        const name =
          session.participantNames?.get(participant) ||
          participant.split("@")[0];
        return `${index + 1}. ${name}: ${points} poin`;
      })
      .join("\n");

    message += `*LEADERBOARD:*\n${leaderboard}`;

    return message;
  }
          }

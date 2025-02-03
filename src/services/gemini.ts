interface RyzendesuResponse {
  status: boolean;
  answer: string;
  message?: string;
}

export async function checkAnswerSimilarity(
  userAnswer: string,
  correctAnswers: string[],
  question: string
): Promise<string> {
  const prompt = `
    Kamu adalah asisten dalam permainan Family 100 yang gaul dan lucu.
    
    Konteks:
    - Pertanyaan: "${question}"
    - Daftar jawaban yang benar: ${correctAnswers.join(", ")}
    - Jawaban pemain: "${userAnswer}"
    
    Jika jawaban pemain ada di daftar jawaban yang benar / memiliki makna yang sama, benarkan jawaban pemain dan berikan output:
    "BENAR: jawaban" jawaban harus ada dan persis di daftar jawaban

    contoh:
    - Jawaban pemain: "mi gorng"
    - Daftar jawaban yang benar: "nasi goreng, mie goreng, sate, bakso, martabak"
    - Output: "BENAR: mie goreng"

    jika jawabannya tidak ada, respon dengan bahasa non formal tanpa mengulangi teks ini. jangan spoiler
  `;

  try {
    const response = await fetch(
      `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(
        prompt
      )}`
    );

    const data = (await response.json()) as {
      success: boolean;
      response: string;
    };

    if (!data.success) {
      console.error("AI API Error");
      return "Maaf, terjadi kesalahan saat memproses jawaban.";
    }

    return data.response.trim();
  } catch (error) {
    console.error("AI API Error:", error);
    return "Maaf, terjadi kesalahan saat memproses jawaban.";
  }
}

export async function chatWithGemini(message: string): Promise<string | null> {
  try {
    const response = await fetch(
      `https://api.ryzendesu.vip/api/ai/chatgpt?text=${encodeURIComponent(
        message
      )}`
    );

    const data = (await response.json()) as {
      success: boolean;
      response: string;
    };

    if (!data.success) {
      console.error("AI API Error");
      return "Maaf, terjadi kesalahan saat memproses permintaan Anda.";
    }

    return data.response.trim();
  } catch (error) {
    console.error("AI Chat Error:", error);
    return "Maaf, terjadi kesalahan dalam sistem.";
  }
}

export interface Family100Question {
  question: string;
  answers: Array<{
    text: string;
    points: number;
  }>;
}

export interface GameSession {
  isActive: boolean;
  questionData: Family100Question;
  remainingAnswers: Set<string>;
  participants: Map<string, number>;
  participantNames: Map<string, string>;
  chatId: string;
  answeredBy: Map<string, string>;
}

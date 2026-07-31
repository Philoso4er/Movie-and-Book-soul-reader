export interface ItemInfo {
  verified: boolean;
  title: string;
  type: "movie" | "book" | "show";
  creator: string;
  year: string;
  description: string;
  genres: string[];
  vibes: string[];
  soulProfile: string;
  suggestedQuestions: string[];
  coverDescription: string;
  voiceGender?: "female" | "male" | "neutral";
  voicePitch?: number;
  voiceRate?: number;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: string;
}

export interface EBookChapter {
  title: string;
  content: string;
}

export interface EBook {
  title: string;
  author: string;
  introduction: string;
  chapters: EBookChapter[];
  epilogue: string;
}

export interface StoryChoiceHistory {
  sceneText: string;
  choiceSelected: string;
}

export interface StoryState {
  title: string;
  setting: string;
  history: StoryChoiceHistory[];
  currentSceneText: string;
  choices: string[];
  status: "playing" | "ended";
  moodTheme: string;
}

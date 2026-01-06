export class ClovaRequestDto {
  systemPrompt: string;
  userMessage: string;
  jsonSchema: object;
}

export interface ClovaApiResponse {
  result: {
    message: {
      role: string;
      content: string;
    };
    stopReason: string;
    inputLength: number;
    outputLength: number;
    seed: number;
  };
}

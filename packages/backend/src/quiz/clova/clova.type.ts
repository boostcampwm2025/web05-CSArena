export interface ClovaRequestDto {
  systemPrompt: string;
}

export interface ClovaApiResponse {
  result: {
    message: {
      content: string;
    };
  };
}

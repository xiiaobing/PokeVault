import api from './api'

import type { Card, PaginatedResponse } from '../types/card'

export async function searchCards(
  query: string
): Promise<PaginatedResponse<Card>> {
  const response = await api.get<PaginatedResponse<Card>>(
    '/cards/search/',
    {
      params: {
        q: query,
      },
    }
  )

  return response.data
}


export interface CardScanResponse {
  matched: boolean;
  source?: "database" | "pokewallet";
  recognition?: {
    name: string;
    set_name: string;
    number: string;
    language: string | null;
    print: string | null;
    similarity: number;
    picture: string | null;
  };
  card?: Card;
  message?: string;
}

export async function scanCard(image: File): Promise<CardScanResponse> {
  const formData = new FormData();
  formData.append("image", image);

  const response = await api.post<CardScanResponse>(
    "/cards/scan/",
    formData,
    {
      headers: {
        "Content-Type": undefined,
      },
    }
  );

  return response.data;
}

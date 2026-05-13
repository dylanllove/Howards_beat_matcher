import type { AnalysisResult } from '../types';
const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000';
export async function analyseMp3(file: File): Promise<AnalysisResult> {
  const data = new FormData(); data.append('file', file);
  const response = await fetch(`${API_URL}/analyse`, { method: 'POST', body: data });
  if (!response.ok) throw new Error(await response.text());
  return response.json();
}

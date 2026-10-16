import { File } from 'expo-file-system';
import { Platform } from 'react-native';
import { request } from './integration';

export interface VoiceProvider {
  capabilities(signal?: AbortSignal): Promise<{configured: boolean; languages: string[]}>;
  transcribe(uri: string, language: string, signal: AbortSignal): Promise<string>;
}
export const backendVoice: VoiceProvider = {
  capabilities: signal => request<{configured: boolean; languages: string[]}>('/voice/capabilities', {signal}),
  async transcribe(uri, language, signal) {
    // Obtain authorization through the shared authenticated request boundary.
    // Upload is performed by integration.uploadAudio so tokens stay out of components.
    const {uploadAudio} = await import('./integration');
    return uploadAudio(uri, language, signal);
  },
};
export function removeRecording(uri: string | null) {
  if (!uri) return;
  if (Platform.OS === 'web') { URL.revokeObjectURL(uri); return; }
  try { const file = new File(uri); if (file.exists) file.delete(); } catch { /* Cache cleanup can be retried by OS. */ }
}

import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DeepgramClient } from '@deepgram/sdk';

/**
 * Thin wrapper around Deepgram's prerecorded STT and REST TTS endpoints.
 * Deliberately does NOT use Deepgram's bundled "Voice Agent" product —
 * this app's safety behavior (the deterministic emergency gate, the
 * structured handoff schema, the sanitizer for a known structured-output
 * glitch) all live in our own agent code and must run on every turn
 * regardless of channel. Voice is just a transport: audio in, transcript
 * out through the exact same agent.handle() pipeline text uses, agent
 * reply text in, audio out. No agent logic is duplicated here.
 */
interface MinimalTranscriptResponse {
  results?: {
    channels?: {
      alternatives?: { transcript?: string }[];
    }[];
  };
}

@Injectable()
export class VoiceService {
  private readonly logger = new Logger(VoiceService.name);
  private client: DeepgramClient | null = null;

  constructor(private readonly config: ConfigService) {}

  isConfigured(): boolean {
    return Boolean(this.config.get<string>('DEEPGRAM_API_KEY'));
  }

  private getClient(): DeepgramClient {
    if (!this.client) {
      this.client = new DeepgramClient({ apiKey: this.config.get<string>('DEEPGRAM_API_KEY') });
    }
    return this.client;
  }

  /** Transcribes one complete recorded utterance (push-to-talk, not a live stream). */
  async transcribe(audio: Buffer, mimetype: string): Promise<string> {
    const client = this.getClient();
    const response = await client.listen.v1.media.transcribeFile(
      { data: audio, contentType: mimetype },
      { model: 'nova-3', smart_format: true, punctuate: true },
    );
    const transcript = (response as unknown as MinimalTranscriptResponse).results?.channels?.[0]?.alternatives?.[0]
      ?.transcript;
    if (!transcript) {
      this.logger.warn('Deepgram returned an empty transcript');
    }
    return (transcript ?? '').trim();
  }

  /** Synthesizes the agent's reply text to speech. MP3 for broad <audio> compatibility. */
  async synthesize(text: string): Promise<Buffer> {
    const client = this.getClient();
    const response = await client.speak.v1.audio.generate({
      text,
      model: 'aura-2-asteria-en',
      encoding: 'mp3',
    });
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }
}

import { AudioTrack } from "../../domain/entities";
import { AudioEngineRepository } from "../../domain/repositories";

export class SelectTrack {
  constructor(private audioEngine: AudioEngineRepository) {}

  async execute(track: AudioTrack): Promise<void> {
    await this.audioEngine.load(track.buffer);
  }
}

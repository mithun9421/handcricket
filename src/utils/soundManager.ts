import { Howl, Howler } from 'howler';

class SoundManager {
  private sounds: { [key: string]: Howl } = {};
  private isEnabled: boolean = true;

  constructor() {
    // Initialize sounds with error handling
    this.sounds = {
      click: new Howl({
        src: ['/sounds/click.mp3'],
        volume: 0.5,
        preload: false,
        onloaderror: () => console.log('Click sound not found - using silent mode')
      }),
      sixer: new Howl({
        src: ['/sounds/crowd-cheer.mp3'],
        volume: 0.7,
        preload: false,
        onloaderror: () => console.log('Sixer sound not found - using silent mode')
      }),
      wicket: new Howl({
        src: ['/sounds/wicket.mp3'],
        volume: 0.6,
        preload: false,
        onloaderror: () => console.log('Wicket sound not found - using silent mode')
      }),
      runs: new Howl({
        src: ['/sounds/bat-hit.mp3'],
        volume: 0.4,
        preload: false,
        onloaderror: () => console.log('Runs sound not found - using silent mode')
      }),
      toss: new Howl({
        src: ['/sounds/coin-flip.mp3'],
        volume: 0.5,
        preload: false,
        onloaderror: () => console.log('Toss sound not found - using silent mode')
      }),
      win: new Howl({
        src: ['/sounds/victory.mp3'],
        volume: 0.8,
        preload: false,
        onloaderror: () => console.log('Win sound not found - using silent mode')
      }),
      notification: new Howl({
        src: ['/sounds/notification.mp3'],
        volume: 0.3,
        preload: false,
        onloaderror: () => console.log('Notification sound not found - using silent mode')
      })
    };
  }

  play(soundName: string) {
    if (!this.isEnabled) return;
    
    const sound = this.sounds[soundName];
    if (sound) {
      sound.play();
    }
  }

  setVolume(soundName: string, volume: number) {
    const sound = this.sounds[soundName];
    if (sound) {
      sound.volume(volume);
    }
  }

  setMasterVolume(volume: number) {
    Howler.volume(volume);
  }

  mute() {
    this.isEnabled = false;
    Howler.mute(true);
  }

  unmute() {
    this.isEnabled = true;
    Howler.mute(false);
  }

  toggle() {
    if (this.isEnabled) {
      this.mute();
    } else {
      this.unmute();
    }
  }

  isPlaying(soundName: string): boolean {
    const sound = this.sounds[soundName];
    return sound ? sound.playing() : false;
  }
}

export const soundManager = new SoundManager();
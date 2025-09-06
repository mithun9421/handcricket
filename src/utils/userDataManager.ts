interface UserStats {
  gamesPlayed: number;
  gamesWon: number;
  totalRuns: number;
  totalWickets: number;
  bestScore: number;
  winStreak: number;
  currentStreak: number;
  lastPlayed: string;
}

interface UserData {
  name: string;
  rememberMe: boolean;
  stats: UserStats;
  preferences: {
    soundEnabled: boolean;
    volume: number;
  };
}

class UserDataManager {
  private readonly STORAGE_KEY = 'handcricket_user_data';

  private defaultUserData: UserData = {
    name: '',
    rememberMe: false,
    stats: {
      gamesPlayed: 0,
      gamesWon: 0,
      totalRuns: 0,
      totalWickets: 0,
      bestScore: 0,
      winStreak: 0,
      currentStreak: 0,
      lastPlayed: ''
    },
    preferences: {
      soundEnabled: true,
      volume: 0.7
    }
  };

  getUserData(): UserData {
    if (typeof window === 'undefined') return this.defaultUserData;
    
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        return { ...this.defaultUserData, ...parsed };
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
    
    return this.defaultUserData;
  }

  saveUserData(userData: Partial<UserData>) {
    if (typeof window === 'undefined') return;
    
    try {
      const current = this.getUserData();
      const updated = { ...current, ...userData };
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(updated));
    } catch (error) {
      console.error('Error saving user data:', error);
    }
  }

  updateStats(gameResult: {
    won: boolean;
    runs: number;
    wickets: number;
  }) {
    const userData = this.getUserData();
    const stats = userData.stats;

    stats.gamesPlayed += 1;
    if (gameResult.won) {
      stats.gamesWon += 1;
      stats.currentStreak += 1;
      stats.winStreak = Math.max(stats.winStreak, stats.currentStreak);
    } else {
      stats.currentStreak = 0;
    }

    stats.totalRuns += gameResult.runs;
    stats.totalWickets += gameResult.wickets;
    stats.bestScore = Math.max(stats.bestScore, gameResult.runs);
    stats.lastPlayed = new Date().toISOString();

    this.saveUserData({ stats });
  }

  getWinRate(): number {
    const stats = this.getUserData().stats;
    return stats.gamesPlayed > 0 ? (stats.gamesWon / stats.gamesPlayed) * 100 : 0;
  }

  getAverageScore(): number {
    const stats = this.getUserData().stats;
    return stats.gamesPlayed > 0 ? stats.totalRuns / stats.gamesPlayed : 0;
  }

  clearData() {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(this.STORAGE_KEY);
    }
  }

  exportData(): string {
    return JSON.stringify(this.getUserData(), null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      this.saveUserData(data);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export const userDataManager = new UserDataManager();
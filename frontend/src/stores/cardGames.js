import { defineStore } from 'pinia';

const DEFAULT_GAMES = [
  {
    id: 'vanguard',
    name: 'แวนการ์ด',
    isVanguard: true,
    formats: ['แวนการ์ด D ไทย', 'แวนการ์ด D JP', 'แวนการ์ด Premium'],
    rarities: ['RRR', 'RR', 'R', 'C', 'OR', 'SP', 'SEC', 'DSR', 'FFR', 'FR', 'SR', 'PR']
  }
];

export const useCardGamesStore = defineStore('cardGames', {
  state: () => {
    const saved = localStorage.getItem('card_shop_games');
    let games = DEFAULT_GAMES;
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const hasVanguard = parsed.some(g => g.isVanguard || g.name === 'แวนการ์ด');
          games = hasVanguard ? parsed : [...DEFAULT_GAMES, ...parsed];
        }
      } catch (e) {
        games = DEFAULT_GAMES;
      }
    }
    return {
      games: games
    };
  },
  getters: {
    vanguardGame: (state) => state.games.find(g => g.isVanguard || g.name === 'แวนการ์ด') || DEFAULT_GAMES[0],
    otherGames: (state) => state.games.filter(g => !g.isVanguard && g.name !== 'แวนการ์ด'),
    allCategories: (state) => {
      const list = [];
      state.games.forEach(g => {
        if (g.formats && g.formats.length > 0) {
          list.push(...g.formats);
        } else {
          list.push(g.name);
        }
      });
      return list;
    }
  },
  actions: {
    saveToStorage() {
      localStorage.setItem('card_shop_games', JSON.stringify(this.games));
    },
    addGame({ name, formats, rarities }) {
      const id = 'game_' + Date.now();
      const parsedFormats = Array.isArray(formats)
        ? formats
        : (formats ? formats.split(',').map(s => s.trim()).filter(Boolean) : []);
      const parsedRarities = Array.isArray(rarities)
        ? rarities
        : (rarities ? rarities.split(',').map(s => s.trim()).filter(Boolean) : []);

      const newGame = {
        id,
        name: name.trim(),
        isVanguard: false,
        formats: parsedFormats.length > 0 ? parsedFormats : [name.trim()],
        rarities: parsedRarities
      };

      this.games.push(newGame);
      this.saveToStorage();
      return newGame;
    },
    updateGame(id, { name, formats, rarities }) {
      const index = this.games.findIndex(g => g.id === id);
      if (index !== -1) {
        const current = this.games[index];
        const parsedFormats = Array.isArray(formats)
          ? formats
          : (formats ? formats.split(',').map(s => s.trim()).filter(Boolean) : current.formats);
        const parsedRarities = Array.isArray(rarities)
          ? rarities
          : (rarities ? rarities.split(',').map(s => s.trim()).filter(Boolean) : current.rarities);

        this.games[index] = {
          ...current,
          name: name ? name.trim() : current.name,
          formats: parsedFormats.length > 0 ? parsedFormats : [current.name],
          rarities: parsedRarities
        };
        this.saveToStorage();
      }
    },
    deleteGame(id) {
      const target = this.games.find(g => g.id === id);
      if (target?.isVanguard) {
        alert('ไม่สามารถลบการ์ดเกมแวนการ์ดที่เป็นค่าเริ่มต้นของระบบได้');
        return false;
      }
      this.games = this.games.filter(g => g.id !== id);
      this.saveToStorage();
      return true;
    },
    getRaritiesForCategory(categoryName) {
      if (!categoryName) return this.vanguardGame.rarities;
      const matched = this.games.find(g => 
        (g.formats && g.formats.includes(categoryName)) || 
        g.name === categoryName
      );
      if (matched && matched.rarities && matched.rarities.length > 0) {
        return matched.rarities;
      }
      return this.vanguardGame.rarities;
    },
    getRaritiesForGame(gameIdOrName) {
      const matched = this.games.find(g => g.id === gameIdOrName || g.name === gameIdOrName);
      if (matched && matched.rarities && matched.rarities.length > 0) {
        return matched.rarities;
      }
      return this.vanguardGame.rarities;
    }
  }
});


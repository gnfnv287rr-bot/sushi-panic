/** Pure, deterministic game rules. Time is seconds; fullness is 0–120. */
export const VERSION = '0.2.0';
export const STEP = 1 / 60;
export const RULES = Object.freeze({ startFullness: 55, hunger: 15, overfull: 100, grace: 2, hungerDamage: 8, overfullDamage: 10, allergyDamage: 24, biteCooldown: 0.24 });
export const FOODS = Object.freeze({
  salmon: { name: '三文鱼', fullness: 19, points: 100, allergen: 'fish', color: '#f78069' },
  tuna: { name: '金枪鱼', fullness: 15, points: 120, allergen: 'fish', color: '#d95166' },
  shrimp: { name: '鲜虾', fullness: 16, points: 110, allergen: 'shellfish', color: '#f5a285' },
  tamago: { name: '玉子烧', fullness: 22, points: 90, allergen: 'egg', color: '#f8c94d' },
  cucumber: { name: '黄瓜卷', fullness: 12, points: 80, allergen: null, color: '#84ad72' },
  ikura: { name: '鱼子军舰', fullness: 14, points: 140, allergen: 'roe', color: '#f58c3a' },
  onigiri: { name: '大饭团', fullness: 30, points: 110, allergen: null, color: '#e9e1cf' },
  tea: { name: '乌龙茶', fullness: -18, points: 20, allergen: null, color: '#81a38a' },
});
export const ALLERGEN_NAMES = Object.freeze({ fish: '鱼类', shellfish: '虾类', egg: '鸡蛋', roe: '鱼子' });
export const CHARACTERS = Object.freeze([
  { id: 'momo', name: '桃桃', title: '杂食小行家', drain: 3.6, portion: 1, hp: 100, allergy: 'shellfish', color: '#e77c72', ability: '换着吃：不同安全寿司回复 1 生命', short: '换着吃 · 回血', mark: '桃' },
  { id: 'taro', name: '阿太', title: '快饿大胃王', drain: 4.3, portion: 0.85, hp: 110, allergy: 'roe', color: '#d6a448', ability: '好胃口：饱腹增量 ×0.85，食物分 ×1.15', short: '快消化 · 高食物分', mark: '太' },
  { id: 'yuzu', name: '柚子', title: '慢食观察家', drain: 3, portion: 1.15, hp: 90, allergy: 'egg', color: '#7e9a76', ability: '护身符：首次过敏免伤；饱腹增量 ×1.15', short: '慢消化 · 一次免伤', mark: '柚' },
  { id: 'nori', name: '小海', title: '黄瓜卷信徒', drain: 3.8, portion: 1, hp: 100, allergy: 'fish', color: '#6d9ba4', ability: '清爽派：每份黄瓜卷回复 3 生命', short: '黄瓜卷 · 回血', mark: '海' },
]);
export const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
export function seededRandom(seed) {
  let a = Number(seed) >>> 0;
  return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ t >>> 15, t | 1); t ^= t + Math.imul(t ^ t >>> 7, t | 61); return ((t ^ t >>> 14) >>> 0) / 4294967296; };
}
export class FoodDeck {
  constructor(rng) { this.rng = rng; this.bag = []; this.unsafeStreak = 0; this.draws = 0; this.guarantees = 0; }
  next() {
    // At most two non-universal dishes in a row. An injection does not consume the bag.
    if (this.unsafeStreak >= 2) { this.unsafeStreak = 0; this.draws++; this.guarantees++; return 'cucumber'; }
    if (!this.bag.length) {
      this.bag = Object.keys(FOODS);
      for (let i = this.bag.length - 1; i > 0; i--) { const j = Math.floor(this.rng() * (i + 1)); [this.bag[i], this.bag[j]] = [this.bag[j], this.bag[i]]; }
    }
    const key = this.bag.pop();
    this.unsafeStreak = FOODS[key].fullness > 0 && !FOODS[key].allergen ? 0 : this.unsafeStreak + 1;
    this.draws++;
    return key;
  }
}
export function difficultyAt(time) {
  const t = Math.max(0, time);
  return { level: Math.min(6, 1 + Math.floor(t / 25)), drainMultiplier: 1 + Math.min(t / 180, 1) * 0.65, speed: 0.044 + Math.min(t / 180, 1) * 0.026, spawnInterval: 1.85 - Math.min(t / 180, 1) * 0.7 };
}
export function fullnessZone(fullness) { return fullness < RULES.hunger ? 'hungry' : fullness > RULES.overfull ? 'overfull' : 'safe'; }
export function isAllergic(character, foodKey) { return FOODS[foodKey]?.allergen === character.allergy; }
export class Game {
  constructor({ seed = Date.now(), characterId } = {}) {
    this.seed = Number(seed) >>> 0;
    // Character choice and food RNG have independent streams, enabling fair same-seed comparisons.
    const characterRng = seededRandom(this.seed ^ 0x9e3779b9);
    this.character = CHARACTERS.find(c => c.id === characterId) || CHARACTERS[Math.floor(characterRng() * CHARACTERS.length)];
    this.deck = new FoodDeck(seededRandom(this.seed));
    this.phase = 'card'; this.time = 0; this.fullness = RULES.startFullness; this.hp = this.character.hp;
    this.score = 0; this.combo = 0; this.bestCombo = 0; this.eaten = 0; this.sushiEaten = 0; this.allergies = 0; this.perfects = 0;
    this.hazardTime = 0; this.hazardZone = 'safe'; this.deathReason = ''; this.shield = this.character.id === 'yuzu' ? 1 : 0;
    this.lastBite = -10; this.lastFood = null; this.nextSpawn = 0; this.nextId = 1; this.foods = []; this.events = []; this.beltTravel = 0;
    this.survivalScore = 0; this.foodScore = 0; this.bonusScore = 0; this.seenFoods = new Set();
    this.scoreFactor = this.character.portion * 3.6 / this.character.drain;
  }
  start() {
    if (this.phase !== 'card') return false;
    this.phase = 'playing';
    // Immediate food, including a universally safe dish, with spaced targets.
    for (const [key, p] of [['cucumber', 0.12], [this.deck.next(), 0.34], [this.deck.next(), 0.56], ['onigiri', 0.78]]) this.addFood(key, p);
    this.nextSpawn = difficultyAt(0).spawnInterval;
    return true;
  }
  pause() { if (this.phase !== 'playing') return false; this.phase = 'paused'; return true; }
  resume() { if (this.phase !== 'paused') return false; this.phase = 'playing'; return true; }
  addFood(key, p = 0) { const f = { id: this.nextId++, key, p, distance: 0 }; this.foods.push(f); return f; }
  refreshScore() { this.score = Math.floor(this.survivalScore + this.foodScore + this.bonusScore + 1e-8); }
  step(dt = STEP) {
    if (this.phase !== 'playing' || !Number.isFinite(dt) || dt <= 0) return;
    // Small substeps preserve grace timing and movement even for a coarse simulator caller.
    let remaining = Math.min(dt, 1);
    while (remaining > 1e-8 && this.phase === 'playing') { const h = Math.min(remaining, STEP); this.tick(h); remaining -= h; }
  }
  tick(dt) {
    const d = difficultyAt(this.time);
    this.time += dt;
    this.fullness = clamp(this.fullness - this.character.drain * d.drainMultiplier * dt, 0, 120);
    const zone = fullnessZone(this.fullness);
    if (zone === 'safe') { this.hazardTime = 0; this.hazardZone = zone; }
    else {
      if (zone !== this.hazardZone) this.hazardTime = 0;
      const old = this.hazardTime; this.hazardTime += dt; this.hazardZone = zone;
      const damageTime = Math.max(0, this.hazardTime - RULES.grace) - Math.max(0, old - RULES.grace);
      this.hp = clamp(this.hp - damageTime * (zone === 'hungry' ? RULES.hungerDamage : RULES.overfullDamage), 0, this.character.hp);
      if (this.hp <= 0) this.end(zone === 'hungry' ? '饿得眼冒金星' : '这次真的吃撑了');
    }
    this.survivalScore += dt * (this.fullness >= 25 && this.fullness <= 85 ? 12 : 8);
    this.beltTravel += d.speed * dt;
    for (const f of this.foods) { const move = d.speed * dt; f.p = (f.p + move) % 1; f.distance += move; }
    this.foods = this.foods.filter(f => f.distance < 1 && f.p < 0.98); // One trip; no invisible offscreen reservoir.
    this.nextSpawn -= dt;
    if (this.nextSpawn <= 0) {
      // Keep a readable gap across the entry/exit seam; blocked spawns never accrue debt.
      const entryClear = this.foods.every(f => Math.min(f.p, 1 - f.p) >= 0.08);
      if (this.foods.length < 14 && entryClear) { this.addFood(this.deck.next()); this.nextSpawn += d.spawnInterval; }
      else this.nextSpawn = 0;
    }
    this.refreshScore();
  }
  eat(id) {
    if (this.phase !== 'playing' || this.time - this.lastBite < RULES.biteCooldown) return null;
    const index = this.foods.findIndex(f => f.id === id);
    if (index < 0) return null;
    const item = this.foods.splice(index, 1)[0], food = FOODS[item.key];
    this.lastBite = this.time; this.eaten++; if(food.fullness>0)this.sushiEaten++;
    const change = food.fullness > 0 ? food.fullness * this.character.portion : food.fullness;
    this.fullness = clamp(this.fullness + change, 0, 120);
    let event;
    if (isAllergic(this.character, item.key)) {
      this.allergies++; this.combo = 0;
      const shielded = this.shield > 0; if (shielded) this.shield--;
      const damage = shielded ? 0 : RULES.allergyDamage;
      this.hp = clamp(this.hp - damage, 0, this.character.hp);
      event = { type: 'allergy', text: shielded ? '护身符！免伤一次' : '过敏！生命 −24', item, change, damage };
      if (this.hp <= 0) this.end('误食过敏寿司');
    } else {
      const comfortable = this.fullness >= 25 && this.fullness <= 85;
      if (food.fullness > 0) {
        this.combo = comfortable ? this.combo + 1 : 0;
        this.bestCombo = Math.max(this.bestCombo, this.combo);
        this.foodScore += food.points * this.scoreFactor * (this.character.id === 'taro' ? 1.15 : 1);
        if (comfortable) { this.perfects++; this.bonusScore += (30 + Math.min(this.combo, 10) * 8) * this.scoreFactor; }
        if (!this.seenFoods.has(item.key)) { this.seenFoods.add(item.key); this.bonusScore += 25 * this.scoreFactor; }
        if (this.character.id === 'momo' && this.lastFood && this.lastFood !== item.key) this.hp = Math.min(this.character.hp, this.hp + 1);
        if (this.character.id === 'nori' && item.key === 'cucumber') this.hp = Math.min(this.character.hp, this.hp + 3);
        this.lastFood = item.key;
      } else { this.foodScore += food.points * this.scoreFactor; }
      event = { type: food.fullness < 0 ? 'tea' : comfortable ? 'perfect' : 'eat', text: food.fullness < 0 ? '清清爽爽 · 饱腹 −18' : comfortable ? `恰到好处！${this.combo > 1 ? this.combo + ' 连击' : ''}` : '慢点吃，小心撑！', item, change };
    }
    if (fullnessZone(this.fullness) === 'safe') { this.hazardTime = 0; this.hazardZone = 'safe'; }
    this.refreshScore(); this.events.push(event); if (this.events.length > 32) this.events.shift(); return event;
  }
  end(reason) { if (this.phase !== 'playing') return; this.phase = 'gameover'; this.deathReason = reason; this.hp = 0; }
  snapshot() { return { version: VERSION, seed: this.seed, phase: this.phase, character: this.character.id, time: this.time, hp: this.hp, fullness: this.fullness, score: this.score, eaten: this.eaten,sushiEaten:this.sushiEaten, allergies: this.allergies, perfects: this.perfects, bestCombo: this.bestCombo, deathReason: this.deathReason }; }
}

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
export const players=sqliteTable('players',{
  ownerKey:text('owner_key').primaryKey(),
  playerId:text('player_id').notNull(),
  normalizedId:text('normalized_id').notNull().unique(),
  createdAt:integer('created_at').notNull(),
  bestScore:integer('best_score').notNull().default(0),
  bestSushi:integer('best_sushi').notNull().default(0),
  bestTicks:integer('best_ticks').notNull().default(0),
  bestAt:integer('best_at').notNull().default(0),
});
export const runs=sqliteTable('runs',{
  id:text('id').primaryKey(),
  ownerKey:text('owner_key').notNull().references(()=>players.ownerKey),
  seed:integer('seed').notNull(),
  createdAt:integer('created_at').notNull(),
  finishedAt:integer('finished_at'),
  score:integer('score'),
  sushi:integer('sushi'),
  ticks:integer('ticks'),
},t=>[index('runs_owner_created').on(t.ownerKey,t.createdAt)]);

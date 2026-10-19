import { Game, FOODS, CHARACTERS, seededRandom, difficultyAt, VERSION } from '../src/core.js';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const output=new URL('../artifacts/simulation.json',import.meta.url);
const policies=['careful','random','idle'],rows=[];
let total=0,anomalies=0;
for(const c of CHARACTERS){
  for(const policy of policies){
    const runs=policy==='careful'?250:100,survivals=[],scores=[],deaths={};let minHp=c.hp,minFullness=120,maxFullness=0,longestSafeDrought=0;
    for(let seed=1;seed<=runs;seed++){
      const g=new Game({seed,characterId:c.id});g.start();const rng=seededRandom(seed^0xfeed);let nextThink=0,safeDrought=0;
      while(g.phase==='playing'&&g.time<300-1e-6){
        // Engine uses the identical fixed substeps as the actual browser.
        g.step(.1);
        const safe=g.foods.filter(f=>!FOODS[f.key].allergen&&FOODS[f.key].fullness>0);
        safeDrought=safe.length?0:safeDrought+.1;longestSafeDrought=Math.max(longestSafeDrought,safeDrought);
        if(g.time>=nextThink){
          nextThink=g.time+.45;
          if(policy==='careful'&&rng()>.08){
            const candidates=g.foods.filter(f=>FOODS[f.key].allergen!==c.allergy&&FOODS[f.key].fullness>0&&g.fullness+FOODS[f.key].fullness*c.portion<=85).sort((a,b)=>FOODS[b.key].fullness-FOODS[a.key].fullness);
            if(g.fullness<48&&candidates.length)g.eat(candidates[0].id);
            else if(g.fullness>95){const tea=g.foods.find(f=>f.key==='tea');if(tea)g.eat(tea.id);}
          } else if(policy==='random'&&g.foods.length&&rng()>.25)g.eat(g.foods[Math.floor(rng()*g.foods.length)].id);
        }
        minHp=Math.min(minHp,g.hp);minFullness=Math.min(minFullness,g.fullness);maxFullness=Math.max(maxFullness,g.fullness);
        if(![g.hp,g.fullness,g.score,g.time].every(Number.isFinite)||g.hp<0||g.hp>c.hp||g.fullness<0||g.fullness>120||g.foods.length>14)anomalies++;
      }
      total++;survivals.push(g.time);scores.push(g.score);deaths[g.deathReason||'survived300']=(deaths[g.deathReason||'survived300']||0)+1;
    }
    survivals.sort((a,b)=>a-b);rows.push({character:c.id,name:c.name,policy,runs,survived300:deaths.survived300||0,minSeconds:+survivals[0].toFixed(2),medianSeconds:+survivals[Math.floor(runs/2)].toFixed(2),maxSeconds:+survivals.at(-1).toFixed(2),meanScore:Math.round(scores.reduce((a,b)=>a+b,0)/runs),minHp:+minHp.toFixed(2),fullnessRange:[+minFullness.toFixed(2),+maxFullness.toFixed(2)],longestUniversalSafeDrought:+longestSafeDrought.toFixed(2),deaths});
  }
}
const result={version:VERSION,testedAt:new Date().toISOString(),type:'automated simulation, NOT human playtest',totalRuns:total,horizonSeconds:300,anomalies,carefulPolicy:'0.45s reaction interval, 8% missed decisions; no future knowledge; all visible plates accessible; eat safe positive food below 48, target <=85; tea above 95',limits:'No touchscreen motor model, rendering latency, real-user enjoyment or exhaustive mathematical no-deadlock proof.',difficultyCap:difficultyAt(180),results:rows};
await mkdir(new URL('../artifacts/',import.meta.url),{recursive:true});await writeFile(output,JSON.stringify(result,null,2)+'\n');
console.table(rows.map(({name,policy,runs,survived300,minSeconds,medianSeconds,meanScore})=>({name,policy,runs,survived300,minSeconds,medianSeconds,meanScore})));
console.log(`${total} runs, ${anomalies} state anomalies. Full output: artifacts/simulation.json`);
assert.equal(anomalies,0);for(const r of rows.filter(r=>r.policy==='careful'))assert.equal(r.survived300,r.runs,`Careful policy failure: ${r.character}`);
const carefulScores=rows.filter(r=>r.policy==='careful').map(r=>r.meanScore);
assert.ok(Math.max(...carefulScores)/Math.min(...carefulScores)<1.2,'Same-policy character mean score spread must remain below 20%');

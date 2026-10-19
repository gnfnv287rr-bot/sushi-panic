import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
let entryCounter=0;
async function start(page){await page.goto('/?test=1');await page.locator('#player-id-input').fill(`测试${process.pid}_${++entryCounter}`);await page.getByRole('button',{name:'入座，开吃！'}).click();await expect(page.getByText('你的本局角色卡')).toBeVisible();await page.getByRole('button',{name:'记住了，开始！'}).click();await expect(page.locator('#overlay')).toHaveClass(/hidden/);await expect.poll(()=>page.evaluate(()=>window.__sushi.renderer.targets.length)).toBeGreaterThan(0);}
test('real mouse bite, scoring, stale clicks and pause/resume',async({page})=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
  const before=await page.evaluate(()=>window.__sushi.snapshot());
  const target=await page.evaluate(()=>window.__sushi.renderer.targets.find(t=>t.key==='cucumber'));
  const b=await page.locator('#game').boundingBox();await page.mouse.click(b.x+target.x,b.y+target.y);
  await expect.poll(()=>page.evaluate(()=>window.__sushi.game.eaten)).toBe(1);await expect.poll(()=>page.evaluate(()=>window.__sushi.game.score)).toBeGreaterThan(80);
  await page.getByRole('button',{name:'暂停游戏'}).click();const paused=await page.evaluate(()=>window.__sushi.snapshot());await page.waitForTimeout(350);expect(await page.evaluate(()=>window.__sushi.snapshot())).toEqual(paused);
  await page.getByRole('button',{name:'继续开吃'}).click();await page.waitForTimeout(200);expect((await page.evaluate(()=>window.__sushi.snapshot())).time).toBeGreaterThan(paused.time);expect(before.phase).toBe('playing');expect(errors).toEqual([]);
});
test('allergen warning matches character, allergy damages, end/restart and best score persist',async({page})=>{
  await page.goto('/?test=1');await page.evaluate(()=>{window.__sushi.newGame({seed:2,characterId:'momo'});window.__sushi.start();});
  await expect(page.locator('#allergy-name')).toHaveText('虾类');await expect(page.locator('[data-food="shrimp"]')).toHaveClass(/allergic/);
  await page.evaluate(()=>{const g=window.__sushi.game;g.foods=[];g.addFood('shrimp',.15);window.__sushi.renderer.draw(g,0);});await expect.poll(()=>page.evaluate(()=>window.__sushi.renderer.targets[0]?.key)).toBe('shrimp');await page.keyboard.press('1');await expect(page.locator('#hp')).toHaveText('76');
  await page.evaluate(()=>{window.__sushi.game.fullness=0;window.__sushi.advance(20);});await expect(page.getByRole('button',{name:'再来一局！'})).toBeVisible();const score=await page.evaluate(()=>window.__sushi.game.score);expect(score).toBeGreaterThan(0);
  await page.getByRole('button',{name:'再来一局！'}).click();await expect(page.getByText('你的本局角色卡')).toBeVisible();expect((await page.evaluate(()=>window.__sushi.snapshot())).time).toBe(0);await page.reload();await expect(page.locator('#best-score')).toHaveText(String(score).padStart(5,'0'));
});
test('help pauses the run, modal keyboard does not eat; blur auto-pauses',async({page})=>{
  await start(page);await page.getByRole('button',{name:'怎么玩'}).click();await expect(page.getByRole('dialog')).toBeVisible();await page.keyboard.press('1');expect((await page.evaluate(()=>window.__sushi.snapshot())).eaten).toBe(0);await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).not.toBeVisible();expect((await page.evaluate(()=>window.__sushi.snapshot())).phase).toBe('paused');await page.getByRole('button',{name:'继续开吃'}).click();await page.evaluate(()=>window.dispatchEvent(new Event('blur')));await expect(page.getByRole('button',{name:'继续开吃'})).toBeVisible();
});
test('background visibility event freezes values and requires explicit resume',async({page})=>{
  await start(page);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});const paused=await page.evaluate(()=>window.__sushi.snapshot());expect(paused.phase).toBe('paused');await page.waitForTimeout(250);expect(await page.evaluate(()=>window.__sushi.snapshot())).toEqual(paused);
});
test('all four character cards show correct HP and allergy UI',async({page})=>{
  await page.goto('/?test=1');for(const [id,hp,allergy] of [['momo',100,'虾类'],['taro',110,'鱼子'],['yuzu',90,'鸡蛋'],['nori',100,'鱼类']]){await page.evaluate(id=>window.__sushi.newGame({seed:8,characterId:id}),id);await expect(page.getByText('你的本局角色卡')).toBeVisible();await page.getByRole('button',{name:'记住了，开始！'}).click();await expect(page.locator('#hp')).toHaveText(String(hp));await expect(page.locator('#allergy-name')).toHaveText(allergy);}
});
for(const [width,height] of [[320,640],[375,667],[390,844],[768,1024],[1024,768],[1440,900],[844,390]]){
  test(`viewport ${width}×${height}: layout, pointer alignment, 44px targets and resize`,async({browser})=>{
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<800,isMobile:width<500,deviceScaleFactor:width<500?2:1});const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await start(page);
    const pauseBox=await page.locator('#pause').boundingBox(),panelBox=await page.locator('.game-panel').boundingBox();expect(pauseBox.x+pauseBox.width).toBeLessThanOrEqual(panelBox.x+panelBox.width);
    if(width<=760&&height>=540){const stage=await page.locator('#game').boundingBox(),hp=await page.locator('#hp').boundingBox();expect(hp.y).toBeGreaterThan(0);expect(stage.y+stage.height).toBeLessThanOrEqual(height);}
    await page.locator('#game').scrollIntoViewIfNeeded();
    const metrics=await page.evaluate(()=>({scroll:document.documentElement.scrollWidth,width:innerWidth,targets:window.__sushi.renderer.targets.map(t=>({radius:t.radius,x:t.x,y:t.y})),w:window.__sushi.renderer.w,h:window.__sushi.renderer.h}));expect(metrics.scroll).toBeLessThanOrEqual(width+1);expect(metrics.targets.length).toBeGreaterThan(0);for(const t of metrics.targets){expect(t.radius*2).toBeGreaterThanOrEqual(44);expect(t.x-t.radius).toBeGreaterThanOrEqual(0);expect(t.x+t.radius).toBeLessThanOrEqual(metrics.w+1);}
    const target=await page.evaluate(()=>window.__sushi.renderer.targets.find(t=>t.key==='cucumber')),box=await page.locator('#game').boundingBox();if(width<800)await page.touchscreen.tap(box.x+target.x,box.y+target.y);else await page.mouse.click(box.x+target.x,box.y+target.y);
    await expect.poll(()=>page.evaluate(()=>window.__sushi.game.eaten)).toBe(1);
    await page.keyboard.press('p');await expect(page.getByRole('button',{name:'继续开吃'})).toBeVisible();await page.setViewportSize({width:height,height:width});await page.waitForTimeout(50);expect((await page.evaluate(()=>window.__sushi.snapshot())).phase).toBe('paused');
    expect(errors).toEqual([]);await context.close();
  });
}
test('screenshots of desktop home, desktop gameplay and mobile gameplay',async({browser})=>{
  await mkdir('artifacts',{recursive:true});const context=await browser.newContext({viewport:{width:1440,height:1100},deviceScaleFactor:1});const page=await context.newPage();await page.goto('/?test=1');await page.screenshot({path:'artifacts/desktop-home.png',fullPage:true});await page.evaluate(()=>{window.__sushi.newGame({seed:24,characterId:'momo'});window.__sushi.start();window.__sushi.advance(9);});await page.waitForTimeout(50);await page.screenshot({path:'artifacts/desktop-game.png',fullPage:true});await page.setViewportSize({width:390,height:844});await page.waitForTimeout(50);await page.screenshot({path:'artifacts/mobile-game.png',fullPage:true});await context.close();
});
test('standalone file runs without a server or network and has working mouse input',async({browser})=>{
  const context=await browser.newContext({viewport:{width:1280,height:1000}});const page=await context.newPage();const errors=[],network=[];page.on('pageerror',e=>errors.push(e.message));await context.route('http://**/*',r=>{network.push(r.request().url());return r.abort();});await context.route('https://**/*',r=>{network.push(r.request().url());return r.abort();});
  await page.goto(pathToFileURL(fileURLToPath(new URL('../../play.html',import.meta.url))).href);
  expect(await page.evaluate(()=>typeof window.__sushi)).toBe('undefined');await page.locator('#player-id-input').fill('离线玩家');await page.getByRole('button',{name:'入座，开吃！'}).click();await page.getByRole('button',{name:'记住了，开始！'}).click();
  // Initial plate 1 is always a universally safe cucumber roll.
  await page.keyboard.press('1');await expect.poll(async()=>Number(await page.locator('#score').textContent())).toBeGreaterThan(80);await page.keyboard.press('p');await expect(page.getByRole('button',{name:'继续开吃'})).toBeVisible();await page.getByRole('button',{name:'返回门口'}).click();await expect(page.getByRole('button',{name:'入座，开吃！'})).toBeVisible();expect(errors).toEqual([]);expect(network).toEqual([]);await context.close();
});
test('storage denial does not stop gameplay, sound toggle degrades safely',async({browser})=>{
  const context=await browser.newContext();await context.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}});});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await start(page);await page.getByRole('button',{name:'声音：关'}).click();await expect(page.getByRole('button',{name:'声音：开'})).toHaveAttribute('aria-pressed','true');await page.keyboard.press('1');await expect.poll(()=>page.evaluate(()=>window.__sushi.game.eaten)).toBe(1);expect(errors).toEqual([]);await context.close();
});
test('survival cue warns about hunger, overfull and low HP, then clears on recovery',async({page})=>{
  await page.goto('/?test=1');await page.evaluate(()=>{window.__sushi.newGame({seed:2,characterId:'momo'});window.__sushi.start();});
  await expect(page.locator('#scene-warning')).toBeHidden();
  await page.evaluate(()=>{window.__sushi.game.fullness=5;window.__sushi.advance(.1);});await expect(page.locator('#scene-warning')).toBeVisible();await expect(page.locator('#scene-warning-title')).toHaveText('快饿坏了，吃一口！');await expect(page.locator('#scene-warning-detail')).toContainText('秒后开始掉血');
  await page.evaluate(()=>{window.__sushi.game.fullness=120;window.__sushi.advance(.1);});await expect(page.locator('#scene-warning-title')).toHaveText('吃撑啦，先停嘴！');
  await page.evaluate(()=>{window.__sushi.game.fullness=55;window.__sushi.game.hp=30;window.__sushi.advance(.1);});await expect(page.locator('#scene-warning-title')).toHaveText('生命不多了，小心忌口！');await expect(page.locator('#hp-max')).toHaveText('/ 100');
  await page.evaluate(()=>{window.__sushi.game.hp=100;window.__sushi.advance(.1);});await expect(page.locator('#scene-warning')).toBeHidden();
});
test('early belly cues appear before danger, upgrade in danger and clear in comfort',async({page})=>{
  await page.goto('/?test=1');await page.evaluate(()=>{window.__sushi.newGame({seed:2,characterId:'momo'});window.__sushi.start();});
  const setFullness=fullness=>page.evaluate(fullness=>{window.__sushi.game.fullness=fullness;window.__sushi.advance(.1);},fullness);
  await setFullness(24);await expect(page.locator('#scene-warning-title')).toHaveText('该吃一口了！');await expect(page.locator('#scene-warning')).toHaveAttribute('data-severity','caution');expect(await page.evaluate(()=>window.__sushi.game.hp)).toBe(100);
  await page.keyboard.press('1');await expect(page.locator('#scene-warning')).toBeHidden();
  await setFullness(92);await expect(page.locator('#scene-warning-title')).toHaveText('快吃撑啦，慢一点！');await expect(page.locator('#scene-warning')).toHaveAttribute('data-severity','caution');expect(await page.evaluate(()=>window.__sushi.game.hp)).toBe(100);
  await setFullness(106);await expect(page.locator('#scene-warning-title')).toHaveText('吃撑啦，先停嘴！');await expect(page.locator('#scene-warning')).toHaveAttribute('data-severity','danger');
  await setFullness(92);await expect(page.locator('#scene-warning')).toHaveAttribute('data-severity','caution');
  await setFullness(55);await expect(page.locator('#scene-warning')).toBeHidden();
  await setFullness(12);await expect(page.locator('#scene-warning-title')).toHaveText('快饿坏了，吃一口！');await expect(page.locator('#scene-warning')).toHaveAttribute('data-severity','danger');
});
test('player enters their own ID, it replaces random names, invalid ID is explained',async({page})=>{
  await page.goto('/?test=1');await page.locator('#player-id-input').fill('a');await page.getByRole('button',{name:'入座，开吃！'}).click();await expect(page.locator('#entry-error')).toContainText('2–16');
  const id="W".repeat(16);await page.locator('#player-id-input').fill(id);await page.getByRole('button',{name:'入座，开吃！'}).click();await expect(page.locator('.card-name')).toHaveText(id);await expect(page.locator('#character-name')).toHaveText(id);await expect(page.getByText('本局体质：',{exact:false})).toBeVisible();await page.reload();await expect(page.locator('#player-id-input')).toHaveValue(id);
});
test('real run is verified and visible to a separate browser; opening board pauses gameplay',async({browser})=>{
  test.setTimeout(65000);
  const context=await browser.newContext(),page=await context.newPage();await start(page);const id=await page.locator('#character-name').textContent();const deadline=Date.now()+45000;
  while(Date.now()<deadline){
    const state=await page.evaluate(()=>({phase:window.__sushi.game.phase,target:window.__sushi.renderer.targets.filter(t=>t.number&&t.key!=='tea').sort((a,b)=>Number(b.allergic)-Number(a.allergic))[0]?.number}));
    if(state.phase==='gameover')break;
    if(state.phase==='paused')await page.getByRole('button',{name:'继续开吃',exact:true}).click();
    else if(state.target)await page.keyboard.press(String(state.target));
    await page.waitForTimeout(270);
  }
  await expect(page.locator('#rank-result')).toContainText(/已上榜|登顶/,{timeout:10000});
  const otherContext=await browser.newContext(),other=await otherContext.newPage();await other.goto('/');await other.getByRole('button',{name:'大胃王榜',exact:true}).click();await expect(other.locator('#board-list')).toContainText(id);await expect(other.locator('.champion-row')).toHaveCount(1);await expect(other.locator('.champion-row')).toContainText('大胃王');await otherContext.close();
  await page.getByRole('button',{name:'再来一局！'}).click();await page.getByRole('button',{name:'记住了，开始！'}).click();await page.getByRole('button',{name:'大胃王榜',exact:true}).click();expect((await page.evaluate(()=>window.__sushi.snapshot())).phase).toBe('paused');await expect(page.locator('#leaderboard-dialog')).toBeVisible();await page.screenshot({path:'artifacts/shared-leaderboard.png',fullPage:true});await context.close();
});

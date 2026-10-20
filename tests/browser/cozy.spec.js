import {test,expect} from '@playwright/test';
test.use({extraHTTPHeaders:{'x-sushi-test-peer':'cozy-integration'}});
test('approved live menu cards cover all themes and keep active sessions locked',async({page})=>{
 await page.goto('/?test=1&casual=1');await page.locator('#today-menu').click();
 await expect(page.locator('#cozy-theme-options .theme-card')).toHaveCount(4);
 await page.locator('#cozy-theme-options [data-theme="autumn"]').click();
 await expect(page.locator('#menu-picker')).toHaveValue('autumn');await expect(page.locator('#cozy-theme-name')).toHaveText('往期 · 秋日小食堂');
 const close=await page.locator('#cozy-menu-dismiss').boundingBox();expect(close.width).toBeGreaterThanOrEqual(44);expect(close.height).toBeGreaterThanOrEqual(44);await page.locator('#cozy-menu-dismiss').click();await page.locator('#player-id-input').fill('暖店菜单食客');await page.locator('#new-game').click();await page.locator('#start-game').click();
 await page.locator('#today-menu').click();for(const card of await page.locator('#cozy-theme-options .theme-card').all())await expect(card).toBeDisabled();await expect(page.locator('#menu-picker')).toBeDisabled();
});
test('tea shortcut eats an existing real tea, never creates one or bypasses cooldown',async({page})=>{
 await page.goto('/?test=1&casual=1');await page.evaluate(()=>{window.__sushi.newGame({casual:true,seed:8,characterId:'momo'});window.__sushi.start();const g=window.__sushi.game;g.foods=[];g.addFood('salmon',.12);g.fullness=90;window.__sushi.advance(.8);});
 await expect(page.locator('#cozy-tea-action')).toBeDisabled();
 await page.evaluate(()=>{window.__sushi.game.addFood('tea',.52);window.__sushi.advance(.1);window.__sushi.renderer.draw(window.__sushi.game,0);});
 await expect(page.locator('#cozy-tea-action')).toBeEnabled();const before=await page.evaluate(()=>({fullness:window.__sushi.game.fullness,ids:window.__sushi.game.foods.map(f=>f.id)}));
 await page.locator('#cozy-tea-action').click();const after=await page.evaluate(()=>({fullness:window.__sushi.game.fullness,ids:window.__sushi.game.foods.map(f=>f.id)}));expect(after.ids).toHaveLength(before.ids.length-1);expect(after.ids.every(id=>before.ids.includes(id))).toBe(true);expect(before.fullness-after.fullness).toBeGreaterThanOrEqual(18);expect(before.fullness-after.fullness).toBeLessThan(18.5);await expect(page.locator('#cozy-tea-action')).toBeDisabled();
});
test('real moving DOM plate matches the engine, accepts pointer input and refreshes art when IDs are reused',async({page})=>{
 await page.setViewportSize({width:390,height:844});await page.goto('/?test=1&casual=1');
 await page.evaluate(()=>{window.__sushi.newGame({casual:true,seed:8,characterId:'momo'});window.__sushi.start();});
 const state=await page.evaluate(()=>{const f=window.__sushi.game.foods[0];const b=document.querySelector(`#live-plates [data-id="${f.id}"]`);return{food:f.key,key:b.dataset.key,id:f.id};});expect(state.key).toBe(state.food);
 await page.locator('#game').scrollIntoViewIfNeeded();const box=await page.locator(`#live-plates [data-id="${state.id}"]`).boundingBox();await page.mouse.click(box.x+box.width/2,box.y+box.height/2);expect(await page.evaluate(()=>window.__sushi.game.eaten)).toBe(1);
 await page.evaluate(()=>{const g=window.__sushi.game;g.foods=[{...g.foods[0],key:'tamago',p:.15}];window.__sushi.renderer.draw(g,0);});
 await expect(page.locator('#live-plates .plate')).toHaveAttribute('data-key','tamago');await expect(page.locator('#live-plates .dish-name')).toHaveText('玉子烧');
});

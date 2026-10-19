import {test,expect} from '@playwright/test';
test.use({extraHTTPHeaders:{'x-sushi-test-peer':'collection-filters'}});
for(const[w,h]of[[320,640],[1440,1000]])test(`row filters combine, reset and support keyboard without overflowing ${w}`,async({page})=>{
 await page.setViewportSize({width:w,height:h});await page.goto('/?test=1&casual=1');await page.locator('#collection').click();
 const theme=page.getByRole('group',{name:'菜单分类',exact:true}),rarity=page.getByRole('group',{name:'珍稀等级',exact:true}),sort=page.getByRole('group',{name:'排列顺序',exact:true});
 await expect(theme.getByRole('button')).toHaveText(['全部','本期菜单','常驻菜单','往期菜单']);await expect(page.locator('#theme-progress')).toContainText('本期菜单');await expect(page.locator('#collection-reset')).toBeDisabled();
 for(const group of[theme,rarity,sort])for(const button of await group.getByRole('button').all()){const rect=await button.boundingBox();expect(rect.width).toBeGreaterThanOrEqual(44);expect(rect.height).toBeGreaterThanOrEqual(44);}
 await page.locator('#collection-next').click();await expect(page.locator('#collection-page-info')).toContainText('第2/');
 await theme.getByRole('button',{name:'本期菜单',exact:true}).click();await expect(page.locator('#collection-page-info')).toContainText('28款 · 第1/');
 const rare=rarity.getByRole('button',{name:'珍藏',exact:true});await rare.focus();await page.keyboard.press('Space');await expect(rare).toHaveAttribute('aria-pressed','true');await expect(page.locator('#collection-grid article')).toHaveCount(8);
 await page.getByRole('searchbox',{name:'搜索寿司',exact:true}).fill('不存在的寿司');await expect(page.locator('.collection-empty')).toBeVisible();await expect(page.locator('#collection-next')).toBeDisabled();
 await page.locator('#collection-reset').click();await expect(page.locator('#collection-page-info')).toContainText('222款 · 第1/');await expect(page.locator('#collection-search')).toHaveValue('');await expect(theme.getByRole('button',{name:'全部',exact:true})).toHaveAttribute('aria-pressed','true');await expect(rarity.getByRole('button',{name:'全部',exact:true})).toHaveAttribute('aria-pressed','true');await expect(page.locator('#collection-reset')).toBeDisabled();
 await sort.getByRole('button',{name:'图鉴编号',exact:true}).click();const ids=await page.locator('#collection-grid article').evaluateAll(els=>els.map(el=>Number(el.querySelector('small').textContent.match(/NO\.(\d+)/)[1])));expect(ids).toEqual([...ids].sort((a,b)=>a-b));expect(new Set(ids).size).toBe(24);expect(ids[0]).toBe(1);
 await page.locator('.collection-rules summary').click();await expect(page.locator('.collection-rules .rarity-note')).toBeVisible();expect(await page.locator('#collection-dialog').evaluate(el=>el.scrollWidth<=el.clientWidth+1)).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1)).toBe(true);
 await page.screenshot({path:`artifacts/v124/filters-tested-${w}.png`});
});
test('number ordering remains numeric after discovering a later catalogue dish',async({page})=>{
 await page.goto('/?test=1&casual=1');await page.locator('#player-id-input').fill('图鉴排序食客');await page.locator('#new-game').click();await page.locator('#start-game').click();
 // A local-only engine fixture: no fabricated run is submitted to any cloud backend.
 await page.evaluate(()=>{const g=window.__sushi.game;g.fullness=55;g.foods=[];g.addFood('taste_caramel_salmon',.12);window.__sushi.advance(.8);window.__sushi.renderer.draw(g,0);});await page.keyboard.press('1');
 await page.locator('#collection').click();await expect(page.locator('#collection-grid article').first()).toHaveAttribute('data-sushi-id','taste_caramel_salmon');await page.getByRole('group',{name:'排列顺序',exact:true}).getByRole('button',{name:'图鉴编号',exact:true}).click();await expect(page.locator('#collection-grid article').first().locator('small').first()).toContainText('NO.001');
});

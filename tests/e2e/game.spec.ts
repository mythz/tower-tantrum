import { test,expect } from '@playwright/test';
declare global { interface Window { musicStarts?:number } }
async function boot(page:import('@playwright/test').Page){await page.goto('/?test');await page.locator('#begin').click();await page.waitForFunction(()=>!!window.tantrumTest);}
test('build, combat, upgrade, pause, sound and restart',async({page})=>{const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);await page.locator('#pick-pea').click();const canvas=page.locator('canvas');const box=(await canvas.boundingBox())!;await page.mouse.click(box.x+box.width*120/960,box.y+box.height*264/576);await expect(page.locator('#coins')).toHaveText('120');await page.locator('#upgrade').click();await expect(page.locator('#coins')).toHaveText('50');await expect(page.locator('#selection')).toContainText('LEVEL 2');await page.locator('#start').click();await expect(page.locator('#phase')).toHaveText('GRUMPS INBOUND');await page.waitForFunction(()=>window.tantrumTest!.snapshot().enemies>0);await page.locator('#pause').click();await expect(page.locator('#phase')).toHaveText('PAUSED');const tick=await page.evaluate(()=>window.tantrumTest!.snapshot().tick);await page.waitForTimeout(250);expect(await page.evaluate(()=>window.tantrumTest!.snapshot().tick)).toBe(tick);await page.locator('#resume').click();await page.locator('#mute').click();await expect(page.locator('#mute')).toHaveAttribute('aria-pressed','true');await page.locator('#pause').click();await page.locator('#restart').click();await expect(page.locator('#coins')).toHaveText('180');expect(await page.evaluate(()=>window.tantrumTest!.snapshot().towers)).toBe(0);await page.screenshot({path:'test-results/game.png',fullPage:true});expect(errors).toEqual([]);});
test('victory and defeat overlays through domain fixture',async({page})=>{await boot(page);await page.evaluate(()=>window.tantrumTest!.finish(true));await expect(page.locator('#overlay')).toContainText('Sweet victory');await page.locator('#restart').click();await page.evaluate(()=>window.tantrumTest!.finish(false));await expect(page.locator('#overlay')).toContainText('too much');await page.locator('#restart').click();await expect(page.locator('#phase')).toHaveText('BUILD TIME');});
test('small landscape, keyboard and hidden-tab pause',async({page})=>{await page.setViewportSize({width:960,height:540});await boot(page);await page.keyboard.press('2');await expect(page.locator('#pick-berry')).toHaveClass(/selected/);await page.keyboard.press('Escape');await expect(page.locator('#pick-berry')).not.toHaveClass(/selected/);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await expect(page.locator('#resume')).toBeVisible();await page.screenshot({path:'test-results/small.png',fullPage:true});});
test('bounded stress scene renders and reports frame intervals',async({page})=>{await boot(page);await page.evaluate(()=>window.tantrumTest!.stress());const timing=await page.evaluate(()=>new Promise<{average:number;p95:number}>(resolve=>{const values:number[]=[];let last=performance.now();function frame(now:number){values.push(now-last);last=now;if(values.length<120)requestAnimationFrame(frame);else{values.sort((a,b)=>a-b);resolve({average:values.reduce((a,b)=>a+b,0)/values.length,p95:values[114]});}}requestAnimationFrame(frame);}));console.log('HEADLESS STRESS FRAME MS',timing);expect(timing.average).toBeLessThan(100);});

test('sound settings persist and changing them while paused does not start music',async({page})=>{
  await boot(page);
  await page.locator('#pause').click();
  await page.evaluate(()=>{
    const original=HTMLMediaElement.prototype.play;
    window.musicStarts=0;
    HTMLMediaElement.prototype.play=function(){
      if(this.loop)window.musicStarts=(window.musicStarts??0)+1;
      return original.call(this);
    };
  });
  await page.locator('#mute').click();
  await page.locator('#mute').click();
  await page.locator('#volume').fill('0.25');
  await page.locator('#motion').check();
  expect(await page.evaluate(()=>window.musicStarts)).toBe(0);
  await page.reload();
  await expect(page.locator('#volume')).toHaveValue('0.25');
  await page.locator('#begin').click();
  await page.locator('#pause').click();
  await expect(page.locator('#motion')).toBeChecked();
});

test('keyboard buttons, touch placement, resize and repeated restart remain usable',async({page,browserName})=>{
  await page.setViewportSize({width:960,height:540});
  await boot(page);
  await page.locator('#pause').focus();
  await page.keyboard.press('Space');
  await expect(page.locator('#resume')).toBeVisible();
  await expect(page.locator('#wave')).toHaveText('0 / 10');
  await page.locator('#resume').click();
  await page.locator('#pick-berry').click();
  const box=(await page.locator('canvas').boundingBox())!;
  if(browserName==='firefox')await page.mouse.click(box.x+box.width*120/960,box.y+box.height*264/576);
  else await page.touchscreen.tap(box.x+box.width*120/960,box.y+box.height*264/576);
  await expect(page.locator('#coins')).toHaveText('80');
  await page.setViewportSize({width:1280,height:720});
  for(let i=0;i<5;i++){
    await page.locator('#pause').click();
    await page.locator('#restart').click();
    await expect(page.locator('#coins')).toHaveText('180');
    expect(await page.evaluate(()=>window.tantrumTest!.snapshot().towers)).toBe(0);
  }
  await page.locator('#pick-pea').click();
  const resized=(await page.locator('canvas').boundingBox())!;
  await page.mouse.click(resized.x+resized.width*120/960,resized.y+resized.height*264/576);
  await expect(page.locator('#coins')).toHaveText('120');
  await page.setViewportSize({width:390,height:844});
  await expect(page.locator('.rotate')).toBeVisible();
});

test('malformed or unavailable settings storage leaves the game playable',async({page})=>{
  await page.addInitScript(()=>{
    Storage.prototype.getItem=()=>'{broken json';
    Storage.prototype.setItem=()=>{throw new Error('Storage blocked');};
  });
  await boot(page);
  await page.locator('#mute').click();
  await expect(page.locator('#mute')).toHaveAttribute('aria-pressed','true');
  await page.locator('#start').click();
  await expect(page.locator('#phase')).toHaveText('GRUMPS INBOUND');
});

test('critical artwork failure offers retry',async({page})=>{
  await page.route('**/assets/base-0.svg',route=>route.abort());
  await page.goto('/');
  await expect(page.locator('#overlay')).toContainText('garden could not load');
  await expect(page.getByRole('button',{name:'Retry'})).toBeVisible();
});

test('blocked optional audio does not stop combat',async({page})=>{
  const errors:string[]=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*.wav',route=>route.abort());
  await boot(page);
  await page.locator('#pick-pea').click();
  const box=(await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x+box.width*120/960,box.y+box.height*264/576);
  await page.locator('#start').click();
  const tick=await page.evaluate(()=>window.tantrumTest!.snapshot().tick);
  await page.waitForTimeout(1200);
  expect(await page.evaluate(()=>window.tantrumTest!.snapshot().tick)).toBeGreaterThan(tick+30);
  expect(errors).toEqual([]);
});

test('hard levels switch maps, retain their restart and advance after victory',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
 await page.locator('#level-select').selectOption('5');
 await expect(page.locator('#level-title')).toHaveText('The king of all tantrums.');
 await expect(page.locator('#wave')).toHaveText('0 / 15');
 await expect(page.locator('#coins')).toHaveText('380');
 await page.locator('#start').click();await expect(page.locator('#level-select')).toBeDisabled();
 await page.locator('#pause').click();await page.locator('#restart').click();
 await expect(page.locator('#level-select')).toHaveValue('5');await expect(page.locator('#coins')).toHaveText('380');await expect(page.locator('#phase')).toHaveText('BUILD TIME');
 await page.screenshot({path:'test-results/citadel.png',fullPage:true});
 await page.locator('#level-select').selectOption('1');
 await page.evaluate(()=>window.tantrumTest!.finish(true));
 await expect(page.locator('#overlay')).toContainText('12 waves defended in Bramble Orchard');
 await page.locator('#next-level').click();
 await expect(page.locator('#level-select')).toHaveValue('2');await expect(page.locator('#coins')).toHaveText('260');
 await page.screenshot({path:'test-results/canyon.png',fullPage:true});
 expect(errors).toEqual([]);
});

test('new towers, targeting, selling, speed, early calls and powers work from the controls',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
 await page.evaluate(()=>window.tantrumTest!.advance(0));
 await page.keyboard.press('5');await expect(page.locator('#pick-sun')).toHaveClass(/selected/);
 const box=(await page.locator('canvas').boundingBox())!;const at=(x:number,y:number)=>page.mouse.click(box.x+box.width*x/960,box.y+box.height*y/576);
 await at(120,264);await expect(page.locator('#coins')).toHaveText('40');await expect(page.locator('#selection')).toContainText('Sunbeam Sniper');
 await page.locator('#selection button[data-target="first"]').click();await expect(page.locator('#selection button[data-target="first"]')).toHaveClass(/on/);
 await page.locator('#sell').click();await expect(page.locator('#coins')).toHaveText('138');expect(await page.evaluate(()=>window.tantrumTest!.snapshot().towers)).toBe(0);
 await expect(page.locator('#ability-bomb')).toBeDisabled();
 await page.locator('#speed').click();await expect(page.locator('#speed')).toHaveText('2×');
 await page.locator('#start').click();await expect(page.locator('#start')).toContainText('Call early');
 await page.waitForFunction(()=>window.tantrumTest!.snapshot().enemies>0);
 await page.locator('#start').click();await expect(page.locator('#wave')).toHaveText('2 / 10');await expect(page.locator('#coins')).toHaveText('150');
 await page.keyboard.press('w');await expect(page.locator('#ability-chill')).toBeDisabled();
 await page.locator('#ability-bomb').click();await expect(page.locator('#ability-bomb')).toHaveClass(/armed/);await at(130,168);await expect(page.locator('#ability-bomb')).toBeDisabled();
 await page.screenshot({path:'test-results/powers.png'});expect(errors).toEqual([]);
});

test('five new lands render, restart and advance through the campaign',async({page})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);
 await expect(page.locator('#level-select option')).toHaveCount(11);
 const added=[
  {index:6,name:'Marshmallow Lagoon',coins:420},
  {index:7,name:'Pistachio Grove',coins:460},
  {index:8,name:'Honeycomb Dunes',coins:500},
  {index:9,name:'Peppermint Glacier',coins:540},
  {index:10,name:'Starlight Confection',coins:580}
 ];
 for(const level of added){
  await page.locator('#level-select').selectOption(String(level.index));
  await expect(page.locator('#coins')).toHaveText(String(level.coins));
  await expect(page.locator('#wave')).toHaveText('0 / 15');
  await page.locator('#start').click();await expect(page.locator('#phase')).toHaveText('GRUMPS INBOUND');
  await page.locator('#pause').click();await page.locator('#restart').click();
  await expect(page.locator('#level-select')).toHaveValue(String(level.index));
  await expect(page.locator('#coins')).toHaveText(String(level.coins));
  await page.screenshot({path:`test-results/level-${level.index+1}.png`,fullPage:true});
  await page.evaluate(()=>window.tantrumTest!.finish(true));
  await expect(page.locator('#overlay')).toContainText(`15 waves defended in ${level.name}`);
  if(level.index<10){await page.locator('#next-level').click();await expect(page.locator('#level-select')).toHaveValue(String(level.index+1));}
  else {await expect(page.locator('#next-level')).toHaveCount(0);await page.locator('#restart').click();}
 }
 expect(errors).toEqual([]);
});

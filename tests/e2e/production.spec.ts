import { test, expect } from '@playwright/test';

test('production subdirectory build loads local assets and plays the first wave', async ({ page }) => {
  test.setTimeout(90000);
  const errors:string[]=[];
  page.on('pageerror', e => {errors.push(e.message);console.log('PRODUCTION ERROR',e.message);});
  page.on('response', r => { if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`); });
  await page.goto('./?test');
  await page.locator('#begin').click();
  expect(await page.evaluate(() => window.tantrumTest)).toBeUndefined();
  await page.locator('#pick-pea').click();
  const box=(await page.locator('canvas').boundingBox())!;
  await page.mouse.click(box.x+box.width*120/960,box.y+box.height*264/576);
  await expect(page.locator('#coins')).toHaveText('120');
  await page.locator('#upgrade').click();
  await expect(page.locator('#coins')).toHaveText('50');
  await page.locator('#start').click();
  await expect(page.locator('#phase')).toHaveText('GRUMPS INBOUND');
  await page.waitForTimeout(2000);
  expect(errors).toEqual([]);
  await expect(page.locator('#phase')).toHaveText('BUILD TIME',{timeout:65000});
  await expect(page.locator('#lives')).toHaveText('20');
  await expect(page.locator('#wave')).toHaveText('1 / 10');
  await expect(page.locator('#start')).toBeEnabled();
  expect(errors).toEqual([]);
});

import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'tests/e2e',
  use:{viewport:{width:1280,height:720},hasTouch:true,deviceScaleFactor:2},
  projects:[
    {name:'development',testMatch:'game.spec.ts',use:{baseURL:'http://localhost:5173'}},
    {name:'production',testMatch:'production.spec.ts',use:{baseURL:'http://localhost:4173/release-check/'}},
    {name:'firefox',testMatch:'game.spec.ts',use:{baseURL:'http://localhost:5173',browserName:'firefox',hasTouch:false}},
  ],
  webServer:[
    {command:'npm run dev -- --port 5173 --strictPort',url:'http://localhost:5173',reuseExistingServer:false},
    {command:'npm run build -- --base=/release-check/ --outDir=dist-qa && npm run preview -- --port 4173 --strictPort --base=/release-check/ --outDir=dist-qa',url:'http://localhost:4173/release-check/',reuseExistingServer:false},
  ],
});

import { defineConfig } from '@playwright/test';
export default defineConfig({ testDir:'tests/e2e', use:{baseURL:'http://localhost:5173', viewport:{width:1280,height:820}}, webServer:{command:'npm run dev',url:'http://localhost:5173',reuseExistingServer:true} });

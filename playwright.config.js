import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',timeout:30000,fullyParallel:false,workers:1,
  reporter:[['list'],['json',{outputFile:'artifacts/browser-results.json'}]],
  use:{baseURL:'http://127.0.0.1:5174',headless:true,screenshot:'only-on-failure',trace:'retain-on-failure'},
  webServer:{command:'node scripts/serve.mjs --port 5174',url:'http://127.0.0.1:5174',reuseExistingServer:!process.env.CI,env:{SUSHI_DB_FILE:':memory:'}},
  projects:[{name:'chromium',use:{browserName:'chromium',channel:'chrome'}}],
});

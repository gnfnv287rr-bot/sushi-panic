import{defineConfig}from'@playwright/test';
export default defineConfig({testDir:'.',testMatch:'preview.spec.mjs',workers:1,timeout:30000,reporter:[['list'],['json',{outputFile:'design-preview/v1.3/tests/results.json'}]],outputDir:'traces',use:{headless:true,browserName:'chromium',channel:'chrome',screenshot:'only-on-failure'}});

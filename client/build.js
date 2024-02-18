/**
 * Build script for Southbridge Boxes to ensure that local values are correct.
 * Depends on variables set in brunch-config and app/base_url
 *
 * Run the script using `node build.js`
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module brunch-build
 */

import { exec } from "child_process";
import colors from "colors";
import inquirer from "inquirer";
import ora from "ora";
import viteConfig from "./vite.config.js";
import { spawn } from "child_process";
import base_url from "./src/base-url.js";

let loader;
let loading = false;
const inputName = Object.keys(viteConfig.build.rollupOptions.input)[0];
const outputFile = viteConfig.build.rollupOptions.output.entryFileNames.replace("[name]", inputName);
const outputDir = viteConfig.build.rollupOptions.output.dir;

/* 
 * Suddenly, wierdly this script (or the npm build?) hammered all the files in the target directory - perhaps normal?
 */

const spawnBuild = () => {
  const build = spawn("npm", ["run", "build"]);

  build.stdout.on("data", (data) => {
    if (loading) {
      loader.stopAndPersist({
        text: "Building",
        symbol: "✓"
      });
      loading = false;
    }
    process.stdout.write(`${data}`);
  });

  build.stderr.on('data', (data) => console.error(`stderr: ${data}`));

  //build.on('close', (code) => console.log(`build process exited with code ${code}`));
};

const run = async () => {
  console.log('\nBuilding Southbridges Boxes using the following values'.magenta);
  console.log(`\n${'-'.padEnd(70, '-')}`);
  console.log(`${'Api url'.padEnd(25)} ${base_url.blue}`);
  console.log(`${'Target directory'.padEnd(25)} ${outputDir.blue}`);
  console.log(`${'Target file'.padEnd(25)} ${outputFile.blue}`);
  console.log(`${'-'.padEnd(70, '-')}\n`);
  console.log('Be sure to also check admin api general settings for correct url\n'.green);

  const { confirm } = await inquirer.prompt({
    type: 'confirm',
    default: false,
    message: 'Please confirm running the build script',
    name: 'confirm'
  });

  if (confirm) {
    loading = true;
    loader = ora('Confirmed, running build').start();
    spawnBuild();
  } else {
    console.log('Not confirmed, exiting');
  };
};

try {
  run();
} catch(e) {
  console.log('Api url not found, copy app/base-url.example.js'.red);
};


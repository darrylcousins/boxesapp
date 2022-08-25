
/**
 * Helper functions for cron scripts
 *
 * @author Darryl Cousins <darryljcousins@gmail.com>
 * @module cron-lib
 */

import { exec } from "child_process";
import fs from "fs";

export const execCommand = async (command, callback) => {
  await exec(command, (error, stdout, stderr) => {
    if (error) callback(error);
    // stdout is where info is returned on deleteMany
    if (stdout) callback(stdout);
    // stderr is where info is returned with export
    if (stderr) callback(stderr);
  });
};

export const titleCase = (str) => {
  return `${str.charAt(0).toUpperCase()}${str.slice(1)}`;
};

export const delay = ms => new Promise(res => setTimeout(res, ms));

export const sleepUntil = async (f, timeoutMs) => {
  return new Promise((resolve, reject) => {
    let timeWas = new Date();
    let wait = setInterval(function() {
      if (f()) {
        clearInterval(wait);
        resolve();
      } else if (new Date() - timeWas > timeoutMs) { // Timeout
        clearInterval(wait);
        reject();
      }
    }, 20);
  });
};

export const checkAttachment = async (a) => {
  const exists = () => fs.existsSync(a);
  await sleepUntil(exists);
};

export const fileStringDate = (d) => {
  const pad = (input) => input.toString().padStart(2, '0');
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()}.${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
};

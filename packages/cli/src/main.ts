#!/usr/bin/env node
import { dispatchCli } from './dispatch.js';

dispatchCli(process.argv.slice(2), import.meta.url)
  .then((result) => {
    if (result.output) {
      console.log(result.output);
    }
    if (result.error) {
      console.error(result.error);
    }
    process.exitCode = result.exitCode;
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  });


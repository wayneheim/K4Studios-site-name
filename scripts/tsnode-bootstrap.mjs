import { register } from 'node:module';
import { pathToFileURL } from 'node:url';

// Register ts-node ESM loader for this process
register('ts-node/esm', pathToFileURL('./'));

// Dynamically import the TS test script
await import('./validate-structured-data.ts');

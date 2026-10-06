import { defineConfig } from 'vitest/config';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const aliases: Record<string, string> = {
  '@yoga/platform/api': 'platform/api/src/index.ts',
  '@yoga/platform/ui': 'platform/ui/src/index.ts',
  '@yoga/platform/auth': 'platform/auth/src/index.ts',
  '@yoga/platform/supabase': 'platform/supabase/src/index.ts',
  '@yoga/mod-branch/data-access': 'modules/mod-branch/data-access/src/index.ts',
  '@yoga/mod-membership/data-access': 'modules/mod-membership/data-access/src/index.ts',
  '@yoga/mod-schedule/data-access': 'modules/mod-schedule/data-access/src/index.ts',
  '@yoga/mod-landing/data-access': 'modules/mod-landing/data-access/src/index.ts'
};
export default defineConfig({
  resolve: { alias: Object.fromEntries(Object.entries(aliases).map(([key, path]) => [key, resolve(path)])) },
  plugins: [{ name: 'angular-jit-test-resources', enforce: 'pre', transform(source, id) {
    if (!id.endsWith('.ts') || id.includes('node_modules')) return;
    return source.replace(/templateUrl:\s*['"]([^'"]+)['"]/g, (_, file) => `template: ${JSON.stringify(readFileSync(resolve(dirname(id), file), 'utf8'))}`)
      .replace(/styleUrls?:\s*(\[[^\]]*\]|['"][^'"]*['"])/g, 'styles: []');
  } }],
  test: { globals: true, environment: 'jsdom', setupFiles: ['tests/setup.ts'], include: ['**/*.spec.ts'], exclude: ['node_modules/**', 'dist/**'], maxWorkers: 1 }
});

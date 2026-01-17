/**
 * Utility to filter out backup/copy .mjs files from glob results.
 * 
 * When you have Color.mjs and Color-copy1.mjs in the same folder,
 * this ensures only the canonical (shorter) version is used.
 * 
 * Patterns excluded:
 * - *-copy*.mjs, *-copy.mjs
 * - *_copy*.mjs, *_copy.mjs  
 * - *-backup*.mjs, *-backup.mjs
 * - *_backup*.mjs, *_backup.mjs
 * - * copy.mjs, * copy *.mjs (space before "copy")
 */

// Regex to detect backup/copy file patterns
const BACKUP_PATTERN = /[-_\s](copy|backup)(\d*|[-_\s].*)?\.[^.]+$/i;

/**
 * Check if a file path looks like a backup/copy file
 */
export function isBackupFile(filePath: string): boolean {
  // Extract just the filename
  const filename = filePath.split(/[/\\]/).pop() || '';
  return BACKUP_PATTERN.test(filename);
}

/**
 * Filter a glob result object to exclude backup files.
 * Use this after import.meta.glob() to remove backup .mjs files.
 * 
 * @example
 * const modules = import.meta.glob('.../*.mjs', { eager: true });
 * const filtered = filterBackupModules(modules);
 */
export function filterBackupModules<T extends Record<string, any>>(modules: T): T {
  const filtered = {} as T;
  for (const key in modules) {
    if (!isBackupFile(key)) {
      filtered[key] = modules[key];
    }
  }
  return filtered;
}

/**
 * Filter an array of file paths to exclude backup files.
 */
export function filterBackupPaths(paths: string[]): string[] {
  return paths.filter(p => !isBackupFile(p));
}

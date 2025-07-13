/**
 * Bridge file for backward compatibility with tests
 * Re-exports the initCommand from the actual initialization-command.ts
 */

import { initCommand } from '../../commands/system/initialization-command.ts';

export { initCommand }; 
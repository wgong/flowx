/**
 * Claude-Flow UI Module
 * Provides compatible UI solutions for different terminal environments
 */

export { 
  CompatibleUI, 
  createCompatibleUI, 
  isRawModeSupported,
  type UIProcess,
  type UISystemStats 
} from './compatible-ui.js';

export { 
  handleRawModeError, 
  withRawModeFallback, 
  checkUISupport, 
  showUISupport,
  type FallbackOptions 
} from './fallback-handler.js';

/**
 * Main UI launcher that automatically selects the best available UI
 */
export async function launchBestUI(): Promise<void> {
  const { checkUISupport, handleRawModeError } = await import('./fallback-handler.js');
  const support = checkUISupport();
  
  if (support.supported) {
    try {
      const { launchUI: launchMainUI } = await import('./compatible-ui.js');
      await launchMainUI();
    } catch (error) {
      if (error instanceof Error) {
        await handleRawModeError(error, { 
          enableUI: true,
          fallbackMessage: 'Falling back to compatible UI mode',
          showHelp: true 
        });
      }
    }
  } else {
    const { launchUI: launchCompatibleUI } = await import('./compatible-ui.js');
    console.log('🔄 Using compatible UI mode for this environment');
    await launchCompatibleUI();
  }
}

/**
 * Alternative UI launcher with configuration
 */
export async function launchUIWithConfig(config: any): Promise<void> {
  try {
    // Try to use the compatible UI launcher
    const compatibleUI = await import('./compatible-ui.js');
    return await compatibleUI.launchUI();
  } catch (error) {
    // Fallback to simple handler
    const fallbackHandler = await import('./fallback-handler.js');
    console.log('⚠️ Falling back to basic UI mode');
    console.log('Config:', config);
  }
}
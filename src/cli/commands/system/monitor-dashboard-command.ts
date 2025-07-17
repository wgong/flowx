/**
 * Monitor Dashboard Command - Launch real-time monitoring dashboard
 */

import { render } from 'ink';
import React from 'react';
import { CLICommand } from '../../core/application.js';
import { printInfo, printSuccess, printError } from '../../core/output-formatter.js';
import { SimpleDashboard } from '../../ui/components/simple-dashboard.js';

export const monitorDashboardCommand: CLICommand = {
  name: 'monitor-dashboard',
  description: 'Launch real-time monitoring dashboard with live agent status, task progress, and system health',
  category: 'System',
  arguments: [],
  options: [
    {
      name: 'refresh-interval',
      short: 'i',
      description: 'Dashboard refresh interval in seconds',
      type: 'number',
      default: 2
    },
    {
      name: 'full-screen',
      short: 'f',
      description: 'Launch in full-screen mode',
      type: 'boolean',
      default: false
    }
  ],
  examples: [
    'flowx monitor-dashboard',
    'flowx monitor-dashboard --refresh-interval 5',
    'flowx monitor-dashboard --full-screen'
  ],
  handler: async (context) => {
    const { options } = context;

    try {
      printInfo('🚀 Launching FlowX Real-Time Monitoring Dashboard...');
      printInfo('Press Q or ESC to exit the dashboard');

      // Create dashboard component
      const Dashboard = () => {
        return React.createElement(SimpleDashboard, {
          onBack: () => {
            printSuccess('Dashboard closed successfully');
            process.exit(0);
          }
        });
      };

      // Render the dashboard
      const { unmount } = render(React.createElement(Dashboard), {
        exitOnCtrlC: true,
        patchConsole: false
      });

      // Handle process termination
      process.on('SIGINT', () => {
        unmount();
        printSuccess('Dashboard closed successfully');
        process.exit(0);
      });

      process.on('SIGTERM', () => {
        unmount();
        printSuccess('Dashboard closed successfully');
        process.exit(0);
      });

    } catch (error) {
      printError(`Failed to launch monitoring dashboard: ${error instanceof Error ? error.message : String(error)}`);
      process.exit(1);
    }
  }
}; 
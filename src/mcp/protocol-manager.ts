/**
 * MCP Protocol Version Management and Compatibility Checking
 */

import { MCPProtocolVersion, MCPCapabilities, MCPInitializeParams } from "../utils/types.js";
import { ILogger } from "../core/logger.js";

export interface ProtocolVersionInfo {
  version: MCPProtocolVersion;
  name: string;
  releaseDate: Date;
  deprecated?: boolean;
  deprecationDate?: Date;
  supportedFeatures: string[];
  breakingChanges?: string[];
  migrationGuide?: string;
}

export interface CompatibilityResult {
  compatible: boolean;
  warnings: string[];
  errors: string[];
  recommendedVersion?: MCPProtocolVersion;
  missingFeatures?: string[];
  deprecatedFeatures?: string[];
}

export interface NegotiationResult {
  agreedVersion: MCPProtocolVersion;
  agreedCapabilities: MCPCapabilities;
  clientCapabilities: MCPCapabilities;
  serverCapabilities: MCPCapabilities;
  warnings: string[];
  limitations: string[];
}

/**
 * MCP Protocol Manager
 * Handles protocol version negotiation, compatibility checking, and feature management
 */
export class MCPProtocolManager {
  private supportedVersions: Map<string, ProtocolVersionInfo> = new Map();
  private currentVersion: MCPProtocolVersion;
  private serverCapabilities: MCPCapabilities;

  private readonly knownVersions: ProtocolVersionInfo[] = [
    {
      version: { major: 2024, minor: 11, patch: 5 },
      name: 'MCP 2024.11.5',
      releaseDate: new Date('2024-11-01'),
      supportedFeatures: [
        'tools',
        'prompts',
        'resources',
        'logging',
        'sampling',
        'notifications',
        'tool_list_changed',
        'resource_list_changed',
        'prompt_list_changed',
        'enhanced_error_handling',
        'batch_operations',
        'streaming_responses',
      ],
    },
    {
      version: { major: 2024, minor: 11, patch: 4 },
      name: 'MCP 2024.11.4',
      releaseDate: new Date('2024-10-15'),
      supportedFeatures: [
        'tools',
        'prompts',
        'resources',
        'logging',
        'notifications',
        'tool_list_changed',
        'resource_list_changed',
        'enhanced_error_handling',
      ],
    },
    {
      version: { major: 2024, minor: 11, patch: 3 },
      name: 'MCP 2024.11.3',
      releaseDate: new Date('2024-10-01'),
      supportedFeatures: [
        'tools',
        'prompts',
        'resources',
        'logging',
        'notifications',
      ],
    },
    {
      version: { major: 2024, minor: 10, patch: 0 },
      name: 'MCP 2024.10.0',
      releaseDate: new Date('2024-09-01'),
      deprecated: true,
      deprecationDate: new Date('2024-11-01'),
      supportedFeatures: [
        'tools',
        'prompts',
        'resources',
        'logging',
      ],
      breakingChanges: [
        'Changed tool response format',
        'Modified error codes',
        'Updated capability negotiation',
      ],
      migrationGuide: 'https://docs.mcp.io/migration/2024.10-to-2024.11',
    },
    {
      version: { major: 2024, minor: 9, patch: 0 },
      name: 'MCP 2024.9.0',
      releaseDate: new Date('2024-08-01'),
      deprecated: true,
      deprecationDate: new Date('2024-10-01'),
      supportedFeatures: [
        'tools',
        'prompts',
        'resources',
      ],
      breakingChanges: [
        'Removed legacy tool format',
        'Changed initialization sequence',
      ],
      migrationGuide: 'https://docs.mcp.io/migration/2024.9-to-2024.10',
    },
  ];

  constructor(
    private logger: ILogger,
    preferredVersion?: MCPProtocolVersion,
    serverCapabilities?: MCPCapabilities,
  ) {
    // Initialize supported versions
    this.knownVersions.forEach(versionInfo => {
      const versionKey = this.versionToString(versionInfo.version);
      this.supportedVersions.set(versionKey, versionInfo);
    });

    // Set current version (latest supported or preferred)
    this.currentVersion = preferredVersion || this.getLatestSupportedVersion();
    
    // Set server capabilities
    this.serverCapabilities = serverCapabilities || this.getDefaultCapabilities();

    this.logger.info('Protocol manager initialized', {
      currentVersion: this.versionToString(this.currentVersion),
      supportedVersions: this.getSupportedVersionStrings(),
    });
  }

  /**
   * Negotiate protocol version and capabilities with a client
   */
  async negotiateProtocol(clientParams: MCPInitializeParams): Promise<NegotiationResult> {
    this.logger.info('Starting protocol negotiation', {
      clientVersion: clientParams.protocolVersion,
      clientCapabilities: clientParams.capabilities,
    });

    const clientVersion = clientParams.protocolVersion;
    const clientCapabilities = clientParams.capabilities;

    // Check compatibility
    const compatibility = this.checkCompatibility(clientVersion);
    
    if (!compatibility.compatible) {
      throw new Error(`Incompatible protocol version: ${this.versionToString(clientVersion)}. ${compatibility.errors.join(', ')}`);
    }

    // Find the best mutually supported version
    let agreedVersion: MCPProtocolVersion;
    
    if (this.isVersionSupported(clientVersion)) {
      agreedVersion = clientVersion;
    } else {
      // Find the highest version that both support
      agreedVersion = this.findBestMutualVersion(clientVersion);
    }

    // Negotiate capabilities
    const agreedCapabilities = this.negotiateCapabilities(
      clientCapabilities,
      this.serverCapabilities,
      agreedVersion
    );

    const result: NegotiationResult = {
      agreedVersion,
      agreedCapabilities,
      clientCapabilities,
      serverCapabilities: this.serverCapabilities,
      warnings: compatibility.warnings,
      limitations: this.identifyLimitations(agreedVersion, agreedCapabilities),
    };

    // Add deprecation warnings
    const versionInfo = this.getVersionInfo(agreedVersion);
    if (versionInfo?.deprecated) {
      result.warnings.push(
        `Protocol version ${this.versionToString(agreedVersion)} is deprecated. ` +
        `Please upgrade to ${this.versionToString(this.getLatestSupportedVersion())}.`
      );
      
      if (versionInfo.migrationGuide) {
        result.warnings.push(`Migration guide: ${versionInfo.migrationGuide}`);
      }
    }

    this.logger.info('Protocol negotiation completed', {
      agreedVersion: this.versionToString(agreedVersion),
      agreedCapabilities,
      warnings: result.warnings,
      limitations: result.limitations,
    });

    return result;
  }

  /**
   * Check if a client version is compatible with the server
   */
  checkCompatibility(clientVersion: MCPProtocolVersion): CompatibilityResult {
    const result: CompatibilityResult = {
      compatible: false,
      warnings: [],
      errors: [],
      missingFeatures: [],
      deprecatedFeatures: [],
    };

    // Check if version is supported
    if (!this.isVersionSupported(clientVersion)) {
      const latestSupported = this.getLatestSupportedVersion();
      const comparison = this.compareVersions(clientVersion, latestSupported);
      
      if (comparison > 0) {
        // Client version is newer than what we support
        result.errors.push(
          `Client version ${this.versionToString(clientVersion)} is newer than supported. ` +
          `Maximum supported version: ${this.versionToString(latestSupported)}`
        );
        result.recommendedVersion = latestSupported;
      } else {
        // Client version is older - check if we can find a compatible version
        const compatibleVersion = this.findBestMutualVersion(clientVersion);
        if (compatibleVersion) {
          result.compatible = true;
          result.recommendedVersion = compatibleVersion;
          result.warnings.push(
            `Client version ${this.versionToString(clientVersion)} is older. ` +
            `Recommended version: ${this.versionToString(compatibleVersion)}`
          );
        } else {
          result.errors.push(
            `Client version ${this.versionToString(clientVersion)} is not supported. ` +
            `Minimum supported version: ${this.versionToString(this.getOldestSupportedVersion())}`
          );
        }
      }
    } else {
      result.compatible = true;
      
      // Check for deprecation
      const versionInfo = this.getVersionInfo(clientVersion);
      if (versionInfo?.deprecated) {
        result.warnings.push(
          `Version ${this.versionToString(clientVersion)} is deprecated`
        );
        result.deprecatedFeatures = versionInfo.breakingChanges || [];
      }
    }

    // Check for missing features
    const versionInfo = this.getVersionInfo(clientVersion);
    if (versionInfo) {
      const latestVersionInfo = this.getVersionInfo(this.getLatestSupportedVersion());
      if (latestVersionInfo) {
        const missingFeatures = latestVersionInfo.supportedFeatures.filter(
          feature => !versionInfo.supportedFeatures.includes(feature)
        );
        result.missingFeatures = missingFeatures;
        
        if (missingFeatures.length > 0) {
          result.warnings.push(
            `Client version missing features: ${missingFeatures.join(', ')}`
          );
        }
      }
    }

    return result;
  }

  /**
   * Get information about a specific version
   */
  getVersionInfo(version: MCPProtocolVersion): ProtocolVersionInfo | undefined {
    const versionKey = this.versionToString(version);
    return this.supportedVersions.get(versionKey);
  }

  /**
   * Check if a version is supported
   */
  isVersionSupported(version: MCPProtocolVersion): boolean {
    const versionKey = this.versionToString(version);
    return this.supportedVersions.has(versionKey);
  }

  /**
   * Get the latest supported version
   */
  getLatestSupportedVersion(): MCPProtocolVersion {
    const versions = Array.from(this.supportedVersions.values())
      .filter(v => !v.deprecated)
      .sort((a, b) => this.compareVersions(b.version, a.version));
    
    return versions[0]?.version || { major: 2024, minor: 11, patch: 5 };
  }

  /**
   * Get the oldest supported version
   */
  getOldestSupportedVersion(): MCPProtocolVersion {
    const versions = Array.from(this.supportedVersions.values())
      .sort((a, b) => this.compareVersions(a.version, b.version));
    
    return versions[0]?.version || { major: 2024, minor: 9, patch: 0 };
  }

  /**
   * Get all supported version strings
   */
  getSupportedVersionStrings(): string[] {
    return Array.from(this.supportedVersions.keys()).sort();
  }

  /**
   * Get current server capabilities
   */
  getServerCapabilities(): MCPCapabilities {
    return { ...this.serverCapabilities };
  }

  /**
   * Update server capabilities
   */
  updateServerCapabilities(capabilities: Partial<MCPCapabilities>): void {
    this.serverCapabilities = { ...this.serverCapabilities, ...capabilities };
    this.logger.info('Server capabilities updated', { capabilities: this.serverCapabilities });
  }

  /**
   * Check if a feature is supported in a specific version
   */
  isFeatureSupported(version: MCPProtocolVersion, feature: string): boolean {
    const versionInfo = this.getVersionInfo(version);
    return versionInfo?.supportedFeatures.includes(feature) || false;
  }

  private versionToString(version: MCPProtocolVersion): string {
    return `${version.major}.${version.minor}.${version.patch}`;
  }

  private compareVersions(a: MCPProtocolVersion, b: MCPProtocolVersion): number {
    if (a.major !== b.major) return a.major - b.major;
    if (a.minor !== b.minor) return a.minor - b.minor;
    return a.patch - b.patch;
  }

  private getDefaultCapabilities(): MCPCapabilities {
    return {
      logging: {
        level: 'info',
      },
      tools: {
        listChanged: true,
      },
      resources: {
        listChanged: true,
        subscribe: false,
      },
      prompts: {
        listChanged: true,
      },
    };
  }

  private negotiateCapabilities(
    clientCapabilities: MCPCapabilities,
    serverCapabilities: MCPCapabilities,
    agreedVersion: MCPProtocolVersion
  ): MCPCapabilities {
    const agreedCapabilities: MCPCapabilities = {};

    // Negotiate logging capabilities
    if (clientCapabilities.logging && serverCapabilities.logging) {
      agreedCapabilities.logging = {
        level: this.negotiateLogLevel(
          clientCapabilities.logging.level,
          serverCapabilities.logging.level
        ),
      };
    }

    // Negotiate tools capabilities
    if (clientCapabilities.tools && serverCapabilities.tools) {
      agreedCapabilities.tools = {
        listChanged: clientCapabilities.tools.listChanged && serverCapabilities.tools.listChanged,
      };
    }

    // Negotiate resources capabilities
    if (clientCapabilities.resources && serverCapabilities.resources) {
      agreedCapabilities.resources = {
        listChanged: clientCapabilities.resources.listChanged && serverCapabilities.resources.listChanged,
        subscribe: clientCapabilities.resources.subscribe && serverCapabilities.resources.subscribe,
      };
    }

    // Negotiate prompts capabilities
    if (clientCapabilities.prompts && serverCapabilities.prompts) {
      agreedCapabilities.prompts = {
        listChanged: clientCapabilities.prompts.listChanged && serverCapabilities.prompts.listChanged,
      };
    }

    // Filter capabilities by version support
    return this.filterCapabilitiesByVersion(agreedCapabilities, agreedVersion);
  }

  private negotiateLogLevel(
    clientLevel?: 'debug' | 'info' | 'warn' | 'error',
    serverLevel?: 'debug' | 'info' | 'warn' | 'error'
  ): 'debug' | 'info' | 'warn' | 'error' {
    const levels = ['debug', 'info', 'warn', 'error'];
    const clientIndex = clientLevel ? levels.indexOf(clientLevel) : 1;
    const serverIndex = serverLevel ? levels.indexOf(serverLevel) : 1;
    
    // Use the more restrictive (higher) level
    const chosenIndex = Math.max(clientIndex, serverIndex);
    return levels[chosenIndex] as 'debug' | 'info' | 'warn' | 'error';
  }

  private filterCapabilitiesByVersion(
    capabilities: MCPCapabilities,
    version: MCPProtocolVersion
  ): MCPCapabilities {
    const filtered: MCPCapabilities = { ...capabilities };

    // Remove capabilities not supported in the agreed version
    if (!this.isFeatureSupported(version, 'tool_list_changed')) {
      if (filtered.tools) {
        delete filtered.tools.listChanged;
      }
    }

    if (!this.isFeatureSupported(version, 'resource_list_changed')) {
      if (filtered.resources) {
        delete filtered.resources.listChanged;
      }
    }

    if (!this.isFeatureSupported(version, 'prompt_list_changed')) {
      if (filtered.prompts) {
        delete filtered.prompts.listChanged;
      }
    }

    return filtered;
  }

  private findBestMutualVersion(clientVersion: MCPProtocolVersion): MCPProtocolVersion {
    // Find the highest version that is <= client version and supported by server
    const supportedVersions = Array.from(this.supportedVersions.values())
      .map(v => v.version)
      .filter(v => this.compareVersions(v, clientVersion) <= 0)
      .sort((a, b) => this.compareVersions(b, a));

    return supportedVersions[0] || this.getOldestSupportedVersion();
  }

  private identifyLimitations(
    version: MCPProtocolVersion,
    capabilities: MCPCapabilities
  ): string[] {
    const limitations: string[] = [];

    const versionInfo = this.getVersionInfo(version);
    const latestVersion = this.getLatestSupportedVersion();
    const latestVersionInfo = this.getVersionInfo(latestVersion);

    if (versionInfo && latestVersionInfo) {
      // Check for missing features
      const missingFeatures = latestVersionInfo.supportedFeatures.filter(
        feature => !versionInfo.supportedFeatures.includes(feature)
      );

      if (missingFeatures.includes('batch_operations')) {
        limitations.push('Batch operations not available - requests will be processed individually');
      }

      if (missingFeatures.includes('streaming_responses')) {
        limitations.push('Streaming responses not available - all responses will be sent at once');
      }

      if (missingFeatures.includes('enhanced_error_handling')) {
        limitations.push('Enhanced error details not available - basic error information only');
      }
    }

    // Check capability limitations
    if (!capabilities.tools?.listChanged) {
      limitations.push('Tool list change notifications disabled');
    }

    if (!capabilities.resources?.listChanged) {
      limitations.push('Resource list change notifications disabled');
    }

    if (!capabilities.resources?.subscribe) {
      limitations.push('Resource subscriptions not available');
    }

    return limitations;
  }
}
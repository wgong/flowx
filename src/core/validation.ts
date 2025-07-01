/**
 * Validation System
 * Provides schema-driven validation, runtime type checking, and sanitization
 */

export interface ValidationRule {
  type: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'function' | 'custom';
  required?: boolean;
  nullable?: boolean;
  default?: any;
  
  // String validation
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  format?: 'email' | 'url' | 'uuid' | 'date' | 'time' | 'datetime';
  
  // Number validation
  min?: number;
  max?: number;
  integer?: boolean;
  
  // Array validation
  items?: ValidationRule;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  
  // Object validation
  properties?: Record<string, ValidationRule>;
  additionalProperties?: boolean | ValidationRule;
  
  // Custom validation
  validator?: (value: any, context: ValidationContext) => ValidationResult;
  
  // Transformation
  transform?: (value: any) => any;
  sanitize?: (value: any) => any;
}

export interface ValidationSchema {
  $schema?: string;
  $id?: string;
  title?: string;
  description?: string;
  type?: string;
  properties?: Record<string, ValidationRule>;
  required?: string[];
  additionalProperties?: boolean;
}

export interface ValidationContext {
  path: string[];
  root: any;
  parent?: any;
  schema: ValidationRule;
}

export interface ValidationError {
  path: string;
  message: string;
  code: string;
  value?: any;
  expected?: any;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  value?: any;
}

export class Validator {
  private formatValidators = new Map<string, (value: string) => boolean>();

  constructor() {
    this.setupDefaultFormatValidators();
  }

  /**
   * Validate a value against a schema
   */
  validate(value: any, rule: ValidationRule, path: string[] = []): ValidationResult {
    const context: ValidationContext = {
      path,
      root: value,
      schema: rule
    };

    try {
      const result = this.validateValue(value, rule, context);
      
      if (result.valid && rule.transform) {
        result.value = rule.transform(result.value);
      }

      return result;
    } catch (error) {
      return {
        valid: false,
        errors: [{
          path: path.join('.'),
          message: error instanceof Error ? error.message : 'Validation error',
          code: 'VALIDATION_ERROR',
          value
        }]
      };
    }
  }

  /**
   * Validate an object against a schema
   */
  validateObject(obj: any, schema: ValidationSchema): ValidationResult {
    if (!schema.properties) {
      return { valid: true, errors: [], value: obj };
    }

    const errors: ValidationError[] = [];
    const result: any = {};

    // Validate required properties
    if (schema.required) {
      for (const prop of schema.required) {
        if (!(prop in obj) || obj[prop] === undefined) {
          errors.push({
            path: prop,
            message: `Required property '${prop}' is missing`,
            code: 'REQUIRED_PROPERTY_MISSING'
          });
        }
      }
    }

    // Validate each property
    for (const [prop, rule] of Object.entries(schema.properties)) {
      const value = obj[prop];
      const propResult = this.validate(value, rule, [prop]);
      
      if (!propResult.valid) {
        errors.push(...propResult.errors);
      } else {
        result[prop] = propResult.value !== undefined ? propResult.value : value;
      }
    }

    // Handle additional properties
    if (schema.additionalProperties === false) {
      for (const prop of Object.keys(obj)) {
        if (!schema.properties[prop]) {
          errors.push({
            path: prop,
            message: `Additional property '${prop}' is not allowed`,
            code: 'ADDITIONAL_PROPERTY_NOT_ALLOWED',
            value: obj[prop]
          });
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      value: errors.length === 0 ? result : undefined
    };
  }

  /**
   * Register a custom format validator
   */
  registerFormat(name: string, validator: (value: string) => boolean): void {
    this.formatValidators.set(name, validator);
  }

  private validateValue(value: any, rule: ValidationRule, context: ValidationContext): ValidationResult {
    // Handle null/undefined
    if (value === null || value === undefined) {
      if (rule.required && value === undefined) {
        return {
          valid: false,
          errors: [{
            path: context.path.join('.'),
            message: 'Value is required',
            code: 'REQUIRED',
            value
          }]
        };
      }

      if (value === null && !rule.nullable) {
        return {
          valid: false,
          errors: [{
            path: context.path.join('.'),
            message: 'Value cannot be null',
            code: 'NOT_NULLABLE',
            value
          }]
        };
      }

      if (value === undefined && rule.default !== undefined) {
        return { valid: true, errors: [], value: rule.default };
      }

      return { valid: true, errors: [], value };
    }

    // Apply sanitization
    if (rule.sanitize) {
      value = rule.sanitize(value);
    }

    // Type validation
    const typeResult = this.validateType(value, rule, context);
    if (!typeResult.valid) {
      return typeResult;
    }

    // Custom validation
    if (rule.validator) {
      return rule.validator(value, context);
    }

    return { valid: true, errors: [], value };
  }

  private validateType(value: any, rule: ValidationRule, context: ValidationContext): ValidationResult {
    const path = context.path.join('.');

    switch (rule.type) {
      case 'string':
        return this.validateString(value, rule, path);
      case 'number':
        return this.validateNumber(value, rule, path);
      case 'boolean':
        return this.validateBoolean(value, path);
      case 'array':
        return this.validateArray(value, rule, context);
      case 'object':
        return this.validateObjectType(value, rule, context);
      case 'function':
        return this.validateFunction(value, path);
      default:
        return { valid: true, errors: [], value };
    }
  }

  private validateString(value: any, rule: ValidationRule, path: string): ValidationResult {
    if (typeof value !== 'string') {
      return {
        valid: false,
        errors: [{
          path,
          message: `Expected string, got ${typeof value}`,
          code: 'TYPE_MISMATCH',
          value,
          expected: 'string'
        }]
      };
    }

    const errors: ValidationError[] = [];

    // Length validation
    if (rule.minLength !== undefined && value.length < rule.minLength) {
      errors.push({
        path,
        message: `String length must be at least ${rule.minLength}`,
        code: 'MIN_LENGTH',
        value
      });
    }

    if (rule.maxLength !== undefined && value.length > rule.maxLength) {
      errors.push({
        path,
        message: `String length must be at most ${rule.maxLength}`,
        code: 'MAX_LENGTH',
        value
      });
    }

    // Pattern validation
    if (rule.pattern && !rule.pattern.test(value)) {
      errors.push({
        path,
        message: `String does not match pattern ${rule.pattern}`,
        code: 'PATTERN_MISMATCH',
        value
      });
    }

    // Format validation
    if (rule.format) {
      const formatValidator = this.formatValidators.get(rule.format);
      if (formatValidator && !formatValidator(value)) {
        errors.push({
          path,
          message: `String is not a valid ${rule.format}`,
          code: 'FORMAT_INVALID',
          value
        });
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      value
    };
  }

  private validateNumber(value: any, rule: ValidationRule, path: string): ValidationResult {
    if (typeof value !== 'number' || isNaN(value)) {
      return {
        valid: false,
        errors: [{
          path,
          message: `Expected number, got ${typeof value}`,
          code: 'TYPE_MISMATCH',
          value,
          expected: 'number'
        }]
      };
    }

    const errors: ValidationError[] = [];

    // Integer validation
    if (rule.integer && !Number.isInteger(value)) {
      errors.push({
        path,
        message: 'Number must be an integer',
        code: 'NOT_INTEGER',
        value
      });
    }

    // Range validation
    if (rule.min !== undefined && value < rule.min) {
      errors.push({
        path,
        message: `Number must be at least ${rule.min}`,
        code: 'MIN_VALUE',
        value
      });
    }

    if (rule.max !== undefined && value > rule.max) {
      errors.push({
        path,
        message: `Number must be at most ${rule.max}`,
        code: 'MAX_VALUE',
        value
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      value
    };
  }

  private validateBoolean(value: any, path: string): ValidationResult {
    if (typeof value !== 'boolean') {
      return {
        valid: false,
        errors: [{
          path,
          message: `Expected boolean, got ${typeof value}`,
          code: 'TYPE_MISMATCH',
          value,
          expected: 'boolean'
        }]
      };
    }

    return { valid: true, errors: [], value };
  }

  private validateArray(value: any, rule: ValidationRule, context: ValidationContext): ValidationResult {
    if (!Array.isArray(value)) {
      return {
        valid: false,
        errors: [{
          path: context.path.join('.'),
          message: `Expected array, got ${typeof value}`,
          code: 'TYPE_MISMATCH',
          value,
          expected: 'array'
        }]
      };
    }

    const errors: ValidationError[] = [];
    const result: any[] = [];

    // Length validation
    if (rule.minItems !== undefined && value.length < rule.minItems) {
      errors.push({
        path: context.path.join('.'),
        message: `Array must have at least ${rule.minItems} items`,
        code: 'MIN_ITEMS',
        value
      });
    }

    if (rule.maxItems !== undefined && value.length > rule.maxItems) {
      errors.push({
        path: context.path.join('.'),
        message: `Array must have at most ${rule.maxItems} items`,
        code: 'MAX_ITEMS',
        value
      });
    }

    // Unique items validation
    if (rule.uniqueItems) {
      const seen = new Set();
      for (let i = 0; i < value.length; i++) {
        const item = JSON.stringify(value[i]);
        if (seen.has(item)) {
          errors.push({
            path: `${context.path.join('.')}[${i}]`,
            message: 'Array items must be unique',
            code: 'DUPLICATE_ITEM',
            value: value[i]
          });
        }
        seen.add(item);
      }
    }

    // Validate each item
    if (rule.items) {
      for (let i = 0; i < value.length; i++) {
        const itemResult = this.validateValue(value[i], rule.items, {
          ...context,
          path: [...context.path, i.toString()]
        });

        if (!itemResult.valid) {
          errors.push(...itemResult.errors);
        } else {
          result[i] = itemResult.value !== undefined ? itemResult.value : value[i];
        }
      }
    } else {
      result.push(...value);
    }

    return {
      valid: errors.length === 0,
      errors,
      value: errors.length === 0 ? result : undefined
    };
  }

  private validateObjectType(value: any, rule: ValidationRule, context: ValidationContext): ValidationResult {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      return {
        valid: false,
        errors: [{
          path: context.path.join('.'),
          message: `Expected object, got ${typeof value}`,
          code: 'TYPE_MISMATCH',
          value,
          expected: 'object'
        }]
      };
    }

    const errors: ValidationError[] = [];
    const result: any = {};

    // Validate properties
    if (rule.properties) {
      for (const [prop, propRule] of Object.entries(rule.properties)) {
        const propValue = value[prop];
        const propResult = this.validateValue(propValue, propRule, {
          ...context,
          path: [...context.path, prop]
        });

        if (!propResult.valid) {
          errors.push(...propResult.errors);
        } else {
          result[prop] = propResult.value !== undefined ? propResult.value : propValue;
        }
      }
    }

    // Handle additional properties
    if (rule.additionalProperties === false) {
      for (const prop of Object.keys(value)) {
        if (!rule.properties || !rule.properties[prop]) {
          errors.push({
            path: `${context.path.join('.')}.${prop}`,
            message: `Additional property '${prop}' is not allowed`,
            code: 'ADDITIONAL_PROPERTY_NOT_ALLOWED',
            value: value[prop]
          });
        }
      }
    } else if (typeof rule.additionalProperties === 'object') {
      // Validate additional properties against schema
      for (const [prop, propValue] of Object.entries(value)) {
        if (!rule.properties || !rule.properties[prop]) {
          const propResult = this.validateValue(propValue, rule.additionalProperties, {
            ...context,
            path: [...context.path, prop]
          });

          if (!propResult.valid) {
            errors.push(...propResult.errors);
          } else {
            result[prop] = propResult.value !== undefined ? propResult.value : propValue;
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
      value: errors.length === 0 ? result : undefined
    };
  }

  private validateFunction(value: any, path: string): ValidationResult {
    if (typeof value !== 'function') {
      return {
        valid: false,
        errors: [{
          path,
          message: `Expected function, got ${typeof value}`,
          code: 'TYPE_MISMATCH',
          value,
          expected: 'function'
        }]
      };
    }

    return { valid: true, errors: [], value };
  }

  private setupDefaultFormatValidators(): void {
    this.formatValidators.set('email', (value: string) => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return emailRegex.test(value);
    });

    this.formatValidators.set('url', (value: string) => {
      try {
        new URL(value);
        return true;
      } catch {
        return false;
      }
    });

    this.formatValidators.set('uuid', (value: string) => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      return uuidRegex.test(value);
    });

    this.formatValidators.set('date', (value: string) => {
      const date = new Date(value);
      return !isNaN(date.getTime()) && value.includes('-');
    });

    this.formatValidators.set('time', (value: string) => {
      const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/;
      return timeRegex.test(value);
    });

    this.formatValidators.set('datetime', (value: string) => {
      const date = new Date(value);
      return !isNaN(date.getTime());
    });
  }
}

/**
 * Create a validator with common sanitization functions
 */
export function createValidator(): Validator {
  return new Validator();
} 
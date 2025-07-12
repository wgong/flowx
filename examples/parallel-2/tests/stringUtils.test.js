/**
 * String Utility Library Tests
 */

const { 
  reverse,
  capitalize,
  truncate,
  countWords
} = require('../src/stringUtils');

describe('String Utility Library', () => {
  describe('reverse function', () => {
    it('should reverse a string', () => {
      expect(reverse('hello')).toBe('olleh');
      expect(reverse('world')).toBe('dlrow');
    });
    
    it('should return an empty string when given an empty string', () => {
      expect(reverse('')).toBe('');
    });
    
    it('should handle strings with spaces', () => {
      expect(reverse('hello world')).toBe('dlrow olleh');
    });
    
    it('should handle palindromes', () => {
      expect(reverse('racecar')).toBe('racecar');
    });
    
    it('should handle strings with special characters', () => {
      expect(reverse('hello!')).toBe('!olleh');
    });
  });

  describe('capitalize function', () => {
    it('should capitalize the first letter of a word', () => {
      expect(capitalize('hello')).toBe('Hello');
    });
    
    it('should capitalize the first letter of each word in a string', () => {
      expect(capitalize('hello world')).toBe('Hello World');
    });
    
    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('');
    });
    
    it('should not change already capitalized words', () => {
      expect(capitalize('Hello World')).toBe('Hello World');
    });
    
    it('should handle strings with special characters', () => {
      expect(capitalize('hello-world')).toBe('Hello-World');
      expect(capitalize('hello! world.')).toBe('Hello! World.');
    });
  });

  describe('truncate function', () => {
    it('should truncate a string if it exceeds the max length', () => {
      expect(truncate('hello world', 5)).toBe('he...');
    });
    
    it('should not truncate a string if it is shorter than the max length', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });
    
    it('should handle empty strings', () => {
      expect(truncate('', 5)).toBe('');
    });
    
    it('should handle strings equal to the max length', () => {
      expect(truncate('hello', 5)).toBe('hello');
    });
    
    it('should handle maxLength of 0 or negative', () => {
      expect(truncate('hello', 0)).toBe('...');
      expect(truncate('hello', -5)).toBe('...');
    });
  });
});
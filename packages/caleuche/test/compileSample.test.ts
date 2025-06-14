import { describe, it, expect } from 'vitest';
import { compileSample, Sample, CompileOptions, CompileOutput } from '../src';

describe('compileSample', () => {
  it('should generate a JS file with the correct content', () => {
    const sample: Sample = {
      template: 'console.log("Hello, <%= name %>!");',
      type: 'javascript',
      dependencies: [],
      input: [{ name: 'name', type: 'string', required: true }],
    };
    const options: CompileOptions = { project: true };
    const output: CompileOutput = compileSample(sample, { name: 'World' }, options);
    expect(output.items.some(item => item.fileName === 'sample.js')).toBe(true);
    expect(output.items.some(item => item.content.includes('Hello, World'))).toBe(true);
  });

  it('should throw if required input is missing', () => {
    const sample: Sample = {
      template: 'console.log("Hello, <%= name %>!");',
      type: 'javascript',
      dependencies: [],
      input: [{ name: 'name', type: 'string', required: true }],
    };
    const options: CompileOptions = { project: false };
    expect(() => compileSample(sample, {}, options)).toThrow(/Missing required input/);
  });

  it('should generate a project file for python', () => {
    const sample: Sample = {
      template: 'print("Hello, <%= name %>!")',
      type: 'python',
      dependencies: [{ name: 'requests', version: '^2.0.0' }],
      input: [{ name: 'name', type: 'string', required: true }],
    };
    const options: CompileOptions = { project: true };
    const output: CompileOutput = compileSample(sample, { name: 'Alice' }, options);
    expect(output.items.some(item => item.fileName === 'requirements.txt')).toBe(true);
    expect(output.items.some(item => item.content.includes('requests==^2.0.0'))).toBe(true);
    expect(output.items.some(item => item.fileName === 'sample.py')).toBe(true);
    expect(output.items.some(item => item.content.includes('Hello, Alice'))).toBe(true);
  });
});

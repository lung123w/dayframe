import { describe, it, expect } from 'vitest';
import { Subtask, subtaskService } from '../db';

describe('Subtask model', () => {
  it('creates with defaults', () => {
    const s = new Subtask();
    expect(s.title).toBe('');
    expect(s.completed).toBe(false);
    expect(s.sortOrder).toBe(0);
    expect(s.parentTaskId).toBeUndefined();
    expect(s.createdAt).toBeDefined();
    expect(s.updatedAt).toBeDefined();
  });

  it('creates with provided data', () => {
    const s = new Subtask({ title: 'Test', parentTaskId: 1, completed: true, sortOrder: 2 });
    expect(s.title).toBe('Test');
    expect(s.parentTaskId).toBe(1);
    expect(s.completed).toBe(true);
    expect(s.sortOrder).toBe(2);
  });

  it('preserves id when provided', () => {
    const s = new Subtask({ id: 42, title: 'With ID' });
    expect(s.id).toBe(42);
  });

  it('handles sortOrder of 0 correctly', () => {
    const s = new Subtask({ sortOrder: 0 });
    expect(s.sortOrder).toBe(0);
  });
});

describe('subtaskService', () => {
  it('exports expected methods', () => {
    expect(typeof subtaskService.getAll).toBe('function');
    expect(typeof subtaskService.getByTaskId).toBe('function');
    expect(typeof subtaskService.create).toBe('function');
    expect(typeof subtaskService.update).toBe('function');
    expect(typeof subtaskService.delete).toBe('function');
    expect(typeof subtaskService.deleteByTaskId).toBe('function');
    expect(typeof subtaskService.toggleCompleted).toBe('function');
  });
});

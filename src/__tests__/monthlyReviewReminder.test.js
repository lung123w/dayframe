import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ensureMonthlyReviewReminder, REMINDER_TITLE } from '../utils/monthlyReviewReminder';

describe('ensureMonthlyReviewReminder', () => {
  let mockTaskService;
  beforeEach(() => {
    mockTaskService = {
      getAll: vi.fn(),
      create: vi.fn(),
    };
  });

  it('creates a recurring task when none exists', async () => {
    mockTaskService.getAll.mockResolvedValue([]);
    const createdTask = { id: 1, title: REMINDER_TITLE, isRecurring: true };
    mockTaskService.create.mockResolvedValue(createdTask);
    const result = await ensureMonthlyReviewReminder(mockTaskService);
    expect(result.created).toBe(true);
    expect(mockTaskService.create).toHaveBeenCalledTimes(1);
    const args = mockTaskService.create.mock.calls[0][0];
    expect(args.title).toBe(REMINDER_TITLE);
    expect(args.isRecurring).toBe(true);
    expect(args.priority).toBe('high');
    expect(args.recurrencePattern.type).toBe('monthly');
    expect(args.recurrencePattern.weekOfMonth).toBe('last');
    expect(args.recurrencePattern.dayOfWeek).toBe(6);
    expect(args.recurrencePattern.hour).toBe(9);
    expect(args.recurrencePattern.minute).toBe(0);
  });

  it('does not create a new task when one already exists', async () => {
    const existing = { id: 5, title: REMINDER_TITLE, isRecurring: true };
    mockTaskService.getAll.mockResolvedValue([existing]);
    const result = await ensureMonthlyReviewReminder(mockTaskService);
    expect(result.created).toBe(false);
    expect(result.task).toBe(existing);
    expect(mockTaskService.create).not.toHaveBeenCalled();
  });

  it('sets dueDate to a Date ISO string at 09:00 local time', async () => {
    mockTaskService.getAll.mockResolvedValue([]);
    mockTaskService.create.mockImplementation(async (t) => ({ id: 1, ...t }));
    await ensureMonthlyReviewReminder(mockTaskService);
    const args = mockTaskService.create.mock.calls[0][0];
    expect(typeof args.dueDate).toBe('string');
    const due = new Date(args.dueDate);
    expect(due.getHours()).toBe(9);
    expect(due.getMinutes()).toBe(0);
    expect(due.getSeconds()).toBe(0);
  });

  it('sets dueDate to a Saturday (the last one of the month)', async () => {
    mockTaskService.getAll.mockResolvedValue([]);
    mockTaskService.create.mockImplementation(async (t) => ({ id: 1, ...t }));
    await ensureMonthlyReviewReminder(mockTaskService);
    const args = mockTaskService.create.mock.calls[0][0];
    const due = new Date(args.dueDate);
    expect(due.getDay()).toBe(6); // Saturday
  });
});

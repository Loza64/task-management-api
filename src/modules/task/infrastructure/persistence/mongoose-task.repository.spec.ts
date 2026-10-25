import { Types } from 'mongoose';
import { TaskStatus } from '../../domain/task.entity';
import { MongooseTaskRepository } from './mongoose-task.repository';
import { TaskModel } from './task.schema';

describe('MongooseTaskRepository.findAll', () => {
  const repository = new MongooseTaskRepository();

  afterEach(() => jest.restoreAllMocks());

  it('delegates to paginate and maps the result to the page meta', async () => {
    const now = new Date();
    const paginate = jest.spyOn(TaskModel, 'paginate').mockResolvedValue({
      docs: [{ _id: new Types.ObjectId(), title: 'Tarea', description: null, status: TaskStatus.PENDING, completedAt: null, createdAt: now, updatedAt: now }],
      totalDocs: 21,
      limit: 10,
      page: 2,
      totalPages: 3,
    } as never);

    const page = await repository.findAll({ page: 2, pageSize: 10, status: TaskStatus.PENDING, search: 'a.b' });

    expect(paginate).toHaveBeenCalledWith(
      { status: TaskStatus.PENDING, $or: [{ title: /a\.b/i }, { description: /a\.b/i }] },
      expect.objectContaining({ page: 2, limit: 10, lean: true }),
    );
    expect(page.meta).toEqual({ page: 2, pageSize: 10, pageCount: 3, total: 21 });
    expect(page.items).toHaveLength(1);
    expect(page.items[0].title).toBe('Tarea');
  });
});

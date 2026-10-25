import { AppError } from '../../../../shared/errors/AppError';
import { containsRegex } from '../../../../shared/pagination/regex-search.util';
import { Page } from '../../../../shared/pagination/pagination.types';
import { Task } from '../../domain/task.entity';
import { TaskListParams, TaskRepository } from '../../domain/task.repository';
import { TaskDocument, TaskModel } from './task.schema';

const toDomain = (doc: TaskDocument): Task =>
  Object.assign(new Task(), {
    id: doc._id.toString(),
    title: doc.title,
    description: doc.description ?? null,
    status: doc.status,
    completedAt: doc.completedAt ?? null,
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  });

export class MongooseTaskRepository implements TaskRepository {
  async findAll({ page, pageSize, search, status }: TaskListParams): Promise<Page<Task>> {
    const filter: Record<string, unknown> = {};
    if (status) filter.status = status;
    if (search) {
      const pattern = containsRegex(search);
      filter.$or = [{ title: pattern }, { description: pattern }];
    }

    const result = await TaskModel.paginate(filter, {
      page,
      limit: pageSize,
      sort: { createdAt: -1, _id: -1 },
      lean: true,
    });

    return {
      items: result.docs.map(toDomain),
      meta: {
        page: result.page ?? page,
        pageSize: result.limit,
        pageCount: result.totalPages,
        total: result.totalDocs,
      },
    };
  }

  async findById(id: string): Promise<Task | null> {
    const doc = await TaskModel.findById(id).lean();
    return doc ? toDomain(doc) : null;
  }

  async save(task: Task): Promise<Task> {
    const fields = {
      title: task.title,
      description: task.description,
      status: task.status,
      completedAt: task.completedAt,
    };

    if (!task.id) {
      const created = await TaskModel.create(fields);
      return toDomain(created.toObject());
    }

    const updated = await TaskModel.findByIdAndUpdate(task.id, { $set: fields }, { new: true, runValidators: true }).lean();
    if (!updated) {
      throw new AppError('Tarea no encontrada', 404);
    }
    return toDomain(updated);
  }

  async delete(id: string): Promise<boolean> {
    const { deletedCount } = await TaskModel.deleteOne({ _id: id });
    return deletedCount === 1;
  }
}

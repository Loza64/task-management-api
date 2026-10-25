import { model, PaginateModel, Schema, Types } from 'mongoose';
import mongoosePaginate from 'mongoose-paginate-v2';
import { TaskStatus } from '../../domain/task.entity';

export interface TaskDocument {
  _id: Types.ObjectId;
  title: string;
  description?: string | null;
  status: TaskStatus;
  completedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const taskSchema = new Schema<TaskDocument>(
  {
    title: { type: String, required: true, trim: true, minlength: 3, maxlength: 120, unique: true },
    description: { type: String, trim: true, maxlength: 1000, default: null },
    status: { type: String, enum: Object.values(TaskStatus), required: true, default: TaskStatus.PENDING },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true, versionKey: false },
);

taskSchema.index({ status: 1, createdAt: -1 });
taskSchema.plugin(mongoosePaginate);

export const TaskModel = model<TaskDocument, PaginateModel<TaskDocument>>('Task', taskSchema);

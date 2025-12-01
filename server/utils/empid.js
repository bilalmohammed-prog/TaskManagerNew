import Counter from '../models/counter.js';

export async function generateEmpID() {
  const year = (new Date()).getFullYear();
  const key = `empid-${year}`;
  const result = await Counter.findOneAndUpdate(
    { _id: key },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  ).exec();
  const seq = result.seq.toString().padStart(6, '0');
  return `EMP-${year}-${seq}`;
}

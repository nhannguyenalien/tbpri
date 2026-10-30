// Bản dự phòng: không dùng Firebase — `db` chỉ là tay cầm cho lib/compat/database.js.
import { getDatabase } from 'firebase/database';
export const app = {};
export const db = getDatabase();

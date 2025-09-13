import { IUserDocument } from '../models/mongodb/userModel';

declare global {
  namespace Express {
    interface Request {
      user?: IUserDocument;
    }
  }
}
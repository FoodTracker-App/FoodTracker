import { getDashboard as loadDashboard } from "../services/dashboardService.js";
import { getStoreToday } from "../config/store.js";
import { validateBatchQuery } from "../utils/validateBatchQuery.js";

export const getDashboard = async (req, res, next) => {
  try {
    const today = getStoreToday();
    const query = validateBatchQuery(req.query);
    res.status(200).json(await loadDashboard(query, today));
  } catch (error) {
    next(error);
  }
};

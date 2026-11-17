import api from "../lib/api";
import { AcademicReport } from "../types/academic";

export const reportService = {
  // Fetch the summary for a specific Unit
  getUnitReport: async (unitId: string): Promise<AcademicReport> => {
    const response = await api.get(`reports/dashboard/lecturer/?unit=${encodeURIComponent(unitId)}`);
    return response.data;
  },

  // FIX: Aligning with the GlobalUnitReportView we added to reports/urls.py
  getGlobalReport: async (): Promise<AcademicReport> => {
    const response = await api.get("reports/unit/global/");
    return response.data;
  }
};
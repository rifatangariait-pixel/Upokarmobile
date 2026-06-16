/**
 * Reusable Google Sheets API Service
 * Replaces MySQL/Prisma layer with REST API calls to Google Apps Script.
 */

// Retrieve URL from env configs automatically
const AS_URL = (import.meta as any).env.VITE_APPS_SCRIPT_URL;

export const GoogleSheetsService = {
  /**
   * Main request handler
   */
  async request(action: string, sheetName: string, payload: any = {}) {
    if (!AS_URL) {
      console.warn(`[Missing Config] VITE_APPS_SCRIPT_URL missing. Intercepted request (${action} -> ${sheetName}). Ensure you deploy GAS backend.`);
      return null; // Return null so local Zustand `persist` cache takes over fallback naturally
    }
    
    try {
      const response = await fetch(AS_URL, {
        method: 'POST',
        // 'text/plain' circumvents CORS pre-flight OPTION requests in pure GAS apps
        headers: {
          'Content-Type': 'text/plain;charset=utf-8',
        },
        body: JSON.stringify({ action, sheetName, ...payload }),
      });
      
      const result = await response.json();
      
      if (!result.success) {
        throw new Error(result.error || 'Google Sheets API error. Check duplicate constraints.');
      }
      
      return result.data;
    } catch (error: any) {
      console.error(`Google Sheets Service Error (${action} on ${sheetName}):`, error);
      throw error;
    }
  },

  getAll(sheetName: string) {
    return this.request('readAll', sheetName);
  },

  getById(sheetName: string, id: string) {
    return this.request('readById', sheetName, { id });
  },

  create(sheetName: string, data: any) {
    return this.request('create', sheetName, { data });
  },

  update(sheetName: string, id: string, data: any) {
    return this.request('update', sheetName, { id, data });
  },

  delete(sheetName: string, id: string) {
    return this.request('delete', sheetName, { id });
  },

  search(sheetName: string, query: any) {
    return this.request('search', sheetName, { query });
  },
  
  backupDatabase() {
    return this.request('backup', 'System');
  }
};

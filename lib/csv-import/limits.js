// Limits of one CSV import, shared by the import wizard and importTransactions. The row limit also keeps the request
// far below the server action body limit (1 MB)
export const IMPORT_MAX_ROWS = 500;
export const IMPORT_MAX_FILE_BYTES = 5 * 1024 * 1024;
export const IMPORT_MAX_DESCRIPTION = 255;
export const IMPORT_MAX_SETTINGS_NAME = 50;

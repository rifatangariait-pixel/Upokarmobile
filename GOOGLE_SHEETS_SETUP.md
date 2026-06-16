# Google Sheets Database Architecture & Setup

## Architecture Overview
This project has been fully migrated to use **Google Sheets as the primary database** via Google Apps Script (Serverless API).
All MySQL dependencies, ORMs (Prisma, Sequelize, TypeORM), and migration tools have been removed.

### Sheets Structure required in your Google Sheet:
- **Products**: Brand, model, imei1, purchasePrice, sellingPrice, status, etc.
- **StockMovement**: Logs stock adjustments, transfers, and incoming shipments.
- **Customers**: full_name, mobile, nidObject, monthly_income, risk_rating.
- **Guarantors**: guarantor details attached to customers.
- **EMISales**: Financial tracking of Down payment, monthly info, sale status.
- **EMICollections**: Repayment trail and penalty calculation.
- **Suppliers**: Wholesale providers mapping.
- **Expenses**: Operational expenses and salary logs.
- **Users**: Admin, Manager, Sales Officer, etc.
- **Settings**: App preferences.

---

## Duplicate Validation (Built-in)
The Google Apps Script automatically rejects records if:
1. `imei1` already exists in **Products**.
2. `nidObject` already exists in **Customers**.
3. `mobile` already exists in **Customers**.

## Automatic Backups
A `backup` command replicates the entire spreadsheet in your root Google Drive folder automatically. Append `{ "action": "backup" }` to an API call to test.

---

## Deployment & Setup Guide

### 1. Create the Google Sheet
1. Go to [Google Sheets](https://sheets.new).
2. Name the sheet something like `Angaria ERP Database`.
3. (Optional) Run the script below first, and the script's `setupSheets()` function will automatically generate all required sheets for you!

### 2. Add Google Apps Script
1. In your Google Sheet, click on **Extensions > Apps Script**.
2. Delete any code in the editor and **Paste the entire code** from the local `/apps-script/Code.gs` file inside this codebase.
3. Save the file (Ctrl+S or Cmd+S).
4. Run the `setupSheets()` function from the editor dropdown to automatically create all your required sheets. Grant any permissions it requests.

### 3. Deploy the API
1. In the Apps Script Editor, click **Deploy > New deployment** in the top right.
2. Select **Web app** as the type.
3. Settings:
   - **Description**: `ERP API v1`
   - **Execute as**: `Me (Your Email)`
   - **Who has access**: `Anyone` *(Important: required for REST API access!)*
4. Click **Deploy**.
5. Copy the **Web app URL** that is generated.

### 4. Configure Environment Variable
1. In your project codebase, open the `.env` file (or create one using `.env.example`).
2. Add the copied URL to the environment variables:
   ```env
   VITE_APPS_SCRIPT_URL="https://script.google.com/macros/s/YOUR_SCRIPT_ID/exec"
   ```
3. Restart the preview server (`npm run dev` or the UI reload).
4. Done! All Database operations now bridge directly strictly to Google Sheets.

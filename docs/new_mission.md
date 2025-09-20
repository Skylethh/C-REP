




# **Feature Brief: Professional Report Archive System**

## **1. Objective**

The primary goal is to build a "Report Archive" system for the KarbonRapor application. This feature will store a record of every generated PDF report, allowing users to view a history of their past reports, re-download them at any time, and manage them. This will enhance user efficiency and provide a crucial historical and auditable record of their reporting activities.

## **2. Part A: Backend & Database Setup**

This is the foundational work. We need a new table to store the report metadata and secure the stored files.

### **Step 2.1: Create the `generated_reports` Table in Supabase**

The core of the archive is a new table to store the metadata for each report.

**Task:** Create the SQL schema for the `generated_reports` table.

**Instructions for Copilot:**
Please provide the `CREATE TABLE` SQL statement for a new table named `generated_reports`. It should have the following columns to store the metadata of each generated PDF:
* `id`: `UUID`, Primary Key, auto-generated.
* `created_at`: `TIMESTAMP WITH TIME ZONE`, default `now()`.
* `report_title`: `TEXT`, not null (The custom title the user provides).
* `project_id`: `UUID`, a foreign key referencing the `projects` table.
* `date_range_start`: `DATE`, not null.
* `date_range_end`: `DATE`, not null.
* `created_by_user_id`: `UUID`, a foreign key referencing `auth.users`.
* `file_storage_path`: `TEXT`, not null (The path to the PDF file in Supabase Storage, e.g., `project-reports/{projectId}/{unique_filename}.pdf`).
* `total_emission_tco2e`: `NUMERIC`, for display purposes in the archive list.
* `entry_count`: `INTEGER`, for display purposes.

Additionally, enable Row Level Security (RLS) on this table.

### **Step 2.2: Set Up Supabase Storage for Reports**

The generated PDF files need to be stored securely.

**Task:** Define the storage bucket and its security policies.

**Instructions for Copilot:**
1.  Outline the SQL command to create a new, private Supabase Storage bucket named `project-reports`.
2.  Draft the RLS policies for this `project-reports` bucket. The policies must ensure that:
    * A user can only upload files to a folder corresponding to a project they are a member of.
    * A user can only download/view files from a project they are a member of.

## **3. Part B: Integrating Logic into the Report Generator**

We need to modify the existing "Generate Report" function to save the report to our new archive system.

**Task:** Update the `generateReportPdf` Server Action.

**Instructions for Copilot:**
Modify the existing `generateReportPdf` server action in `src/app/actions/reports.ts`. The new logic flow should be as follows:
1.  The action receives `projectId`, `dateRange`, and the new `reportTitle` from the user.
2.  It fetches the necessary data from the database as it does now.
3.  It renders the React PDF component into a PDF buffer on the server using `@react-pdf/renderer`.
4.  **New Step:** It generates a unique filename for the PDF (e.g., using a UUID or timestamp).
5.  **New Step:** It uploads this PDF buffer to the `project-reports` bucket in **Supabase Storage**. The file path should be like `{projectId}/{unique_filename}.pdf`.
6.  **New Step:** After a successful upload, it **inserts a new record** into the `generated_reports` table, saving all the report's metadata (title, date range, user ID, and the storage path from the previous step).
7.  **New Step:** It must call `revalidatePath('/dashboard/reports')` to ensure the archive list on the frontend will be updated immediately.
8.  Finally, it returns the PDF buffer to the user's browser to trigger the immediate download, just as it did before.

## **4. Part C: Frontend UI Implementation**

Now, we will build the user-facing part of the archive on the reports page.

### **Step 4.1: Create the `ReportArchive` Component**

**Task:** Create a new component to display the list of past reports.

**Instructions for Copilot:**
1.  Create a new file at `src/components/reports/ReportArchive.tsx`.
2.  This should be an `async` Server Component. It will fetch all records from the `generated_reports` table that belong to the currently selected project, ordered by `created_at` descending.
3.  If no reports are found, it should display a simple message like "Henüz oluşturulmuş bir rapor bulunmuyor." (No reports have been generated yet).
4.  If reports exist, it should display the data in a **`shadcn/ui Table`**.
5.  The table columns should be: `Rapor Başlığı`, `Tarih Aralığı`, `Oluşturulma Tarihi`, `Oluşturan Kişi`, and `Aksiyonlar`.

### **Step 4.2: Implement the "Re-Download" and "Delete" Actions**

**Task:** Create the server actions for managing the archived reports.

**Instructions for Copilot:**
1.  Inside the "Aksiyonlar" (Actions) column of the table, add two icon buttons for each row.
2.  **Download Action:** Create a new server action `downloadArchivedReport(reportId)`. This action will:
    a.  Find the report in the `generated_reports` table using its `reportId`.
    b.  Get the `file_storage_path`.
    c.  Use the Supabase client to create a temporary, signed URL for that file path.
    d.  Redirect the user to this signed URL to initiate the download.
3.  **Delete Action:** Create a new server action `deleteArchivedReport(reportId)`. This action will:
    a.  First, delete the record from the `generated_reports` table.
    b.  Then, delete the corresponding file from Supabase Storage.
    c.  It must also revalidate the `/dashboard/reports` path.

### **Step 4.3: Integrate into the Main Reports Page**

**Task:** Add the new archive component to the existing reports page.

**Instructions for Copilot:**
1.  Open the main reports page at `/dashboard/reports/page.tsx`.
2.  Import and render the new `<ReportArchive />` component.
3.  Place it visually below the "Rapor Oluştur" card, perhaps with a title like "Rapor Arşivi".
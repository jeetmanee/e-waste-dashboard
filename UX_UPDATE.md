# UX functionality update

This update preserves the original warm beige dashboard design, typography, sidebar, route structure, page layouts, and Supabase access model. It does not replace the application with the visual style or navigation of the supplied reference site.

## What changed

- Added grid and list display modes to the existing Files & Resources page.
- Improved repository search to cover titles, filenames, descriptions, and tags.
- Made file-type filters reflect the formats actually present in the archive.
- Added title A–Z sorting alongside newest and oldest sorting.
- Added workstream filtering in the repository and a “View related files” action from each workstream page.
- Kept separate View and Download actions. Supported files use the existing document preview route; original downloads remain separate.
- Added the 13 submission titles supplied by the project team as submission records. They are explicitly marked as awaiting a file until an authorised member attaches the original.
- Added prefilled upload titles for submission records. The IEEE submission folder supports attaching multiple documents.

## Access and data handling

- Existing Supabase authentication, database, storage, and role policies are retained.
- Public visitors can browse records permitted by the existing public visibility rules.
- Only authorised members can upload, edit, or delete project files.
- Uploads remain private by default. A member must deliberately select public visibility.
- Submission placeholders are not represented as uploaded files and have no View or Download action until an original is attached.

## Run locally

Keep your own `.env.local` file in the project root. It is intentionally not included in this ZIP.

```bash
npm install
npm run dev
```

Validate the production build with:

```bash
npm run build
```
